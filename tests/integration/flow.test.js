const mongoose = require('mongoose');
const {
  startDb, stopDb, api, lastToken, nextVkn, tagId, bootstrap, registerCompany, auth,
} = require('./helpers');
const { Swipe, Match, Company } = require('../../src/models');
const { computeQueueFor } = require('../../src/services/queue');
const { sendOutcomePrompts } = require('../../src/jobs');

let ctx;
let A; // görüntü işleme firması
let B; // elektronik firması
let C; // ilgisiz firma

beforeAll(async () => {
  await startDb();
  ctx = await bootstrap();
});
afterAll(stopDb);

const flush = () => new Promise((r) => setTimeout(r, 200));

describe('kayıt ve doğrulama', () => {
  test('ücretsiz e-posta sağlayıcısı reddedilir', async () => {
    const r = await api().post('/api/v1/auth/register').send({
      email: 'ali@gmail.com', password: 'Sifre12345!', fullName: 'Ali', kvkkConsent: true,
      company: { name: 'X', taxNumber: nextVkn(), technoparkId: String(ctx.tp._id) },
    });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/kurumsal/);
  });

  test('geçersiz vergi numarası reddedilir', async () => {
    const r = await api().post('/api/v1/auth/register').send({
      email: 'ali@firma.com.tr', password: 'Sifre12345!', fullName: 'Ali', kvkkConsent: true,
      company: { name: 'X', taxNumber: '1111111112', technoparkId: String(ctx.tp._id) },
    });
    expect(r.status).toBe(400);
  });

  test('KVKK onayı zorunlu', async () => {
    const r = await api().post('/api/v1/auth/register').send({
      email: 'ali@firma.com.tr', password: 'Sifre12345!', fullName: 'Ali', kvkkConsent: false,
      company: { name: 'X', taxNumber: nextVkn(), technoparkId: String(ctx.tp._id) },
    });
    expect(r.status).toBe(400);
  });

  test('e-posta doğrulanmadan giriş yapılamaz; doğrulayınca yapılır', async () => {
    const email = 'kurucu@dogrulama.com.tr';
    await api().post('/api/v1/auth/register').send({
      email, password: 'Sifre12345!', fullName: 'Kurucu', kvkkConsent: true,
      company: { name: 'Doğrulama AŞ', taxNumber: nextVkn(), technoparkId: String(ctx.tp._id) },
    }).expect(201);
    await api().post('/api/v1/auth/login').send({ email, password: 'Sifre12345!' }).expect(403);
    await api().post('/api/v1/auth/verify-email').send({ token: lastToken(email) }).expect(200);
    const login = await api().post('/api/v1/auth/login').send({ email, password: 'Sifre12345!' }).expect(200);
    expect(login.body.token).toBeTruthy();
    // Onaylanmamış firma akışı göremez
    await api().get('/api/v1/feed').set(auth(login.body.token)).expect(403);
  });
});

describe('profil, akış, eşleşme', () => {
  beforeAll(async () => {
    A = await registerCompany({ email: 'ceo@vizyon.com.tr', name: 'Vizyon', technoparkId: ctx.tp._id, tpAdminToken: ctx.tpAdminToken });
    B = await registerCompany({ email: 'ceo@elektronik.com.tr', name: 'Elektronik', technoparkId: ctx.tp._id, tpAdminToken: ctx.tpAdminToken });
    C = await registerCompany({ email: 'ceo@alakasiz.com.tr', name: 'Alakasız', technoparkId: ctx.tp._id, tpAdminToken: ctx.tpAdminToken });

    const cv = await tagId('competence', 'Görüntü İşleme Çözümleri');
    const field = await tagId('competence', 'Saha Testi');
    const pcb = await tagId('competence', 'PCB Tasarım ve Üretim');
    const legal = await tagId('competence', 'Hukuk ve Fikri Mülkiyet');
    const sector = await tagId('sector', 'Üretim / Endüstri');

    await api().patch('/api/v1/companies/me').set(auth(A.token)).send({
      stage: 'first_customer', employeeRange: '6-20', sectors: [sector],
      description: 'Endüstriyel kalite kontrol için derin öğrenme tabanlı hata tespit modelleri geliştiren bir girişimiz.',
    }).expect(200);
    await api().put('/api/v1/companies/me/offers').set(auth(A.token)).send({
      offers: [{ tag: cv, collaborationType: 'subcontracting', description: 'kalite kontrol hata tespiti modelleri' }],
    }).expect(200);
    await api().put('/api/v1/companies/me/needs').set(auth(A.token)).send({
      needs: [{ tag: field, collaborationType: 'joint_rnd', urgency: 'this_month', description: 'üretim hattında saha testi' }],
    }).expect(200);

    await api().patch('/api/v1/companies/me').set(auth(B.token)).send({ stage: 'growth', employeeRange: '21-50', sectors: [sector] }).expect(200);
    await api().put('/api/v1/companies/me/offers').set(auth(B.token)).send({
      offers: [{ tag: field, collaborationType: 'joint_rnd', description: 'üretim sahasında saha testi' },
        { tag: pcb, collaborationType: 'subcontracting', description: 'kart tasarımı' }],
    }).expect(200);
    await api().put('/api/v1/companies/me/needs').set(auth(B.token)).send({
      needs: [{ tag: cv, collaborationType: 'subcontracting', urgency: 'this_quarter', visibility: 'matched_only', description: 'kalite kontrol için hata tespiti' }],
    }).expect(200);

    await api().put('/api/v1/companies/me/offers').set(auth(C.token)).send({
      offers: [{ tag: legal, collaborationType: 'mentorship', description: 'patent danışmanlığı' }],
    }).expect(200);
    await flush();
  });

  test('en fazla 5 "sunuyorum" maddesi', async () => {
    const cv = await tagId('competence', 'Görüntü İşleme Çözümleri');
    const offers = Array.from({ length: 6 }, () => ({ tag: cv, collaborationType: 'subcontracting' }));
    await api().put('/api/v1/companies/me/offers').set(auth(A.token)).send({ offers }).expect(400);
  });

  test('profil tamamlama yüzdesi döner', async () => {
    const r = await api().get('/api/v1/companies/me').set(auth(A.token)).expect(200);
    expect(r.body.company.completion.percent).toBeGreaterThan(30);
    expect(r.body.company.completion.missing).toContain('logoUrl');
  });

  test('akış uyum skoruna göre sıralı ve gerekçeli; gizli ihtiyaç gerekçede yok', async () => {
    await computeQueueFor(A.companyId);
    const r = await api().get('/api/v1/feed').set(auth(A.token)).expect(200);
    const ids = r.body.cards.map((c) => String(c.id));
    expect(ids[0]).toBe(B.companyId);
    expect(ids).not.toContain(A.companyId);
    const card = r.body.cards[0];
    expect(card.matchPercent).toBeGreaterThan(50);
    expect(card.reasons).toContain('Aradığınız: Saha Testi');
    expect(card.reasons).toContain('Aynı teknokent');
    expect(card.reasons.join(' ')).not.toMatch(/Onların aradığı/);
    expect(card.needs).toHaveLength(0); // matched_only ihtiyaç kartta görünmez
    expect(r.body.dailyLimit).toBe(20);
  });

  test('aynı gün tekrar istenen akış aynı kartları döner (günlük limit sayacı artmaz)', async () => {
    const r1 = await api().get('/api/v1/feed').set(auth(A.token)).expect(200);
    const r2 = await api().get('/api/v1/feed').set(auth(A.token)).expect(200);
    expect(r2.body.shownToday).toBe(r1.body.shownToday);
    expect(r2.body.cards.map((c) => c.id)).toEqual(r1.body.cards.map((c) => c.id));
  });

  test('tek taraflı ilgi eşleşme oluşturmaz; karşılıklı ilgi oluşturur', async () => {
    const s1 = await api().post('/api/v1/swipes').set(auth(A.token)).send({ targetCompanyId: B.companyId, direction: 'right' }).expect(201);
    expect(s1.body.matched).toBe(false);
    expect(s1.body.swipe.scoreAtTime).toBeGreaterThan(0);

    // B'nin eşleşme listesinde A görünmez (tek taraflı ilgi gizli)
    const before = await api().get('/api/v1/matches').set(auth(B.token)).expect(200);
    expect(before.body.matches).toHaveLength(0);

    const s2 = await api().post('/api/v1/swipes').set(auth(B.token)).send({ targetCompanyId: A.companyId, direction: 'right' }).expect(201);
    expect(s2.body.matched).toBe(true);
    expect(await Match.countDocuments()).toBe(1);

    const stored = await Swipe.findOne({ swiperCompany: B.companyId });
    expect(stored.scoreAtTime).toBeGreaterThan(0);
  });

  test('aynı firmaya ikinci kez ilgi gösterilemez; kaydırılan firma akıştan düşer', async () => {
    await api().post('/api/v1/swipes').set(auth(A.token)).send({ targetCompanyId: B.companyId, direction: 'right' }).expect(409);
    const r = await api().get('/api/v1/feed').set(auth(A.token)).expect(200);
    expect(r.body.cards.map((c) => String(c.id))).not.toContain(B.companyId);
  });

  test('eşleşince gizli ihtiyaçlar firma detayında görünür', async () => {
    const r = await api().get(`/api/v1/companies/${B.companyId}`).set(auth(A.token)).expect(200);
    expect(r.body.company.matched).toBe(true);
    expect(r.body.company.needs).toHaveLength(1);
    const rc = await api().get(`/api/v1/companies/${B.companyId}`).set(auth(C.token)).expect(200);
    expect(rc.body.company.needs).toHaveLength(0);
  });

  test('sol kaydırma akıştan düşürür', async () => {
    await api().post('/api/v1/swipes').set(auth(A.token)).send({ targetCompanyId: C.companyId, direction: 'left' }).expect(201);
    const r = await api().get('/api/v1/feed').set(auth(A.token)).expect(200);
    expect(r.body.cards.map((c) => String(c.id))).not.toContain(C.companyId);
  });

  test('süper ilgi MVP\'de kapalı', async () => {
    await api().post('/api/v1/swipes').set(auth(C.token)).send({ targetCompanyId: A.companyId, direction: 'super' }).expect(403);
  });

  describe('eşleşme sonrası', () => {
    let matchId;
    beforeAll(async () => {
      const r = await api().get('/api/v1/matches').set(auth(A.token)).expect(200);
      matchId = r.body.matches[0].id;
    });

    test('ilk mesajda dış bağlantı yasak', async () => {
      await api().post(`/api/v1/matches/${matchId}/messages`).set(auth(A.token))
        .send({ content: 'Merhaba, sitemize bakın https://ornek.com' }).expect(400);
    });

    test('mesajlaşma ve okunmamış sayısı', async () => {
      await api().post(`/api/v1/matches/${matchId}/messages`).set(auth(A.token)).send({ content: 'Merhaba, saha testi için görüşelim mi?' }).expect(201);
      // ilk mesajdan sonra bağlantı serbest
      await api().post(`/api/v1/matches/${matchId}/messages`).set(auth(A.token)).send({ content: 'Detaylar: https://ornek.com' }).expect(201);
      const list = await api().get('/api/v1/matches').set(auth(B.token)).expect(200);
      expect(list.body.matches[0].unreadCount).toBe(2);
      const msgs = await api().get(`/api/v1/matches/${matchId}/messages`).set(auth(B.token)).expect(200);
      expect(msgs.body.messages).toHaveLength(2);
      const list2 = await api().get('/api/v1/matches').set(auth(B.token)).expect(200);
      expect(list2.body.matches[0].unreadCount).toBe(0);
    });

    test('eşleşmeye taraf olmayan firma erişemez', async () => {
      await api().get(`/api/v1/matches/${matchId}/messages`).set(auth(C.token)).expect(404);
    });

    test('toplantı önerisi ve kabulü', async () => {
      const slot = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
      const p = await api().post(`/api/v1/matches/${matchId}/meetings`).set(auth(A.token))
        .send({ slots: [slot], type: 'in_person', location: 'Teknokent B blok' }).expect(201);
      const meetingId = p.body.meeting._id;
      await api().patch(`/api/v1/matches/${matchId}/meetings/${meetingId}`).set(auth(A.token)).send({ action: 'accept' }).expect(403);
      const acc = await api().patch(`/api/v1/matches/${matchId}/meetings/${meetingId}`).set(auth(B.token))
        .send({ action: 'accept', slot }).expect(200);
      expect(acc.body.meeting.status).toBe('accepted');
    });

    test('2 hafta sonra iş sonucu sorusu ve cevabı güven sinyalini günceller', async () => {
      await Match.collection.updateOne({ _id: new mongoose.Types.ObjectId(String(matchId)) }, { $set: { createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000) } });
      expect(await sendOutcomePrompts()).toBe(1);
      expect(await sendOutcomePrompts()).toBe(0);
      const pend = await api().get('/api/v1/matches/pending-outcomes').set(auth(A.token)).expect(200);
      expect(pend.body.matches).toHaveLength(1);
      await api().put(`/api/v1/matches/${matchId}/outcome`).set(auth(A.token))
        .send({ result: 'proposal', estimatedValue: 250000, rating: 5 }).expect(200);
      const b = await Company.findById(B.companyId);
      expect(b.stats.totalOutcomes).toBe(1);
      expect(b.stats.positiveOutcomes).toBe(1);
      const pend2 = await api().get('/api/v1/matches/pending-outcomes').set(auth(A.token)).expect(200);
      expect(pend2.body.matches).toHaveLength(0);
    });
  });

  describe('teknokent paneli', () => {
    test('istatistikler', async () => {
      const r = await api().get('/api/v1/panel/stats').set(auth(ctx.tpAdminToken)).expect(200);
      expect(r.body.metrics.matches).toBe(1);
      expect(r.body.metrics.matchToMessageRate).toBe(100);
      expect(r.body.metrics.meetings).toBe(1);
      expect(r.body.metrics.outcomes.proposal).toBe(1);
      expect(r.body.companies.approved).toBeGreaterThanOrEqual(3);
    });

    test('CSV dışa aktarma', async () => {
      const r = await api().get('/api/v1/panel/stats/export.csv').set(auth(ctx.tpAdminToken)).expect(200);
      expect(r.headers['content-type']).toMatch(/text\/csv/);
      expect(r.text).toMatch(/Eşleşme;1/);
    });

    test('talep–arz boşluğu', async () => {
      const r = await api().get('/api/v1/panel/supply-demand').set(auth(ctx.tpAdminToken)).expect(200);
      expect(r.body.items.length).toBeGreaterThan(0);
      expect(r.body.items[0]).toHaveProperty('gap');
    });

    test('ağ haritası', async () => {
      const r = await api().get('/api/v1/panel/network').set(auth(ctx.tpAdminToken)).expect(200);
      expect(r.body.edges).toHaveLength(1);
    });

    test('firma kullanıcısı panele erişemez', async () => {
      await api().get('/api/v1/panel/stats').set(auth(A.token)).expect(403);
    });

    test('toplu yükleme ve profil sahiplenme', async () => {
      const vkn = nextVkn();
      const imp = await api().post('/api/v1/panel/companies/import').set(auth(ctx.tpAdminToken)).send({
        companies: [{ name: 'Önceden Yüklü AŞ', taxNumber: vkn, emailDomain: 'onyuklu.com.tr', sectors: ['Savunma'] },
          { name: 'Hatalı', taxNumber: '1111111112' }],
      }).expect(201);
      expect(imp.body.created).toBe(1);
      expect(imp.body.errors).toHaveLength(1);

      const reg = await api().post('/api/v1/auth/register').send({
        email: 'ceo@onyuklu.com.tr', password: 'Sifre12345!', fullName: 'Sahip', kvkkConsent: true,
        company: { name: 'Önceden Yüklü AŞ', taxNumber: vkn, technoparkId: String(ctx.tp._id) },
      }).expect(201);
      expect(reg.body.company.claimed).toBe(true);
      expect(reg.body.company.verificationStatus).toBe('approved');

      // İkinci kişi aynı vergi no ile kayıt olamaz
      await api().post('/api/v1/auth/register').send({
        email: 'baska@onyuklu.com.tr', password: 'Sifre12345!', fullName: 'Başka', kvkkConsent: true,
        company: { name: 'X', taxNumber: vkn, technoparkId: String(ctx.tp._id) },
      }).expect(409);
    });
  });

  describe('güven ve gizlilik', () => {
    test('engellenen firma akışta ve detayda görünmez, eşleşme kapanır', async () => {
      const D = await registerCompany({ email: 'ceo@dfirma.com.tr', name: 'D Firma', technoparkId: ctx.tp._id, tpAdminToken: ctx.tpAdminToken });
      await api().post(`/api/v1/companies/me/blocks/${D.companyId}`).set(auth(C.token)).expect(200);
      await api().get(`/api/v1/companies/${C.companyId}`).set(auth(D.token)).expect(404);
      await api().post('/api/v1/swipes').set(auth(D.token)).send({ targetCompanyId: C.companyId, direction: 'right' }).expect(404);
    });

    test('3 farklı firmadan rapor alan profil incelemeye düşer', async () => {
      const target = await registerCompany({ email: 'spam@spamci.com.tr', name: 'Spamcı', technoparkId: ctx.tp._id, tpAdminToken: ctx.tpAdminToken });
      for (const r of [A, B, C]) {
        // eslint-disable-next-line no-await-in-loop
        await api().post('/api/v1/reports').set(auth(r.token)).send({ targetCompanyId: target.companyId, reason: 'spam' }).expect(201);
      }
      await api().post('/api/v1/reports').set(auth(A.token)).send({ targetCompanyId: target.companyId, reason: 'spam' }).expect(409);
      expect((await Company.findById(target.companyId)).underReview).toBe(true);
      await api().get('/api/v1/feed').set(auth(target.token)).expect(403);
      const reports = await api().get('/api/v1/panel/reports').set(auth(ctx.tpAdminToken)).expect(200);
      expect(reports.body.reports).toHaveLength(3);
      await api().post(`/api/v1/panel/companies/${target.companyId}/moderate`).set(auth(ctx.tpAdminToken)).send({ action: 'restore' }).expect(200);
      expect((await Company.findById(target.companyId)).underReview).toBe(false);
    });

    test('davet ile ekip üyesi ekleme (yalnızca kurumsal alan adı)', async () => {
      await api().post('/api/v1/companies/me/invitations').set(auth(A.token)).send({ email: 'x@baska.com' }).expect(400);
      await api().post('/api/v1/companies/me/invitations').set(auth(A.token)).send({ email: 'uye@vizyon.com.tr' }).expect(201);
      const acc = await api().post('/api/v1/auth/accept-invite').send({
        token: lastToken('uye@vizyon.com.tr'), fullName: 'Üye Kişi', password: 'Sifre12345!', kvkkConsent: true,
      }).expect(201);
      expect(acc.body.user.role).toBe('company_member');
      // Üye profil düzenleyemez ama akışı görebilir
      await api().patch('/api/v1/companies/me').set(auth(acc.body.token)).send({ stage: 'mvp' }).expect(403);
      await api().get('/api/v1/feed').set(auth(acc.body.token)).expect(200);
    });

    test('KVKK: hesap silme', async () => {
      const E = await registerCompany({ email: 'ceo@silinecek.com.tr', name: 'Silinecek', technoparkId: ctx.tp._id, tpAdminToken: ctx.tpAdminToken });
      await api().delete('/api/v1/auth/me').set(auth(E.token)).send({ password: 'yanlis' }).expect(401);
      await api().delete('/api/v1/auth/me').set(auth(E.token)).send({ password: 'Sifre12345!' }).expect(200);
      await api().get('/api/v1/auth/me').set(auth(E.token)).expect(401);
      expect((await Company.findById(E.companyId)).active).toBe(false);
    });
  });
});

describe('genel', () => {
  test('health', async () => {
    const r = await api().get('/health').expect(200);
    expect(r.body.db).toBe('up');
  });

  test('meta ve herkese açık listeler', async () => {
    await api().get('/api/v1/meta').expect(200);
    const t = await api().get('/api/v1/technoparks').expect(200);
    expect(t.body.technoparks.length).toBe(2);
    const tags = await api().get('/api/v1/tags?type=sector').expect(200);
    expect(tags.body.tags.every((x) => x.type === 'sector')).toBe(true);
  });

  test('bilinmeyen uç nokta 404', async () => {
    await api().get('/api/v1/yok').expect(404);
  });
});

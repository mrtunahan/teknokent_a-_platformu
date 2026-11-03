const S = require('../../src/services/scoring');

const now = new Date('2026-11-03T12:00:00Z');
const parents = new Map([
  ['cv', 'ai'], // görüntü işleme -> yapay zekâ
  ['nlp', 'ai'],
  ['ai', null],
  ['pcb', 'hw'],
  ['field', null],
]);
const names = new Map([['cv', 'Görüntü İşleme'], ['field', 'Saha Testi'], ['pcb', 'PCB'], ['ai', 'Yapay Zekâ'], ['s1', 'Üretim']]);
const ctx = { now, tagParents: parents, tagNames: names };

const base = (over) => ({
  id: 'x',
  technopark: 'tp1',
  city: 'Çankırı',
  sectors: [],
  stage: 'growth',
  employeeRange: '21-50',
  verified: true,
  profileUpdatedAt: now,
  certificates: [],
  blockedCompanies: [],
  preferences: { region: 'turkey', requiredCertificates: [], blockedSectors: [] },
  offers: [],
  needs: [],
  description: '',
  trust: { positive: 0, total: 0 },
  ...over,
});

const vision = base({
  id: 'A',
  stage: 'first_customer',
  employeeRange: '6-20',
  sectors: ['s1'],
  offers: [{ tag: 'cv', collaborationType: 'subcontracting', description: 'endüstriyel kalite kontrol hata tespiti modelleri' }],
  needs: [{ tag: 'field', collaborationType: 'joint_rnd', urgency: 'this_month', visibility: 'public', description: 'üretim hattında saha testi' }],
});
const electronics = base({
  id: 'B',
  sectors: ['s1'],
  offers: [{ tag: 'field', collaborationType: 'joint_rnd', description: 'üretim sahasında saha testi altyapısı' }],
  needs: [{ tag: 'cv', collaborationType: 'subcontracting', urgency: 'this_quarter', visibility: 'public', description: 'kalite kontrol için hata tespiti' }],
});
const unrelated = base({
  id: 'C',
  technopark: 'tp2',
  city: 'İzmir',
  offers: [{ tag: 'pcb', collaborationType: 'supply_distribution', description: 'kart üretimi' }],
  needs: [{ tag: 'nlp', collaborationType: 'investment', urgency: 'general', visibility: 'public' }],
});

describe('yardımcı fonksiyonlar', () => {
  test('jaccard', () => {
    expect(S.jaccard(['a', 'b'], ['b', 'c'])).toBeCloseTo(1 / 3);
    expect(S.jaccard([], [])).toBe(0);
  });

  test('etiket benzerliği: aynı 1, üst/kardeş 0.5, ilgisiz 0', () => {
    expect(S.tagSimilarity('cv', 'cv', parents)).toBe(1);
    expect(S.tagSimilarity('cv', 'ai', parents)).toBe(0.5);
    expect(S.tagSimilarity('cv', 'nlp', parents)).toBe(0.5);
    expect(S.tagSimilarity('cv', 'pcb', parents)).toBe(0);
  });

  test('iş birliği türü: aynı 1, uyumlu 0.5, diğer 0', () => {
    expect(S.collaborationCompatibility('subcontracting', 'subcontracting')).toBe(1);
    expect(S.collaborationCompatibility('subcontracting', 'joint_rnd')).toBe(0.5);
    expect(S.collaborationCompatibility('joint_rnd', 'subcontracting')).toBe(0.5);
    expect(S.collaborationCompatibility('investment', 'equipment_sharing')).toBe(0);
  });

  test('konum: aynı teknokent / aynı şehir / diğer', () => {
    expect(S.proximity(vision, electronics)).toBe('technopark');
    expect(S.proximity(vision, base({ technopark: 'tp9', city: 'çankırı' }))).toBe('city');
    expect(S.proximity(vision, unrelated)).toBe('other');
    expect(S.proximity(vision, base({ technopark: 'tp9', city: 'Ankara', branches: [{ technopark: 'tp1' }] }))).toBe('technopark');
  });

  test('ölçek tablosu: kurumsal ihtiyacı startup karşılıyorsa yüksek', () => {
    const corp = base({ stage: 'mature', employeeRange: '50+' });
    const startup = base({ stage: 'mvp' });
    expect(S.scaleFit(corp, startup)).toBe(1);
    expect(S.scaleFit(corp, corp)).toBe(0.5);
    expect(S.scaleFit(base({ stage: undefined, employeeRange: undefined }), startup)).toBe(0.5);
  });

  test('tazelik 30 gün içinde 1, 180 günden sonra 0', () => {
    expect(S.freshness(base({ profileUpdatedAt: now }), now)).toBe(1);
    expect(S.freshness(base({ profileUpdatedAt: new Date('2026-01-01') }), now)).toBe(0);
  });

  test('güven sinyali: onay + Laplace düzeltilmiş geri bildirim', () => {
    expect(S.trustSignal(base({ verified: true }))).toBeCloseTo(0.75);
    expect(S.trustSignal(base({ verified: false, trust: { positive: 8, total: 8 } }))).toBeCloseTo(0.5 * 0.9);
  });
});

describe('uyum skoru', () => {
  test('birleşik skor zayıf yöne α=0.7 ağırlık verir', () => {
    expect(S.combine(0.2, 0.8)).toBeCloseTo(0.7 * 0.2 + 0.3 * 0.8);
    expect(S.combine(0.8, 0.2)).toBeCloseTo(S.combine(0.2, 0.8));
  });

  test('ağırlıkların toplamı 1', () => {
    expect(Object.values(S.DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  test('karşılıklı ihtiyaç–yetkinlik uyumu olan çift, ilgisiz çiftten çok daha yüksek', () => {
    const good = S.scorePair(vision, electronics, ctx);
    const bad = S.scorePair(vision, unrelated, ctx);
    expect(good.score).toBeGreaterThan(0.6);
    expect(bad.score).toBeLessThan(0.35);
    expect(good.score).toBeGreaterThan(bad.score + 0.3);
    expect(good.components.ab.competence).toBeGreaterThan(0.5);
    expect(good.components.ab.collaboration).toBe(1);
  });

  test('skor simetrik: S(A,B) = S(B,A)', () => {
    expect(S.scorePair(vision, electronics, ctx).score).toBeCloseTo(S.scorePair(electronics, vision, ctx).score);
  });

  test('tek taraflı ilgi cezalandırılır', () => {
    // B, A'nın ihtiyacını karşılıyor ama A'da B'nin aradığı yok
    const oneSided = { ...electronics, needs: [{ tag: 'nlp', collaborationType: 'investment', urgency: 'general', visibility: 'public' }] };
    const r = S.scorePair(vision, oneSided, ctx);
    const mutual = S.scorePair(vision, electronics, ctx);
    expect(r.ab).toBeGreaterThan(r.ba);
    expect(r.score).toBeLessThan(mutual.score);
    expect(r.score).toBeLessThan((r.ab + r.ba) / 2);
  });

  test('süresi dolmuş ihtiyaç skora katılmaz', () => {
    const expired = { ...vision, needs: [{ ...vision.needs[0], expiresAt: new Date('2026-10-01') }] };
    expect(S.directionalScore(expired, electronics, ctx).components.competence).toBe(0);
  });

  test('embedding varsa metin benzerliği için kullanılır', () => {
    const a = { ...vision, embeddings: { needs: [1, 0, 0], offers: [0, 1, 0] } };
    const b = { ...electronics, embeddings: { needs: [0, 1, 0], offers: [1, 0, 0] } };
    const c = { ...electronics, embeddings: { needs: [0, 1, 0], offers: [0, 0, 1] } };
    expect(S.directionalScore(a, b, ctx).components.competence).toBeGreaterThan(S.directionalScore(a, c, ctx).components.competence);
  });
});

describe('"neden bu firma" gerekçeleri', () => {
  test('karşılıklı ihtiyaçlar ve konum gösterilir', () => {
    const r = S.scorePair(vision, electronics, ctx);
    expect(r.reasonsForA).toEqual(expect.arrayContaining([
      'Aradığınız: Saha Testi',
      'Onların aradığı: Görüntü İşleme (sizde var)',
      'Aynı teknokent',
    ]));
  });

  test('"yalnızca eşleşince görünür" ihtiyaç gerekçede gösterilmez ama skora katılır', () => {
    const hidden = { ...electronics, needs: [{ ...electronics.needs[0], visibility: 'matched_only' }] };
    const r = S.scorePair(vision, hidden, ctx);
    expect(r.reasonsForA.some((x) => x.startsWith('Onların aradığı'))).toBe(false);
    expect(r.ba).toBeCloseTo(S.scorePair(vision, electronics, ctx).ba);
  });
});

describe('sert filtreler', () => {
  test('kendisi ve engellenen firmalar elenir (iki yönlü)', () => {
    expect(S.passesHardFilters(vision, vision, now)).toBe(false);
    expect(S.passesHardFilters({ ...vision, blockedCompanies: ['B'] }, electronics, now)).toBe(false);
    expect(S.passesHardFilters(vision, { ...electronics, blockedCompanies: ['A'] }, now)).toBe(false);
    expect(S.passesHardFilters(vision, electronics, now)).toBe(true);
  });

  test('bölge tercihi', () => {
    const v = (region) => ({ ...vision, preferences: { ...vision.preferences, region } });
    expect(S.passesHardFilters(v('same_technopark'), unrelated, now)).toBe(false);
    expect(S.passesHardFilters(v('same_city'), unrelated, now)).toBe(false);
    expect(S.passesHardFilters(v('turkey'), unrelated, now)).toBe(true);
    expect(S.passesHardFilters(v('same_city'), { ...unrelated, city: 'ÇANKIRI' }, now)).toBe(true);
  });

  test('rakip sektör engeli', () => {
    const v = { ...vision, preferences: { ...vision.preferences, blockedSectors: ['s1'] } };
    expect(S.passesHardFilters(v, electronics, now)).toBe(false);
  });

  test('zorunlu belge: geçerlilik tarihi kontrol edilir', () => {
    const v = { ...vision, preferences: { ...vision.preferences, requiredCertificates: ['facility_security'] } };
    expect(S.passesHardFilters(v, electronics, now)).toBe(false);
    expect(S.passesHardFilters(v, { ...electronics, certificates: [{ type: 'facility_security', validUntil: new Date('2027-01-01') }] }, now)).toBe(true);
    expect(S.passesHardFilters(v, { ...electronics, certificates: [{ type: 'facility_security', validUntil: new Date('2026-01-01') }] }, now)).toBe(false);
  });
});

/**
 * Başlangıç verisi: etiket kataloğu, teknokent(ler) ve platform yöneticisi.
 *   node scripts/seed.js              -> etiketler + teknokent + super admin
 *   node scripts/seed.js --demo       -> ek olarak örnek firmalar (geliştirme/sunum için)
 *
 * Ortam değişkenleri: SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_TECHNOPARK_NAME, SEED_TECHNOPARK_CITY
 */
const { connectDb, disconnectDb } = require('../src/config/db');
const {
  Tag, Technopark, User, Company,
} = require('../src/models');
const { ROLES, KVKK_CONSENT_VERSION } = require('../src/constants');
const seedTags = require('../src/constants/seedTags');
const { slugify } = require('../src/utils/slug');
const { recomputeAllQueues } = require('../src/services/queue');

async function seedTagCatalog() {
  for (const t of seedTags.filter((x) => !x.parent)) {
    // eslint-disable-next-line no-await-in-loop
    await Tag.updateOne({ type: t.type, slug: slugify(t.name) }, { $setOnInsert: { type: t.type, name: t.name, slug: slugify(t.name) } }, { upsert: true });
  }
  for (const t of seedTags.filter((x) => x.parent)) {
    // eslint-disable-next-line no-await-in-loop
    const parent = await Tag.findOne({ type: t.type, slug: t.parent });
    // eslint-disable-next-line no-await-in-loop
    await Tag.updateOne(
      { type: t.type, slug: slugify(t.name) },
      { $setOnInsert: { type: t.type, name: t.name, slug: slugify(t.name) }, $set: { parent: parent?._id || null } },
      { upsert: true },
    );
  }
  return Tag.countDocuments();
}

/** Test/demo için geçerli kontrol haneli VKN üretir. */
function makeVkn(seed) {
  const base = String(seed).padStart(9, '0').slice(-9).split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    const tmp = (base[i] + (9 - i)) % 10;
    let v = (tmp * 2 ** (9 - i)) % 9;
    if (tmp !== 0 && v === 0) v = 9;
    sum += v;
  }
  return base.join('') + ((10 - (sum % 10)) % 10);
}

async function seedDemo(tp) {
  const tag = async (type, name) => (await Tag.findOne({ type, slug: slugify(name) }))._id;
  const demos = [
    {
      name: 'Vizyon Görüntü Teknolojileri', stage: 'first_customer', employeeRange: '6-20',
      sectors: [['sector', 'Üretim / Endüstri']], technologies: [['technology', 'Görüntü İşleme']],
      description: 'Endüstriyel kalite kontrol için derin öğrenme tabanlı hata tespit modelleri geliştiriyoruz.',
      offers: [{ tag: ['competence', 'Görüntü İşleme Çözümleri'], collaborationType: 'subcontracting', description: 'Endüstriyel kalite kontrol için hata tespiti modelleri' }],
      needs: [{ tag: ['competence', 'Saha Testi'], collaborationType: 'joint_rnd', urgency: 'this_quarter', description: 'Üretim hattında saha testi yapabileceğimiz ortak' },
        { tag: ['competence', 'PCB Tasarım ve Üretim'], collaborationType: 'subcontracting', urgency: 'this_month', description: 'Kamera modülü için kart tasarımı' }],
    },
    {
      name: 'Anadolu Elektronik Sistemleri', stage: 'growth', employeeRange: '21-50',
      sectors: [['sector', 'Savunma'], ['sector', 'Üretim / Endüstri']], technologies: [['technology', 'Gömülü Sistem']],
      description: 'Gömülü sistem, elektronik kart tasarımı ve üretimi; savunma ve endüstri için saha testleri.',
      offers: [{ tag: ['competence', 'PCB Tasarım ve Üretim'], collaborationType: 'subcontracting', description: 'Elektronik kart tasarımı ve küçük seri üretim' },
        { tag: ['competence', 'Saha Testi'], collaborationType: 'joint_rnd', description: 'Endüstriyel sahada test altyapısı' }],
      needs: [{ tag: ['competence', 'Yapay Zekâ Modeli Geliştirme'], collaborationType: 'project_subcontractor', urgency: 'this_quarter', description: 'TÜBİTAK 1501 projemiz için görüntü işleme ortağı' }],
    },
    {
      name: 'Kurumsal AR-GE Merkezi', stage: 'mature', employeeRange: '50+',
      sectors: [['sector', 'Otomotiv']], technologies: [['technology', 'Veri Analitiği']],
      description: 'Otomotiv yan sanayi AR-GE merkezi. Açık inovasyon ve startup POC çalışmaları yürütüyoruz.',
      offers: [{ tag: ['competence', 'Pilot Müşteri'], collaborationType: 'joint_product', description: 'Startuplar için pilot saha ve POC imkânı' }],
      needs: [{ tag: ['competence', 'Görüntü İşleme Çözümleri'], collaborationType: 'subcontracting', urgency: 'general', description: 'Montaj hattında görsel kalite kontrol' }],
    },
  ];
  let i = 1;
  for (const d of demos) {
    const toTags = (list) => Promise.all(list.map(([t, n]) => tag(t, n)));
    // eslint-disable-next-line no-await-in-loop
    const doc = {
      ...d,
      taxNumber: makeVkn(900000000 + i),
      technopark: tp._id,
      city: tp.city,
      // eslint-disable-next-line no-await-in-loop
      sectors: await toTags(d.sectors),
      // eslint-disable-next-line no-await-in-loop
      technologies: await toTags(d.technologies),
      // eslint-disable-next-line no-await-in-loop
      offers: await Promise.all(d.offers.map(async (o) => ({ ...o, tag: await tag(...o.tag) }))),
      // eslint-disable-next-line no-await-in-loop
      needs: await Promise.all(d.needs.map(async (o) => ({ ...o, tag: await tag(...o.tag) }))),
      verification: { status: 'approved', reviewedAt: new Date() },
      emailDomain: `demo${i}.example.com`,
    };
    // eslint-disable-next-line no-await-in-loop
    const c = await Company.findOneAndUpdate({ taxNumber: doc.taxNumber }, doc, { upsert: true, returnDocument: 'after' });
    const email = `admin@demo${i}.example.com`;
    // eslint-disable-next-line no-await-in-loop
    if (!(await User.exists({ email }))) {
      const u = new User({
        email, fullName: `Demo Yönetici ${i}`, role: ROLES.COMPANY_ADMIN, company: c._id, emailVerified: true,
        consents: { kvkkVersion: KVKK_CONSENT_VERSION, kvkkAcceptedAt: new Date() },
      });
      // eslint-disable-next-line no-await-in-loop
      await u.setPassword('Demo12345!');
      // eslint-disable-next-line no-await-in-loop
      await u.save();
    }
    i += 1;
  }
  await recomputeAllQueues();
  // eslint-disable-next-line no-console
  console.log(`Demo firmalar hazır. Giriş: admin@demo1.example.com / Demo12345! (demo1..demo${demos.length})`);
}

async function main() {
  await connectDb();
  const n = await seedTagCatalog();
  // eslint-disable-next-line no-console
  console.log(`Etiketler: ${n}`);

  const tpName = process.env.SEED_TECHNOPARK_NAME || 'Çankırı Karatekin Üniversitesi Teknokent';
  const tpCity = process.env.SEED_TECHNOPARK_CITY || 'Çankırı';
  const tp = await Technopark.findOneAndUpdate({ name: tpName }, { $setOnInsert: { name: tpName, city: tpCity } }, { upsert: true, returnDocument: 'after' });
  // eslint-disable-next-line no-console
  console.log(`Teknokent: ${tp.name} (${tp._id})`);

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    if (!(await User.exists({ email: email.toLowerCase() }))) {
      const u = new User({
        email, fullName: 'Platform Yöneticisi', role: ROLES.SUPER_ADMIN, emailVerified: true,
        consents: { kvkkVersion: KVKK_CONSENT_VERSION, kvkkAcceptedAt: new Date() },
      });
      await u.setPassword(password);
      await u.save();
      // eslint-disable-next-line no-console
      console.log(`Super admin oluşturuldu: ${email}`);
    }
  } else {
    // eslint-disable-next-line no-console
    console.log('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD verilmediği için super admin oluşturulmadı.');
  }

  if (process.argv.includes('--demo')) await seedDemo(tp);
  await disconnectDb();
}

if (require.main === module) {
  main().catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    await disconnectDb();
    process.exit(1);
  });
}

module.exports = { seedTagCatalog, makeVkn };

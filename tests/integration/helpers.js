const mongoose = require('mongoose');
const request = require('supertest');
const { createApp } = require('../../src/app');
const { sent } = require('../../src/services/mail');
const { seedTagCatalog, makeVkn } = require('../../scripts/seed');
const { Technopark, User, Tag } = require('../../src/models');
const { ROLES } = require('../../src/constants');
const { slugify } = require('../../src/utils/slug');

let mem = null;

async function startDb() {
  let uri = process.env.TEST_MONGODB_URI;
  if (uri) {
    uri = `${uri.replace(/\/$/, '')}/teknomatch_test_${process.pid}_${Date.now()}`;
  } else {
    // eslint-disable-next-line global-require
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mem = await MongoMemoryServer.create();
    uri = mem.getUri();
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
}

async function stopDb() {
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mem) await mem.stop();
}

const app = createApp();
const api = () => request(app);

/** Son gönderilen e-postadaki token'ı döndürür. */
function lastToken(to) {
  const mail = [...sent].reverse().find((m) => m.to === to);
  return mail?.text.match(/token=([a-f0-9]+)/)?.[1];
}

let vknSeq = 100000000;
const nextVkn = () => makeVkn(vknSeq++);

const tagId = async (type, name) => String((await Tag.findOne({ type, slug: slugify(name) }))._id);

async function bootstrap() {
  await seedTagCatalog();
  const tp = await Technopark.create({ name: 'Test Teknokent', city: 'Çankırı' });
  const tp2 = await Technopark.create({ name: 'Diğer Teknokent', city: 'İzmir' });
  const tpAdmin = new User({
    email: 'yonetim@teknokent.edu.tr', fullName: 'TK Yönetici', role: ROLES.TECHNOPARK_ADMIN, technopark: tp._id, emailVerified: true,
  });
  await tpAdmin.setPassword('Yonetim123!');
  await tpAdmin.save();
  const login = await api().post('/api/v1/auth/login').send({ email: tpAdmin.email, password: 'Yonetim123!' });
  return { tp, tp2, tpAdminToken: login.body.token };
}

/** Kayıt + e-posta doğrulama + giriş + teknokent onayı. */
async function registerCompany({ email, name, technoparkId, tpAdminToken, approve = true }) {
  const reg = await api().post('/api/v1/auth/register').send({
    email,
    password: 'Sifre12345!',
    fullName: `${name} Yönetici`,
    kvkkConsent: true,
    company: { name, taxNumber: nextVkn(), technoparkId: String(technoparkId) },
  });
  if (reg.status !== 201) throw new Error(`register ${reg.status} ${JSON.stringify(reg.body)}`);
  await api().post('/api/v1/auth/verify-email').send({ token: lastToken(email) }).expect(200);
  const login = await api().post('/api/v1/auth/login').send({ email, password: 'Sifre12345!' }).expect(200);
  if (approve) {
    await api().post(`/api/v1/panel/companies/${reg.body.company.id}/review`)
      .set('Authorization', `Bearer ${tpAdminToken}`).send({ action: 'approve' }).expect(200);
  }
  return { token: login.body.token, companyId: String(reg.body.company.id) };
}

const auth = (t) => ({ Authorization: `Bearer ${t}` });

module.exports = {
  startDb, stopDb, api, lastToken, nextVkn, tagId, bootstrap, registerCompany, auth, sent,
};

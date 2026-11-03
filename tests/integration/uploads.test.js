require('../setupEnv');
const { describe, test, before, after } = require('node:test');
const { expect } = require('expect');
const fs = require('fs');
const {
  startDb, stopDb, api, bootstrap, registerCompany, auth,
} = require('./helpers');

// En küçük geçerli PNG (1x1) ve PDF başlığı
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6300010000050001'
  + '0d0a2db40000000049454e44ae426082', 'hex');
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

let ctx;
let A;
let B;
let P; // onaysız firma

before(async () => {
  await startDb();
  ctx = await bootstrap();
  A = await registerCompany({ email: 'ceo@yukleme.com.tr', name: 'Yükleme', technoparkId: ctx.tp._id, tpAdminToken: ctx.tpAdminToken });
  B = await registerCompany({ email: 'ceo@izleyici.com.tr', name: 'İzleyici', technoparkId: ctx.tp._id, tpAdminToken: ctx.tpAdminToken });
  P = await registerCompany({ email: 'ceo@onaysiz.com.tr', name: 'Onaysız', technoparkId: ctx.tp._id, tpAdminToken: ctx.tpAdminToken, approve: false });
}, { timeout: 60000 });

after(async () => {
  await stopDb();
  fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
});

describe('logo yükleme', () => {
  let logoUrl;

  test('PNG logo yüklenir ve herkese açık servis edilir', async () => {
    const r = await api().post('/api/v1/companies/me/logo').set(auth(A.token)).attach('file', PNG, 'logo.png').expect(201);
    logoUrl = r.body.logoUrl;
    expect(logoUrl).toMatch(/^\/files\/logos\/[a-z0-9-]+\.png$/);
    const img = await api().get(logoUrl).expect(200);
    expect(img.headers['content-type']).toBe('image/png');
    expect(Buffer.compare(img.body, PNG)).toBe(0);
    const me = await api().get('/api/v1/companies/me').set(auth(A.token)).expect(200);
    expect(me.body.company.logoUrl).toBe(logoUrl);
  });

  test('uzantısı/MIME türü ne olursa olsun içerik doğrulanır: SVG ve sahte PNG reddedilir', async () => {
    await api().post('/api/v1/companies/me/logo').set(auth(A.token)).attach('file', SVG, { filename: 'x.png', contentType: 'image/png' }).expect(400);
    await api().post('/api/v1/companies/me/logo').set(auth(A.token)).attach('file', PDF, 'x.png').expect(400);
  });

  test('boyut sınırı', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(3 * 1024 * 1024)]);
    await api().post('/api/v1/companies/me/logo').set(auth(A.token)).attach('file', big, 'big.png').expect(413);
  });

  test('dosyasız istek 400', async () => {
    await api().post('/api/v1/companies/me/logo').set(auth(A.token)).expect(400);
  });

  test('yeni logo eskisinin yerini alır, eski dosya silinir; DELETE logoyu kaldırır', async () => {
    const r = await api().post('/api/v1/companies/me/logo').set(auth(A.token)).attach('file', PNG, 'logo2.png').expect(201);
    expect(r.body.logoUrl).not.toBe(logoUrl);
    await new Promise((res) => setTimeout(res, 50));
    await api().get(logoUrl).expect(404);
    await api().delete('/api/v1/companies/me/logo').set(auth(A.token)).expect(200);
    await new Promise((res) => setTimeout(res, 50));
    await api().get(r.body.logoUrl).expect(404);
  });

  test('yol geçişi denemeleri reddedilir', async () => {
    await api().get('/files/logos/..%2f..%2fpackage.json').expect(404);
  });
});

describe('belge dosyası yükleme', () => {
  let certId;

  before(async () => {
    const r = await api().put('/api/v1/companies/me/certificates').set(auth(A.token)).send({
      certificates: [{ type: 'iso_27001', title: 'ISO 27001', validUntil: '2028-01-01' }],
    }).expect(200);
    certId = r.body.company.certificates[0].id;
  });

  test('PDF yüklenir; onaylı firma indirebilir, onaysız firma indiremez', async () => {
    const up = await api().post(`/api/v1/companies/me/certificates/${certId}/document`).set(auth(A.token))
      .attach('file', PDF, 'ISO 27001 sertifikası.pdf').expect(201);
    expect(up.body.document.contentType).toBe('application/pdf');

    const detail = await api().get(`/api/v1/companies/${A.companyId}`).set(auth(B.token)).expect(200);
    expect(detail.body.company.certificates[0].document.name).toBe('ISO 27001 sertifikası.pdf');

    const dl = await api().get(`/api/v1/companies/${A.companyId}/certificates/${certId}/document`).set(auth(B.token)).expect(200);
    expect(dl.headers['content-type']).toBe('application/pdf');
    expect(dl.headers['content-disposition']).toMatch(/filename\*=UTF-8''ISO%2027001/);

    await api().get(`/api/v1/companies/${A.companyId}/certificates/${certId}/document`).set(auth(P.token)).expect(403);
    await api().get(`/api/v1/companies/${A.companyId}/certificates/${certId}/document`).expect(401);
  });

  test('belgeler güncellenirken id verilirse yüklü dosya korunur, verilmezse silinir', async () => {
    const keep = await api().put('/api/v1/companies/me/certificates').set(auth(A.token)).send({
      certificates: [{ id: certId, type: 'iso_27001', title: 'ISO 27001 (yenilendi)' }, { type: 'iso_9001', title: 'ISO 9001' }],
    }).expect(200);
    const kept = keep.body.company.certificates.find((c) => c.id === certId);
    expect(kept.title).toBe('ISO 27001 (yenilendi)');
    expect(kept.document).not.toBeNull();

    await api().put('/api/v1/companies/me/certificates').set(auth(A.token)).send({ certificates: [] }).expect(200);
    await api().get(`/api/v1/companies/${A.companyId}/certificates/${certId}/document`).set(auth(B.token)).expect(404);
  });

  test('bilinmeyen belge 404', async () => {
    await api().post('/api/v1/companies/me/certificates/000000000000000000000000/document').set(auth(A.token))
      .attach('file', PDF, 'a.pdf').expect(404);
  });
});

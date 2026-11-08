const express = require('express');
const multer = require('multer');
const config = require('../config');
const storage = require('../services/storage');
const { Company, User, Tag, Match, Swipe, CandidateQueue } = require('../models');
const {
  ROLES, EMPLOYEE_RANGES, STAGES, COLLABORATION_TYPES, URGENCY, NEED_VISIBILITY, REGION_PREFERENCES,
  CERTIFICATE_TYPES,
} = require('../constants');
const { validate, objectId, idParams, z } = require('../middleware/validate');
const {
  authenticate, requireCompany, requireCompanyAdmin, requireApprovedCompany,
} = require('../middleware/auth');
const { onProfileChanged, DISCOVERABLE } = require('../services/queue');
const { refreshEmbeddings } = require('../services/embedding');
const { cardView, detailView, offerView, needView, CARD_POPULATE } = require('../services/cards');
const { issueToken } = require('../services/tokens');
const { sendMail, templates } = require('../services/mail');
const { badRequest, notFound, conflict, forbidden } = require('../utils/errors');
const logger = require('../utils/logger');
const { daysAgo } = require('../utils/dates');

const router = express.Router();
router.use(authenticate, requireCompany);

const ownView = (c) => ({
  ...detailView(c, { matched: true }),
  taxNumber: c.taxNumber,
  verificationStatus: c.verification?.status,
  verificationNote: c.verification?.note,
  underReview: c.underReview,
  preferences: c.preferences,
  references: c.references,
  needs: (c.needs || []).map((n) => ({ ...needView(n), visibility: n.visibility })),
  offers: (c.offers || []).map(offerView),
  blockedCompanies: c.blockedCompanies,
  completion: c.completion(),
  profileUpdatedAt: c.profileUpdatedAt,
});

async function loadOwn(id) {
  return Company.findById(id).populate([...CARD_POPULATE, { path: 'preferences.blockedSectors', select: 'name type' }]);
}

/** Profil değişikliği sonrası: tazelik zamanı, embedding ve aday kuyruğu (arka planda). */
async function afterProfileChange(company) {
  company.profileUpdatedAt = new Date();
  await company.save();
  const id = company._id;
  setImmediate(async () => {
    try {
      await refreshEmbeddings(id);
      await onProfileChanged(id);
    } catch (err) {
      logger.error('Kuyruk yeniden hesaplanamadı:', err.message);
    }
  });
}

async function assertTags(ids, types) {
  const unique = [...new Set(ids.map(String))];
  if (!unique.length) return;
  const n = await Tag.countDocuments({ _id: { $in: unique }, ...(types ? { type: { $in: types } } : {}) });
  if (n !== unique.length) throw badRequest('Geçersiz etiket.');
}

// ---------- Kendi profilim ----------

router.get('/me', async (req, res) => {
  res.json({ company: ownView(await loadOwn(req.company._id)) });
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  logoUrl: z.string().trim().url().max(500).or(z.literal('')).optional(),
  website: z.string().trim().url().max(300).or(z.literal('')).optional(),
  foundedYear: z.number().int().min(1900).max(2100).optional(),
  employeeRange: z.enum(EMPLOYEE_RANGES).optional(),
  stage: z.enum(STAGES).optional(),
  city: z.string().trim().max(80).optional(),
  branches: z.array(z.object({ technopark: objectId.optional(), city: z.string().trim().max(80) })).max(10).optional(),
  sectors: z.array(objectId).max(10).optional(),
  technologies: z.array(objectId).max(15).optional(),
  description: z.string().trim().max(3000).optional(),
  preferences: z.object({
    region: z.enum(REGION_PREFERENCES).optional(),
    requiredCertificates: z.array(z.enum(CERTIFICATE_TYPES)).max(CERTIFICATE_TYPES.length).optional(),
    blockedSectors: z.array(objectId).max(20).optional(),
  }).optional(),
});

router.patch('/me', requireCompanyAdmin, validate({ body: profileSchema }), async (req, res) => {
  const b = req.valid.body;
  if (b.sectors) await assertTags(b.sectors, ['sector']);
  if (b.technologies) await assertTags(b.technologies, ['technology']);
  if (b.preferences?.blockedSectors) await assertTags(b.preferences.blockedSectors, ['sector']);
  const { preferences, ...rest } = b;
  Object.assign(req.company, rest);
  if (preferences) {
    for (const [k, v] of Object.entries(preferences)) req.company.preferences[k] = v;
  }
  await afterProfileChange(req.company);
  res.json({ company: ownView(await loadOwn(req.company._id)) });
});

const offerSchema = z.object({
  tag: objectId,
  collaborationType: z.enum(COLLABORATION_TYPES),
  description: z.string().trim().max(500).default(''),
});

const needSchema = z.object({
  tag: objectId,
  collaborationType: z.enum(COLLABORATION_TYPES),
  description: z.string().trim().max(500).default(''),
  urgency: z.enum(URGENCY).default('general'),
  budgetRange: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
    currency: z.string().length(3).default('TRY'),
  }).optional(),
  visibility: z.enum(NEED_VISIBILITY).default('public'),
  expiresAt: z.coerce.date().nullable().optional(),
});

/** "Sunuyorum" beyanı — en fazla 5 madde, tamamı değiştirilir. */
router.put('/me/offers', requireCompanyAdmin, validate({
  body: z.object({ offers: z.array(offerSchema).max(5, 'En fazla 5 "sunuyorum" maddesi eklenebilir.') }),
}), async (req, res) => {
  await assertTags(req.valid.body.offers.map((o) => o.tag));
  req.company.offers = req.valid.body.offers;
  await afterProfileChange(req.company);
  res.json({ company: ownView(await loadOwn(req.company._id)) });
});

/** "Arıyorum" beyanı — en fazla 5 madde, tamamı değiştirilir. */
router.put('/me/needs', requireCompanyAdmin, validate({
  body: z.object({ needs: z.array(needSchema).max(5, 'En fazla 5 "arıyorum" maddesi eklenebilir.') }),
}), async (req, res) => {
  await assertTags(req.valid.body.needs.map((n) => n.tag));
  req.company.needs = req.valid.body.needs;
  await afterProfileChange(req.company);
  res.json({ company: ownView(await loadOwn(req.company._id)) });
});

router.put('/me/certificates', requireCompanyAdmin, validate({
  body: z.object({
    certificates: z.array(z.object({
      id: objectId.optional(), // mevcut belgeyi (ve yüklü dosyasını) korumak için
      type: z.enum(CERTIFICATE_TYPES),
      title: z.string().trim().max(200).default(''),
      validUntil: z.coerce.date().nullable().optional(),
    })).max(30),
  }),
}), async (req, res) => {
  const existing = new Map(req.company.certificates.map((c) => [String(c._id), c]));
  const keep = new Set();
  req.company.certificates = req.valid.body.certificates.map(({ id, ...c }) => {
    const prev = id && existing.get(id);
    if (!prev) return c;
    keep.add(id);
    return { ...c, _id: prev._id, document: prev.document };
  });
  // Silinen belgelerin dosyalarını temizle
  for (const [id, c] of existing) {
    if (!keep.has(id) && c.document?.key) storage.remove(c.document.key).catch(() => {});
  }
  await afterProfileChange(req.company);
  res.json({ company: ownView(await loadOwn(req.company._id)) });
});

router.put('/me/references', requireCompanyAdmin, validate({
  body: z.object({
    references: z.array(z.object({
      title: z.string().trim().min(1).max(200),
      client: z.string().trim().max(200).optional(),
      description: z.string().trim().max(1000).optional(),
      hidden: z.boolean().default(false),
    })).max(20),
  }),
}), async (req, res) => {
  req.company.references = req.valid.body.references;
  await afterProfileChange(req.company);
  res.json({ company: ownView(await loadOwn(req.company._id)) });
});

// ---------- Dosya yükleme ----------

// defParamCharset: Türkçe dosya adlarının (ı, ş, ğ...) latin1 olarak bozulmasını önler
const upload = (maxBytes) => multer({
  storage: multer.memoryStorage(), limits: { fileSize: maxBytes, files: 1 }, defParamCharset: 'utf8',
}).single('file');

/** multer hatalarını anlaşılır 400/413 yanıtlarına çevirir. */
const handleUpload = (maxBytes) => (req, res, next) => upload(maxBytes)(req, res, (err) => {
  if (!err) {
    if (!req.file) return next(badRequest('"file" alanında bir dosya gönderin.'));
    return next();
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `Dosya en fazla ${Math.round(maxBytes / 1024 / 1024)} MB olabilir.` });
  }
  return next(badRequest(`Dosya yüklenemedi: ${err.message}`));
});

const LOGO_TYPES = ['png', 'jpg', 'webp'];
const DOC_TYPES = ['pdf', 'png', 'jpg'];

/** Logo yükleme (PNG/JPEG/WEBP, en fazla 2 MB). SVG kabul edilmez (betik içerebilir). */
router.post('/me/logo', requireCompanyAdmin, handleUpload(config.storage.maxLogoBytes), async (req, res) => {
  const kind = storage.sniff(req.file.buffer);
  if (!kind || !LOGO_TYPES.includes(kind.ext)) throw badRequest('Logo PNG, JPEG veya WEBP olmalı.');
  const key = storage.newKey('logos', kind.ext);
  await storage.put(key, req.file.buffer, kind.mime);
  const old = req.company.logoKey;
  req.company.logoKey = key;
  req.company.logoUrl = `/files/${key}`;
  await afterProfileChange(req.company);
  if (old) storage.remove(old).catch(() => {});
  res.status(201).json({ logoUrl: req.company.logoUrl });
});

router.delete('/me/logo', requireCompanyAdmin, async (req, res) => {
  const old = req.company.logoKey;
  req.company.logoKey = '';
  req.company.logoUrl = '';
  await afterProfileChange(req.company);
  if (old) storage.remove(old).catch(() => {});
  res.json({ ok: true });
});

const certParams = z.object({ certId: objectId });

/** Belge dosyası yükleme (PDF/PNG/JPEG, en fazla 10 MB). */
router.post('/me/certificates/:certId/document', requireCompanyAdmin, validate({ params: certParams }),
  handleUpload(config.storage.maxDocumentBytes), async (req, res) => {
    const cert = req.company.certificates.id(req.valid.params.certId);
    if (!cert) throw notFound('Belge bulunamadı.');
    const kind = storage.sniff(req.file.buffer);
    if (!kind || !DOC_TYPES.includes(kind.ext)) throw badRequest('Belge PDF, PNG veya JPEG olmalı.');
    const key = storage.newKey(`documents/${req.company._id}`, kind.ext);
    await storage.put(key, req.file.buffer, kind.mime);
    const old = cert.document?.key;
    cert.document = {
      key,
      name: (req.file.originalname || `belge.${kind.ext}`).slice(0, 200),
      size: req.file.size,
      contentType: kind.mime,
      uploadedAt: new Date(),
    };
    await req.company.save();
    if (old) storage.remove(old).catch(() => {});
    res.status(201).json({ document: { name: cert.document.name, size: cert.document.size, contentType: kind.mime } });
  });

router.delete('/me/certificates/:certId/document', requireCompanyAdmin, validate({ params: certParams }), async (req, res) => {
  const cert = req.company.certificates.id(req.valid.params.certId);
  if (!cert) throw notFound('Belge bulunamadı.');
  const old = cert.document?.key;
  cert.document = undefined;
  await req.company.save();
  if (old) storage.remove(old).catch(() => {});
  res.json({ ok: true });
});

/** Belge dosyasını indirme: kendi firması veya onaylı (ve engellenmemiş) diğer firmalar. */
router.get('/:id/certificates/:certId/document', validate({ params: z.object({ id: objectId, certId: objectId }) }), async (req, res) => {
  const { id, certId } = req.valid.params;
  const own = id === String(req.company._id);
  if (!own && (req.company.verification?.status !== 'approved' || req.company.underReview)) {
    throw forbidden('Firmanız henüz teknokent yönetimi tarafından onaylanmadı.');
  }
  const c = await Company.findOne({ _id: id, active: true, ...(own ? {} : { 'verification.status': 'approved', prefilled: false }) });
  if (!c) throw notFound('Firma bulunamadı.');
  if (!own && ((c.blockedCompanies || []).some((x) => String(x) === String(req.company._id))
    || (req.company.blockedCompanies || []).some((x) => String(x) === id))) throw notFound('Firma bulunamadı.');
  const cert = c.certificates.id(certId);
  if (!cert?.document?.key) throw notFound('Belge dosyası bulunamadı.');
  const file = await storage.get(cert.document.key);
  if (!file) throw notFound('Belge dosyası bulunamadı.');
  res.setHeader('Content-Type', cert.document.contentType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(cert.document.name || 'belge')}`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, max-age=300');
  if (file.size) res.setHeader('Content-Length', file.size);
  file.stream.pipe(res);
});

// ---------- Ekip ----------

router.get('/me/members', async (req, res) => {
  const members = await User.find({ company: req.company._id }, { fullName: 1, email: 1, role: 1, title: 1, lastLoginAt: 1 }).lean();
  res.json({ members });
});

router.post('/me/invitations', requireCompanyAdmin, validate({
  body: z.object({
    email: z.string().trim().toLowerCase().email(),
    role: z.enum([ROLES.COMPANY_ADMIN, ROLES.COMPANY_MEMBER]).default(ROLES.COMPANY_MEMBER),
  }),
}), async (req, res) => {
  const { email, role } = req.valid.body;
  // Davetliler de firmanın kurumsal alan adını kullanmalı
  if (req.company.emailDomain && email.split('@')[1] !== req.company.emailDomain) {
    throw badRequest(`Davet yalnızca @${req.company.emailDomain} adreslerine gönderilebilir.`);
  }
  if (await User.exists({ email })) throw conflict('Bu e-posta ile kayıtlı bir hesap var.');
  const token = await issueToken({ type: 'invitation', email, company: req.company._id, role, ttlHours: 7 * 24 });
  await sendMail({ to: email, ...templates.invitation(req.company.name, token) });
  res.status(201).json({ ok: true });
});

router.patch('/me/members/:id', requireCompanyAdmin, validate({
  params: idParams,
  body: z.object({ role: z.enum([ROLES.COMPANY_ADMIN, ROLES.COMPANY_MEMBER]) }),
}), async (req, res) => {
  const member = await User.findOne({ _id: req.valid.params.id, company: req.company._id });
  if (!member) throw notFound('Üye bulunamadı.');
  if (String(member._id) === String(req.user._id)) throw badRequest('Kendi rolünüzü değiştiremezsiniz.');
  member.role = req.valid.body.role;
  await member.save();
  res.json({ member });
});

router.delete('/me/members/:id', requireCompanyAdmin, validate({ params: idParams }), async (req, res) => {
  if (req.valid.params.id === String(req.user._id)) throw badRequest('Kendinizi çıkaramazsınız; hesap silme akışını kullanın.');
  const r = await User.deleteOne({ _id: req.valid.params.id, company: req.company._id });
  if (!r.deletedCount) throw notFound('Üye bulunamadı.');
  res.json({ ok: true });
});

// ---------- Engelleme ----------

router.post('/me/blocks/:id', validate({ params: idParams }), async (req, res) => {
  const { id } = req.valid.params;
  if (id === String(req.company._id)) throw badRequest('Kendi firmanızı engelleyemezsiniz.');
  if (!(await Company.exists({ _id: id }))) throw notFound('Firma bulunamadı.');
  await Company.updateOne({ _id: req.company._id }, { $addToSet: { blockedCompanies: id } });
  // Engellenen firmayla açık eşleşme varsa kapat
  const [companyA, companyB] = Match.orderPair(req.company._id, id);
  await Match.updateOne({ companyA, companyB }, { status: 'closed' });
  await Company.updateOne({ _id: id }, { queueStale: true });
  setImmediate(() => onProfileChanged(req.company._id).catch((e) => logger.error(e.message)));
  res.json({ ok: true });
});

router.delete('/me/blocks/:id', validate({ params: idParams }), async (req, res) => {
  await Company.updateOne({ _id: req.company._id }, { $pull: { blockedCompanies: req.valid.params.id } });
  await Company.updateOne({ _id: req.valid.params.id }, { queueStale: true });
  await Company.updateOne({ _id: req.company._id }, { queueStale: true });
  res.json({ ok: true });
});

// ---------- Firma dizini (liste tabanlı keşif) ----------

/**
 * Onaylı ve yayında olan firmaların listesi: uyum skoru (aday kuyruğundan), "neden bu firma" gerekçeleri ve
 * bu firmanın ilgi/eşleşme durumu ile. İki yönlü engellenenler ve son LEFT_SWIPE_COOLDOWN_DAYS gün içinde
 * gizlenen (sola kaydırılan) firmalar listelenmez. Filtreleme ve sıralama istemcide yapılır (teknokent ölçeği).
 */
router.get('/', requireApprovedCompany, validate({
  query: z.object({ limit: z.coerce.number().int().min(1).max(500).default(300) }),
}), async (req, res) => {
  const me = req.company;
  const cooldownStart = daysAgo(config.matching.leftSwipeCooldownDays);
  const [blockedMe, swipes, matches, queue] = await Promise.all([
    Company.find({ blockedCompanies: me._id }, { _id: 1 }).lean(),
    Swipe.find({ swiperCompany: me._id }, { targetCompany: 1, direction: 1, createdAt: 1 }).sort({ createdAt: 1 }).lean(),
    Match.find({ $or: [{ companyA: me._id }, { companyB: me._id }] }, { companyA: 1, companyB: 1, status: 1 }).lean(),
    CandidateQueue.findOne({ company: me._id }, { candidates: 1 }).lean(),
  ]);

  const hidden = new Set([...(me.blockedCompanies || []), ...blockedMe.map((c) => c._id)].map(String));
  const interest = new Map();
  for (const s of swipes) interest.set(String(s.targetCompany), s); // en son kaydırma kazanır
  for (const [id, s] of interest) {
    if (s.direction === 'left' && s.createdAt >= cooldownStart) hidden.add(id);
  }
  const matchBy = new Map(matches.map((m) => [String(String(m.companyA) === String(me._id) ? m.companyB : m.companyA), m]));
  const scoreBy = new Map((queue?.candidates || []).map((c) => [String(c.company), c]));

  const docs = await Company.find({ ...DISCOVERABLE, _id: { $ne: me._id } })
    .populate(CARD_POPULATE).sort({ name: 1 }).limit(req.valid.query.limit).lean();

  const companies = docs
    .filter((c) => !hidden.has(String(c._id)))
    .map((c) => {
      const id = String(c._id);
      const sc = scoreBy.get(id);
      const m = matchBy.get(id);
      const s = interest.get(id);
      return {
        ...cardView(c, sc ? { score: sc.score, reasons: sc.reasons } : {}),
        description: c.description || '',
        website: c.website || '',
        foundedYear: c.foundedYear,
        technologies: (c.technologies || []).map((t) => ({ id: t._id, name: t.name, type: t.type })),
        status: m && m.status === 'active' ? 'matched' : s && s.direction !== 'left' ? 'interested' : 'none',
        matchId: m && m.status === 'active' ? m._id : null,
      };
    });
  res.json({ companies, total: companies.length });
});

// ---------- Başka firmanın detayı ----------

router.get('/:id', requireApprovedCompany, validate({ params: idParams }), async (req, res) => {
  const { id } = req.valid.params;
  if (id === String(req.company._id)) return res.json({ company: ownView(await loadOwn(id)) });
  const c = await Company.findOne({
    _id: id, active: true, prefilled: false, 'verification.status': 'approved',
  }).populate(CARD_POPULATE).lean();
  if (!c) throw notFound('Firma bulunamadı.');
  const blocked = (c.blockedCompanies || []).some((x) => String(x) === String(req.company._id))
    || (req.company.blockedCompanies || []).some((x) => String(x) === id);
  if (blocked) throw notFound('Firma bulunamadı.');
  if (c.underReview) throw forbidden('Bu profil inceleme altında.');
  const [companyA, companyB] = Match.orderPair(req.company._id, c._id);
  const matched = !!(await Match.exists({ companyA, companyB, status: 'active' }));
  return res.json({ company: detailView(c, { matched }) });
});

module.exports = router;

const express = require('express');
const { Company, User, Tag, Match } = require('../models');
const {
  ROLES, EMPLOYEE_RANGES, STAGES, COLLABORATION_TYPES, URGENCY, NEED_VISIBILITY, REGION_PREFERENCES,
  CERTIFICATE_TYPES,
} = require('../constants');
const { validate, objectId, idParams, z } = require('../middleware/validate');
const {
  authenticate, requireCompany, requireCompanyAdmin, requireApprovedCompany,
} = require('../middleware/auth');
const { onProfileChanged } = require('../services/queue');
const { refreshEmbeddings } = require('../services/embedding');
const { detailView, offerView, needView, CARD_POPULATE } = require('../services/cards');
const { issueToken } = require('../services/tokens');
const { sendMail, templates } = require('../services/mail');
const { badRequest, notFound, conflict, forbidden } = require('../utils/errors');
const logger = require('../utils/logger');

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
      type: z.enum(CERTIFICATE_TYPES),
      title: z.string().trim().max(200).default(''),
      validUntil: z.coerce.date().nullable().optional(),
    })).max(30),
  }),
}), async (req, res) => {
  req.company.certificates = req.valid.body.certificates;
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

const express = require('express');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { User, Company, Technopark, Match } = require('../models');
const { ROLES, FREE_EMAIL_DOMAINS, KVKK_CONSENT_VERSION } = require('../constants');
const { validate, objectId, z } = require('../middleware/validate');
const { authenticate, signToken } = require('../middleware/auth');
const { issueToken, consumeToken } = require('../services/tokens');
const { sendMail, templates } = require('../services/mail');
const { isValidVkn } = require('../utils/taxNumber');
const { badRequest, conflict, unauthorized, forbidden } = require('../utils/errors');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.isTest ? 10000 : 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin.' },
});
router.use(authLimiter);

const password = z.string().min(8, 'Şifre en az 8 karakter olmalı.').max(128);
const email = z.string().trim().toLowerCase().email('Geçersiz e-posta.');
const domainOf = (e) => e.split('@')[1];

function assertCorporateEmail(e) {
  if (FREE_EMAIL_DOMAINS.has(domainOf(e))) {
    throw badRequest('Lütfen kurumsal e-posta adresinizi kullanın (gmail, hotmail vb. kabul edilmez).');
  }
}

const consentFields = (marketing) => ({
  kvkkVersion: KVKK_CONSENT_VERSION,
  kvkkAcceptedAt: new Date(),
  marketing: !!marketing,
});

async function sendVerification(user) {
  const token = await issueToken({ type: 'email_verification', user: user._id, ttlHours: 48 });
  await sendMail({ to: user.email, ...templates.verifyEmail(token) });
}

const registerSchema = z.object({
  email,
  password,
  fullName: z.string().trim().min(2).max(120),
  title: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  kvkkConsent: z.literal(true, { message: 'KVKK aydınlatma metni onaylanmalı.' }),
  marketingConsent: z.boolean().optional(),
  company: z.object({
    name: z.string().trim().min(2).max(200),
    taxNumber: z.string().trim().regex(/^\d{10}$/, 'Vergi numarası 10 haneli olmalı.'),
    technoparkId: objectId,
    city: z.string().trim().max(80).optional(),
  }),
});

/**
 * Kayıt: kurumsal e-posta + vergi numarası. Teknokentin önceden yüklediği firma varsa ve e-posta alan adı
 * eşleşiyorsa kullanıcı o profili sahiplenir; yoksa yeni firma "onay bekliyor" durumunda açılır.
 */
router.post('/register', validate({ body: registerSchema }), async (req, res) => {
  const b = req.valid.body;
  assertCorporateEmail(b.email);
  if (!isValidVkn(b.company.taxNumber)) throw badRequest('Vergi numarası geçersiz.');
  if (await User.exists({ email: b.email })) throw conflict('Bu e-posta ile kayıtlı bir hesap var.');

  const technopark = await Technopark.findOne({ _id: b.company.technoparkId, active: true });
  if (!technopark) throw badRequest('Teknokent bulunamadı.');

  const domain = domainOf(b.email);
  let company = await Company.findOne({ taxNumber: b.company.taxNumber });
  let claimed = false;
  if (company) {
    if (!company.prefilled || (await User.exists({ company: company._id }))) {
      throw conflict('Firmanız zaten kayıtlı. Hesap için firma yöneticinizden davet isteyin.');
    }
    // Önceden doldurulmuş profili sahiplen
    const domainMatches = company.emailDomain && company.emailDomain === domain;
    company.prefilled = false;
    company.emailDomain = company.emailDomain || domain;
    if (!domainMatches) company.verification = { status: 'pending' };
    company.queueStale = true;
    await company.save();
    claimed = true;
  } else {
    company = await Company.create({
      name: b.company.name,
      taxNumber: b.company.taxNumber,
      technopark: technopark._id,
      city: b.company.city || technopark.city,
      emailDomain: domain,
    });
  }

  const user = new User({
    email: b.email,
    fullName: b.fullName,
    title: b.title,
    phone: b.phone,
    role: ROLES.COMPANY_ADMIN,
    company: company._id,
    consents: consentFields(b.marketingConsent),
    emailVerified: !config.requireEmailVerification,
  });
  await user.setPassword(b.password);
  try {
    await user.save();
  } catch (err) {
    if (!claimed) await Company.deleteOne({ _id: company._id });
    throw err;
  }
  if (config.requireEmailVerification) await sendVerification(user);

  res.status(201).json({
    user,
    company: { id: company._id, name: company.name, verificationStatus: company.verification.status, claimed },
    message: config.requireEmailVerification ? 'Doğrulama bağlantısı e-posta adresinize gönderildi.' : undefined,
  });
});

router.post('/verify-email', validate({ body: z.object({ token: z.string().min(10) }) }), async (req, res) => {
  const t = await consumeToken('email_verification', req.valid.body.token);
  await User.updateOne({ _id: t.user }, { emailVerified: true });
  res.json({ ok: true });
});

router.post('/resend-verification', validate({ body: z.object({ email }) }), async (req, res) => {
  const user = await User.findOne({ email: req.valid.body.email, emailVerified: false, active: true });
  if (user) await sendVerification(user);
  res.json({ ok: true }); // hesap varlığını sızdırmamak için her zaman 200
});

router.post('/login', validate({ body: z.object({ email, password: z.string().min(1) }) }), async (req, res) => {
  const { email: e, password: pw } = req.valid.body;
  const user = await User.findOne({ email: e }).select('+passwordHash');
  if (!user || !user.active || !(await user.checkPassword(pw))) throw unauthorized('E-posta veya şifre hatalı.');
  if (config.requireEmailVerification && !user.emailVerified) throw forbidden('Lütfen önce e-posta adresinizi doğrulayın.');
  user.lastLoginAt = new Date();
  await user.save();
  const company = user.company ? await Company.findById(user.company, { name: 1, verification: 1, logoUrl: 1 }).lean() : null;
  res.json({ token: signToken(user), user, company });
});

router.post('/forgot-password', validate({ body: z.object({ email }) }), async (req, res) => {
  const user = await User.findOne({ email: req.valid.body.email, active: true });
  if (user) {
    const token = await issueToken({ type: 'password_reset', user: user._id, ttlHours: 2 });
    await sendMail({ to: user.email, ...templates.resetPassword(token) });
  }
  res.json({ ok: true });
});

router.post('/reset-password', validate({ body: z.object({ token: z.string().min(10), password }) }), async (req, res) => {
  const t = await consumeToken('password_reset', req.valid.body.token);
  const user = await User.findById(t.user);
  if (!user) throw badRequest('Kullanıcı bulunamadı.');
  await user.setPassword(req.valid.body.password);
  user.emailVerified = true;
  await user.save();
  res.json({ ok: true });
});

/** Firma davetini kabul ederek hesap oluşturma. */
router.post('/accept-invite', validate({
  body: z.object({
    token: z.string().min(10),
    fullName: z.string().trim().min(2).max(120),
    password,
    title: z.string().trim().max(120).optional(),
    kvkkConsent: z.literal(true, { message: 'KVKK aydınlatma metni onaylanmalı.' }),
    marketingConsent: z.boolean().optional(),
  }),
}), async (req, res) => {
  const b = req.valid.body;
  const t = await consumeToken('invitation', b.token);
  if (await User.exists({ email: t.email })) throw conflict('Bu e-posta ile kayıtlı bir hesap var.');
  const user = new User({
    email: t.email,
    fullName: b.fullName,
    title: b.title,
    role: t.role,
    company: t.company,
    emailVerified: true,
    consents: consentFields(b.marketingConsent),
  });
  await user.setPassword(b.password);
  await user.save();
  res.status(201).json({ token: signToken(user), user });
});

router.get('/me', authenticate, async (req, res) => {
  const company = req.user.company
    ? await Company.findById(req.user.company, { name: 1, verification: 1, logoUrl: 1, technopark: 1 }).lean()
    : null;
  res.json({ user: req.user, company });
});

router.patch('/me', authenticate, validate({
  body: z.object({
    fullName: z.string().trim().min(2).max(120).optional(),
    title: z.string().trim().max(120).optional(),
    phone: z.string().trim().max(30).optional(),
    marketingConsent: z.boolean().optional(),
  }),
}), async (req, res) => {
  const { marketingConsent, ...rest } = req.valid.body;
  Object.assign(req.user, rest);
  if (marketingConsent !== undefined) req.user.consents.marketing = marketingConsent;
  await req.user.save();
  res.json({ user: req.user });
});

router.post('/change-password', authenticate, validate({
  body: z.object({ currentPassword: z.string().min(1), newPassword: password }),
}), async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await user.checkPassword(req.valid.body.currentPassword))) throw unauthorized('Mevcut şifre hatalı.');
  await user.setPassword(req.valid.body.newPassword);
  await user.save();
  res.json({ ok: true });
});

/** KVKK: kişisel veri silme. Kullanıcı kaydı tamamen silinir; firmanın son kullanıcısıysa firma pasifleşir. */
router.delete('/me', authenticate, validate({ body: z.object({ password: z.string().min(1) }) }), async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await user.checkPassword(req.valid.body.password))) throw unauthorized('Şifre hatalı.');

  if (user.company) {
    const others = await User.find({ company: user.company, _id: { $ne: user._id }, active: true }).sort({ createdAt: 1 });
    if (!others.length) {
      await Company.updateOne({ _id: user.company }, { active: false });
      await Match.updateMany({ $or: [{ companyA: user.company }, { companyB: user.company }] }, { status: 'closed' });
    } else if (user.role === ROLES.COMPANY_ADMIN && !others.some((o) => o.role === ROLES.COMPANY_ADMIN)) {
      others[0].role = ROLES.COMPANY_ADMIN;
      await others[0].save();
    }
  }
  await User.deleteOne({ _id: user._id });
  res.json({ ok: true });
});

module.exports = router;

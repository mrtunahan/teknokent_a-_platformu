const express = require('express');
const { Technopark, User } = require('../models');
const { ROLES, KVKK_CONSENT_VERSION } = require('../constants');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate, idParams, z } = require('../middleware/validate');
const { notFound, conflict } = require('../utils/errors');
const { issueToken } = require('../services/tokens');
const { sendMail, templates, link: appLink, isMailConfigured } = require('../services/mail');

const router = express.Router();

/** Kayıt formu için herkese açık teknokent listesi. */
router.get('/', async (_req, res) => {
  const technoparks = await Technopark.find({ active: true }, { name: 1, city: 1 }).sort({ name: 1 }).lean();
  res.json({ technoparks: technoparks.map((t) => ({ id: t._id, name: t.name, city: t.city })) });
});

const tpSchema = z.object({
  name: z.string().trim().min(2).max(200),
  city: z.string().trim().min(2).max(80),
  licenseStatus: z.enum(['pilot', 'active', 'expired', 'none']).optional(),
  active: z.boolean().optional(),
});

router.post('/', authenticate, requireRole(ROLES.SUPER_ADMIN), validate({ body: tpSchema }), async (req, res) => {
  res.status(201).json({ technopark: await Technopark.create(req.valid.body) });
});

router.patch('/:id', authenticate, requireRole(ROLES.SUPER_ADMIN), validate({ params: idParams, body: tpSchema.partial() }), async (req, res) => {
  const tp = await Technopark.findByIdAndUpdate(req.valid.params.id, req.valid.body, { returnDocument: 'after', runValidators: true });
  if (!tp) throw notFound('Teknokent bulunamadı.');
  res.json({ technopark: tp });
});

/** Teknokent yöneticisi hesabı oluşturur; kişiye şifre belirleme bağlantısı gönderilir. */
router.post('/:id/admins', authenticate, requireRole(ROLES.SUPER_ADMIN), validate({
  params: idParams,
  body: z.object({ email: z.string().trim().toLowerCase().email(), fullName: z.string().trim().min(2).max(120) }),
}), async (req, res) => {
  const tp = await Technopark.findById(req.valid.params.id);
  if (!tp) throw notFound('Teknokent bulunamadı.');
  if (await User.exists({ email: req.valid.body.email })) throw conflict('Bu e-posta ile kayıtlı bir hesap var.');
  const user = new User({
    ...req.valid.body,
    role: ROLES.TECHNOPARK_ADMIN,
    technopark: tp._id,
    emailVerified: false,
    consents: { kvkkVersion: KVKK_CONSENT_VERSION, kvkkAcceptedAt: new Date() },
  });
  await user.setPassword(require('crypto').randomBytes(24).toString('hex'));
  await user.save();
  const token = await issueToken({ type: 'password_reset', user: user._id, ttlHours: 72 });
  await sendMail({ to: user.email, ...templates.resetPassword(token) });
  // SMTP yoksa şifre belirleme bağlantısı platform yöneticisine gösterilir (elden iletmek için)
  res.status(201).json({ user, setupLink: isMailConfigured() ? undefined : appLink(`/reset-password?token=${token}`) });
});

module.exports = router;

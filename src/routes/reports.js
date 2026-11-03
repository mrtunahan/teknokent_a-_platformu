const express = require('express');
const config = require('../config');
const { Report, Company } = require('../models');
const { authenticate, requireCompany } = require('../middleware/auth');
const { validate, objectId, z } = require('../middleware/validate');
const { badRequest, notFound, conflict } = require('../utils/errors');

const router = express.Router();
router.use(authenticate, requireCompany);

/** Raporla: farklı firmalardan 3 rapor alan profil incelemeye düşer ve akışlardan çıkar. */
router.post('/', validate({
  body: z.object({
    targetCompanyId: objectId,
    reason: z.enum(['spam', 'fake_profile', 'inappropriate', 'sales_pitch', 'other']),
    details: z.string().trim().max(1000).optional(),
  }),
}), async (req, res) => {
  const { targetCompanyId, reason, details } = req.valid.body;
  if (targetCompanyId === String(req.company._id)) throw badRequest('Kendi firmanızı raporlayamazsınız.');
  if (!(await Company.exists({ _id: targetCompanyId }))) throw notFound('Firma bulunamadı.');
  try {
    await Report.create({
      reporterCompany: req.company._id, reporterUser: req.user._id, targetCompany: targetCompanyId, reason, details,
    });
  } catch (err) {
    if (err.code === 11000) throw conflict('Bu firmayı zaten raporladınız.');
    throw err;
  }
  const open = await Report.countDocuments({ targetCompany: targetCompanyId, status: 'open' });
  if (open >= config.matching.reportThreshold) {
    await Company.updateOne({ _id: targetCompanyId }, { underReview: true });
  }
  res.status(201).json({ ok: true });
});

module.exports = router;

const express = require('express');
const { authenticate, requireCompany, requireApprovedCompany } = require('../middleware/auth');
const { validate, objectId, z } = require('../middleware/validate');
const { getFeed } = require('../services/feed');
const { swipe } = require('../services/matching');
const { SWIPE_DIRECTIONS } = require('../constants');

const router = express.Router();
router.use(authenticate, requireCompany, requireApprovedCompany);

/** Günlük kart akışı (uyum skoruna göre sıralı, %20 keşif). */
router.get('/feed', async (req, res) => {
  res.json(await getFeed(req.company));
});

/** Kaydırma: right = İlgileniyorum, left = Şimdilik değil, super = Süper ilgi (özellik bayrağıyla). */
router.post('/swipes', validate({
  body: z.object({
    targetCompanyId: objectId,
    direction: z.enum(SWIPE_DIRECTIONS),
    note: z.string().trim().max(300).optional(),
  }),
}), async (req, res) => {
  const { targetCompanyId, direction, note } = req.valid.body;
  const result = await swipe({ viewer: req.company, user: req.user, targetId: targetCompanyId, direction, note });
  res.status(201).json(result);
});

module.exports = router;

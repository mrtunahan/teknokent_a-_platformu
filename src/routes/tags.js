const express = require('express');
const { Tag } = require('../models');
const { TAG_TYPES, ROLES } = require('../constants');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate, objectId, z } = require('../middleware/validate');
const { invalidateTagCache } = require('../services/tagCache');
const { slugify } = require('../utils/slug');
const { badRequest } = require('../utils/errors');

const router = express.Router();

router.get('/', validate({ query: z.object({ type: z.enum(TAG_TYPES).optional(), q: z.string().trim().max(60).optional() }) }), async (req, res) => {
  const { type, q } = req.valid.query;
  const filter = { ...(type ? { type } : {}) };
  if (q) filter.slug = { $regex: slugify(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') };
  const tags = await Tag.find(filter).sort({ type: 1, name: 1 }).lean();
  res.json({ tags: tags.map((t) => ({ id: t._id, type: t.type, name: t.name, slug: t.slug, parent: t.parent })) });
});

router.post('/', authenticate, requireRole(ROLES.SUPER_ADMIN), validate({
  body: z.object({ type: z.enum(TAG_TYPES), name: z.string().trim().min(2).max(80), parent: objectId.nullable().optional() }),
}), async (req, res) => {
  const { type, name, parent } = req.valid.body;
  if (parent && !(await Tag.exists({ _id: parent }))) throw badRequest('Üst etiket bulunamadı.');
  const tag = await Tag.create({ type, name, slug: slugify(name), parent: parent || null });
  invalidateTagCache();
  res.status(201).json({ tag });
});

module.exports = router;

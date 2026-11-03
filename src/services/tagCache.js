const Tag = require('../models/Tag');

const TTL_MS = 5 * 60 * 1000;
let cache = null;

/** Etiket adları ve üst etiket haritası (skorlama ve gerekçe metinleri için). */
async function getTagContext() {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  const tags = await Tag.find({}, { name: 1, parent: 1 }).lean();
  cache = {
    at: Date.now(),
    tagNames: new Map(tags.map((t) => [String(t._id), t.name])),
    tagParents: new Map(tags.map((t) => [String(t._id), t.parent ? String(t.parent) : null])),
  };
  return cache;
}

const invalidateTagCache = () => {
  cache = null;
};

module.exports = { getTagContext, invalidateTagCache };

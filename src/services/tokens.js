const crypto = require('crypto');
const { Token } = require('../models');
const { badRequest } = require('../utils/errors');

const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');

async function issueToken({ type, ttlHours, ...fields }) {
  const raw = crypto.randomBytes(32).toString('hex');
  await Token.create({ type, tokenHash: hash(raw), expiresAt: new Date(Date.now() + ttlHours * 3600 * 1000), ...fields });
  return raw;
}

/** Token'ı tek kullanımlık olarak tüketir; geçersizse 400 fırlatır. */
async function consumeToken(type, raw) {
  const doc = await Token.findOneAndUpdate(
    { type, tokenHash: hash(String(raw || '')), usedAt: null, expiresAt: { $gt: new Date() } },
    { usedAt: new Date() },
    { returnDocument: 'after' },
  );
  if (!doc) throw badRequest('Bağlantı geçersiz veya süresi dolmuş.');
  return doc;
}

module.exports = { issueToken, consumeToken };

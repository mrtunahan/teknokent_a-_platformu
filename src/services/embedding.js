/**
 * Opsiyonel embedding servisi istemcisi (belgedeki Python/FastAPI + sentence-transformers servisi).
 * Sözleşme: POST {EMBEDDING_SERVICE_URL}/embed  {texts: string[]}  ->  {embeddings: number[][], model?: string}
 * Servis yapılandırılmamışsa skorlama yerleşik metin benzerliğine düşer.
 */
const config = require('../config');
const logger = require('../utils/logger');
const Company = require('../models/Company');

const joinText = (items) => (items || []).map((x) => x.description || '').join(' ').trim();

async function refreshEmbeddings(companyId) {
  const url = config.matching.embeddingServiceUrl;
  if (!url) return false;
  const c = await Company.findById(companyId).lean();
  if (!c) return false;
  const needsText = joinText(c.needs);
  const offersText = `${joinText(c.offers)} ${c.description || ''}`.trim();
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/embed`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(config.matching.embeddingApiKey ? { 'x-api-key': config.matching.embeddingApiKey } : {}),
      },
      body: JSON.stringify({ texts: [needsText, offersText] }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { embeddings, model } = await res.json();
    await Company.updateOne(
      { _id: companyId },
      { embeddings: { needs: needsText ? embeddings[0] : [], offers: offersText ? embeddings[1] : [], model, updatedAt: new Date() } },
    );
    return true;
  } catch (err) {
    logger.warn(`Embedding üretilemedi (${companyId}): ${err.message}`);
    return false;
  }
}

/**
 * Embedding'i olmayan (veya `all` ise tüm) firmalar için vektörleri üretir.
 * Gece işinde ve `npm run reembed` betiğinde kullanılır.
 */
async function refreshAllEmbeddings({ all = false } = {}) {
  if (!config.matching.embeddingServiceUrl) return 0;
  // Embedding'i hiç olmayan ya da profil son güncellemesinden eski olan firmalar
  const filter = all ? { active: true } : {
    active: true,
    $expr: { $lt: [{ $ifNull: ['$embeddings.updatedAt', new Date(0)] }, '$profileUpdatedAt'] },
  };
  const ids = (await Company.find(filter, { _id: 1 }).lean()).map((c) => c._id);
  let ok = 0;
  for (const id of ids) {
    // eslint-disable-next-line no-await-in-loop
    if (await refreshEmbeddings(id)) ok += 1;
  }
  if (ids.length) logger.info(`Embedding güncellendi: ${ok}/${ids.length} firma`);
  return ok;
}

module.exports = { refreshEmbeddings, refreshAllEmbeddings };

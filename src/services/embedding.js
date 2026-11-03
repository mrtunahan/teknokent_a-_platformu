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
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ texts: [needsText, offersText] }),
      signal: AbortSignal.timeout(10000),
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

module.exports = { refreshEmbeddings };

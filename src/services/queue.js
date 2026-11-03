/**
 * Aday kuyruğu hesaplama. Skorlar her kaydırmada anlık hesaplanmaz: gece toplu iş her firma için en iyi
 * ~200 adayı hesaplayıp `CandidateQueue` koleksiyonuna yazar; profil güncellenince yalnızca o firmanın
 * kuyruğu yeniden hesaplanır.
 */
const config = require('../config');
const logger = require('../utils/logger');
const { Company, CandidateQueue } = require('../models');
const { scorePair, passesHardFilters, toScoringProfile } = require('./scoring');
const { getTagContext } = require('./tagCache');

const DISCOVERABLE = {
  active: true,
  underReview: false,
  prefilled: false,
  'verification.status': 'approved',
};

const loadCompanies = (filter) => Company.find({ ...DISCOVERABLE, ...filter }).select('+embeddings').lean();

function regionFilter(viewer) {
  const region = viewer.preferences?.region || 'turkey';
  const tps = [viewer.technopark, ...(viewer.branches || []).map((b) => b.technopark)].filter(Boolean);
  const cities = [viewer.city, ...(viewer.branches || []).map((b) => b.city)].filter(Boolean);
  if (region === 'same_technopark') return { $or: [{ technopark: { $in: tps } }, { 'branches.technopark': { $in: tps } }] };
  if (region === 'same_city' && cities.length) {
    return { $or: [{ city: { $in: cities } }, { 'branches.city': { $in: cities } }, { technopark: { $in: tps } }] };
  }
  return {};
}

/** Tek bir izleyici firma için skorlanmış aday listesi (filtrelenmiş, sıralı). */
function rankCandidates(viewerDoc, candidateDocs, ctx) {
  const viewer = toScoringProfile(viewerDoc);
  const out = [];
  for (const doc of candidateDocs) {
    const cand = toScoringProfile(doc);
    // Sert filtreler iki yönlü: aday da izleyiciyi engellemiş olabilir
    if (!passesHardFilters(viewer, cand, ctx.now)) continue;
    const r = scorePair(viewer, cand, ctx);
    if (r.score <= 0) continue;
    out.push({ company: doc._id, score: r.score, ab: r.ab, ba: r.ba, reasons: r.reasonsForA });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

async function computeQueueFor(companyId, opts = {}) {
  const viewerDoc = await Company.findById(companyId).select('+embeddings').lean();
  if (!viewerDoc) return null;
  const ctx = { ...(await getTagContext()), now: new Date() };
  const pool = opts.pool || (await loadCompanies({ _id: { $ne: viewerDoc._id }, ...regionFilter(viewerDoc) }));
  const candidates = rankCandidates(viewerDoc, pool, ctx).slice(0, config.matching.candidateQueueSize);
  const queue = await CandidateQueue.findOneAndUpdate(
    { company: companyId },
    { candidates, computedAt: new Date() },
    { upsert: true, returnDocument: 'after' },
  );
  await Company.updateOne({ _id: companyId }, { queueStale: false });
  return queue;
}

/** Gece toplu iş: tüm keşfedilebilir firmaların kuyruklarını yeniden hesaplar. */
async function recomputeAllQueues() {
  const started = Date.now();
  const all = await loadCompanies({});
  for (const c of all) {
    const pool = all.filter((x) => String(x._id) !== String(c._id));
    // eslint-disable-next-line no-await-in-loop
    await computeQueueFor(c._id, { pool });
  }
  logger.info(`Aday kuyrukları yeniden hesaplandı: ${all.length} firma, ${Date.now() - started} ms`);
  return all.length;
}

/**
 * Bir firmanın profili değiştiğinde: kendi kuyruğu hemen, diğer firmalarınki "bayat" işaretlenir
 * (ilk akış isteğinde ya da gece işinde yeniden hesaplanır).
 */
async function onProfileChanged(companyId) {
  await Company.updateMany({ _id: { $ne: companyId } }, { queueStale: true });
  await computeQueueFor(companyId);
}

module.exports = { computeQueueFor, recomputeAllQueues, onProfileChanged, rankCandidates, DISCOVERABLE };

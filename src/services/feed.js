const config = require('../config');
const { Company, CandidateQueue, FeedImpression, Swipe, Match } = require('../models');
const { computeQueueFor, DISCOVERABLE } = require('./queue');
const { selectFeed } = require('./ranking');
const { cardView, CARD_POPULATE } = require('./cards');
const { dayKey, daysAgo } = require('../utils/dates');

/** İzleyicinin akışında artık gösterilmemesi gereken firmalar. */
async function excludedTargets(companyId, now = new Date()) {
  const cooldownStart = daysAgo(config.matching.leftSwipeCooldownDays, now);
  const [swipes, matches] = await Promise.all([
    Swipe.find({
      swiperCompany: companyId,
      $or: [{ direction: { $in: ['right', 'super'] } }, { direction: 'left', createdAt: { $gte: cooldownStart } }],
    }, { targetCompany: 1 }).lean(),
    Match.find({ $or: [{ companyA: companyId }, { companyB: companyId }] }, { companyA: 1, companyB: 1 }).lean(),
  ]);
  const set = new Set(swipes.map((s) => String(s.targetCompany)));
  for (const m of matches) set.add(String(String(m.companyA) === String(companyId) ? m.companyB : m.companyA));
  return set;
}

async function impressionCounts(ids, now = new Date()) {
  if (!ids.length) return new Map();
  const rows = await FeedImpression.aggregate([
    { $match: { targetCompany: { $in: ids }, createdAt: { $gte: daysAgo(7, now) } } },
    { $group: { _id: '$targetCompany', n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
}

/**
 * Günlük kart akışı. Gün içinde gösterilip henüz kaydırılmamış kartlar tekrar döner;
 * yeni kartlar günlük limite kadar eklenir.
 */
async function getFeed(company, { now = new Date(), rng } = {}) {
  const limit = config.matching.dailyCardLimit;
  const day = dayKey(now);

  let queue = await CandidateQueue.findOne({ company: company._id }).lean();
  if (!queue || company.queueStale) queue = (await computeQueueFor(company._id)).toObject();

  const [excluded, todays] = await Promise.all([
    excludedTargets(company._id, now),
    FeedImpression.find({ viewerCompany: company._id, day }).sort({ createdAt: 1 }).lean(),
  ]);
  const shownToday = new Set(todays.map((i) => String(i.targetCompany)));
  const pending = todays.filter((i) => !excluded.has(String(i.targetCompany)));

  const remaining = Math.max(0, limit - todays.length);
  let fresh = [];
  if (remaining > 0) {
    const pool = queue.candidates.filter((c) => !excluded.has(String(c.company)) && !shownToday.has(String(c.company)));
    const impressions = await impressionCounts(pool.map((c) => c.company), now);
    fresh = selectFeed(pool, remaining, { explorationRatio: config.matching.explorationRatio, impressions, rng });
  }

  // Kuyruk hesaplandıktan sonra durumu değişmiş firmaları ele
  const ids = [...pending.map((p) => p.targetCompany), ...fresh.map((f) => f.company)];
  const docs = await Company.find({ _id: { $in: ids }, ...DISCOVERABLE }).populate(CARD_POPULATE).lean();
  const byId = new Map(docs.map((d) => [String(d._id), d]));

  const freshValid = fresh.filter((f) => byId.has(String(f.company)));
  if (freshValid.length) {
    await FeedImpression.bulkWrite(freshValid.map((f) => ({
      updateOne: {
        filter: { viewerCompany: company._id, day, targetCompany: f.company },
        update: { $setOnInsert: { score: f.score, ab: f.ab, ba: f.ba, reasons: f.reasons, exploration: f.exploration } },
        upsert: true,
      },
    })));
  }

  const cards = [
    ...pending.map((p) => ({ doc: byId.get(String(p.targetCompany)), meta: p })),
    ...freshValid.map((f) => ({ doc: byId.get(String(f.company)), meta: f })),
  ]
    .filter((x) => x.doc)
    .map(({ doc, meta }) => cardView(doc, meta));

  return {
    cards,
    dailyLimit: limit,
    shownToday: todays.length + freshValid.length,
    remainingToday: Math.max(0, limit - todays.length - freshValid.length),
  };
}

module.exports = { getFeed, excludedTargets };

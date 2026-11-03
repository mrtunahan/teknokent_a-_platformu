const config = require('../config');
const { Company, Swipe, Match, FeedImpression, CandidateQueue, User } = require('../models');
const { scorePair, toScoringProfile } = require('./scoring');
const { getTagContext } = require('./tagCache');
const { DISCOVERABLE } = require('./queue');
const { emitToCompany } = require('./realtime');
const { sendMail, templates } = require('./mail');
const { badRequest, notFound, conflict, tooMany, forbidden } = require('../utils/errors');
const { dayKey, startOfDay, daysAgo } = require('../utils/dates');

/** Kaydırma anındaki skor: önce bugünkü kart gösterimi, sonra aday kuyruğu, yoksa anlık hesap. */
async function scoreAtTime(viewer, target, now) {
  const imp = await FeedImpression.findOne({ viewerCompany: viewer._id, targetCompany: target._id, day: dayKey(now) }).lean();
  if (imp) return { score: imp.score, ab: imp.ab, ba: imp.ba, reasons: imp.reasons, exploration: imp.exploration };
  const q = await CandidateQueue.findOne({ company: viewer._id }, { candidates: { $elemMatch: { company: target._id } } }).lean();
  const c = q?.candidates?.[0];
  if (c) return { score: c.score, ab: c.ab, ba: c.ba, reasons: c.reasons, exploration: false };
  const ctx = { ...(await getTagContext()), now };
  const [v, t] = await Promise.all([
    Company.findById(viewer._id).select('+embeddings').lean(),
    Company.findById(target._id).select('+embeddings').lean(),
  ]);
  const r = scorePair(toScoringProfile(v), toScoringProfile(t), ctx);
  return { score: r.score, ab: r.ab, ba: r.ba, reasons: r.reasonsForA, exploration: false };
}

async function notifyMatch(match, a, b) {
  for (const [me, other] of [[a, b], [b, a]]) {
    emitToCompany(me._id, 'match:new', { matchId: match._id, company: { id: other._id, name: other.name, logoUrl: other.logoUrl } });
    // eslint-disable-next-line no-await-in-loop
    const users = await User.find({ company: me._id, active: true }, { email: 1 }).lean();
    const tpl = templates.newMatch(other.name);
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(users.map((u) => sendMail({ to: u.email, ...tpl })));
  }
}

/** Karşılıklı ilgi varsa eşleşme oluşturur (idempotent). */
async function createMatchIfMutual(viewer, target, myScore) {
  const reverse = await Swipe.findOne({
    swiperCompany: target._id,
    targetCompany: viewer._id,
    direction: { $in: ['right', 'super'] },
  }).sort({ createdAt: -1 }).lean();
  if (!reverse) return null;

  const [companyA, companyB] = Match.orderPair(viewer._id, target._id);
  const existing = await Match.findOne({ companyA, companyB });
  if (existing) return { match: existing, created: false };

  const reverseImp = await FeedImpression.findOne({ viewerCompany: target._id, targetCompany: viewer._id })
    .sort({ createdAt: -1 }).lean();
  let match;
  try {
    match = await Match.create({
      companyA,
      companyB,
      score: myScore.score ?? reverse.scoreAtTime ?? 0,
      reasons: {
        [String(viewer._id)]: myScore.reasons || [],
        [String(target._id)]: reverseImp?.reasons || [],
      },
    });
  } catch (err) {
    if (err.code === 11000) return { match: await Match.findOne({ companyA, companyB }), created: false };
    throw err;
  }
  await notifyMatch(match, viewer, target);
  return { match, created: true };
}

/**
 * Kaydırma: sağ (ilgileniyorum), sol (şimdilik değil), süper (günde 1, notlu).
 * Normal kaydırmada tek taraflı ilgi karşı tarafa gösterilmez; yalnızca karşılıklı eşleşme açığa çıkar.
 */
async function swipe({ viewer, user, targetId, direction, note, now = new Date() }) {
  if (String(viewer._id) === String(targetId)) throw badRequest('Kendi firmanızı kaydıramazsınız.');
  if (direction === 'super' && !config.features.superLike) throw forbidden('Süper ilgi özelliği henüz etkin değil.');

  const target = await Company.findOne({ _id: targetId, ...DISCOVERABLE });
  if (!target) throw notFound('Firma bulunamadı.');
  if ((viewer.blockedCompanies || []).some((id) => String(id) === String(target._id))
    || (target.blockedCompanies || []).some((id) => String(id) === String(viewer._id))) {
    throw notFound('Firma bulunamadı.');
  }

  const last = await Swipe.findOne({ swiperCompany: viewer._id, targetCompany: target._id }).sort({ createdAt: -1 }).lean();
  if (last && last.direction !== 'left') throw conflict('Bu firmaya zaten ilgi gösterdiniz.');
  if (last && last.direction === 'left' && last.createdAt > daysAgo(config.matching.leftSwipeCooldownDays, now)) {
    if (direction === 'left') throw conflict('Bu firmayı zaten geçtiniz.');
  }

  if (direction !== 'left') {
    const todayStart = startOfDay(now);
    const rights = await Swipe.countDocuments({
      swiperCompany: viewer._id, direction: { $in: ['right', 'super'] }, createdAt: { $gte: todayStart },
    });
    if (rights >= config.matching.dailyRightSwipeLimit) throw tooMany('Günlük ilgi limitine ulaştınız. Yarın tekrar deneyin.');
    if (direction === 'super') {
      const supers = await Swipe.countDocuments({ swiperCompany: viewer._id, direction: 'super', createdAt: { $gte: todayStart } });
      if (supers >= 1) throw tooMany('Süper ilgi günde 1 kez kullanılabilir.');
    }
  }

  const sc = await scoreAtTime(viewer, target, now);
  const swipeDoc = await Swipe.create({
    swiperCompany: viewer._id,
    swiperUser: user._id,
    targetCompany: target._id,
    direction,
    scoreAtTime: sc.score ?? null,
    directional: { ab: sc.ab, ba: sc.ba },
    exploration: !!sc.exploration,
    note: direction === 'super' ? note : undefined,
  });

  let matchResult = null;
  if (direction !== 'left') {
    if (direction === 'super') {
      emitToCompany(target._id, 'interest:super', { company: { id: viewer._id, name: viewer.name }, note });
    }
    matchResult = await createMatchIfMutual(viewer, target, sc);
  }
  return {
    swipe: { id: swipeDoc._id, direction, targetCompany: target._id, scoreAtTime: swipeDoc.scoreAtTime },
    matched: !!matchResult,
    matchId: matchResult?.match?._id || null,
  };
}

module.exports = { swipe, createMatchIfMutual };

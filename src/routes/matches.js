const express = require('express');
const config = require('../config');
const {
  Match, Message, Meeting, Outcome, Company, User,
} = require('../models');
const { authenticate, requireCompany, requireApprovedCompany } = require('../middleware/auth');
const { validate, idParams, objectId, z } = require('../middleware/validate');
const { MEETING_TYPES, OUTCOME_RESULTS } = require('../constants');
const { emitToMatch, emitToCompany } = require('../services/realtime');
const { sendMail, templates } = require('../services/mail');
const {
  notFound, badRequest, forbidden, tooMany,
} = require('../utils/errors');
const { startOfDay, daysAgo } = require('../utils/dates');

const router = express.Router();
router.use(authenticate, requireCompany, requireApprovedCompany);

const URL_RE = /(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|net|org|io|co|tr|info|biz|app|dev|ly)(\/\S*)?\b/i;

async function loadMatch(req) {
  const match = await Match.findById(req.valid.params.id);
  if (!match || !match.involves(req.company._id)) throw notFound('Eşleşme bulunamadı.');
  return match;
}

const otherSummary = (c) => (c ? { id: c._id, name: c.name, logoUrl: c.logoUrl, verified: c.verification?.status === 'approved' } : null);

async function notifyCompanyUsers(companyId, tpl) {
  const users = await User.find({ company: companyId, active: true }, { email: 1 }).lean();
  await Promise.all(users.map((u) => sendMail({ to: u.email, ...tpl })));
}

/** Eşleşme listesi: okunmamış mesaj sayısı ve bekleyen toplantılarla. */
router.get('/', async (req, res) => {
  const me = req.company._id;
  const matches = await Match.find({ $or: [{ companyA: me }, { companyB: me }] }).sort({ lastMessageAt: -1, createdAt: -1 }).lean();
  const otherIds = matches.map((m) => (String(m.companyA) === String(me) ? m.companyB : m.companyA));
  const [others, pendingMeetings, outcomes] = await Promise.all([
    Company.find({ _id: { $in: otherIds } }, { name: 1, logoUrl: 1, verification: 1 }).lean(),
    Meeting.aggregate([
      { $match: { match: { $in: matches.map((m) => m._id) }, status: { $in: ['proposed', 'accepted'] } } },
      { $group: { _id: '$match', n: { $sum: 1 } } },
    ]),
    Outcome.find({ match: { $in: matches.map((m) => m._id) }, company: me }, { match: 1, result: 1 }).lean(),
  ]);
  const byId = new Map(others.map((o) => [String(o._id), o]));
  const meetingsBy = new Map(pendingMeetings.map((x) => [String(x._id), x.n]));
  const outcomeBy = new Map(outcomes.map((o) => [String(o.match), o.result]));

  const unread = await Promise.all(matches.map((m) => {
    const lastRead = m.lastReadAt?.[String(me)] || new Date(0);
    return Message.countDocuments({ match: m._id, senderCompany: { $ne: me }, createdAt: { $gt: lastRead } });
  }));

  res.json({
    matches: matches.map((m, i) => ({
      id: m._id,
      company: otherSummary(byId.get(String(otherIds[i]))),
      score: m.score,
      matchPercent: Math.round((m.score || 0) * 100),
      reasons: m.reasons?.[String(me)] || [],
      status: m.status,
      createdAt: m.createdAt,
      lastMessageAt: m.lastMessageAt,
      unreadCount: unread[i],
      pendingMeetings: meetingsBy.get(String(m._id)) || 0,
      outcome: outcomeBy.get(String(m._id)) || null,
      outcomeDue: !outcomeBy.has(String(m._id)) && m.createdAt <= daysAgo(config.matching.outcomePromptDays),
    })),
  });
});

/** 2 hafta önce oluşmuş ve henüz iş sonucu bildirilmemiş eşleşmeler. */
router.get('/pending-outcomes', async (req, res) => {
  const me = req.company._id;
  const matches = await Match.find({
    $or: [{ companyA: me }, { companyB: me }],
    createdAt: { $lte: daysAgo(config.matching.outcomePromptDays) },
  }).lean();
  const done = new Set((await Outcome.find({ company: me, match: { $in: matches.map((m) => m._id) } }, { match: 1 }).lean())
    .map((o) => String(o.match)));
  const pending = matches.filter((m) => !done.has(String(m._id)));
  const others = await Company.find({ _id: { $in: pending.map((m) => (String(m.companyA) === String(me) ? m.companyB : m.companyA)) } }, { name: 1, logoUrl: 1, verification: 1 }).lean();
  const byId = new Map(others.map((o) => [String(o._id), o]));
  res.json({
    matches: pending.map((m) => ({
      id: m._id,
      createdAt: m.createdAt,
      company: otherSummary(byId.get(String(String(m.companyA) === String(me) ? m.companyB : m.companyA))),
    })),
  });
});

router.get('/:id', validate({ params: idParams }), async (req, res) => {
  const match = await loadMatch(req);
  const other = await Company.findById(match.otherCompany(req.company._id), { name: 1, logoUrl: 1, verification: 1 }).lean();
  const [meetings, outcomes] = await Promise.all([
    Meeting.find({ match: match._id }).sort({ createdAt: -1 }).lean(),
    Outcome.find({ match: match._id, company: req.company._id }).lean(),
  ]);
  res.json({
    match: {
      id: match._id,
      company: otherSummary(other),
      matchPercent: Math.round((match.score || 0) * 100),
      reasons: match.reasons?.[String(req.company._id)] || [],
      status: match.status,
      createdAt: match.createdAt,
      meetings,
      myOutcome: outcomes[0] || null,
    },
  });
});

// ---------- Mesajlaşma ----------

router.get('/:id/messages', validate({
  params: idParams,
  query: z.object({ before: z.coerce.date().optional(), limit: z.coerce.number().int().min(1).max(100).default(50) }),
}), async (req, res) => {
  const match = await loadMatch(req);
  const { before, limit } = req.valid.query;
  const msgs = await Message.find({ match: match._id, ...(before ? { createdAt: { $lt: before } } : {}) })
    .sort({ createdAt: -1 }).limit(limit).populate('senderUser', 'fullName').lean();
  match.lastReadAt.set(String(req.company._id), new Date());
  await match.save();
  res.json({
    messages: msgs.reverse().map((m) => ({
      id: m._id,
      content: m.content,
      senderCompany: m.senderCompany,
      senderName: m.senderUser?.fullName || 'Silinmiş kullanıcı',
      mine: String(m.senderCompany) === String(req.company._id),
      createdAt: m.createdAt,
    })),
  });
});

router.post('/:id/messages', validate({
  params: idParams,
  body: z.object({ content: z.string().trim().min(1).max(4000) }),
}), async (req, res) => {
  const match = await loadMatch(req);
  if (match.status !== 'active') throw forbidden('Bu eşleşme kapatılmış.');
  const me = req.company._id;
  const { content } = req.valid.body;

  const isFirst = !(await Message.exists({ match: match._id, senderCompany: me }));
  if (isFirst) {
    // Spam satışçıya karşı: ilk mesajda dış bağlantı yok, günlük ilk mesaj limiti
    if (URL_RE.test(content)) throw badRequest('İlk mesajda dış bağlantı paylaşılamaz.');
    const firstsToday = await Message.aggregate([
      { $match: { senderCompany: me } },
      { $group: { _id: '$match', first: { $min: '$createdAt' } } },
      { $match: { first: { $gte: startOfDay() } } },
      { $count: 'n' },
    ]);
    if ((firstsToday[0]?.n || 0) >= config.matching.dailyFirstMessageLimit) {
      throw tooMany('Günlük yeni sohbet başlatma limitine ulaştınız.');
    }
  }

  const msg = await Message.create({ match: match._id, senderUser: req.user._id, senderCompany: me, content });
  match.lastMessageAt = msg.createdAt;
  if (!match.firstMessageBy) match.firstMessageBy = me;
  match.lastReadAt.set(String(me), msg.createdAt);
  await match.save();

  const payload = {
    id: msg._id, matchId: match._id, content, senderCompany: me, senderName: req.user.fullName, createdAt: msg.createdAt,
  };
  emitToMatch(match._id, 'message:new', payload);
  emitToCompany(match.otherCompany(me), 'message:new', payload);
  res.status(201).json({ message: { ...payload, mine: true } });
});

// ---------- Toplantı ----------

router.post('/:id/meetings', validate({
  params: idParams,
  body: z.object({
    slots: z.array(z.coerce.date()).min(1).max(5),
    durationMinutes: z.number().int().min(10).max(480).default(30),
    type: z.enum(MEETING_TYPES).default('online'),
    location: z.string().trim().max(300).optional(),
    note: z.string().trim().max(1000).optional(),
  }),
}), async (req, res) => {
  const match = await loadMatch(req);
  if (match.status !== 'active') throw forbidden('Bu eşleşme kapatılmış.');
  const b = req.valid.body;
  if (b.slots.some((d) => d <= new Date())) throw badRequest('Önerilen saatler gelecekte olmalı.');
  const meeting = await Meeting.create({
    match: match._id,
    proposedBy: req.company._id,
    proposedByUser: req.user._id,
    proposedSlots: b.slots,
    durationMinutes: b.durationMinutes,
    type: b.type,
    location: b.location,
    note: b.note,
  });
  const other = match.otherCompany(req.company._id);
  emitToCompany(other, 'meeting:proposed', { matchId: match._id, meetingId: meeting._id });
  await notifyCompanyUsers(other, templates.meeting(req.company.name, 'önerildi'));
  res.status(201).json({ meeting });
});

router.patch('/:id/meetings/:meetingId', validate({
  params: z.object({ id: objectId, meetingId: objectId }),
  body: z.object({
    action: z.enum(['accept', 'decline', 'cancel', 'complete']),
    slot: z.coerce.date().optional(),
  }),
}), async (req, res) => {
  const match = await loadMatch(req);
  const meeting = await Meeting.findOne({ _id: req.valid.params.meetingId, match: match._id });
  if (!meeting) throw notFound('Toplantı bulunamadı.');
  const { action, slot } = req.valid.body;
  const mine = String(meeting.proposedBy) === String(req.company._id);

  if (action === 'accept' || action === 'decline') {
    if (mine) throw forbidden('Kendi önerinizi yanıtlayamazsınız.');
    if (meeting.status !== 'proposed') throw badRequest('Bu öneri artık yanıtlanamaz.');
    if (action === 'accept') {
      const chosen = slot || meeting.proposedSlots[0];
      if (!meeting.proposedSlots.some((d) => d.getTime() === new Date(chosen).getTime())) {
        throw badRequest('Seçilen saat önerilen saatlerden biri olmalı.');
      }
      meeting.startsAt = chosen;
      meeting.status = 'accepted';
    } else {
      meeting.status = 'declined';
    }
  } else if (action === 'cancel') {
    if (!['proposed', 'accepted'].includes(meeting.status)) throw badRequest('Bu toplantı iptal edilemez.');
    meeting.status = 'cancelled';
  } else if (action === 'complete') {
    if (meeting.status !== 'accepted') throw badRequest('Yalnızca kabul edilmiş toplantılar tamamlanabilir.');
    if (meeting.startsAt > new Date()) throw badRequest('Toplantı saati henüz gelmedi.');
    meeting.status = 'completed';
  }
  await meeting.save();
  const other = match.otherCompany(req.company._id);
  emitToCompany(other, 'meeting:updated', { matchId: match._id, meetingId: meeting._id, status: meeting.status });
  const statusText = {
    accepted: 'kabul edildi', declined: 'reddedildi', cancelled: 'iptal edildi', completed: 'tamamlandı',
  }[meeting.status];
  if (meeting.status !== 'completed') await notifyCompanyUsers(other, templates.meeting(req.company.name, statusText));
  res.json({ meeting });
});

// ---------- İş sonucu ----------

/** Karşı firmanın güven sinyalini (olumlu geri bildirim oranı) güncel tutar. */
async function refreshTrustStats(companyId) {
  const matches = await Match.find({ $or: [{ companyA: companyId }, { companyB: companyId }] }, { _id: 1 }).lean();
  const rows = await Outcome.find({ match: { $in: matches.map((m) => m._id) }, company: { $ne: companyId } }, { result: 1, rating: 1 }).lean();
  const positive = rows.filter((r) => (r.rating ? r.rating >= 4 : r.result !== 'no_result')).length;
  await Company.updateOne({ _id: companyId }, { 'stats.positiveOutcomes': positive, 'stats.totalOutcomes': rows.length });
}

router.put('/:id/outcome', validate({
  params: idParams,
  body: z.object({
    result: z.enum(OUTCOME_RESULTS),
    estimatedValue: z.number().min(0).optional(),
    currency: z.string().length(3).default('TRY'),
    feedback: z.string().trim().max(1000).optional(),
    rating: z.number().int().min(1).max(5).optional(),
  }),
}), async (req, res) => {
  const match = await loadMatch(req);
  const outcome = await Outcome.findOneAndUpdate(
    { match: match._id, company: req.company._id },
    { ...req.valid.body, user: req.user._id },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );
  await refreshTrustStats(match.otherCompany(req.company._id));
  res.json({ outcome });
});

module.exports = router;

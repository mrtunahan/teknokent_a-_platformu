/**
 * Teknokent yönetim paneli: firma onayı, toplu yükleme, metrikler, talep–arz boşluğu, ağ haritası.
 * Teknokent yöneticisi yalnızca kendi teknokentini, platform yöneticisi tümünü (veya ?technoparkId=) görür.
 */
const express = require('express');
const mongoose = require('mongoose');
const {
  Company, User, Swipe, Match, Message, Meeting, Outcome, Report, Tag,
} = require('../models');
const { ROLES } = require('../constants');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate, idParams, objectId, z } = require('../middleware/validate');
const { badRequest, notFound, forbidden } = require('../utils/errors');
const { isValidVkn } = require('../utils/taxNumber');
const { daysAgo } = require('../utils/dates');
const { slugify } = require('../utils/slug');
const { sendMail, templates } = require('../services/mail');
const { invalidateTagCache } = require('../services/tagCache');

const router = express.Router();
router.use(authenticate, requireRole(ROLES.TECHNOPARK_ADMIN, ROLES.SUPER_ADMIN));

/** İsteğin kapsamındaki teknokent kimliği (super admin için opsiyonel). */
function scopeTechnopark(req) {
  if (req.user.role === ROLES.TECHNOPARK_ADMIN) {
    if (!req.user.technopark) throw forbidden('Hesabınız bir teknokente bağlı değil.');
    return req.user.technopark;
  }
  const q = req.query.technoparkId;
  if (q && !mongoose.isValidObjectId(q)) throw badRequest('Geçersiz teknokent.');
  return q ? new mongoose.Types.ObjectId(String(q)) : null;
}

const companyScope = (tp) => (tp ? { technopark: tp } : {});

async function scopedCompanyIds(tp) {
  return (await Company.find(companyScope(tp), { _id: 1 }).lean()).map((c) => c._id);
}

async function loadScopedCompany(req) {
  const tp = scopeTechnopark(req);
  const c = await Company.findOne({ _id: req.valid.params.id, ...companyScope(tp) });
  if (!c) throw notFound('Firma bulunamadı.');
  return c;
}

// ---------- Firma yönetimi ----------

router.get('/companies', validate({
  query: z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    q: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    technoparkId: objectId.optional(),
  }),
}), async (req, res) => {
  const tp = scopeTechnopark(req);
  const { status, q, page, limit } = req.valid.query;
  const filter = { ...companyScope(tp), ...(status ? { 'verification.status': status } : {}) };
  if (q) filter.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const [items, total] = await Promise.all([
    Company.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Company.countDocuments(filter),
  ]);
  const users = await User.aggregate([
    { $match: { company: { $in: items.map((c) => c._id) } } },
    { $group: { _id: '$company', n: { $sum: 1 } } },
  ]);
  const usersBy = new Map(users.map((u) => [String(u._id), u.n]));
  res.json({
    total,
    page,
    companies: items.map((c) => ({
      id: c._id,
      name: c.name,
      taxNumber: c.taxNumber,
      emailDomain: c.emailDomain,
      verificationStatus: c.verification.status,
      prefilled: c.prefilled,
      underReview: c.underReview,
      active: c.active,
      completion: c.completion().percent,
      userCount: usersBy.get(String(c._id)) || 0,
      createdAt: c.createdAt,
    })),
  });
});

/** Profil onayı: onaylanan firma "Teknokent onaylı" rozeti alır ve akışa girer. */
router.post('/companies/:id/review', validate({
  params: idParams,
  body: z.object({ action: z.enum(['approve', 'reject']), note: z.string().trim().max(500).optional() }),
}), async (req, res) => {
  const c = await loadScopedCompany(req);
  const approved = req.valid.body.action === 'approve';
  c.verification = {
    status: approved ? 'approved' : 'rejected', reviewedBy: req.user._id, reviewedAt: new Date(), note: req.valid.body.note,
  };
  c.queueStale = true;
  await c.save();
  if (approved) await Company.updateMany({ _id: { $ne: c._id } }, { queueStale: true });
  const users = await User.find({ company: c._id }, { email: 1 }).lean();
  await Promise.all(users.map((u) => sendMail({ to: u.email, ...templates.companyReviewed(approved, req.valid.body.note) })));
  res.json({ id: c._id, verificationStatus: c.verification.status });
});

/**
 * Firma listesini toplu yükleme (soğuk başlangıç): profiller önceden doldurulur, firmalar kurumsal
 * e-postayla kayıt olarak profili sahiplenir. Etiketler ad ile verilebilir.
 */
router.post('/companies/import', validate({
  body: z.object({
    technoparkId: objectId.optional(),
    companies: z.array(z.object({
      name: z.string().trim().min(2).max(200),
      taxNumber: z.string().trim(),
      emailDomain: z.string().trim().toLowerCase().max(120).optional(),
      city: z.string().trim().max(80).optional(),
      website: z.string().trim().max(300).optional(),
      description: z.string().trim().max(3000).optional(),
      employeeRange: z.enum(['1-5', '6-20', '21-50', '50+']).optional(),
      sectors: z.array(z.string().trim()).max(10).optional(),
      technologies: z.array(z.string().trim()).max(15).optional(),
    })).min(1).max(1000),
  }),
}), async (req, res) => {
  let tp = scopeTechnopark(req);
  if (!tp) {
    if (!req.valid.body.technoparkId) throw badRequest('technoparkId gerekli.');
    tp = req.valid.body.technoparkId;
  }
  const tags = await Tag.find({ type: { $in: ['sector', 'technology'] } }, { slug: 1, type: 1 }).lean();
  const tagBy = new Map(tags.map((t) => [`${t.type}:${t.slug}`, t._id]));
  const resolve = (type, names = []) => names.map((n) => tagBy.get(`${type}:${slugify(n)}`)).filter(Boolean);

  const result = { created: 0, skipped: 0, errors: [] };
  for (const [i, row] of req.valid.body.companies.entries()) {
    if (!isValidVkn(row.taxNumber)) {
      result.errors.push({ row: i, taxNumber: row.taxNumber, error: 'Geçersiz vergi numarası.' });
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    if (await Company.exists({ taxNumber: row.taxNumber })) {
      result.skipped += 1;
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await Company.create({
      name: row.name,
      taxNumber: row.taxNumber,
      emailDomain: row.emailDomain,
      city: row.city,
      website: row.website,
      description: row.description,
      employeeRange: row.employeeRange,
      technopark: tp,
      sectors: resolve('sector', row.sectors),
      technologies: resolve('technology', row.technologies),
      prefilled: true,
      verification: { status: 'approved', reviewedBy: req.user._id, reviewedAt: new Date(), note: 'Teknokent listesinden içe aktarıldı' },
    });
    result.created += 1;
  }
  invalidateTagCache();
  res.status(201).json(result);
});

/** Son 30 günde hiç kaydırma/mesaj yapmamış onaylı firmalar (hatırlatma için). */
router.get('/companies/inactive', async (req, res) => {
  const tp = scopeTechnopark(req);
  const since = daysAgo(30);
  const companies = await Company.find({ ...companyScope(tp), 'verification.status': 'approved', active: true, prefilled: false }, { name: 1 }).lean();
  const ids = companies.map((c) => c._id);
  const [sw, msg] = await Promise.all([
    Swipe.distinct('swiperCompany', { swiperCompany: { $in: ids }, createdAt: { $gte: since } }),
    Message.distinct('senderCompany', { senderCompany: { $in: ids }, createdAt: { $gte: since } }),
  ]);
  const activeSet = new Set([...sw, ...msg].map(String));
  res.json({ companies: companies.filter((c) => !activeSet.has(String(c._id))).map((c) => ({ id: c._id, name: c.name })) });
});

// ---------- Raporlar / kötüye kullanım ----------

router.get('/reports', async (req, res) => {
  const ids = await scopedCompanyIds(scopeTechnopark(req));
  const reports = await Report.find({ targetCompany: { $in: ids }, status: 'open' })
    .populate('targetCompany', 'name underReview').populate('reporterCompany', 'name').sort({ createdAt: -1 }).lean();
  res.json({ reports });
});

router.post('/companies/:id/moderate', validate({
  params: idParams,
  body: z.object({ action: z.enum(['restore', 'deactivate']), note: z.string().trim().max(500).optional() }),
}), async (req, res) => {
  const c = await loadScopedCompany(req);
  if (req.valid.body.action === 'restore') {
    c.underReview = false;
    await Report.updateMany({ targetCompany: c._id, status: 'open' }, { status: 'dismissed' });
  } else {
    c.active = false;
    c.underReview = false;
    await Report.updateMany({ targetCompany: c._id, status: 'open' }, { status: 'resolved' });
    await Match.updateMany({ $or: [{ companyA: c._id }, { companyB: c._id }] }, { status: 'closed' });
  }
  await c.save();
  res.json({ id: c._id, active: c.active, underReview: c.underReview });
});

// ---------- Metrikler ----------

const rangeQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  technoparkId: objectId.optional(),
});

async function computeStats(tp, from, to) {
  const ids = await scopedCompanyIds(tp);
  const inRange = { createdAt: { $gte: from, $lte: to } };
  const matchScope = { $or: [{ companyA: { $in: ids } }, { companyB: { $in: ids } }] };

  const approvedCompanies = await Company.find({ _id: { $in: ids }, 'verification.status': 'approved', active: true, prefilled: false });
  const usable = approvedCompanies.filter((c) => c.offers.length && c.needs.length && (c.description || '').length >= 40).length;

  const weekAgo = daysAgo(7, to);
  const [weeklySwipers, weeklySenders] = await Promise.all([
    Swipe.distinct('swiperCompany', { swiperCompany: { $in: ids }, createdAt: { $gte: weekAgo, $lte: to } }),
    Message.distinct('senderCompany', { senderCompany: { $in: ids }, createdAt: { $gte: weekAgo, $lte: to } }),
  ]);
  const weeklyActive = new Set([...weeklySwipers, ...weeklySenders].map(String)).size;

  const swipeAgg = await Swipe.aggregate([
    { $match: { swiperCompany: { $in: ids }, ...inRange } },
    { $group: { _id: '$direction', n: { $sum: 1 } } },
  ]);
  const swipes = Object.fromEntries(swipeAgg.map((s) => [s._id, s.n]));
  const totalSwipes = (swipes.right || 0) + (swipes.left || 0) + (swipes.super || 0);

  const matches = await Match.find({ ...matchScope, ...inRange }, { _id: 1, createdAt: 1 }).lean();
  const matchIds = matches.map((m) => m._id);
  const [withMessages, meetings, outcomes] = await Promise.all([
    Message.distinct('match', { match: { $in: matchIds } }),
    Meeting.find({ match: { $in: matchIds } }, { match: 1, status: 1, createdAt: 1 }).lean(),
    Outcome.find({ match: { $in: matchIds } }, { match: 1, result: 1, estimatedValue: 1, createdAt: 1 }).lean(),
  ]);
  const msgSet = new Set(withMessages.map(String));
  const realMeetings = meetings.filter((m) => ['accepted', 'completed'].includes(m.status));
  const matchesWithMeeting = new Set(realMeetings.map((m) => String(m.match)));
  const msgToMeeting = [...matchesWithMeeting].filter((id) => msgSet.has(id)).length;

  const outcomeCounts = Object.fromEntries(['met', 'proposal', 'contract', 'no_result'].map((r) => [r, 0]));
  const bestOutcome = new Map();
  const rank = {
    no_result: 0, met: 1, proposal: 2, contract: 3,
  };
  for (const o of outcomes) {
    const prev = bestOutcome.get(String(o.match));
    if (!prev || rank[o.result] > rank[prev.result]) bestOutcome.set(String(o.match), o);
  }
  for (const o of bestOutcome.values()) outcomeCounts[o.result] += 1;

  const monthKey = (d) => new Date(d).toISOString().slice(0, 7);
  const monthly = {};
  const bump = (d, k) => {
    const m = monthKey(d);
    monthly[m] = monthly[m] || { month: m, matches: 0, meetings: 0, outcomes: 0 };
    monthly[m][k] += 1;
  };
  matches.forEach((m) => bump(m.createdAt, 'matches'));
  realMeetings.forEach((m) => bump(m.createdAt, 'meetings'));
  [...bestOutcome.values()].forEach((o) => bump(o.createdAt, 'outcomes'));

  const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
  return {
    period: { from, to },
    companies: {
      total: ids.length,
      approved: approvedCompanies.length,
      pending: await Company.countDocuments({ _id: { $in: ids }, 'verification.status': 'pending' }),
      prefilledUnclaimed: await Company.countDocuments({ _id: { $in: ids }, prefilled: true }),
    },
    metrics: {
      profileCompletionRate: pct(usable, approvedCompanies.length),
      weeklyActiveCompanies: weeklyActive,
      weeklyActiveRate: pct(weeklyActive, approvedCompanies.length),
      swipes: { total: totalSwipes, right: swipes.right || 0, left: swipes.left || 0, super: swipes.super || 0 },
      rightSwipeRate: pct((swipes.right || 0) + (swipes.super || 0), totalSwipes),
      matches: matches.length,
      matchToMessageRate: pct(msgSet.size, matches.length),
      meetings: realMeetings.length,
      messageToMeetingRate: pct(msgToMeeting, msgSet.size),
      outcomes: outcomeCounts,
      documentedCollaborations: outcomeCounts.proposal + outcomeCounts.contract,
      estimatedValue: [...bestOutcome.values()].reduce((a, o) => a + (o.estimatedValue || 0), 0),
    },
    monthly: Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month)),
  };
}

function resolveRange(q) {
  const to = q.to || new Date();
  const from = q.from || daysAgo(30, to);
  if (from > to) throw badRequest('Başlangıç tarihi bitişten sonra olamaz.');
  return { from, to };
}

router.get('/stats', validate({ query: rangeQuery }), async (req, res) => {
  const { from, to } = resolveRange(req.valid.query);
  res.json(await computeStats(scopeTechnopark(req), from, to));
});

/** Bakanlık / yönetim kurulu raporları için CSV dışa aktarma (Excel ile açılır). */
router.get('/stats/export.csv', validate({ query: rangeQuery }), async (req, res) => {
  const { from, to } = resolveRange(req.valid.query);
  const s = await computeStats(scopeTechnopark(req), from, to);
  const m = s.metrics;
  const rows = [
    ['Metrik', 'Değer'],
    ['Dönem başlangıcı', from.toISOString().slice(0, 10)],
    ['Dönem bitişi', to.toISOString().slice(0, 10)],
    ['Toplam firma', s.companies.total],
    ['Onaylı firma', s.companies.approved],
    ['Onay bekleyen firma', s.companies.pending],
    ['Profil tamamlama oranı (%)', m.profileCompletionRate],
    ['Haftalık aktif firma', m.weeklyActiveCompanies],
    ['Sağa kaydırma oranı (%)', m.rightSwipeRate],
    ['Eşleşme', m.matches],
    ['Eşleşme → mesaj oranı (%)', m.matchToMessageRate],
    ['Toplantı', m.meetings],
    ['Mesaj → toplantı oranı (%)', m.messageToMeetingRate],
    ['Görüşüldü', m.outcomes.met],
    ['Teklif', m.outcomes.proposal],
    ['Sözleşme', m.outcomes.contract],
    ['Sonuçsuz', m.outcomes.no_result],
    ['Belgeli iş birliği', m.documentedCollaborations],
    ['Tahmini değer (TRY)', m.estimatedValue],
    [],
    ['Ay', 'Eşleşme', 'Toplantı', 'İş sonucu'],
    ...s.monthly.map((x) => [x.month, x.matches, x.meetings, x.outcomes]),
  ];
  const esc = (v) => (v == null ? '' : /[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const csv = `﻿${rows.map((r) => r.map(esc).join(';')).join('\r\n')}`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="teknomatch-rapor-${to.toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

/** Talep–arz boşluğu: en çok aranan ama teknokentte en az sunulan yetkinlikler. */
router.get('/supply-demand', async (req, res) => {
  const tp = scopeTechnopark(req);
  const base = { ...companyScope(tp), active: true };
  const [needs, offers] = await Promise.all([
    Company.aggregate([{ $match: base }, { $unwind: '$needs' }, { $group: { _id: '$needs.tag', n: { $sum: 1 } } }]),
    Company.aggregate([{ $match: base }, { $unwind: '$offers' }, { $group: { _id: '$offers.tag', n: { $sum: 1 } } }]),
  ]);
  const map = new Map();
  for (const x of needs) map.set(String(x._id), { tag: x._id, demand: x.n, supply: 0 });
  for (const x of offers) {
    const e = map.get(String(x._id)) || { tag: x._id, demand: 0, supply: 0 };
    e.supply = x.n;
    map.set(String(x._id), e);
  }
  const tags = await Tag.find({ _id: { $in: [...map.values()].map((e) => e.tag) } }, { name: 1, type: 1 }).lean();
  const tagBy = new Map(tags.map((t) => [String(t._id), t]));
  const rows = [...map.values()]
    .map((e) => ({ tag: tagBy.get(String(e.tag)) || { _id: e.tag }, demand: e.demand, supply: e.supply, gap: e.demand - e.supply }))
    .sort((a, b) => b.gap - a.gap || b.demand - a.demand);
  res.json({ items: rows });
});

/** Ağ haritası: firmalar düğüm, eşleşmeler kenar. */
router.get('/network', async (req, res) => {
  const tp = scopeTechnopark(req);
  const companies = await Company.find({ ...companyScope(tp), 'verification.status': 'approved', active: true, prefilled: false }, { name: 1, sectors: 1 })
    .populate('sectors', 'name').lean();
  const ids = companies.map((c) => c._id);
  const matches = await Match.find({ companyA: { $in: ids }, companyB: { $in: ids } }, { companyA: 1, companyB: 1, score: 1 }).lean();
  const degree = new Map();
  for (const m of matches) {
    degree.set(String(m.companyA), (degree.get(String(m.companyA)) || 0) + 1);
    degree.set(String(m.companyB), (degree.get(String(m.companyB)) || 0) + 1);
  }
  res.json({
    nodes: companies.map((c) => ({
      id: c._id, name: c.name, sectors: (c.sectors || []).map((s) => s.name), degree: degree.get(String(c._id)) || 0,
    })),
    edges: matches.map((m) => ({ source: m.companyA, target: m.companyB, score: m.score })),
    isolated: companies.filter((c) => !degree.has(String(c._id))).length,
  });
});

module.exports = router;

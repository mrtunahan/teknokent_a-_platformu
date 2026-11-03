/**
 * Uyum skoru — saf fonksiyonlar (veritabanına dokunmaz, birim testlenebilir).
 *
 *   S(A,B)  = α · min(s_AB, s_BA) + (1-α) · max(s_AB, s_BA),   α = 0.7
 *   s_A→B   = Σ_k w_k · f_k(N_A, O_B)
 *
 * N_A: A'nın "arıyorum" maddeleri, O_B: B'nin "sunuyorum" maddeleri.
 *
 * Skorlama "profil" denilen düz nesneler üzerinde çalışır (bkz. `toScoringProfile`):
 * {
 *   id, technopark, city, branches:[{technopark, city}], sectors:[id], stage, employeeRange,
 *   verified, profileUpdatedAt, certificates:[{type, validUntil}], blockedCompanies:[id],
 *   preferences:{region, requiredCertificates, blockedSectors},
 *   offers:[{tag, collaborationType, description}],
 *   needs:[{tag, collaborationType, description, urgency, visibility, expiresAt}],
 *   description, embeddings?:{needs:[n], offers:[n]}, trust:{positive, total}
 * }
 */
const { COMPATIBLE_COLLABORATION_PAIRS } = require('../constants');
const { textSimilarity, cosineVectors } = require('./text');
const { DAY } = require('../utils/dates');

const ALPHA = 0.7;

const DEFAULT_WEIGHTS = Object.freeze({
  competence: 0.4, // Yetkinlik ↔ ihtiyaç
  collaboration: 0.15, // İş birliği türü uyumu
  sector: 0.1, // Sektör yakınlığı
  scale: 0.1, // Ölçek / aşama uyumu
  location: 0.1, // Konum
  urgency: 0.1, // Aciliyet ve tazelik
  trust: 0.05, // Güven sinyali
});

/** Yetkinlik bileşeninin içindeki etiket / metin payı. */
const COMPETENCE_TAG_SHARE = 0.7;

const URGENCY_WEIGHT = { this_month: 1, this_quarter: 0.7, general: 0.4 };

const compatSet = new Set(COMPATIBLE_COLLABORATION_PAIRS.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]));

const s = (x) => (x == null ? null : String(x));
const clamp01 = (x) => Math.max(0, Math.min(1, x));

function jaccard(a, b) {
  const A = new Set((a || []).map(String));
  const B = new Set((b || []).map(String));
  if (!A.size && !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  return inter / (A.size + B.size - inter);
}

/**
 * Etiket benzerliği: aynı etiket 1; biri diğerinin üst etiketiyse ya da aynı üst etikete sahiplerse 0.5.
 * @param {Map<string,string|null>} parents tagId -> parentId
 */
function tagSimilarity(t1, t2, parents) {
  const a = s(t1);
  const b = s(t2);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const pa = parents?.get(a) || null;
  const pb = parents?.get(b) || null;
  if (pa === b || pb === a || (pa && pa === pb)) return 0.5;
  return 0;
}

function collaborationCompatibility(t1, t2) {
  if (!t1 || !t2) return 0;
  if (t1 === t2) return 1;
  return compatSet.has(`${t1}|${t2}`) ? 0.5 : 0;
}

function activeNeeds(profile, now) {
  return (profile.needs || []).filter((n) => !n.expiresAt || new Date(n.expiresAt) > now);
}

/** Firmanın ölçek segmenti: startup / sme / corporate. */
function segment(p) {
  if (['idea', 'mvp', 'first_customer'].includes(p.stage)) return 'startup';
  if (p.stage === 'mature' || p.employeeRange === '50+') return 'corporate';
  if (p.stage === 'growth' || p.employeeRange === '21-50') return 'sme';
  if (['1-5', '6-20'].includes(p.employeeRange)) return 'startup';
  return null;
}

/** Kural tablosu: [ihtiyaç sahibi][sağlayıcı]. Kurumsal ↔ startup POC için yüksek. */
const SCALE_TABLE = {
  startup: { startup: 0.6, sme: 0.8, corporate: 0.9 },
  sme: { startup: 0.7, sme: 0.8, corporate: 0.6 },
  corporate: { startup: 1, sme: 0.8, corporate: 0.5 },
};

function scaleFit(a, b) {
  const sa = segment(a);
  const sb = segment(b);
  if (!sa || !sb) return 0.5;
  return SCALE_TABLE[sa][sb];
}

function locations(p) {
  const tps = new Set([s(p.technopark), ...(p.branches || []).map((x) => s(x.technopark))].filter(Boolean));
  const cities = new Set(
    [p.city, ...(p.branches || []).map((x) => x.city)].filter(Boolean).map((c) => c.toLocaleLowerCase('tr-TR')),
  );
  return { tps, cities };
}

/** 'technopark' | 'city' | 'other' */
function proximity(a, b) {
  const la = locations(a);
  const lb = locations(b);
  for (const t of la.tps) if (lb.tps.has(t)) return 'technopark';
  for (const c of la.cities) if (lb.cities.has(c)) return 'city';
  return 'other';
}

const LOCATION_SCORE = { technopark: 1, city: 0.6, other: 0.3 };

function freshness(p, now) {
  if (!p.profileUpdatedAt) return 0;
  const days = (now - new Date(p.profileUpdatedAt)) / DAY;
  if (days <= 30) return 1;
  if (days >= 180) return 0;
  return 1 - (days - 30) / 150;
}

function trustSignal(p) {
  const verified = p.verified ? 1 : 0;
  const pos = p.trust?.positive || 0;
  const tot = p.trust?.total || 0;
  const feedback = (pos + 1) / (tot + 2); // Laplace düzeltmesi: veri yokken 0.5
  return 0.5 * verified + 0.5 * feedback;
}

const joinText = (items) => (items || []).map((x) => x.description || '').join(' ');

/**
 * Her ihtiyaç için en iyi karşılayan sunumu bulur.
 * @returns {{need, offer, tagSim}[]}
 */
function bestPairs(needs, offers, parents) {
  return needs.map((need) => {
    let best = { need, offer: null, tagSim: 0 };
    for (const offer of offers || []) {
      const t = tagSimilarity(need.tag, offer.tag, parents);
      const better = t > best.tagSim
        || (t === best.tagSim && t > 0
          && collaborationCompatibility(need.collaborationType, offer.collaborationType)
            > collaborationCompatibility(need.collaborationType, best.offer?.collaborationType));
      if (better) best = { need, offer, tagSim: t };
    }
    return best;
  });
}

/**
 * Tek yönlü skor s_A→B: A'nın ihtiyaçlarının B tarafından karşılanma derecesi.
 * @returns {{score:number, components:object, pairs:object[]}}
 */
function directionalScore(A, B, ctx = {}) {
  const now = ctx.now || new Date();
  const weights = ctx.weights || DEFAULT_WEIGHTS;
  const parents = ctx.tagParents;
  const needs = activeNeeds(A, now);
  const offers = B.offers || [];

  const pairs = bestPairs(needs, offers, parents);
  const matched = pairs.filter((p) => p.tagSim > 0);

  // 1) Yetkinlik ↔ ihtiyaç: etiket kapsama + Jaccard, açıklama metni benzerliği
  let competence = 0;
  if (needs.length && offers.length) {
    const coverage = pairs.reduce((acc, p) => acc + p.tagSim, 0) / needs.length;
    const jac = jaccard(needs.map((n) => n.tag), offers.map((o) => o.tag));
    const tagPart = 0.7 * coverage + 0.3 * jac;
    let textPart = cosineVectors(A.embeddings?.needs, B.embeddings?.offers);
    if (textPart == null) textPart = textSimilarity(joinText(needs), `${joinText(offers)} ${B.description || ''}`);
    competence = COMPETENCE_TAG_SHARE * tagPart + (1 - COMPETENCE_TAG_SHARE) * textPart;
  }

  // 2) İş birliği türü uyumu (yalnızca etiketi eşleşen ihtiyaçlar üzerinden)
  const collaboration = matched.length
    ? matched.reduce((acc, p) => acc + collaborationCompatibility(p.need.collaborationType, p.offer.collaborationType), 0)
      / matched.length
    : 0;

  // 3) Sektör yakınlığı
  const sector = jaccard(A.sectors, B.sectors);

  // 4) Ölçek / aşama uyumu
  const scale = scaleFit(A, B);

  // 5) Konum
  const location = LOCATION_SCORE[proximity(A, B)];

  // 6) Aciliyet (A'nın ihtiyaçları) ve tazelik (B'nin profili)
  const urgencySource = matched.length ? matched.map((p) => p.need) : needs;
  const urgencyVal = urgencySource.length
    ? Math.max(...urgencySource.map((n) => URGENCY_WEIGHT[n.urgency] ?? URGENCY_WEIGHT.general))
    : 0;
  const urgency = 0.5 * urgencyVal + 0.5 * freshness(B, now);

  // 7) Güven sinyali (B)
  const trust = trustSignal(B);

  const components = { competence, collaboration, sector, scale, location, urgency, trust };
  const score = clamp01(Object.entries(weights).reduce((acc, [k, w]) => acc + w * (components[k] || 0), 0));
  return { score, components, pairs: matched };
}

/** İki yönlü skor: zayıf yön α ağırlığıyla, tek taraflı ilgiyi cezalandırır. */
function combine(ab, ba, alpha = ALPHA) {
  return alpha * Math.min(ab, ba) + (1 - alpha) * Math.max(ab, ba);
}

/**
 * "Neden bu firma" gerekçeleri — `viewer` için `candidate` kartında gösterilir.
 * Karşı tarafın "yalnızca eşleşince görünür" ihtiyaçları skora katılır ama burada gösterilmez.
 */
function buildReasons(viewer, candidate, viewerToCand, candToViewer, ctx = {}) {
  const name = (id) => ctx.tagNames?.get(s(id)) || 'etiket';
  const reasons = [];
  const seen = new Set();
  const push = (r) => {
    if (!seen.has(r)) {
      seen.add(r);
      reasons.push(r);
    }
  };

  for (const p of viewerToCand.pairs) push(`Aradığınız: ${name(p.need.tag)}`);
  for (const p of candToViewer.pairs) {
    if (p.need.visibility !== 'matched_only') push(`Onların aradığı: ${name(p.need.tag)} (sizde var)`);
  }
  const prox = proximity(viewer, candidate);
  if (prox === 'technopark') push('Aynı teknokent');
  else if (prox === 'city') push('Aynı şehir');

  const sharedSectors = (viewer.sectors || []).map(String).filter((x) => (candidate.sectors || []).map(String).includes(x));
  if (sharedSectors.length) push(`Ortak sektör: ${name(sharedSectors[0])}`);

  const sv = segment(viewer);
  const sc = segment(candidate);
  if ((sv === 'corporate' && sc === 'startup') || (sv === 'startup' && sc === 'corporate')) push('Kurumsal–startup POC uyumu');
  if (candidate.verified) push('Teknokent onaylı');
  return reasons.slice(0, ctx.maxReasons || 5);
}

/** A'nın B'yi görmesi için sert filtreler. `false` dönerse B, A'nın akışında hiç gösterilmez. */
function passesHardFilters(viewer, candidate, now = new Date()) {
  if (s(viewer.id) === s(candidate.id)) return false;

  const blockedByViewer = new Set((viewer.blockedCompanies || []).map(String));
  const blockedByCand = new Set((candidate.blockedCompanies || []).map(String));
  if (blockedByViewer.has(s(candidate.id)) || blockedByCand.has(s(viewer.id))) return false;

  const prefs = viewer.preferences || {};
  const region = prefs.region || 'turkey';
  const prox = proximity(viewer, candidate);
  if (region === 'same_technopark' && prox !== 'technopark') return false;
  if (region === 'same_city' && prox === 'other') return false;

  const blockedSectors = new Set((prefs.blockedSectors || []).map(String));
  if (blockedSectors.size && (candidate.sectors || []).some((x) => blockedSectors.has(String(x)))) return false;

  const required = prefs.requiredCertificates || [];
  if (required.length) {
    const valid = new Set(
      (candidate.certificates || [])
        .filter((c) => !c.validUntil || new Date(c.validUntil) > now)
        .map((c) => c.type),
    );
    if (!required.every((t) => valid.has(t))) return false;
  }
  return true;
}

/**
 * A ve B arasındaki tam skor: iki yön, birleşik skor ve her iki taraf için gerekçeler.
 */
function scorePair(A, B, ctx = {}) {
  const ab = directionalScore(A, B, ctx);
  const ba = directionalScore(B, A, ctx);
  const score = combine(ab.score, ba.score, ctx.alpha);
  return {
    score,
    ab: ab.score,
    ba: ba.score,
    components: { ab: ab.components, ba: ba.components },
    reasonsForA: buildReasons(A, B, ab, ba, ctx),
    reasonsForB: buildReasons(B, A, ba, ab, ctx),
  };
}

/** Mongoose belgesi / lean nesnesinden skorlama profili üretir. */
function toScoringProfile(c) {
  const id = (x) => (x && x._id ? String(x._id) : s(x));
  return {
    id: id(c._id),
    technopark: id(c.technopark),
    city: c.city,
    branches: (c.branches || []).map((b) => ({ technopark: id(b.technopark), city: b.city })),
    sectors: (c.sectors || []).map(id),
    stage: c.stage,
    employeeRange: c.employeeRange,
    verified: c.verification?.status === 'approved',
    profileUpdatedAt: c.profileUpdatedAt,
    certificates: (c.certificates || []).map((x) => ({ type: x.type, validUntil: x.validUntil })),
    blockedCompanies: (c.blockedCompanies || []).map(id),
    preferences: {
      region: c.preferences?.region || 'turkey',
      requiredCertificates: c.preferences?.requiredCertificates || [],
      blockedSectors: (c.preferences?.blockedSectors || []).map(id),
    },
    offers: (c.offers || []).map((o) => ({ tag: id(o.tag), collaborationType: o.collaborationType, description: o.description })),
    needs: (c.needs || []).map((n) => ({
      tag: id(n.tag),
      collaborationType: n.collaborationType,
      description: n.description,
      urgency: n.urgency,
      visibility: n.visibility,
      expiresAt: n.expiresAt,
    })),
    description: c.description,
    embeddings: c.embeddings,
    trust: { positive: c.stats?.positiveOutcomes || 0, total: c.stats?.totalOutcomes || 0 },
  };
}

module.exports = {
  ALPHA,
  DEFAULT_WEIGHTS,
  jaccard,
  tagSimilarity,
  collaborationCompatibility,
  segment,
  scaleFit,
  proximity,
  freshness,
  trustSignal,
  directionalScore,
  combine,
  buildReasons,
  passesHardFilters,
  scorePair,
  toScoringProfile,
};

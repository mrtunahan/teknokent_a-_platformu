/** Kart ve profil görünümleri: kim neyi görebilir kuralları burada uygulanır. */

const tagView = (t) => (t && t.name ? { id: t._id, name: t.name, type: t.type } : t);

function offerView(o) {
  return { id: o._id, tag: tagView(o.tag), collaborationType: o.collaborationType, description: o.description };
}

function needView(n) {
  return {
    id: n._id,
    tag: tagView(n.tag),
    collaborationType: n.collaborationType,
    description: n.description,
    urgency: n.urgency,
    budgetRange: n.budgetRange,
    expiresAt: n.expiresAt,
  };
}

const publicNeeds = (c, includeHidden) => (c.needs || []).filter((n) => includeHidden || n.visibility !== 'matched_only');

/** Akış kartı: logo, ad, teknokent, uyum yüzdesi, "neden bu firma", karşılıklı özet. */
function cardView(c, { score, reasons, exploration } = {}) {
  return {
    id: c._id,
    name: c.name,
    logoUrl: c.logoUrl,
    technopark: c.technopark?.name ? { id: c.technopark._id, name: c.technopark.name, city: c.technopark.city } : c.technopark,
    city: c.city,
    stage: c.stage,
    employeeRange: c.employeeRange,
    sectors: (c.sectors || []).map(tagView),
    verified: c.verification?.status === 'approved',
    matchPercent: score == null ? null : Math.round(score * 100),
    reasons: reasons || [],
    offers: (c.offers || []).map(offerView),
    needs: publicNeeds(c, false).map(needView),
    exploration: !!exploration,
  };
}

/** Firma detay sayfası (kartı yukarı kaydırınca). Eşleşilmişse gizli ihtiyaçlar da görünür. */
function detailView(c, { matched = false } = {}) {
  return {
    ...cardView(c),
    website: c.website,
    foundedYear: c.foundedYear,
    technologies: (c.technologies || []).map(tagView),
    description: c.description,
    certificates: (c.certificates || []).map((x) => ({ type: x.type, title: x.title, validUntil: x.validUntil })),
    references: (c.references || []).filter((r) => !r.hidden).map((r) => ({ title: r.title, client: r.client, description: r.description })),
    needs: publicNeeds(c, matched).map(needView),
    matched,
  };
}

const CARD_POPULATE = [
  { path: 'technopark', select: 'name city' },
  { path: 'sectors', select: 'name type' },
  { path: 'technologies', select: 'name type' },
  { path: 'offers.tag', select: 'name type' },
  { path: 'needs.tag', select: 'name type' },
];

module.exports = { cardView, detailView, offerView, needView, CARD_POPULATE };

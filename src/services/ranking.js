/**
 * Akış sıralaması — saf fonksiyonlar.
 *  - Kartların ~%80'i en yüksek skora göre, ~%20'si keşif için orta skor aralığından gelir.
 *  - Çok popüler firmalar gösterim sayısına göre hafifçe sönümlenir.
 */

const DAMPING_BETA = 0.15;

/** Popülerlik sönümlemesi: son 7 gündeki gösterim sayısına göre logaritmik ceza. */
const dampedScore = (score, impressions = 0) => score / (1 + DAMPING_BETA * Math.log1p(impressions));

function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * @param {{company:string, score:number}[]} candidates
 * @param {number} n kaç kart seçilecek
 * @param {{explorationRatio?:number, impressions?:Map<string,number>, rng?:Function}} opts
 * @returns {{company, score, rankScore, exploration:boolean}[]}
 */
function selectFeed(candidates, n, opts = {}) {
  if (n <= 0 || !candidates.length) return [];
  const { explorationRatio = 0.2, impressions = new Map(), rng = Math.random } = opts;

  const ranked = candidates
    .map((c) => ({ ...c, rankScore: dampedScore(c.score, impressions.get(String(c.company)) || 0) }))
    .sort((a, b) => b.rankScore - a.rankScore);

  if (ranked.length <= n) return ranked.map((c) => ({ ...c, exploration: false }));

  const exploreCount = Math.max(0, Math.min(n - 1, Math.round(n * explorationRatio)));
  const topCount = n - exploreCount;
  const top = ranked.slice(0, topCount).map((c) => ({ ...c, exploration: false }));
  const rest = ranked.slice(topCount);

  // Orta skor aralığı: kalan adayların %25–%75 dilimi
  const lo = Math.floor(rest.length * 0.25);
  const hi = Math.max(lo + 1, Math.ceil(rest.length * 0.75));
  const mid = shuffle(rest.slice(lo, hi), rng).slice(0, exploreCount);
  const picked = new Set(mid.map((c) => String(c.company)));
  // Orta dilim yetmezse kalanlardan sırayla doldur
  for (const c of rest) {
    if (mid.length >= exploreCount) break;
    if (!picked.has(String(c.company))) {
      mid.push(c);
      picked.add(String(c.company));
    }
  }
  const explore = mid.map((c) => ({ ...c, exploration: true }));

  // Keşif kartlarını akışa serpiştir (her ~4 kartta bir)
  const out = [];
  const step = Math.max(1, Math.floor(top.length / Math.max(1, explore.length)));
  let e = 0;
  top.forEach((c, i) => {
    out.push(c);
    if ((i + 1) % step === 0 && e < explore.length) out.push(explore[e++]);
  });
  while (e < explore.length) out.push(explore[e++]);
  return out;
}

module.exports = { dampedScore, selectFeed, shuffle, DAMPING_BETA };

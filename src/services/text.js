/**
 * Hafif metin benzerliği: Türkçe normalizasyon + önek gövdeleme + terim frekansı kosinüsü.
 * Embedding servisi yapılandırılmadığında açıklama metinleri için yedek benzerlik ölçüsüdür.
 */
const STOPWORDS = new Set(`ve ile için bir bu şu o da de mi mu mı mü ama fakat veya ya ki gibi kadar daha çok en
her hem ise olan olarak olan üzere ayrıca biz siz onlar bizim sizin ne nasıl neden çünkü yani hiç tüm bütün
sonra önce şimdi ilgili yönelik dair the and for with of to in on a an is are we our`.split(/\s+/));

const STEM_LEN = 6;

function tokenize(text) {
  if (!text) return [];
  return String(text)
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .split(/[^a-z0-9ğüşöç]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map((t) => t.slice(0, STEM_LEN));
}

function termVector(text) {
  const v = new Map();
  for (const t of tokenize(text)) v.set(t, (v.get(t) || 0) + 1);
  return v;
}

function cosineMaps(a, b) {
  if (!a.size || !b.size) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [k, x] of a) {
    na += x * x;
    const y = b.get(k);
    if (y) dot += x * y;
  }
  for (const y of b.values()) nb += y * y;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function cosineVectors(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return null;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  // Kosinüs [-1,1] → [0,1]
  return Math.max(0, dot / (Math.sqrt(na) * Math.sqrt(nb)));
}

const textSimilarity = (x, y) => cosineMaps(termVector(x), termVector(y));

module.exports = { tokenize, termVector, cosineMaps, cosineVectors, textSimilarity };

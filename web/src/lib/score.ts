import type { Company } from '@/types';
import { label } from '@/data/options';

const words = (s: string) =>
  s
    .toLocaleLowerCase('tr')
    .split(/[^a-zçğıöşü0-9]+/i)
    .filter((w) => w.length > 3);

/** Kelime kökü örtüşmesi (ilk 5 harf) — "görüntü işleme" ↔ "görüntüleme" gibi yakınlıkları yakalar. */
function overlap(a: string[], b: string[]) {
  const sb = new Set(b.flatMap(words).map((w) => w.slice(0, 5)));
  return a.filter((x) => words(x).some((w) => sb.has(w.slice(0, 5))));
}

/**
 * Basit, açıklanabilir uyum skoru. Backend'deki kural tabanlı skorlamanın istemci tarafı yaklaşığıdır;
 * HTTP adaptörü kullanıldığında skor ve gerekçeler doğrudan API'den gelir.
 */
export function compatibility(me: Company, other: Company): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 42;

  const theyOfferWhatINeed = overlap(me.seeking, [...other.offering, ...other.products, ...other.expertise]);
  if (theyOfferWhatINeed.length) {
    score += 14 + theyOfferWhatINeed.length * 4;
    reasons.push(`Aradığınız “${theyOfferWhatINeed[0]}” alanında yetkin`);
  }
  const iOfferWhatTheyNeed = overlap(other.seeking, [...me.offering, ...me.products, ...me.expertise]);
  if (iOfferWhatTheyNeed.length) {
    score += 12 + iOfferWhatTheyNeed.length * 3;
    reasons.push(`Sizin sunduklarınıza ihtiyaç duyuyor`);
  }
  const sharedCollab = other.collaborationTypes.filter((c) => me.collaborationTypes.includes(c));
  if (sharedCollab.length) {
    score += sharedCollab.length * 5;
    reasons.push(`Ortak hedef: ${label.collab(sharedCollab[0]!)}`);
  }
  const complementary = other.expertise.filter((e) => !me.expertise.includes(e));
  if (complementary.length >= 2) score += 4;
  if (other.city === me.city) {
    score += 6;
    reasons.push(other.technopark === me.technopark ? `Aynı teknokentte: ${other.technopark}` : `Aynı şehirde: ${other.city}`);
  }
  if (other.verified) score += 3;
  if (me.seekingProjectPartner && other.seekingProjectPartner) {
    score += 4;
    if (reasons.length < 3) reasons.push('İkiniz de proje ortağı arıyorsunuz');
  }
  if (!reasons.length) reasons.push(`${other.sector} alanında tamamlayıcı yetkinlikler`);
  // Deterministik küçük çeşitlilik
  score += (other.name.length * 7) % 6;
  return { score: Math.max(48, Math.min(98, score)), reasons: reasons.slice(0, 3) };
}

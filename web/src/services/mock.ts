import { DEMO_COMPANIES, DEMO_LIKES_YOU } from '@/data/companies';
import type { Company } from '@/types';
import type { DataSource } from './types';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const REPLIES: { test: RegExp; answers: string[] }[] = [
  { test: /toplant|görüş|call|zoom|meet/i, answers: ['Harika olur! Önümüzdeki hafta Salı veya Perşembe öğleden sonra bizim için uygun.', 'Görüşme için takvim davetinizi bekliyoruz, ekibimizden CTO’muz da katılacak.'] },
  { test: /fiyat|ücret|bütçe|maliyet/i, answers: ['Bütçe tarafını ilk görüşmede kapsamı netleştirdikten sonra konuşalım isterim. Size kısa bir teklif taslağı hazırlayabiliriz.'] },
  { test: /dosya|sunum|pdf|doküman|belge/i, answers: ['Dosyayı aldık, teşekkürler 🙏 Ekiple inceleyip yarın dönüş yapıyorum.'] },
  { test: /tübitak|horizon|proje|hibe|1501|1507|teydeb/i, answers: ['Proje ortaklığı bizim için de öncelikli. Bu dönem için TÜBİTAK 1501 çağrısını değerlendiriyoruz, birlikte bakabiliriz.'] },
  { test: /merhaba|selam|iyi günler/i, answers: ['Merhaba! Eşleştiğimize çok sevindik. Sizin tarafta öncelikli iş birliği alanı nedir?', 'Merhaba, profilinizi inceledik — ürünlerimiz arasında güçlü bir entegrasyon potansiyeli görüyoruz.'] },
];

const GENERIC = [
  'Çok mantıklı. Bunu iç ekibimizle değerlendirip size detaylı dönüş yapalım.',
  'Kesinlikle katılıyorum. Kısa bir tanışma toplantısı ile başlayalım mı?',
  'Bu konuda daha önce benzer bir pilot yaptık, referans çalışmamızı paylaşabilirim.',
  'Süper! Ekibimizden ilgili kişiyi de bu sohbete dahil edeceğim.',
];

export const mockSource: DataSource = {
  kind: 'mock',
  async listCandidates() {
    await wait(250);
    return DEMO_COMPANIES;
  },
  async getCompany(id) {
    return DEMO_COMPANIES.find((c) => c.id === id);
  },
  async swipe(targetId, direction) {
    await wait(120);
    const matched = direction !== 'left' && DEMO_LIKES_YOU.has(targetId);
    return { matched, matchId: matched ? `m_${targetId}` : undefined };
  },
  async sendMessage() {
    await wait(350);
  },
  async simulateReply(_matchId, _company: Company, lastText) {
    await wait(1800 + Math.random() * 1600);
    const bucket = REPLIES.find((r) => r.test.test(lastText));
    const pool = bucket?.answers ?? GENERIC;
    return pool[Math.floor(Math.random() * pool.length)]!;
  },
  async report() {
    await wait(400);
  },
  async block() {
    await wait(200);
  },
  async saveProfile() {
    await wait(500);
  },
};

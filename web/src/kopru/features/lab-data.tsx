/**
 * Laboratuvar hizmetleri: katalog, talep modeli, örnek veri ve işlem kancası (ext anahtarı: 'lab').
 * Fiyatlar örnektir (KDV hariç); gerçek döner sermaye tarifesiyle değiştirilecek.
 */
import { useMemo } from 'react';
import { uid } from '@/lib/utils';
import { PERSONAS, firmOf, labOf, orgOf, ttoName, type KopruState, type Role } from '../data';
import { firmInbox, useKopru } from '../store';

const DAY = 86_400_000;

/* --------------------------------- Katalog --------------------------------- */

export type LabUnit = 'numune' | 'saat' | 'gün';

export interface LabService {
  id: string;
  labId: string;
  name: string;
  unit: LabUnit;
  /** Birim fiyat (₺, KDV hariç, örnek) */
  price: number;
  /** Tipik süre (iş günü) */
  days: number;
  /** Numune / kullanım koşulu */
  condition: string;
}

export const LAB_SERVICES: LabService[] = [
  // l1 · ÇAKÜ Malzeme Karakterizasyon
  { id: 'l1-sem', labId: 'l1', name: 'SEM-EDS görüntüleme ve element analizi', unit: 'numune', price: 2400, days: 5, condition: 'İletken, kuru numune; en fazla 25 × 25 × 10 mm. Kırık yüzeyler korunarak gönderilmeli.' },
  { id: 'l1-xrd', labId: 'l1', name: 'XRD faz analizi', unit: 'numune', price: 1800, days: 4, condition: 'Toz (≈2 g) veya düz yüzeyli katı numune (en fazla 20 × 20 mm).' },
  { id: 'l1-hv', labId: 'l1', name: 'Mikrosertlik ölçümü (Vickers)', unit: 'numune', price: 650, days: 2, condition: 'Parlatılmış kesit; numune başına 5 ölçüm noktası.' },
  { id: 'l1-met', labId: 'l1', name: 'Metalografik mikroyapı incelemesi', unit: 'numune', price: 1200, days: 3, condition: 'Kesit hazırlama dahil; dağlama ayıracı belirtilmeli.' },
  // l2 · ÇAKÜ Gıda Analiz
  { id: 'l2-raf', labId: 'l2', name: 'Raf ömrü testi (hızlandırılmış)', unit: 'numune', price: 9500, days: 30, condition: 'Ürün başına en az 12 kapalı ambalaj; üretim partisi bilgisi ile.' },
  { id: 'l2-pes', labId: 'l2', name: 'Pestisit kalıntı analizi (GC-MS)', unit: 'numune', price: 3200, days: 7, condition: 'En az 500 g homojen numune; soğuk zincirde teslim.' },
  { id: 'l2-aw', labId: 'l2', name: 'Su aktivitesi ölçümü', unit: 'numune', price: 450, days: 2, condition: 'Hava almayan kapta en az 50 g numune.' },
  // l3 · ÇAKÜ Yapay Zekâ ve Görü
  { id: 'l3-gpu', labId: 'l3', name: 'GPU sunucu kullanımı (A100)', unit: 'saat', price: 380, days: 1, condition: 'Uzaktan erişim; veri gizliliği protokolü imzalanmalı. Rezervasyon saat bloğu olarak yapılır.' },
  { id: 'l3-hsi', labId: 'l3', name: 'Hiperspektral görüntüleme', unit: 'numune', price: 2800, days: 5, condition: 'En fazla 30 × 30 cm yüzey; parlak yüzeyler için ön görüşme gerekir.' },
  { id: 'l3-ds', labId: 'l3', name: 'Endüstriyel kamera ile veri seti oluşturma', unit: 'gün', price: 6500, days: 3, condition: 'Sahada veya laboratuvarda çekim; etiketleme ayrıca fiyatlandırılır.' },
  // l4 · ÇAKÜ Enerji Sistemleri
  { id: 'l4-saha', labId: 'l4', name: 'Saha enerji ölçümü ve güç kalitesi analizi', unit: 'gün', price: 7500, days: 5, condition: 'Pano erişimi ve iş güvenliği refakati firma tarafından sağlanır.' },
  { id: 'l4-term', labId: 'l4', name: 'Termal kamera ile ısı kaybı taraması', unit: 'gün', price: 4200, days: 3, condition: 'Üretim çalışır durumdayken ölçüm yapılır.' },
  { id: 'l4-motor', labId: 'l4', name: 'Elektrik motoru verim testi', unit: 'numune', price: 3600, days: 4, condition: 'En fazla 22 kW; motor etiket bilgileri ile teslim.' },
  // l5 · ÇAKÜ Polimer ve Kompozit
  { id: 'l5-dsc', labId: 'l5', name: 'DSC / TGA termal analiz', unit: 'numune', price: 1600, days: 7, condition: 'Granül veya film; numune başına en az 20 g.' },
  { id: 'l5-cek', labId: 'l5', name: 'Çekme testi', unit: 'numune', price: 900, days: 5, condition: 'Standart test çubuğu (5 adet / numune) veya kesim için levha.' },
  { id: 'l5-ftir', labId: 'l5', name: 'FTIR spektroskopisi', unit: 'numune', price: 750, days: 3, condition: 'Katı, sıvı veya film numune; en az 5 g.' },
  // l6 · KBÜ Döküm ve Isıl İşlem
  { id: 'l6-rad', labId: 'l6', name: 'Radyografik muayene', unit: 'numune', price: 1400, days: 4, condition: 'Parça boyutu en fazla 600 mm, et kalınlığı en fazla 80 mm (çelik).' },
  { id: 'l6-spek', labId: 'l6', name: 'Spektral kimyasal analiz', unit: 'numune', price: 600, days: 2, condition: 'Düz, temiz yüzeyli en az Ø30 mm numune.' },
  { id: 'l6-isil', labId: 'l6', name: 'Isıl işlem denemesi', unit: 'numune', price: 3800, days: 6, condition: 'Hedef sertlik ve çevrim parametreleri talepte belirtilmeli.' },
  // l7 · KÜ Ahşap Malzeme Test
  { id: 'l7-form', labId: 'l7', name: 'Formaldehit emisyon testi (oda yöntemi)', unit: 'numune', price: 5500, days: 28, condition: 'Kenarları kapatılmış, ambalajlı panel numunesi (en az 1 m²).' },
  { id: 'l7-egil', labId: 'l7', name: 'Eğilme direnci ve elastikiyet modülü', unit: 'numune', price: 700, days: 5, condition: 'Panel başına 6 adet 50 × 350 mm test parçası.' },
  { id: 'l7-iklim', labId: 'l7', name: 'Nem-iklim kabini dayanım testi', unit: 'numune', price: 2400, days: 10, condition: 'En az 3 adet son ürün numunesi.' },
];

export const UNIT_LABEL: Record<LabUnit, string> = { numune: 'numune', saat: 'saat', gün: 'gün' };
export const serviceOf = (id: string) => LAB_SERVICES.find((s) => s.id === id);
export const servicesOf = (labId: string) => LAB_SERVICES.filter((s) => s.labId === labId);
export const qtyLabel = (s: LabService | undefined) => (!s || s.unit === 'numune' ? 'Numune sayısı' : `Miktar (${UNIT_LABEL[s.unit]})`);

/* ---------------------------------- Model ---------------------------------- */

export type LabReqStatus = 'talep' | 'teklif' | 'onaylandi' | 'numune' | 'analiz' | 'rapor' | 'tamamlandi' | 'iptal';

export interface LabEvent {
  at: number;
  actor: string;
  text: string;
}

export interface LabRequest {
  id: string;
  labId: string;
  serviceId: string;
  firmId: string;
  qty: number;
  note: string;
  preferredAt?: number;
  status: LabReqStatus;
  createdAt: number;
  offer?: { amount: number; days: number; note?: string; at: number };
  appointmentAt?: number;
  report?: { name: string; dataUrl?: string; summary?: string; at: number };
  events: LabEvent[];
}

export interface LabState {
  requests: LabRequest[];
  /** Sorumlunun güncellediği birim fiyatlar (hizmet kimliği → ₺) */
  prices: Record<string, number>;
}

export const LAB_FLOW: Exclude<LabReqStatus, 'iptal'>[] = ['talep', 'teklif', 'onaylandi', 'numune', 'analiz', 'rapor', 'tamamlandi'];

export const LAB_STATUS: Record<LabReqStatus, { label: string; tone: string; step: string }> = {
  talep: { label: 'Teklif bekleniyor', tone: 'bg-amber-50 text-amber-700 ring-amber-200', step: 'Talep' },
  teklif: { label: 'Teklif verildi', tone: 'bg-blue-50 text-blue-700 ring-blue-200', step: 'Teklif' },
  onaylandi: { label: 'Onaylandı', tone: 'bg-primary-50 text-primary-700 ring-primary-200', step: 'Onay' },
  numune: { label: 'Numune alındı', tone: 'bg-violet-50 text-violet-700 ring-violet-200', step: 'Numune' },
  analiz: { label: 'Analizde', tone: 'bg-sky-50 text-sky-700 ring-sky-200', step: 'Analiz' },
  rapor: { label: 'Raporlanıyor', tone: 'bg-teal-50 text-teal-700 ring-teal-200', step: 'Rapor' },
  tamamlandi: { label: 'Tamamlandı', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', step: 'Tamam' },
  iptal: { label: 'İptal', tone: 'bg-slate-100 text-slate-500 ring-slate-200', step: 'İptal' },
};

/** Onaylanmış ve süren işler (laboratuvar doluluğu ve gelir hesabı) */
export const ACTIVE: LabReqStatus[] = ['onaylandi', 'numune', 'analiz', 'rapor'];
/** Laboratuvar başına örnek eşzamanlı iş kapasitesi */
export const LAB_CAPACITY = 4;

/* -------------------------------- Örnek veri ------------------------------- */

export function labSeed(now = Date.now()): LabState {
  const ago = (d: number, h = 0) => now - d * DAY - h * 3_600_000;
  const later = (d: number) => now + d * DAY;
  return {
    prices: {},
    requests: [
      {
        id: 'lr1', labId: 'l1', serviceId: 'l1-sem', firmId: 'f1', qty: 3, status: 'talep', createdAt: ago(2),
        note: 'Sfero döküm göbek parçalarında yüzey altı gözenekler. Kırık yüzeylerde EDS ile Mg/S dağılımı ve gözenek morfolojisi görülmek isteniyor.',
        preferredAt: later(6),
        events: [{ at: ago(2), actor: 'Kuzey Döküm San. A.Ş.', text: 'Analiz talebi oluşturuldu · 3 numune' }],
      },
      {
        id: 'lr2', labId: 'l2', serviceId: 'l2-raf', firmId: 'f2', qty: 2, status: 'tamamlandi', createdAt: ago(52),
        note: 'Kuru fasulye 1 kg paketleri: mevcut PE ambalaj ve önerilen çok katlı ambalaj karşılaştırması.',
        preferredAt: ago(48),
        offer: { amount: 19_000, days: 30, note: 'İki ambalaj tipi × 3 sıcaklık koşulu; ara ölçümler 10. ve 20. günde.', at: ago(51) },
        appointmentAt: ago(47),
        report: {
          name: 'Ilgaz-raf-omru-raporu.txt', at: ago(9),
          summary: 'Hızlandırılmış raf ömrü testi sonucu (örnek): Çok katlı ambalajda 35 °C / %75 bağıl nemde 30 gün sonunda nem artışı %0,4 ile sınırlı kaldı; tek kat PE ambalajda %1,9. Tahmini raf ömrü çok katlı ambalaj için 12 ayın üzerinde. Böceklenme gözlenmedi.',
        },
        events: [
          { at: ago(52), actor: 'Ilgaz Gıda Ürünleri', text: 'Analiz talebi oluşturuldu · 2 numune' },
          { at: ago(51), actor: 'Prof. Dr. Ayşe Demir', text: 'Teklif verildi · 19.000 ₺ · 30 iş günü' },
          { at: ago(50), actor: 'Ilgaz Gıda Ürünleri', text: 'Teklif onaylandı' },
          { at: ago(47), actor: 'Prof. Dr. Ayşe Demir', text: 'Numune teslim alındı' },
          { at: ago(46), actor: 'Prof. Dr. Ayşe Demir', text: 'Analize başlandı' },
          { at: ago(9), actor: 'Prof. Dr. Ayşe Demir', text: 'Rapor yüklendi · talep tamamlandı' },
        ],
      },
      {
        id: 'lr3', labId: 'l5', serviceId: 'l5-dsc', firmId: 'f4', qty: 4, status: 'analiz', createdAt: ago(12),
        note: '%25 ve %50 rPET içeren preform numunelerinde erime ve kristalizasyon davranışı karşılaştırması.',
        preferredAt: ago(8),
        offer: { amount: 6_400, days: 7, at: ago(11) },
        appointmentAt: ago(6),
        events: [
          { at: ago(12), actor: 'Anka Plastik Ambalaj', text: 'Analiz talebi oluşturuldu · 4 numune' },
          { at: ago(11), actor: 'Dr. Öğr. Üyesi Zeynep Çelik', text: 'Teklif verildi · 6.400 ₺ · 7 iş günü' },
          { at: ago(10), actor: 'Anka Plastik Ambalaj', text: 'Teklif onaylandı' },
          { at: ago(6), actor: 'Dr. Öğr. Üyesi Zeynep Çelik', text: 'Numune teslim alındı' },
          { at: ago(5), actor: 'Dr. Öğr. Üyesi Zeynep Çelik', text: 'Analize başlandı' },
        ],
      },
      {
        id: 'lr4', labId: 'l6', serviceId: 'l6-rad', firmId: 'f6', qty: 8, status: 'onaylandi', createdAt: ago(6),
        note: 'Boji yan çerçevesi dökümlerinde sıcak yırtılma şüpheli bölgeler (köşe geçişleri) için radyografi.',
        preferredAt: later(3),
        offer: { amount: 11_200, days: 4, note: 'Parçalar 600 mm sınırını aşarsa kesit alınarak çekim yapılır.', at: ago(5) },
        appointmentAt: later(3),
        events: [
          { at: ago(6), actor: 'Demirçelik Döküm Ltd.', text: 'Analiz talebi oluşturuldu · 8 numune' },
          { at: ago(5), actor: 'Prof. Dr. Orhan Güneş', text: 'Teklif verildi · 11.200 ₺ · 4 iş günü' },
          { at: ago(4), actor: 'Demirçelik Döküm Ltd.', text: 'Teklif onaylandı' },
          { at: ago(4), actor: 'Prof. Dr. Orhan Güneş', text: `Numune kabul randevusu: ${new Date(later(3)).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}` },
        ],
      },
      {
        id: 'lr5', labId: 'l3', serviceId: 'l3-gpu', firmId: 't0', qty: 40, status: 'talep', createdAt: ago(0, 5),
        note: 'Duruş tahmini modelinin eğitimi için 40 saatlik A100 kullanımı; veri anonimleştirilmiş üretim kayıtlarıdır.',
        preferredAt: later(10),
        events: [{ at: ago(0, 5), actor: 'Orion Yazılım', text: 'Analiz talebi oluşturuldu · 40 saat' }],
      },
      {
        id: 'lr6', labId: 'l1', serviceId: 'l1-hv', firmId: 'f1', qty: 6, status: 'tamamlandi', createdAt: ago(34),
        note: 'Isıl işlem sonrası sfero döküm flanşlarda sertlik dağılımı.',
        offer: { amount: 3_900, days: 2, at: ago(33) },
        appointmentAt: ago(31),
        report: {
          name: 'Kuzey-Doküm-mikrosertlik-raporu.txt', at: ago(28),
          summary: 'Mikrosertlik ölçüm özeti (örnek): 6 numunede ortalama 228 HV0,5; yüzeyden 2 mm derinliğe kadar sertlik %7 daha yüksek. Dağılım müşteri spesifikasyonu aralığında.',
        },
        events: [
          { at: ago(34), actor: 'Kuzey Döküm San. A.Ş.', text: 'Analiz talebi oluşturuldu · 6 numune' },
          { at: ago(33), actor: 'Doç. Dr. Elif Arslan', text: 'Teklif verildi · 3.900 ₺ · 2 iş günü' },
          { at: ago(33), actor: 'Kuzey Döküm San. A.Ş.', text: 'Teklif onaylandı' },
          { at: ago(31), actor: 'Doç. Dr. Elif Arslan', text: 'Numune teslim alındı' },
          { at: ago(30), actor: 'Doç. Dr. Elif Arslan', text: 'Analize başlandı' },
          { at: ago(28), actor: 'Doç. Dr. Elif Arslan', text: 'Rapor yüklendi · talep tamamlandı' },
        ],
      },
    ],
  };
}

/* --------------------------------- Yardımcı -------------------------------- */

export const fmtDate = (t?: number, withYear = false) =>
  t == null ? '—' : new Date(t).toLocaleDateString('tr-TR', withYear ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long', weekday: 'short' });

/** <input type="date"> değeri ↔ zaman damgası (yerel saat) */
export const toDateInput = (t?: number) => {
  if (t == null) return '';
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const fromDateInput = (v: string) => (v ? new Date(`${v}T09:00:00`).getTime() : undefined);

/** Rolün firması (yalnızca firma ve teknokent firması talep yapabilir) */
export const requesterFirmOf = (role: Role): string | null => (role === 'firma' ? PERSONAS.firma.firmId : role === 'tfirma' ? PERSONAS.tfirma.firmId : null);

/** Laboratuvarın sorumlu akademisyenleri (onaylı) */
export const labOwners = (state: KopruState, labId: string) => state.academics.filter((a) => a.approved && a.labIds.includes(labId));

/** Rolün görebileceği talepler */
export function labReqInScope(state: KopruState, role: Role, r: LabRequest): boolean {
  switch (role) {
    case 'firma':
    case 'tfirma':
      return r.firmId === requesterFirmOf(role);
    case 'akademisyen':
      return !!state.academics.find((a) => a.id === PERSONAS.akademisyen.academicId)?.labIds.includes(r.labId);
    case 'tto':
      return labOf(r.labId).universityId === state.orgSel.tto;
    case 'osb':
      return firmOf(r.firmId).orgId === state.orgSel.osb;
    case 'teknokent':
      return firmOf(r.firmId).orgId === state.orgSel.teknokent;
    default:
      return true;
  }
}

/** Laboratuvar tarafında işlem yapabilir mi: sorumlu akademisyen veya laboratuvarın üniversitesinin TTO'su (döner sermaye adına) */
export const canLabAct = (state: KopruState, role: Role, r: LabRequest) =>
  (role === 'akademisyen' && labReqInScope(state, role, r)) || (role === 'tto' && labOf(r.labId).universityId === state.orgSel.tto);
export const canFirmAct = (role: Role, r: LabRequest) => requesterFirmOf(role) === r.firmId;

/** Gelir hesabında sayılan tutar (onaylı teklif) */
export const amountOf = (r: LabRequest) => r.offer?.amount ?? 0;

/* ---------------------------------- Kanca ---------------------------------- */

export interface NewLabRequest {
  labId: string;
  serviceId: string;
  qty: number;
  note: string;
  preferredAt?: number;
}

export function useLab() {
  const k = useKopru();
  const seed = useMemo(() => labSeed(), []);
  const data = k.ext<LabState>('lab', seed);
  const set = (fn: (prev: LabState) => LabState) => k.setExt<LabState>('lab', seed, fn);
  const priceOf = (s: LabService) => data.prices[s.id] ?? s.price;

  /** Rolün işlem yapan adı */
  const actorName = (r: LabRequest) => {
    if (k.role === 'akademisyen') return k.me.name;
    if (k.role === 'tto') return `${ttoName(k.state.orgSel.tto)} (döner sermaye)`;
    return firmOf(r.firmId).name;
  };

  /** Karşı taraf + laboratuvarın üniversitesinin TTO'su (kendi kutusu hariç) */
  const notifyParties = (r: LabRequest, side: 'firm' | 'lab', text: string) => {
    const uni = labOf(r.labId).universityId;
    const to = side === 'firm' ? [...labOwners(k.state, r.labId).map((a) => `academic:${a.id}`), `tto:${uni}`] : [firmInbox(r.firmId), `tto:${uni}`];
    const list = to.filter((x) => x !== k.inbox.key);
    if (list.length) k.notify(list, text, 'laboratuvar', 'lab');
  };

  const patch = (id: string, fn: (r: LabRequest) => Partial<LabRequest>, eventText: string, side: 'firm' | 'lab', notifyText: string) => {
    const r = data.requests.find((x) => x.id === id);
    if (!r) return;
    const at = Date.now();
    const actor = actorName(r);
    set((prev) => ({ ...prev, requests: prev.requests.map((x) => (x.id === id ? { ...x, ...fn(x), events: [...x.events, { at, actor, text: eventText }] } : x)) }));
    notifyParties(r, side, notifyText);
  };

  const label = (r: LabRequest) => `${serviceOf(r.serviceId)?.name ?? 'Analiz'} · ${firmOf(r.firmId).name}`;

  return {
    data,
    priceOf,
    create(input: NewLabRequest): string | null {
      const firmId = requesterFirmOf(k.role);
      if (!firmId) return null;
      const s = serviceOf(input.serviceId);
      const id = uid('lr');
      const firm = firmOf(firmId);
      const r: LabRequest = {
        id, firmId, labId: input.labId, serviceId: input.serviceId, qty: input.qty, note: input.note, preferredAt: input.preferredAt,
        status: 'talep', createdAt: Date.now(),
        events: [{ at: Date.now(), actor: firm.name, text: `Analiz talebi oluşturuldu · ${input.qty} ${s ? UNIT_LABEL[s.unit] : 'numune'}` }],
      };
      set((prev) => ({ ...prev, requests: [r, ...prev.requests] }));
      notifyParties(r, 'firm', `Yeni analiz talebi: ${s?.name ?? 'Analiz'} · ${firm.name} (${labOf(input.labId).name})`);
      return id;
    },
    offer(id: string, offer: { amount: number; days: number; note?: string }) {
      const r = data.requests.find((x) => x.id === id);
      if (!r) return;
      patch(id, () => ({ status: 'teklif', offer: { ...offer, at: Date.now() } }), `Teklif verildi · ${offer.amount.toLocaleString('tr-TR')} ₺ · ${offer.days} iş günü`, 'lab', `Analiz talebinize teklif geldi: ${offer.amount.toLocaleString('tr-TR')} ₺ · ${label(r)}`);
    },
    accept(id: string) {
      const r = data.requests.find((x) => x.id === id);
      if (r) patch(id, () => ({ status: 'onaylandi' }), 'Teklif onaylandı', 'firm', `Teklif onaylandı, randevu bekleniyor: ${label(r)}`);
    },
    reject(id: string) {
      const r = data.requests.find((x) => x.id === id);
      if (r) patch(id, () => ({ status: 'iptal' }), 'Teklif reddedildi', 'firm', `Teklif reddedildi: ${label(r)}`);
    },
    cancel(id: string) {
      const r = data.requests.find((x) => x.id === id);
      if (r) patch(id, () => ({ status: 'iptal' }), 'Talep firma tarafından iptal edildi', 'firm', `Analiz talebi iptal edildi: ${label(r)}`);
    },
    decline(id: string, reason?: string) {
      const r = data.requests.find((x) => x.id === id);
      if (r) patch(id, () => ({ status: 'iptal' }), `Laboratuvar talebi karşılayamadı${reason ? ` · ${reason}` : ''}`, 'lab', `Laboratuvar talebinizi karşılayamadı: ${label(r)}`);
    },
    schedule(id: string, at: number) {
      const r = data.requests.find((x) => x.id === id);
      const day = fmtDate(at);
      if (r) patch(id, () => ({ appointmentAt: at }), `Numune kabul randevusu: ${day}`, 'lab', `Numune kabul randevusu ${day}: ${label(r)}`);
    },
    receive(id: string) {
      const r = data.requests.find((x) => x.id === id);
      if (r) patch(id, () => ({ status: 'numune' }), 'Numune teslim alındı', 'lab', `Numuneniz teslim alındı: ${label(r)}`);
    },
    startAnalysis(id: string) {
      const r = data.requests.find((x) => x.id === id);
      if (r) patch(id, () => ({ status: 'analiz' }), 'Analize başlandı', 'lab', `Analize başlandı: ${label(r)}`);
    },
    finishAnalysis(id: string) {
      const r = data.requests.find((x) => x.id === id);
      if (r) patch(id, () => ({ status: 'rapor' }), 'Analiz tamamlandı, rapor hazırlanıyor', 'lab', `Analiz tamamlandı, rapor hazırlanıyor: ${label(r)}`);
    },
    uploadReport(id: string, report: { name: string; dataUrl?: string; summary?: string }) {
      const r = data.requests.find((x) => x.id === id);
      if (r) patch(id, () => ({ status: 'tamamlandi', report: { ...report, at: Date.now() } }), 'Rapor yüklendi · talep tamamlandı', 'lab', `Analiz raporunuz hazır: ${label(r)}`);
    },
    setPrices(prices: Record<string, number>) {
      set((prev) => ({ ...prev, prices: { ...prev.prices, ...prices } }));
    },
  };
}

/** Raporu indir: dosya varsa kendisi, yoksa metin özeti .txt olarak */
export function downloadReport(r: LabRequest) {
  if (!r.report) return;
  const a = document.createElement('a');
  let url: string | null = null;
  if (r.report.dataUrl) a.href = r.report.dataUrl;
  else {
    const s = serviceOf(r.serviceId);
    const lab = labOf(r.labId);
    const text = [
      `${lab.name} · ${orgOf(lab.universityId).name}`,
      `Hizmet: ${s?.name ?? '—'}`,
      `Firma: ${firmOf(r.firmId).name}`,
      `Miktar: ${r.qty} ${s ? UNIT_LABEL[s.unit] : ''}`,
      `Rapor tarihi: ${fmtDate(r.report.at, true)}`,
      '',
      r.report.summary ?? '',
      '',
      'Bu belge TeknoOrtak demosunda üretilmiş örnek bir rapordur.',
    ].join('\n');
    url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    a.href = url;
  }
  a.download = r.report.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (url) setTimeout(() => URL.revokeObjectURL(url!), 1000);
}

/**
 * Fikri mülkiyet modülü: tipler, etiketler ve örnek (seed) veri.
 * Veri `k.ext('ip', IP_SEED)` altında durur; başvuru numaraları ve tarihler örnektir.
 */
import type { NeedEvent } from '../data';

export type IpType = 'patent' | 'faydali_model' | 'tasarim' | 'yazilim';
export type IpStatus = 'bildirim' | 'on_degerlendirme' | 'arastirma' | 'karar' | 'basvuru' | 'tescil' | 'lisans' | 'reddedildi';

export interface Invention {
  id: string;
  title: string;
  type: IpType;
  summary: string;
  /** Yeni olan nedir (buluşun farkı) */
  novelty?: string;
  /** Olası kullanım alanı */
  usage?: string;
  inventors: { academics: string[]; external: string[] };
  universityId: string;
  projectId?: string;
  /** Ortak hak sahibi firma */
  firmId?: string;
  /** Hak sahipliği paylaşımı, ör. "%60 üniversite · %40 firma" */
  share?: string;
  status: IpStatus;
  /** Patent araştırması notu */
  priorArt?: string;
  /** TTO başvuru kararı ('karar' aşamasında) */
  decision?: 'basvur';
  /** Ret gerekçesi */
  rejectReason?: string;
  applicationNo?: string;
  /** Tescil belgesi alındı mı */
  granted?: boolean;
  /** Lisans alan firma */
  licenseeId?: string;
  events: NeedEvent[];
  createdAt: number;
}

export interface IpState {
  items: Invention[];
}

export const IP_TYPE: Record<IpType, string> = {
  patent: 'Patent',
  faydali_model: 'Faydalı model',
  tasarim: 'Endüstriyel tasarım',
  yazilim: 'Yazılım',
};

export const IP_STAGES: { key: Exclude<IpStatus, 'reddedildi'>; label: string; hint: string }[] = [
  { key: 'bildirim', label: 'Bildirim', hint: 'Buluşçu TTO’ya bildirdi' },
  { key: 'on_degerlendirme', label: 'Ön değerlendirme', hint: 'TTO yenilik ve ticari potansiyeli inceliyor' },
  { key: 'arastirma', label: 'Patent araştırması', hint: 'Tekniğin bilinen durumu taranıyor' },
  { key: 'karar', label: 'Başvuru kararı', hint: 'Başvuru / ret kararı' },
  { key: 'basvuru', label: 'Başvuruda', hint: 'Başvuru yapıldı, inceleme sürüyor' },
  { key: 'tescil', label: 'Tescilli', hint: 'Tescil belgesi alındı' },
  { key: 'lisans', label: 'Lisanslı', hint: 'Bir firmaya lisanslandı' },
];

export const IP_STATUS: Record<IpStatus, string> = {
  bildirim: 'Yeni bildirim',
  on_degerlendirme: 'Ön değerlendirmede',
  arastirma: 'Patent araştırmasında',
  karar: 'Karar bekliyor',
  basvuru: 'Başvuruda',
  tescil: 'Tescilli',
  lisans: 'Lisanslı',
  reddedildi: 'Reddedildi',
};

export const IP_TONE: Record<IpStatus, string> = {
  bildirim: 'bg-amber-50 text-amber-700 ring-amber-200',
  on_degerlendirme: 'bg-blue-50 text-blue-700 ring-blue-200',
  arastirma: 'bg-blue-50 text-blue-700 ring-blue-200',
  karar: 'bg-primary-50 text-primary-700 ring-primary-200',
  basvuru: 'bg-violet-50 text-violet-700 ring-violet-200',
  tescil: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  lisans: 'bg-emerald-100 text-emerald-800 ring-emerald-300',
  reddedildi: 'bg-slate-100 text-slate-500 ring-slate-200',
};

/** Boru hattı sütunları (TTO / platform görünümü) */
export const IP_COLUMNS: { key: string; label: string; statuses: IpStatus[] }[] = [
  { key: 'yeni', label: 'Yeni bildirimler', statuses: ['bildirim'] },
  { key: 'degerlendirme', label: 'Değerlendirme', statuses: ['on_degerlendirme', 'arastirma', 'karar'] },
  { key: 'basvuru', label: 'Başvuruda', statuses: ['basvuru'] },
  { key: 'tescil', label: 'Tescil & lisans', statuses: ['tescil', 'lisans'] },
];

/** Portföy özetleri */
export function ipSummary(items: Invention[]) {
  return {
    total: items.length,
    active: items.filter((i) => ['bildirim', 'on_degerlendirme', 'arastirma', 'karar'].includes(i.status)).length,
    basvuru: items.filter((i) => i.status === 'basvuru').length,
    tescil: items.filter((i) => i.status === 'tescil' || (i.status === 'lisans' && i.granted)).length,
    lisans: items.filter((i) => i.status === 'lisans').length,
  };
}

const DAY = 86_400_000;
const NOW = Date.now();
const ago = (d: number) => NOW - d * DAY;

export const IP_SEED: IpState = {
  items: [
    {
      id: 'ip1',
      title: 'Konveyörlü fırın için atık ısı geri kazanım reküperatörü',
      type: 'faydali_model',
      summary: 'Boya kurutma fırınının baca gazındaki ısıyı, modüler plakalı bir reküperatörle yanma havasına aktaran ve mevcut fırına duruşsuz monte edilebilen düzenek.',
      novelty: 'Sökülebilir plaka paketi sayesinde boya buharı birikintisi hat durdurulmadan temizlenebiliyor.',
      usage: 'Boya, kurutma ve ısıl işlem fırınları; makine ve metal sektörü.',
      inventors: { academics: ['a4'], external: ['Tekn. Yusuf Er (Çankırı Makine Sanayi)'] },
      universityId: 'u-caku',
      projectId: 'p2',
      firmId: 'f5',
      share: '%60 üniversite · %40 firma',
      status: 'basvuru',
      priorArt: 'Benzer plakalı reküperatörler mevcut; ancak hat çalışırken sökülebilir plaka paketi ve kendinden temizleme kanalı tespit edilmedi. Faydalı model için uygun.',
      decision: 'basvur',
      applicationNo: '2026/014872 (örnek)',
      events: [
        { at: ago(19), actor: 'Doç. Dr. Hakan Yıldız', text: 'Buluş bildirimi yapıldı (p2 projesinden)' },
        { at: ago(17), actor: 'ÇAKÜ TTO', text: 'Ön değerlendirmeye alındı' },
        { at: ago(14), actor: 'ÇAKÜ TTO', text: 'Patent araştırması başlatıldı' },
        { at: ago(10), actor: 'ÇAKÜ TTO', text: 'Patent araştırması tamamlandı' },
        { at: ago(8), actor: 'ÇAKÜ TTO', text: 'Başvuru kararı verildi · faydalı model' },
        { at: ago(4), actor: 'ÇAKÜ TTO', text: 'TÜRKPATENT başvurusu yapıldı · 2026/014872 (örnek)' },
      ],
      createdAt: ago(19),
    },
    {
      id: 'ip2',
      title: 'Sfero dökümde gözenek tahmini için ultrasonik + görüntü tabanlı yöntem',
      type: 'patent',
      summary: 'Döküm sonrası ultrasonik ölçüm ile yüzey görüntülerini birlikte işleyerek iç gözenek riskini parça hattan çıkmadan tahmin eden yöntem.',
      novelty: 'İki ölçümü tek modelde birleştirerek röntgen gerektirmeden %90 üzeri doğrulukla riskli parçaları ayırıyor.',
      usage: 'Sfero ve gri döküm hatlarında %100 hat içi kontrol.',
      inventors: { academics: ['a1', 'a2'], external: [] },
      universityId: 'u-caku',
      firmId: 'f1',
      share: '%70 üniversite · %30 firma',
      status: 'on_degerlendirme',
      events: [
        { at: ago(6), actor: 'Doç. Dr. Elif Arslan', text: 'Buluş bildirimi yapıldı (Kuzey Döküm numuneleriyle doğrulandı)' },
        { at: ago(3), actor: 'ÇAKÜ TTO', text: 'Ön değerlendirmeye alındı' },
      ],
      createdAt: ago(6),
    },
    {
      id: 'ip3',
      title: 'Kalın kesitli çelik dökümlerde sıcak yırtılmayı azaltan ekzotermik besleyici manşonu',
      type: 'patent',
      summary: 'Besleyici boynunda kontrollü ısı salımı sağlayan, katılaşma sırasını düzenleyerek sıcak yırtılma çatlaklarını azaltan manşon bileşimi.',
      novelty: 'Bileşimdeki yerli hammadde oranı ve kademeli tutuşma profili.',
      usage: 'Raylı sistem ve iş makinesi çelik dökümleri.',
      inventors: { academics: ['a11'], external: ['Müh. Cem Akın'] },
      universityId: 'u-karabuk',
      firmId: 'f6',
      share: '%50 üniversite · %50 firma',
      status: 'tescil',
      priorArt: 'Ekzotermik manşonlar bilinmekle birlikte kademeli tutuşma profili yeni bulundu.',
      decision: 'basvur',
      applicationNo: '2024/09317 (örnek)',
      granted: true,
      events: [
        { at: ago(720), actor: 'Prof. Dr. Orhan Güneş', text: 'Buluş bildirimi yapıldı' },
        { at: ago(700), actor: 'KBÜ TTO', text: 'Ön değerlendirmeye alındı' },
        { at: ago(670), actor: 'KBÜ TTO', text: 'Patent araştırması tamamlandı' },
        { at: ago(650), actor: 'KBÜ TTO', text: 'TÜRKPATENT başvurusu yapıldı · 2024/09317 (örnek)' },
        { at: ago(60), actor: 'KBÜ TTO', text: 'Tescil edildi' },
      ],
      createdAt: ago(720),
    },
    {
      id: 'ip4',
      title: 'Düşük formaldehit emisyonlu tanen esaslı MDF tutkal formülasyonu',
      type: 'patent',
      summary: 'Üre-formaldehit tutkalın bir kısmını yerel kaynaklı tanen ile ikame eden ve E0 emisyon sınıfını hedefleyen tutkal reçetesi.',
      novelty: 'Sertleştirici sistem pres süresini uzatmadan emisyonu düşürüyor.',
      usage: 'MDF ve yonga levha üretimi.',
      inventors: { academics: ['a12'], external: [] },
      universityId: 'u-kastamonu',
      status: 'arastirma',
      events: [
        { at: ago(30), actor: 'Doç. Dr. Sevgi Aksoy', text: 'Buluş bildirimi yapıldı' },
        { at: ago(25), actor: 'KÜ TTO', text: 'Ön değerlendirmeye alındı' },
        { at: ago(12), actor: 'KÜ TTO', text: 'Patent araştırması başlatıldı' },
      ],
      createdAt: ago(30),
    },
    {
      id: 'ip5',
      title: 'DökümGörü: döküm yüzey hatalarını derin öğrenmeyle tespit eden yazılım',
      type: 'yazilim',
      summary: 'Endüstriyel kamera görüntülerinde çapak, soğuk birleşme ve yüzey gözeneğini sınıflandıran, hat PLC’sine ret sinyali veren yazılım.',
      novelty: 'Az etiketli veriyle eğitilebilen model ve hat hızında çıkarım.',
      usage: 'Döküm ve talaşlı imalat kalite kontrol hatları.',
      inventors: { academics: ['a2'], external: [] },
      universityId: 'u-caku',
      share: '%100 üniversite · lisans karşılığı gelir paylaşımı',
      status: 'lisans',
      priorArt: 'Yazılım; eser sahipliği kaydı ve kaynak kod emaneti ile korunuyor.',
      decision: 'basvur',
      licenseeId: 't1',
      events: [
        { at: ago(300), actor: 'Dr. Öğr. Üyesi Murat Kaya', text: 'Buluş bildirimi yapıldı' },
        { at: ago(290), actor: 'ÇAKÜ TTO', text: 'Ön değerlendirmeye alındı' },
        { at: ago(260), actor: 'ÇAKÜ TTO', text: 'Eser kaydı yapıldı' },
        { at: ago(90), actor: 'ÇAKÜ TTO', text: 'Lisanslandı · Vizyon Görüntü Teknolojileri' },
      ],
      createdAt: ago(300),
    },
    {
      id: 'ip6',
      title: 'Bakliyat için tek yönlü valfli, modifiye atmosferli ambalaj torbası',
      type: 'faydali_model',
      summary: 'Azot ile şişirilen torbada tek yönlü valf ve nem tutucu cep kombinasyonu ile böceklenme ve nem kaynaklı kaybı azaltan ambalaj.',
      novelty: 'Valf ve nem tutucunun tek katmanlı laminasyon içinde birleştirilmesi.',
      usage: 'Kuru fasulye, nohut, mercimek paketleme; ihracat ürünleri.',
      inventors: { academics: ['a3', 'a5'], external: [] },
      universityId: 'u-caku',
      projectId: 'p1',
      firmId: 'f2',
      share: '%50 üniversite · %50 firma (öneri)',
      status: 'bildirim',
      events: [{ at: ago(1), actor: 'Prof. Dr. Ayşe Demir', text: 'Buluş bildirimi yapıldı (p1 projesinden)' }],
      createdAt: ago(1),
    },
  ],
};

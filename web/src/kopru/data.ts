/**
 * Sanayi–Akademi Köprüsü (OSB · Teknokent · TTO) demosu: tipler ve örnek veri.
 * Kişi ve firma adları kurgusaldır.
 */

export type OrgType = 'osb' | 'teknokent' | 'universite';
export type Role = 'firma' | 'akademisyen' | 'tto' | 'osb' | 'teknokent';

export interface Org {
  id: string;
  name: string;
  short: string;
  type: OrgType;
}

export interface Firm {
  id: string;
  name: string;
  orgId: string;
  sector: string;
  employees: string;
  brand: [string, string];
  /** Teknokent firmaları için: çözüm sunabildiği alanlar */
  tags: string[];
  summary: string;
}

export interface Academic {
  id: string;
  name: string;
  title: string;
  department: string;
  orgId: string;
  email: string;
  tags: string[];
  /** Uzmanlık özeti (eşleştirmede anahtar kelime kaynağı) */
  summary: string;
  labIds: string[];
  industryProjects: number;
  publications: number;
  availability: 'uygun' | 'sinirli' | 'dolu';
  approved: boolean;
  brand: [string, string];
}

export interface Lab {
  id: string;
  name: string;
  department: string;
  equipment: string[];
  tags: string[];
  /** Sanayiye hizmet: ücretli analiz, ortak kullanım */
  service: string;
}

export type NeedCategory = 'arge' | 'test' | 'danismanlik' | 'egitim' | 'urun';
export type NeedStatus = 'yeni' | 'inceleme' | 'eslestirme' | 'proje' | 'kapandi';
export type Budget = 'lt100' | '100_500' | 'gt500' | 'belirsiz';
export type Funding = 'oz' | 'tubitak1505' | 'tubitak1501' | 'kosgeb' | 'bilinmiyor';

export interface Invite {
  solverId: string;
  kind: 'academic' | 'firm';
  by: 'tto' | 'firma' | 'akademisyen';
  status: 'bekliyor' | 'kabul' | 'ret';
  at: number;
  ndaAt?: number;
  note?: string;
}

export interface NeedEvent {
  at: number;
  actor: string;
  text: string;
}

export interface Need {
  id: string;
  firmId: string;
  title: string;
  summary: string;
  /** Gizli ise yalnızca gizlilik taahhüdünü onaylayan çözüm sağlayıcı görür */
  details: string;
  category: NeedCategory;
  tags: string[];
  budget: Budget;
  funding: Funding;
  urgency: 'normal' | 'acil';
  confidential: boolean;
  status: NeedStatus;
  createdAt: number;
  ttoOwner?: string;
  ttoNote?: string;
  invites: Invite[];
  projectId?: string;
  events: NeedEvent[];
}

export type Stage = 'gorusme' | 'nda' | 'teklif' | 'sozlesme' | 'basvuru' | 'yurutme' | 'tamamlandi';

export interface ProjectMessage {
  at: number;
  from: 'firma' | 'cozucu' | 'tto';
  name: string;
  text: string;
}

export interface Project {
  id: string;
  needId: string;
  solverId: string;
  kind: 'academic' | 'firm';
  stage: Stage;
  value?: number;
  program?: Funding;
  startedAt: number;
  closedAt?: number;
  messages: ProjectMessage[];
  history: { at: number; stage: Stage }[];
}

export interface KopruState {
  version: number;
  needs: Need[];
  projects: Project[];
  academics: Academic[];
}

/* ------------------------------- Etiketler -------------------------------- */

export const TAGS = [
  'Döküm', 'Metalurji', 'Malzeme karakterizasyonu', 'Tahribatsız muayene', 'Isıl işlem', 'Kaynak teknolojisi',
  'Görüntü işleme', 'Yapay zekâ', 'Makine öğrenmesi', 'Kalite kontrol', 'Otomasyon', 'Robotik', 'PLC / SCADA',
  'Enerji verimliliği', 'Isı transferi', 'Akışkanlar mekaniği', 'CNC / talaşlı imalat', 'Yalın üretim', 'Tedarik zinciri',
  'Gıda güvenliği', 'Gıda analizi', 'Raf ömrü', 'Ambalaj', 'Polimer', 'Kompozit', 'Kimyasal analiz', 'Atık yönetimi',
  'Su arıtma', 'Gömülü sistemler', 'IoT / sensör', 'Elektrik makineleri', 'Güç elektroniği', 'Yazılım', 'Veri analitiği',
  'Ergonomi / İSG', 'Mukavemet / FEA', 'Tuz teknolojisi', 'Mekatronik',
] as const;

export const CATEGORY: Record<NeedCategory, string> = {
  arge: 'Ar-Ge / sorun çözme',
  test: 'Test & analiz',
  danismanlik: 'Danışmanlık',
  egitim: 'Eğitim',
  urun: 'Ürün geliştirme',
};

export const STATUS: Record<NeedStatus, string> = {
  yeni: 'Yeni',
  inceleme: 'TTO inceliyor',
  eslestirme: 'Eşleştiriliyor',
  proje: 'Projede',
  kapandi: 'Tamamlandı',
};

export const BUDGET: Record<Budget, string> = {
  lt100: '100 bin ₺ altı',
  '100_500': '100–500 bin ₺',
  gt500: '500 bin ₺ üzeri',
  belirsiz: 'Henüz belirsiz',
};

export const FUNDING: Record<Funding, string> = {
  oz: 'Öz kaynak',
  tubitak1505: 'TÜBİTAK 1505 (Üniversite–Sanayi İşbirliği)',
  tubitak1501: 'TÜBİTAK 1501 (Sanayi Ar-Ge)',
  kosgeb: 'KOSGEB Ar-Ge desteği',
  bilinmiyor: 'TTO önersin',
};

export const STAGES: { key: Stage; label: string; hint: string }[] = [
  { key: 'gorusme', label: 'Ön görüşme', hint: 'Taraflar sorunu birlikte netleştirir' },
  { key: 'nda', label: 'Gizlilik sözleşmesi', hint: 'TTO standart gizlilik sözleşmesini hazırlar' },
  { key: 'teklif', label: 'Teklif', hint: 'Kapsam, süre ve bütçe teklifi' },
  { key: 'sozlesme', label: 'Sözleşme', hint: 'Üniversite–sanayi sözleşmesi (TTO / döner sermaye)' },
  { key: 'basvuru', label: 'Destek başvurusu', hint: 'Gerekirse TÜBİTAK / KOSGEB başvurusu' },
  { key: 'yurutme', label: 'Yürütme', hint: 'Çalışma sürüyor, ara raporlar' },
  { key: 'tamamlandi', label: 'Tamamlandı', hint: 'Sonuç raporu ve değerlendirme' },
];

/* ------------------------------- Kurumlar --------------------------------- */

export const ORGS: Org[] = [
  { id: 'osb', name: 'Çankırı Organize Sanayi Bölgesi', short: 'Çankırı OSB', type: 'osb' },
  { id: 'tk', name: 'ÇAKÜ Teknokent', short: 'ÇAKÜ Teknokent', type: 'teknokent' },
  { id: 'uni', name: 'Çankırı Karatekin Üniversitesi · TTO', short: 'ÇAKÜ TTO', type: 'universite' },
];

export const orgOf = (id: string) => ORGS.find((o) => o.id === id)!;

/* -------------------------------- Firmalar -------------------------------- */

export const FIRMS: Firm[] = [
  { id: 'f1', name: 'Kuzey Döküm San. A.Ş.', orgId: 'osb', sector: 'Döküm & metal', employees: '120 çalışan', brand: ['#475569', '#0F172A'], tags: [], summary: 'Otomotiv ve tarım makineleri için gri ve sfero döküm parçalar.' },
  { id: 'f2', name: 'Ilgaz Gıda Ürünleri', orgId: 'osb', sector: 'Gıda', employees: '85 çalışan', brand: ['#16A34A', '#065F46'], tags: [], summary: 'Bakliyat işleme, paketleme ve hazır gıda.' },
  { id: 'f3', name: 'Tuzköy Kimya Ltd.', orgId: 'osb', sector: 'Kimya', employees: '40 çalışan', brand: ['#0EA5E9', '#1E3A8A'], tags: [], summary: 'Kaya tuzu işleme ve endüstriyel tuz ürünleri.' },
  { id: 'f4', name: 'Anka Plastik Ambalaj', orgId: 'osb', sector: 'Plastik & ambalaj', employees: '60 çalışan', brand: ['#F59E0B', '#B45309'], tags: [], summary: 'Enjeksiyon ve şişirme kalıplama ile ambalaj üretimi.' },
  { id: 'f5', name: 'Çankırı Makine Sanayi', orgId: 'osb', sector: 'Makine imalatı', employees: '150 çalışan', brand: ['#EF4444', '#7F1D1D'], tags: [], summary: 'Tarım makineleri ve yedek parça imalatı.' },
  // Teknokent firmaları (çözüm sağlayıcı)
  { id: 't1', name: 'Vizyon Görüntü Teknolojileri', orgId: 'tk', sector: 'Yazılım & görüntü işleme', employees: '18 çalışan', brand: ['#FF7A33', '#E05300'], tags: ['Görüntü işleme', 'Yapay zekâ', 'Kalite kontrol', 'Makine öğrenmesi', 'Yazılım'], summary: 'Üretim hatları için kameralı kalite kontrol ve hata tespit yazılımları.' },
  { id: 't2', name: 'Anadolu Elektronik Sistemleri', orgId: 'tk', sector: 'Elektronik', employees: '12 çalışan', brand: ['#2563EB', '#1E40AF'], tags: ['Gömülü sistemler', 'IoT / sensör', 'Otomasyon', 'PLC / SCADA', 'Enerji verimliliği'], summary: 'Endüstriyel sensör, veri toplama ve enerji izleme çözümleri.' },
  { id: 't3', name: 'Mekatek Ar-Ge', orgId: 'tk', sector: 'Mekatronik', employees: '9 çalışan', brand: ['#7C3AED', '#4C1D95'], tags: ['Robotik', 'Mekatronik', 'Otomasyon', 'Mukavemet / FEA', 'CNC / talaşlı imalat'], summary: 'Özel otomasyon hücreleri, robotik besleme ve fikstür tasarımı.' },
];

export const firmOf = (id: string) => FIRMS.find((f) => f.id === id)!;

/* ------------------------------ Laboratuvarlar ---------------------------- */

export const LABS: Lab[] = [
  { id: 'l1', name: 'Malzeme Karakterizasyon Laboratuvarı', department: 'Malzeme Bilimi ve Mühendisliği', equipment: ['SEM-EDS', 'XRD', 'Sertlik ölçüm', 'Metalografi seti'], tags: ['Malzeme karakterizasyonu', 'Metalurji', 'Döküm'], service: 'Ücretli analiz · 5 iş günü' },
  { id: 'l2', name: 'Gıda Analiz Laboratuvarı', department: 'Gıda Mühendisliği', equipment: ['HPLC', 'GC-MS', 'Su aktivitesi ölçer', 'Mikrobiyoloji kabini'], tags: ['Gıda analizi', 'Gıda güvenliği', 'Raf ömrü'], service: 'Akredite analiz · döner sermaye' },
  { id: 'l3', name: 'Yapay Zekâ ve Görü Laboratuvarı', department: 'Bilgisayar Mühendisliği', equipment: ['GPU sunucu (4×A100)', 'Endüstriyel kamera seti', 'Hiperspektral kamera'], tags: ['Yapay zekâ', 'Görüntü işleme', 'Makine öğrenmesi'], service: 'Ortak proje kapsamında kullanım' },
  { id: 'l4', name: 'Enerji Sistemleri Laboratuvarı', department: 'Elektrik-Elektronik Mühendisliği', equipment: ['Güç analizörü', 'Termal kamera', 'Motor test standı'], tags: ['Enerji verimliliği', 'Elektrik makineleri', 'Güç elektroniği'], service: 'Saha ölçümü + rapor' },
  { id: 'l5', name: 'Polimer ve Kompozit Laboratuvarı', department: 'Kimya Mühendisliği', equipment: ['DSC / TGA', 'Çekme test cihazı', 'FTIR'], tags: ['Polimer', 'Kompozit', 'Kimyasal analiz', 'Ambalaj'], service: 'Ücretli analiz · 7 iş günü' },
];

export const labOf = (id: string) => LABS.find((l) => l.id === id)!;

/* ------------------------------ Akademisyenler ---------------------------- */

export const SEED_ACADEMICS: Academic[] = [
  { id: 'a1', name: 'Doç. Dr. Elif Arslan', title: 'Doçent', department: 'Malzeme Bilimi ve Mühendisliği', orgId: 'uni', email: 'elif.arslan@karatekin.edu.tr', tags: ['Döküm', 'Metalurji', 'Malzeme karakterizasyonu', 'Isıl işlem', 'Tahribatsız muayene'], summary: 'Dökme demir ve alüminyum alaşımlarında gözenek, çekinti ve mikroyapı kusurları; döküm simülasyonu ve ısıl işlem optimizasyonu.', labIds: ['l1'], industryProjects: 7, publications: 42, availability: 'uygun', approved: true, brand: ['#FF7A33', '#E05300'] },
  { id: 'a2', name: 'Dr. Öğr. Üyesi Murat Kaya', title: 'Dr. Öğr. Üyesi', department: 'Bilgisayar Mühendisliği', orgId: 'uni', email: 'murat.kaya@karatekin.edu.tr', tags: ['Görüntü işleme', 'Yapay zekâ', 'Makine öğrenmesi', 'Kalite kontrol'], summary: 'Derin öğrenme ile yüzey hatası tespiti, endüstriyel görüntü işleme ve gömülü yapay zekâ.', labIds: ['l3'], industryProjects: 4, publications: 27, availability: 'uygun', approved: true, brand: ['#2563EB', '#1E3A8A'] },
  { id: 'a3', name: 'Prof. Dr. Ayşe Demir', title: 'Profesör', department: 'Gıda Mühendisliği', orgId: 'uni', email: 'ayse.demir@karatekin.edu.tr', tags: ['Gıda güvenliği', 'Gıda analizi', 'Raf ömrü', 'Ambalaj'], summary: 'Bakliyat ve tahıl ürünlerinde raf ömrü uzatma, modifiye atmosfer ambalajlama ve gıda güvenliği sistemleri.', labIds: ['l2'], industryProjects: 11, publications: 68, availability: 'sinirli', approved: true, brand: ['#16A34A', '#065F46'] },
  { id: 'a4', name: 'Doç. Dr. Hakan Yıldız', title: 'Doçent', department: 'Makine Mühendisliği', orgId: 'uni', email: 'hakan.yildiz@karatekin.edu.tr', tags: ['Enerji verimliliği', 'Isı transferi', 'Akışkanlar mekaniği', 'Mukavemet / FEA'], summary: 'Endüstriyel fırın ve kurutucularda enerji verimliliği, atık ısı geri kazanımı, sayısal akış analizi.', labIds: ['l4'], industryProjects: 6, publications: 35, availability: 'uygun', approved: true, brand: ['#DC2626', '#7F1D1D'] },
  { id: 'a5', name: 'Dr. Öğr. Üyesi Zeynep Çelik', title: 'Dr. Öğr. Üyesi', department: 'Kimya Mühendisliği', orgId: 'uni', email: 'zeynep.celik@karatekin.edu.tr', tags: ['Polimer', 'Kompozit', 'Kimyasal analiz', 'Ambalaj', 'Atık yönetimi'], summary: 'Geri dönüştürülmüş polimerlerin ambalajda kullanımı, biyobozunur kompozitler.', labIds: ['l5'], industryProjects: 3, publications: 19, availability: 'uygun', approved: true, brand: ['#F59E0B', '#92400E'] },
  { id: 'a6', name: 'Prof. Dr. Serkan Öztürk', title: 'Profesör', department: 'Elektrik-Elektronik Mühendisliği', orgId: 'uni', email: 'serkan.ozturk@karatekin.edu.tr', tags: ['Elektrik makineleri', 'Güç elektroniği', 'Enerji verimliliği', 'IoT / sensör', 'Otomasyon'], summary: 'Motor sürücüleri, kompanzasyon ve fabrika enerji izleme sistemleri.', labIds: ['l4'], industryProjects: 9, publications: 54, availability: 'dolu', approved: true, brand: ['#0EA5E9', '#075985'] },
  { id: 'a7', name: 'Dr. Öğr. Üyesi Burak Şahin', title: 'Dr. Öğr. Üyesi', department: 'Endüstri Mühendisliği', orgId: 'uni', email: 'burak.sahin@karatekin.edu.tr', tags: ['Yalın üretim', 'Tedarik zinciri', 'Veri analitiği', 'Ergonomi / İSG'], summary: 'Üretim planlama, yalın dönüşüm, fire ve duruş analizi.', labIds: [], industryProjects: 5, publications: 22, availability: 'uygun', approved: true, brand: ['#7C3AED', '#4C1D95'] },
  { id: 'a8', name: 'Doç. Dr. Can Aydın', title: 'Doçent', department: 'Kimya', orgId: 'uni', email: 'can.aydin@karatekin.edu.tr', tags: ['Tuz teknolojisi', 'Kimyasal analiz', 'Su arıtma', 'Atık yönetimi'], summary: 'Kaya tuzu saflaştırma, topaklanma önleyiciler ve tuzlu atık su arıtımı.', labIds: [], industryProjects: 2, publications: 31, availability: 'uygun', approved: true, brand: ['#14B8A6', '#115E59'] },
  // Kendi kaydını yapmış, TTO onayı bekleyenler
  { id: 'a9', name: 'Dr. Öğr. Üyesi Deniz Koç', title: 'Dr. Öğr. Üyesi', department: 'Makine Mühendisliği', orgId: 'uni', email: 'deniz.koc@karatekin.edu.tr', tags: ['Robotik', 'Mekatronik', 'Otomasyon', 'CNC / talaşlı imalat'], summary: 'Endüstriyel robot programlama, esnek üretim hücreleri.', labIds: [], industryProjects: 1, publications: 12, availability: 'uygun', approved: false, brand: ['#64748B', '#1E293B'] },
  { id: 'a10', name: 'Arş. Gör. Dr. Selin Er', title: 'Arş. Gör. Dr.', department: 'Gıda Mühendisliği', orgId: 'uni', email: 'selin.er@karatekin.edu.tr', tags: ['Gıda analizi', 'Raf ömrü'], summary: 'Fonksiyonel gıdalar ve duyusal analiz.', labIds: ['l2'], industryProjects: 0, publications: 8, availability: 'uygun', approved: false, brand: ['#84CC16', '#3F6212'] },
];

/* ------------------------------ Örnek ihtiyaçlar --------------------------- */

const DAY = 86_400_000;

export function seedState(now = Date.now()): KopruState {
  const ago = (d: number) => now - d * DAY;
  const needs: Need[] = [
    {
      id: 'n1', firmId: 'f2', title: 'Kuru fasulye paketlerinde raf ömrü ve böceklenme sorunu', category: 'arge',
      summary: 'Depolamada 4. aydan sonra böceklenme ve nem kaynaklı kalite kaybı yaşanıyor.',
      details: 'Yıllık 2.000 ton ürün; mevcut ambalaj tek kat PE. İhracat müşterisi 12 ay raf ömrü istiyor. Modifiye atmosfer veya ambalaj değişikliği seçenekleri değerlendirilmeli.',
      tags: ['Raf ömrü', 'Gıda güvenliği', 'Ambalaj', 'Gıda analizi'], budget: '100_500', funding: 'tubitak1505', urgency: 'normal', confidential: false,
      status: 'proje', createdAt: ago(48), ttoOwner: 'Uzm. Gökhan Yalçın', ttoNote: 'TÜBİTAK 1505 için uygun; 2. dönem başvurusuna yetişebilir.',
      invites: [
        { solverId: 'a3', kind: 'academic', by: 'tto', status: 'kabul', at: ago(45), ndaAt: ago(44) },
        { solverId: 'a5', kind: 'academic', by: 'tto', status: 'kabul', at: ago(45) },
      ],
      projectId: 'p1',
      events: [
        { at: ago(48), actor: 'Ilgaz Gıda Ürünleri', text: 'İhtiyaç bildirildi' },
        { at: ago(46), actor: 'ÇAKÜ TTO', text: 'İhtiyaç incelendi, 2 akademisyene yönlendirildi' },
        { at: ago(43), actor: 'Prof. Dr. Ayşe Demir', text: 'Davet kabul edildi' },
        { at: ago(40), actor: 'Ilgaz Gıda Ürünleri', text: 'Prof. Dr. Ayşe Demir ile proje başlatıldı' },
      ],
    },
    {
      id: 'n2', firmId: 'f5', title: 'Boya kurutma fırınında yüksek doğalgaz tüketimi', category: 'danismanlik',
      summary: 'Fırın tüketimi sektör ortalamasının %30 üzerinde; atık ısı geri kazanımı araştırılıyor.',
      details: 'Konveyörlü boya fırını, 180 °C, günde 2 vardiya. Baca gazı sıcaklığı 220 °C ölçüldü.',
      tags: ['Enerji verimliliği', 'Isı transferi'], budget: 'lt100', funding: 'oz', urgency: 'normal', confidential: false,
      status: 'kapandi', createdAt: ago(120), ttoOwner: 'Uzm. Gökhan Yalçın',
      invites: [{ solverId: 'a4', kind: 'academic', by: 'tto', status: 'kabul', at: ago(118) }],
      projectId: 'p2',
      events: [
        { at: ago(120), actor: 'Çankırı Makine Sanayi', text: 'İhtiyaç bildirildi' },
        { at: ago(118), actor: 'ÇAKÜ TTO', text: 'Doç. Dr. Hakan Yıldız’a yönlendirildi' },
        { at: ago(20), actor: 'ÇAKÜ TTO', text: 'Proje tamamlandı · yıllık %18 tasarruf raporlandı' },
      ],
    },
    {
      id: 'n3', firmId: 'f4', title: 'Geri dönüştürülmüş PET oranını artırma', category: 'urun',
      summary: 'Şişelerde rPET oranını %25’ten %50’ye çıkarırken mukavemet ve renk sorunları.',
      details: 'Şişirme kalıplamada rPET oranı arttıkça sararma ve tepe yükü düşüşü görülüyor. Hammadde tedarikçisi değiştirilemiyor.',
      tags: ['Polimer', 'Ambalaj', 'Kimyasal analiz'], budget: '100_500', funding: 'tubitak1501', urgency: 'normal', confidential: true,
      status: 'eslestirme', createdAt: ago(9), ttoOwner: 'Uzm. Gökhan Yalçın', ttoNote: 'Firma 1501 deneyimli; akademisyen danışman olarak eklenebilir.',
      invites: [
        { solverId: 'a5', kind: 'academic', by: 'tto', status: 'bekliyor', at: ago(6) },
      ],
      events: [
        { at: ago(9), actor: 'Anka Plastik Ambalaj', text: 'İhtiyaç bildirildi (gizli)' },
        { at: ago(6), actor: 'ÇAKÜ TTO', text: 'Dr. Öğr. Üyesi Zeynep Çelik’e yönlendirildi' },
      ],
    },
    {
      id: 'n4', firmId: 'f3', title: 'Tuzda topaklanma ve beyazlık değerinin düşmesi', category: 'test',
      summary: 'Nemli aylarda paketli tuzda topaklanma; beyazlık değeri müşteri spesifikasyonunun altına iniyor.',
      details: 'Mevcut topaklanma önleyici dozajı ve kurutma koşulları gözden geçirilmeli; numune analizi gerekli.',
      tags: ['Tuz teknolojisi', 'Kimyasal analiz'], budget: 'lt100', funding: 'oz', urgency: 'acil', confidential: false,
      status: 'yeni', createdAt: ago(1),
      invites: [],
      events: [{ at: ago(1), actor: 'Tuzköy Kimya Ltd.', text: 'İhtiyaç bildirildi' }],
    },
    {
      id: 'n5', firmId: 'f5', title: 'Montaj hattında duruş ve fire analizi', category: 'danismanlik',
      summary: 'Hat verimliliği %62; duruş nedenleri kayıt altında değil.',
      details: 'Üç montaj hattı, kâğıt formla duruş takibi. OEE ölçümü ve yalın dönüşüm yol haritası isteniyor.',
      tags: ['Yalın üretim', 'Veri analitiği', 'IoT / sensör'], budget: '100_500', funding: 'kosgeb', urgency: 'normal', confidential: false,
      status: 'inceleme', createdAt: ago(3), ttoOwner: 'Uzm. Gökhan Yalçın',
      invites: [],
      events: [
        { at: ago(3), actor: 'Çankırı Makine Sanayi', text: 'İhtiyaç bildirildi' },
        { at: ago(2), actor: 'ÇAKÜ TTO', text: 'İnceleme başladı' },
      ],
    },
  ];

  const projects: Project[] = [
    {
      id: 'p1', needId: 'n1', solverId: 'a3', kind: 'academic', stage: 'basvuru', value: 480_000, program: 'tubitak1505', startedAt: ago(40),
      history: [
        { at: ago(40), stage: 'gorusme' }, { at: ago(35), stage: 'nda' }, { at: ago(28), stage: 'teklif' }, { at: ago(18), stage: 'sozlesme' }, { at: ago(7), stage: 'basvuru' },
      ],
      messages: [
        { at: ago(39), from: 'cozucu', name: 'Prof. Dr. Ayşe Demir', text: 'Depodan farklı aylara ait numuneler alabilir miyiz? Nem ve sıcaklık kaydı varsa çok işimize yarar.' },
        { at: ago(38), from: 'firma', name: 'Ilgaz Gıda Ürünleri', text: 'Elbette, son 6 ayın depo kayıtlarını paylaşacağız. Numuneleri perşembe teslim ederiz.' },
        { at: ago(8), from: 'tto', name: 'ÇAKÜ TTO', text: 'TÜBİTAK 1505 başvuru taslağı hazır; bütçe tablosunu birlikte son kez gözden geçirelim.' },
      ],
    },
    {
      id: 'p2', needId: 'n2', solverId: 'a4', kind: 'academic', stage: 'tamamlandi', value: 85_000, program: 'oz', startedAt: ago(115), closedAt: ago(20),
      history: [
        { at: ago(115), stage: 'gorusme' }, { at: ago(110), stage: 'teklif' }, { at: ago(100), stage: 'sozlesme' }, { at: ago(95), stage: 'yurutme' }, { at: ago(20), stage: 'tamamlandi' },
      ],
      messages: [{ at: ago(20), from: 'cozucu', name: 'Doç. Dr. Hakan Yıldız', text: 'Sonuç raporu yüklendi: reküperatör ile yıllık yaklaşık %18 doğalgaz tasarrufu öngörülüyor.' }],
    },
  ];

  return { version: 1, needs, projects, academics: SEED_ACADEMICS.map((a) => ({ ...a })) };
}

/* -------------------------------- Kişiler ---------------------------------- */

/** Demo rolleri: her rol için kim olarak giriş yapıldığı */
export const PERSONAS: Record<Role, { name: string; title: string; orgId: string; firmId?: string; academicId?: string }> = {
  firma: { name: 'Mehmet Kurt', title: 'Üretim Müdürü · Kuzey Döküm', orgId: 'osb', firmId: 'f1' },
  akademisyen: { name: 'Doç. Dr. Elif Arslan', title: 'Malzeme Bilimi ve Mühendisliği', orgId: 'uni', academicId: 'a1' },
  tto: { name: 'Uzm. Gökhan Yalçın', title: 'Sanayi İlişkileri · ÇAKÜ TTO', orgId: 'uni' },
  osb: { name: 'Nurcan Aksoy', title: 'Bölge Müdürü · Çankırı OSB', orgId: 'osb' },
  teknokent: { name: 'Selim Yılmaz', title: 'Genel Müdür · ÇAKÜ Teknokent', orgId: 'tk' },
};

export const ROLE_LABEL: Record<Role, string> = {
  firma: 'OSB firması',
  akademisyen: 'Akademisyen',
  tto: 'TTO uzmanı',
  osb: 'OSB yönetimi',
  teknokent: 'Teknokent yönetimi',
};

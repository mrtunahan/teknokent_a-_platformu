/**
 * Sanayi–Akademi Köprüsü (OSB · Teknokent · TTO) demosu: tipler ve örnek veri.
 * Kişi ve firma adları kurgusaldır.
 */

export type OrgType = 'osb' | 'teknokent' | 'universite';
export type Role = 'firma' | 'tfirma' | 'akademisyen' | 'tto' | 'osb' | 'teknokent' | 'platform';
/** Kurum adına bakılan yönetici rolleri */
export type OrgRole = 'tto' | 'osb' | 'teknokent';

export interface Org {
  id: string;
  name: string;
  short: string;
  type: OrgType;
  city: string;
  /** Teknokentin bağlı olduğu üniversite */
  universityId?: string;
  /** Üniversitenin teknoloji transfer ofisi adı */
  tto?: string;
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
  universityId: string;
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
  /** Daveti gönderen TTO (üniversite kimliği) */
  byOrg?: string;
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
  /** il: firmanın ilindeki TTO'lar · ag: tüm ağ */
  route: 'il' | 'ag';
  /** İhtiyacın düştüğü TTO'lar (üniversite kimlikleri) */
  ttoIds: string[];
  /** İncelemeyi üstlenen TTO */
  ttoOrg?: string;
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

/** Uygulama içi bildirim. `to`: alıcı kutusu (bkz. store.inboxKeyOf), `link`: rol yolundan sonraki kısım (ör. "ihtiyaclar/n1") */
export interface Notification {
  id: string;
  to: string;
  text: string;
  link?: string;
  at: number;
  read: boolean;
  kind?: string;
}

export interface KopruState {
  version: number;
  notifications: Notification[];
  /** Özellik modüllerinin kalıcı verisi (her modül kendi anahtarını kullanır) */
  ext: Record<string, unknown>;
  /** Yönetici rollerinde hangi kurum adına bakıldığı */
  orgSel: Record<OrgRole, string>;
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
  'Ergonomi / İSG', 'Mukavemet / FEA', 'Tuz teknolojisi', 'Mekatronik', 'Ahşap / orman ürünleri',
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

// Kurum adları örnektir; gerçek kurum listesiyle değiştirilecek
export const ORGS: Org[] = [
  // Üniversiteler ve TTO'ları
  { id: 'u-caku', name: 'Çankırı Karatekin Üniversitesi', short: 'ÇAKÜ', type: 'universite', city: 'Çankırı', tto: 'ÇAKÜ TTO' },
  { id: 'u-kastamonu', name: 'Kastamonu Üniversitesi', short: 'KÜ', type: 'universite', city: 'Kastamonu', tto: 'KÜ TTO' },
  { id: 'u-karabuk', name: 'Karabük Üniversitesi', short: 'KBÜ', type: 'universite', city: 'Karabük', tto: 'KBÜ TTO' },
  // Teknokentler
  { id: 'tk-caku', name: 'ÇAKÜ Teknokent', short: 'ÇAKÜ Teknokent', type: 'teknokent', city: 'Çankırı', universityId: 'u-caku' },
  { id: 'tk-kastamonu', name: 'Kastamonu Teknokent', short: 'Kastamonu Teknokent', type: 'teknokent', city: 'Kastamonu', universityId: 'u-kastamonu' },
  { id: 'tk-karabuk', name: 'Karabük Teknokent', short: 'Karabük Teknokent', type: 'teknokent', city: 'Karabük', universityId: 'u-karabuk' },
  // Organize sanayi bölgeleri
  { id: 'osb-cankiri', name: 'Çankırı Organize Sanayi Bölgesi', short: 'Çankırı OSB', type: 'osb', city: 'Çankırı' },
  { id: 'osb-cankiri2', name: 'Çankırı 2. Organize Sanayi Bölgesi', short: 'Çankırı 2. OSB', type: 'osb', city: 'Çankırı' },
  { id: 'osb-kastamonu', name: 'Kastamonu Organize Sanayi Bölgesi', short: 'Kastamonu OSB', type: 'osb', city: 'Kastamonu' },
  { id: 'osb-karabuk', name: 'Karabük Organize Sanayi Bölgesi', short: 'Karabük OSB', type: 'osb', city: 'Karabük' },
];

export const CITIES = [...new Set(ORGS.map((o) => o.city))];
export const orgOf = (id: string) => ORGS.find((o) => o.id === id)!;
export const orgsOfType = (t: OrgType) => ORGS.filter((o) => o.type === t);
export const ttoName = (universityId: string) => orgOf(universityId).tto ?? orgOf(universityId).short;
/** Firmanın ilindeki üniversiteler (yoksa tüm ağ) */
export const localTtos = (city: string) => {
  const l = ORGS.filter((o) => o.type === 'universite' && o.city === city).map((o) => o.id);
  return l.length ? l : orgsOfType('universite').map((o) => o.id);
};

/* -------------------------------- Firmalar -------------------------------- */

export const FIRMS: Firm[] = [
  { id: 'f1', name: 'Kuzey Döküm San. A.Ş.', orgId: 'osb-cankiri', sector: 'Döküm & metal', employees: '120 çalışan', brand: ['#475569', '#0F172A'], tags: [], summary: 'Otomotiv ve tarım makineleri için gri ve sfero döküm parçalar.' },
  { id: 'f2', name: 'Ilgaz Gıda Ürünleri', orgId: 'osb-cankiri2', sector: 'Gıda', employees: '85 çalışan', brand: ['#16A34A', '#065F46'], tags: [], summary: 'Bakliyat işleme, paketleme ve hazır gıda.' },
  { id: 'f3', name: 'Tuzköy Kimya Ltd.', orgId: 'osb-cankiri2', sector: 'Kimya', employees: '40 çalışan', brand: ['#0EA5E9', '#1E3A8A'], tags: [], summary: 'Kaya tuzu işleme ve endüstriyel tuz ürünleri.' },
  { id: 'f4', name: 'Anka Plastik Ambalaj', orgId: 'osb-kastamonu', sector: 'Plastik & ambalaj', employees: '60 çalışan', brand: ['#F59E0B', '#B45309'], tags: [], summary: 'Enjeksiyon ve şişirme kalıplama ile ambalaj üretimi.' },
  { id: 'f5', name: 'Çankırı Makine Sanayi', orgId: 'osb-cankiri', sector: 'Makine imalatı', employees: '150 çalışan', brand: ['#EF4444', '#7F1D1D'], tags: [], summary: 'Tarım makineleri ve yedek parça imalatı.' },
  { id: 'f6', name: 'Demirçelik Döküm Ltd.', orgId: 'osb-karabuk', sector: 'Çelik döküm', employees: '210 çalışan', brand: ['#334155', '#020617'], tags: [], summary: 'Raylı sistemler ve iş makineleri için çelik döküm.' },
  { id: 'f7', name: 'Kastamonu Ahşap Panel', orgId: 'osb-kastamonu', sector: 'Orman ürünleri', employees: '180 çalışan', brand: ['#A16207', '#713F12'], tags: [], summary: 'MDF, yonga levha ve kaplamalı panel üretimi.' },
  // Teknokent firmaları (çözüm sağlayıcı). t0 = TeknoOrtak demosundaki "Orion Yazılım" (Teknokent firması rolü)
  { id: 't0', name: 'Orion Yazılım', orgId: 'tk-caku', sector: 'Endüstriyel yazılım', employees: '24 çalışan', brand: ['#334155', '#0F172A'], tags: ['Yazılım', 'Veri analitiği', 'IoT / sensör', 'Yapay zekâ', 'Otomasyon'], summary: 'Üretim ve enerji verilerini tek bulut platformunda toplayan, gerçek zamanlı OEE ve duruş analitiği sunan yazılım.' },
  { id: 't1', name: 'Vizyon Görüntü Teknolojileri', orgId: 'tk-caku', sector: 'Yazılım & görüntü işleme', employees: '18 çalışan', brand: ['#FF7A33', '#E05300'], tags: ['Görüntü işleme', 'Yapay zekâ', 'Kalite kontrol', 'Makine öğrenmesi', 'Yazılım'], summary: 'Üretim hatları için kameralı kalite kontrol ve hata tespit yazılımları.' },
  { id: 't2', name: 'Anadolu Elektronik Sistemleri', orgId: 'tk-kastamonu', sector: 'Elektronik', employees: '12 çalışan', brand: ['#2563EB', '#1E40AF'], tags: ['Gömülü sistemler', 'IoT / sensör', 'Otomasyon', 'PLC / SCADA', 'Enerji verimliliği'], summary: 'Endüstriyel sensör, veri toplama ve enerji izleme çözümleri.' },
  { id: 't3', name: 'Mekatek Ar-Ge', orgId: 'tk-karabuk', sector: 'Mekatronik', employees: '9 çalışan', brand: ['#7C3AED', '#4C1D95'], tags: ['Robotik', 'Mekatronik', 'Otomasyon', 'Mukavemet / FEA', 'CNC / talaşlı imalat'], summary: 'Özel otomasyon hücreleri, robotik besleme ve fikstür tasarımı.' },
];

export const firmOf = (id: string) => FIRMS.find((f) => f.id === id)!;
export const isTechFirm = (f: Firm) => orgOf(f.orgId).type === 'teknokent';
export const cityOfFirm = (id: string) => orgOf(firmOf(id).orgId).city;

/* ------------------------------ Laboratuvarlar ---------------------------- */

export const LABS: Lab[] = [
  { id: 'l1', name: 'Malzeme Karakterizasyon Laboratuvarı', department: 'Malzeme Bilimi ve Mühendisliği', equipment: ['SEM-EDS', 'XRD', 'Sertlik ölçüm', 'Metalografi seti'], tags: ['Malzeme karakterizasyonu', 'Metalurji', 'Döküm'], service: 'Ücretli analiz · 5 iş günü', universityId: 'u-caku' },
  { id: 'l2', name: 'Gıda Analiz Laboratuvarı', department: 'Gıda Mühendisliği', equipment: ['HPLC', 'GC-MS', 'Su aktivitesi ölçer', 'Mikrobiyoloji kabini'], tags: ['Gıda analizi', 'Gıda güvenliği', 'Raf ömrü'], service: 'Akredite analiz · döner sermaye', universityId: 'u-caku' },
  { id: 'l3', name: 'Yapay Zekâ ve Görü Laboratuvarı', department: 'Bilgisayar Mühendisliği', equipment: ['GPU sunucu (4×A100)', 'Endüstriyel kamera seti', 'Hiperspektral kamera'], tags: ['Yapay zekâ', 'Görüntü işleme', 'Makine öğrenmesi'], service: 'Ortak proje kapsamında kullanım', universityId: 'u-caku' },
  { id: 'l4', name: 'Enerji Sistemleri Laboratuvarı', department: 'Elektrik-Elektronik Mühendisliği', equipment: ['Güç analizörü', 'Termal kamera', 'Motor test standı'], tags: ['Enerji verimliliği', 'Elektrik makineleri', 'Güç elektroniği'], service: 'Saha ölçümü + rapor', universityId: 'u-caku' },
  { id: 'l5', name: 'Polimer ve Kompozit Laboratuvarı', department: 'Kimya Mühendisliği', equipment: ['DSC / TGA', 'Çekme test cihazı', 'FTIR'], tags: ['Polimer', 'Kompozit', 'Kimyasal analiz', 'Ambalaj'], service: 'Ücretli analiz · 7 iş günü', universityId: 'u-caku' },
];

LABS.push(
  { id: 'l6', name: 'Döküm ve Isıl İşlem Laboratuvarı', department: 'Metalurji ve Malzeme Mühendisliği', equipment: ['İndüksiyon ocağı', 'Spektrometre', 'Endüstriyel röntgen', 'Isıl işlem fırınları'], tags: ['Döküm', 'Metalurji', 'Isıl işlem', 'Tahribatsız muayene'], service: 'Ücretli analiz · deneme dökümü', universityId: 'u-karabuk' },
  { id: 'l7', name: 'Ahşap Malzeme Test Laboratuvarı', department: 'Orman Endüstri Mühendisliği', equipment: ['Formaldehit emisyon odası', 'Eğilme / çekme test cihazı', 'Nem-iklim kabini'], tags: ['Ahşap / orman ürünleri', 'Kompozit', 'Kimyasal analiz'], service: 'Akredite test · TSE uyumlu rapor', universityId: 'u-kastamonu' },
);

export const labOf = (id: string) => LABS.find((l) => l.id === id)!;

/* ------------------------------ Akademisyenler ---------------------------- */

export const SEED_ACADEMICS: Academic[] = [
  { id: 'a1', name: 'Doç. Dr. Elif Arslan', title: 'Doçent', department: 'Malzeme Bilimi ve Mühendisliği', orgId: 'u-caku', email: 'elif.arslan@karatekin.edu.tr', tags: ['Döküm', 'Metalurji', 'Malzeme karakterizasyonu', 'Isıl işlem', 'Tahribatsız muayene'], summary: 'Dökme demir ve alüminyum alaşımlarında gözenek, çekinti ve mikroyapı kusurları; döküm simülasyonu ve ısıl işlem optimizasyonu.', labIds: ['l1'], industryProjects: 7, publications: 42, availability: 'uygun', approved: true, brand: ['#FF7A33', '#E05300'] },
  { id: 'a2', name: 'Dr. Öğr. Üyesi Murat Kaya', title: 'Dr. Öğr. Üyesi', department: 'Bilgisayar Mühendisliği', orgId: 'u-caku', email: 'murat.kaya@karatekin.edu.tr', tags: ['Görüntü işleme', 'Yapay zekâ', 'Makine öğrenmesi', 'Kalite kontrol'], summary: 'Derin öğrenme ile yüzey hatası tespiti, endüstriyel görüntü işleme ve gömülü yapay zekâ.', labIds: ['l3'], industryProjects: 4, publications: 27, availability: 'uygun', approved: true, brand: ['#2563EB', '#1E3A8A'] },
  { id: 'a3', name: 'Prof. Dr. Ayşe Demir', title: 'Profesör', department: 'Gıda Mühendisliği', orgId: 'u-caku', email: 'ayse.demir@karatekin.edu.tr', tags: ['Gıda güvenliği', 'Gıda analizi', 'Raf ömrü', 'Ambalaj'], summary: 'Bakliyat ve tahıl ürünlerinde raf ömrü uzatma, modifiye atmosfer ambalajlama ve gıda güvenliği sistemleri.', labIds: ['l2'], industryProjects: 11, publications: 68, availability: 'sinirli', approved: true, brand: ['#16A34A', '#065F46'] },
  { id: 'a4', name: 'Doç. Dr. Hakan Yıldız', title: 'Doçent', department: 'Makine Mühendisliği', orgId: 'u-caku', email: 'hakan.yildiz@karatekin.edu.tr', tags: ['Enerji verimliliği', 'Isı transferi', 'Akışkanlar mekaniği', 'Mukavemet / FEA'], summary: 'Endüstriyel fırın ve kurutucularda enerji verimliliği, atık ısı geri kazanımı, sayısal akış analizi.', labIds: ['l4'], industryProjects: 6, publications: 35, availability: 'uygun', approved: true, brand: ['#DC2626', '#7F1D1D'] },
  { id: 'a5', name: 'Dr. Öğr. Üyesi Zeynep Çelik', title: 'Dr. Öğr. Üyesi', department: 'Kimya Mühendisliği', orgId: 'u-caku', email: 'zeynep.celik@karatekin.edu.tr', tags: ['Polimer', 'Kompozit', 'Kimyasal analiz', 'Ambalaj', 'Atık yönetimi'], summary: 'Geri dönüştürülmüş polimerlerin ambalajda kullanımı, biyobozunur kompozitler.', labIds: ['l5'], industryProjects: 3, publications: 19, availability: 'uygun', approved: true, brand: ['#F59E0B', '#92400E'] },
  { id: 'a6', name: 'Prof. Dr. Serkan Öztürk', title: 'Profesör', department: 'Elektrik-Elektronik Mühendisliği', orgId: 'u-caku', email: 'serkan.ozturk@karatekin.edu.tr', tags: ['Elektrik makineleri', 'Güç elektroniği', 'Enerji verimliliği', 'IoT / sensör', 'Otomasyon'], summary: 'Motor sürücüleri, kompanzasyon ve fabrika enerji izleme sistemleri.', labIds: ['l4'], industryProjects: 9, publications: 54, availability: 'dolu', approved: true, brand: ['#0EA5E9', '#075985'] },
  { id: 'a7', name: 'Dr. Öğr. Üyesi Burak Şahin', title: 'Dr. Öğr. Üyesi', department: 'Endüstri Mühendisliği', orgId: 'u-caku', email: 'burak.sahin@karatekin.edu.tr', tags: ['Yalın üretim', 'Tedarik zinciri', 'Veri analitiği', 'Ergonomi / İSG'], summary: 'Üretim planlama, yalın dönüşüm, fire ve duruş analizi.', labIds: [], industryProjects: 5, publications: 22, availability: 'uygun', approved: true, brand: ['#7C3AED', '#4C1D95'] },
  { id: 'a8', name: 'Doç. Dr. Can Aydın', title: 'Doçent', department: 'Kimya', orgId: 'u-caku', email: 'can.aydin@karatekin.edu.tr', tags: ['Tuz teknolojisi', 'Kimyasal analiz', 'Su arıtma', 'Atık yönetimi'], summary: 'Kaya tuzu saflaştırma, topaklanma önleyiciler ve tuzlu atık su arıtımı.', labIds: [], industryProjects: 2, publications: 31, availability: 'uygun', approved: true, brand: ['#14B8A6', '#115E59'] },
  // Diğer üniversiteler
  { id: 'a11', name: 'Prof. Dr. Orhan Güneş', title: 'Profesör', department: 'Metalurji ve Malzeme Mühendisliği', orgId: 'u-karabuk', email: 'orhan.gunes@karabuk.edu.tr', tags: ['Döküm', 'Metalurji', 'Isıl işlem', 'Kaynak teknolojisi', 'Tahribatsız muayene'], summary: 'Çelik ve dökme demir döküm teknolojisi, besleyici tasarımı, ergitme pratiği ve radyografik muayene.', labIds: ['l6'], industryProjects: 14, publications: 88, availability: 'sinirli', approved: true, brand: ['#334155', '#0F172A'] },
  { id: 'a12', name: 'Doç. Dr. Sevgi Aksoy', title: 'Doçent', department: 'Orman Endüstri Mühendisliği', orgId: 'u-kastamonu', email: 'sevgi.aksoy@kastamonu.edu.tr', tags: ['Ahşap / orman ürünleri', 'Kompozit', 'Polimer', 'Kimyasal analiz'], summary: 'Ahşap kompozit paneller, düşük formaldehitli tutkallar ve emisyon azaltma.', labIds: ['l7'], industryProjects: 6, publications: 40, availability: 'uygun', approved: true, brand: ['#A16207', '#713F12'] },
  { id: 'a13', name: 'Dr. Öğr. Üyesi Emre Tan', title: 'Dr. Öğr. Üyesi', department: 'Gıda Mühendisliği', orgId: 'u-kastamonu', email: 'emre.tan@kastamonu.edu.tr', tags: ['Gıda analizi', 'Gıda güvenliği', 'Raf ömrü'], summary: 'Kuru gıdalarda depolama zararlıları ve kontrollü atmosfer uygulamaları.', labIds: [], industryProjects: 2, publications: 17, availability: 'uygun', approved: true, brand: ['#059669', '#064E3B'] },
  { id: 'a14', name: 'Doç. Dr. Kerem Ateş', title: 'Doçent', department: 'Mekatronik Mühendisliği', orgId: 'u-karabuk', email: 'kerem.ates@karabuk.edu.tr', tags: ['Robotik', 'Mekatronik', 'Otomasyon', 'Görüntü işleme'], summary: 'Robotik montaj, görüntü tabanlı robot kılavuzlama ve hat otomasyonu.', labIds: [], industryProjects: 5, publications: 33, availability: 'uygun', approved: true, brand: ['#0F766E', '#134E4A'] },
  // Kendi kaydını yapmış, TTO onayı bekleyenler
  { id: 'a9', name: 'Dr. Öğr. Üyesi Deniz Koç', title: 'Dr. Öğr. Üyesi', department: 'Makine Mühendisliği', orgId: 'u-caku', email: 'deniz.koc@karatekin.edu.tr', tags: ['Robotik', 'Mekatronik', 'Otomasyon', 'CNC / talaşlı imalat'], summary: 'Endüstriyel robot programlama, esnek üretim hücreleri.', labIds: [], industryProjects: 1, publications: 12, availability: 'uygun', approved: false, brand: ['#64748B', '#1E293B'] },
  { id: 'a15', name: 'Dr. Öğr. Üyesi Tolga Er', title: 'Dr. Öğr. Üyesi', department: 'İmalat Mühendisliği', orgId: 'u-karabuk', email: 'tolga.er@karabuk.edu.tr', tags: ['CNC / talaşlı imalat', 'Yalın üretim'], summary: 'Talaşlı imalatta takım ömrü ve süreç optimizasyonu.', labIds: [], industryProjects: 1, publications: 9, availability: 'uygun', approved: false, brand: ['#475569', '#1E293B'] },
  { id: 'a10', name: 'Arş. Gör. Dr. Selin Er', title: 'Arş. Gör. Dr.', department: 'Gıda Mühendisliği', orgId: 'u-caku', email: 'selin.er@karatekin.edu.tr', tags: ['Gıda analizi', 'Raf ömrü'], summary: 'Fonksiyonel gıdalar ve duyusal analiz.', labIds: ['l2'], industryProjects: 0, publications: 8, availability: 'uygun', approved: false, brand: ['#84CC16', '#3F6212'] },
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
      status: 'proje', createdAt: ago(48), route: 'il', ttoIds: ['u-caku'], ttoOrg: 'u-caku', ttoOwner: 'Uzm. Gökhan Yalçın', ttoNote: 'TÜBİTAK 1505 için uygun; 2. dönem başvurusuna yetişebilir.',
      invites: [
        { solverId: 'a3', kind: 'academic', by: 'tto', byOrg: 'u-caku', status: 'kabul', at: ago(45), ndaAt: ago(44) },
        { solverId: 'a5', kind: 'academic', by: 'tto', byOrg: 'u-caku', status: 'kabul', at: ago(45) },
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
      status: 'kapandi', createdAt: ago(120), route: 'il', ttoIds: ['u-caku'], ttoOrg: 'u-caku', ttoOwner: 'Uzm. Gökhan Yalçın',
      invites: [{ solverId: 'a4', kind: 'academic', by: 'tto', byOrg: 'u-caku', status: 'kabul', at: ago(118) }],
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
      status: 'eslestirme', createdAt: ago(9), route: 'ag', ttoIds: ['u-kastamonu', 'u-caku', 'u-karabuk'], ttoOrg: 'u-kastamonu', ttoOwner: 'Uzm. Aylin Kara', ttoNote: 'Firma 1501 deneyimli; ÇAKÜ’den polimer uzmanı danışman olarak eklenebilir.',
      invites: [
        { solverId: 'a5', kind: 'academic', by: 'tto', byOrg: 'u-kastamonu', status: 'kabul', at: ago(6), ndaAt: ago(5), note: 'rPET ile benzer bir çalışmamız var; numune bekliyorum.' },
      ],
      events: [
        { at: ago(9), actor: 'Anka Plastik Ambalaj', text: 'İhtiyaç bildirildi (gizli)' },
        { at: ago(6), actor: 'KÜ TTO', text: 'Dr. Öğr. Üyesi Zeynep Çelik davet edildi (ÇAKÜ TTO bilgilendirildi)' },
        { at: ago(5), actor: 'Dr. Öğr. Üyesi Zeynep Çelik', text: 'Gizlilik taahhüdünü onayladı' },
        { at: ago(5), actor: 'Dr. Öğr. Üyesi Zeynep Çelik', text: 'Daveti kabul etti' },
      ],
    },
    {
      id: 'n4', firmId: 'f3', title: 'Tuzda topaklanma ve beyazlık değerinin düşmesi', category: 'test',
      summary: 'Nemli aylarda paketli tuzda topaklanma; beyazlık değeri müşteri spesifikasyonunun altına iniyor.',
      details: 'Mevcut topaklanma önleyici dozajı ve kurutma koşulları gözden geçirilmeli; numune analizi gerekli.',
      tags: ['Tuz teknolojisi', 'Kimyasal analiz'], budget: 'lt100', funding: 'oz', urgency: 'acil', confidential: false,
      status: 'yeni', createdAt: ago(1), route: 'il', ttoIds: ['u-caku'],
      invites: [],
      events: [{ at: ago(1), actor: 'Tuzköy Kimya Ltd.', text: 'İhtiyaç bildirildi' }],
    },
    {
      id: 'n5', firmId: 'f5', title: 'Montaj hattında duruş ve fire analizi', category: 'danismanlik',
      summary: 'Hat verimliliği %62; duruş nedenleri kayıt altında değil.',
      details: 'Üç montaj hattı, kâğıt formla duruş takibi. OEE ölçümü ve yalın dönüşüm yol haritası isteniyor.',
      tags: ['Yalın üretim', 'Veri analitiği', 'IoT / sensör'], budget: '100_500', funding: 'kosgeb', urgency: 'normal', confidential: false,
      status: 'eslestirme', createdAt: ago(3), route: 'il', ttoIds: ['u-caku'], ttoOrg: 'u-caku', ttoOwner: 'Uzm. Gökhan Yalçın',
      invites: [{ solverId: 't0', kind: 'firm', by: 'tto', byOrg: 'u-caku', status: 'bekliyor', at: ago(1) }],
      events: [
        { at: ago(3), actor: 'Çankırı Makine Sanayi', text: 'İhtiyaç bildirildi' },
        { at: ago(2), actor: 'ÇAKÜ TTO', text: 'İnceleme başladı' },
        { at: ago(1), actor: 'ÇAKÜ TTO', text: 'Orion Yazılım davet edildi' },
      ],
    },
    {
      id: 'n6', firmId: 'f7', title: 'Panellerde formaldehit emisyonunu E0 seviyesine indirme', category: 'urun',
      summary: 'İhracat için E0 sınıfı isteniyor; mevcut tutkal sistemiyle E1 sınırında kalıyoruz.',
      details: 'Üre-formaldehit tutkal, günlük 900 m³ MDF. Alternatif tutkal ve sertleştirici reçetesi, pres parametreleri değerlendirilmeli.',
      tags: ['Ahşap / orman ürünleri', 'Kimyasal analiz', 'Kompozit'], budget: 'gt500', funding: 'tubitak1501', urgency: 'normal', confidential: true,
      status: 'yeni', createdAt: ago(2), route: 'il', ttoIds: ['u-kastamonu'],
      invites: [],
      events: [{ at: ago(2), actor: 'Kastamonu Ahşap Panel', text: 'İhtiyaç bildirildi (gizli)' }],
    },
    {
      id: 'n7', firmId: 'f6', title: 'Çelik dökümde sıcak yırtılma çatlakları', category: 'arge',
      summary: 'Kalın kesitli bojiler için dökümlerde sıcak yırtılma kaynaklı ret oranı %6.',
      details: 'GS-20Mn5 çelik döküm, kum kalıp. Kalıp malzemesi, soğutucu yerleşimi ve kimyasal bileşim inceleniyor.',
      tags: ['Döküm', 'Metalurji', 'Tahribatsız muayene'], budget: '100_500', funding: 'tubitak1505', urgency: 'normal', confidential: false,
      status: 'eslestirme', createdAt: ago(12), route: 'ag', ttoIds: ['u-karabuk', 'u-caku', 'u-kastamonu'], ttoOrg: 'u-karabuk', ttoOwner: 'Uzm. Serdar Polat',
      invites: [
        { solverId: 'a11', kind: 'academic', by: 'tto', byOrg: 'u-karabuk', status: 'kabul', at: ago(10) },
      ],
      events: [
        { at: ago(12), actor: 'Demirçelik Döküm Ltd.', text: 'İhtiyaç bildirildi · tüm ağa açık' },
        { at: ago(10), actor: 'KBÜ TTO', text: 'Prof. Dr. Orhan Güneş davet edildi' },
        { at: ago(9), actor: 'Prof. Dr. Orhan Güneş', text: 'Daveti kabul etti' },
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

  return { version: 3, notifications: [], ext: {}, orgSel: { tto: 'u-caku', osb: 'osb-cankiri', teknokent: 'tk-caku' }, needs, projects, academics: SEED_ACADEMICS.map((a) => ({ ...a })) };
}

/* -------------------------------- Kişiler ---------------------------------- */

/** Demo rolleri: firma ve akademisyen sabit; yönetici rolleri seçili kurumun kişisiyle */
export const PERSONAS = {
  firma: { name: 'Mehmet Kurt', title: 'Üretim Müdürü · Kuzey Döküm', firmId: 'f1' },
  akademisyen: { name: 'Doç. Dr. Elif Arslan', title: 'Malzeme Bilimi ve Mühendisliği · ÇAKÜ', academicId: 'a1' },
  tfirma: { name: 'Deniz Aydın', title: 'Kurucu · Orion Yazılım', firmId: 't0' },
  platform: { name: 'Platform Yöneticisi', title: 'TeknoOrtak · tüm ağ' },
} as const;

/** Kurum yöneticileri (kurgusal kişiler) */
export const ORG_PEOPLE: Record<string, { name: string; title: string }> = {
  'u-caku': { name: 'Uzm. Gökhan Yalçın', title: 'Sanayi İlişkileri · ÇAKÜ TTO' },
  'u-kastamonu': { name: 'Uzm. Aylin Kara', title: 'Proje Destek · KÜ TTO' },
  'u-karabuk': { name: 'Uzm. Serdar Polat', title: 'Sanayi İşbirliği · KBÜ TTO' },
  'osb-cankiri': { name: 'Nurcan Aksoy', title: 'Bölge Müdürü · Çankırı OSB' },
  'osb-cankiri2': { name: 'Ali Demirtaş', title: 'Bölge Müdürü · Çankırı 2. OSB' },
  'osb-kastamonu': { name: 'Fatma Öz', title: 'Bölge Müdürü · Kastamonu OSB' },
  'osb-karabuk': { name: 'Murat Kılıç', title: 'Bölge Müdürü · Karabük OSB' },
  'tk-caku': { name: 'Selim Yılmaz', title: 'Genel Müdür · ÇAKÜ Teknokent' },
  'tk-kastamonu': { name: 'Esra Doğan', title: 'Genel Müdür · Kastamonu Teknokent' },
  'tk-karabuk': { name: 'Okan Yurt', title: 'Genel Müdür · Karabük Teknokent' },
};

/** Yönetici rolünün kurum türü */
export const ROLE_ORG_TYPE: Record<OrgRole, OrgType> = { tto: 'universite', osb: 'osb', teknokent: 'teknokent' };

export const ROLE_LABEL: Record<Role, string> = {
  firma: 'OSB firması',
  tfirma: 'Teknokent firması',
  akademisyen: 'Akademisyen',
  tto: 'TTO uzmanı',
  osb: 'OSB yönetimi',
  teknokent: 'Teknokent yönetimi',
  platform: 'Platform yönetimi',
};

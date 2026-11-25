/**
 * Yayın aktarımı (ORCID / YÖK Akademik) için örnek veri üreteci.
 * Dış ağ çağrısı yapılmaz: yayınlar akademisyenin uzmanlık alanlarına göre deterministik olarak üretilir.
 * Dergi/kongre adları ve DOI’ler örnektir (10.5555 deneme önekidir).
 */
import { SEED_ACADEMICS, type Academic } from '../data';

export type PubType = 'makale' | 'bildiri' | 'kitap_bolumu';
export type PubSource = 'ORCID' | 'YÖK Akademik';

export interface Publication {
  id: string;
  title: string;
  venue: string;
  year: number;
  type: PubType;
  doi: string;
  industry: boolean;
  source: PubSource;
}

export interface ScholarProject {
  id: string;
  title: string;
  program: string;
  role: 'Yürütücü' | 'Araştırmacı' | 'Danışman';
  years: string;
  source: PubSource;
}

export interface ScholarRecord {
  orcid?: string;
  /** Kaynaktaki toplam yayın sayısı (profil sayacına yazılır) */
  total: number;
  pubs: Publication[];
  projects: ScholarProject[];
  orcidAt?: number;
  yokAt?: number;
}

export type ScholarState = Record<string, ScholarRecord>;

export const PUB_TYPE: Record<PubType, string> = { makale: 'Makale', bildiri: 'Bildiri', kitap_bolumu: 'Kitap bölümü' };

export const ORCID_RE = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

/** Yazarken 0000-0000-0000-000X biçimine getirir */
export function formatOrcid(raw: string) {
  const s = raw.toUpperCase().replace(/[^0-9X]/g, '').slice(0, 16);
  return s.replace(/(.{4})(?=.)/g, '$1-');
}

type Domain = 'metal' | 'ai' | 'energy' | 'food' | 'polymer' | 'chem' | 'electric' | 'industrial' | 'robot' | 'wood';

const TAG_DOMAIN: Record<string, Domain> = {
  'Döküm': 'metal', 'Metalurji': 'metal', 'Malzeme karakterizasyonu': 'metal', 'Tahribatsız muayene': 'metal', 'Isıl işlem': 'metal', 'Kaynak teknolojisi': 'metal',
  'Görüntü işleme': 'ai', 'Yapay zekâ': 'ai', 'Makine öğrenmesi': 'ai', 'Kalite kontrol': 'ai', 'Veri analitiği': 'ai', 'Yazılım': 'ai',
  'Enerji verimliliği': 'energy', 'Isı transferi': 'energy', 'Akışkanlar mekaniği': 'energy', 'Mukavemet / FEA': 'energy',
  'Gıda güvenliği': 'food', 'Gıda analizi': 'food', 'Raf ömrü': 'food',
  'Ambalaj': 'polymer', 'Polimer': 'polymer', 'Kompozit': 'polymer',
  'Kimyasal analiz': 'chem', 'Atık yönetimi': 'chem', 'Su arıtma': 'chem', 'Tuz teknolojisi': 'chem',
  'Elektrik makineleri': 'electric', 'Güç elektroniği': 'electric', 'IoT / sensör': 'electric', 'Gömülü sistemler': 'electric', 'PLC / SCADA': 'electric',
  'Yalın üretim': 'industrial', 'Tedarik zinciri': 'industrial', 'Ergonomi / İSG': 'industrial',
  'Otomasyon': 'robot', 'Robotik': 'robot', 'Mekatronik': 'robot', 'CNC / talaşlı imalat': 'robot',
  'Ahşap / orman ürünleri': 'wood',
};

type T = [title: string, type: PubType, industry: boolean];

const TITLES: Record<Domain, T[]> = {
  metal: [
    ['Prediction of shrinkage porosity in ductile iron castings using solidification simulation and ultrasonic testing', 'makale', true],
    ['Sfero dökme demirde magnezyum fading etkisinin mikroyapı ve mekanik özelliklere etkisi', 'makale', false],
    ['Effect of austempering parameters on the wear behaviour of ADI used in agricultural machinery', 'makale', true],
    ['A356 alüminyum alaşımında T6 ısıl işleminin gözenek dağılımına bağlı yorulma ömrü', 'bildiri', false],
    ['Döküm hatalarının tahribatsız muayenesinde güncel yaklaşımlar', 'kitap_bolumu', false],
    ['Industrial case study: reducing scrap rates in a grey iron foundry through gating system redesign', 'bildiri', true],
  ],
  ai: [
    ['Few-shot surface defect detection for industrial inspection with lightweight convolutional networks', 'makale', true],
    ['Derin öğrenme tabanlı yüzey hatası tespitinde veri artırma yöntemlerinin karşılaştırılması', 'bildiri', false],
    ['Edge deployment of vision transformers for real-time quality control on production lines', 'makale', true],
    ['Self-supervised anomaly detection in casting images with limited labelled data', 'makale', false],
    ['Endüstriyel görüntü işlemede açıklanabilir yapay zekâ', 'kitap_bolumu', false],
    ['KOBİ üretim hatlarında kameralı kalite kontrol: bir saha uygulaması', 'bildiri', true],
  ],
  energy: [
    ['Waste heat recovery from industrial paint-drying ovens: a techno-economic assessment', 'makale', true],
    ['Konveyörlü fırınlarda baca gazı ısısının plakalı reküperatörle geri kazanımının sayısal analizi', 'makale', true],
    ['CFD-based optimisation of airflow distribution in industrial dryers', 'makale', false],
    ['Endüstriyel kurutucularda enerji verimliliği ölçüm yöntemleri', 'bildiri', false],
    ['Heat exchanger fouling under exhaust gas conditions: experimental investigation', 'bildiri', false],
    ['Sanayide atık ısı geri kazanımı', 'kitap_bolumu', false],
  ],
  food: [
    ['Modified atmosphere packaging extends the shelf life of dry beans under ambient storage', 'makale', true],
    ['Kuru baklagillerde depolama zararlılarına karşı azot uygulamasının kalite parametrelerine etkisi', 'makale', true],
    ['Water activity and moisture sorption isotherms of legumes for export packaging', 'makale', false],
    ['Tahıl ürünlerinde mikotoksin riskinin HACCP kapsamında değerlendirilmesi', 'bildiri', false],
    ['Shelf-life modelling of pulses using accelerated storage tests', 'bildiri', false],
    ['Gıda güvenliği yönetim sistemlerinde güncel yaklaşımlar', 'kitap_bolumu', false],
  ],
  polymer: [
    ['Mechanical and optical properties of bottles with high recycled PET content', 'makale', true],
    ['Biyobozunur polimer kompozitlerin ambalaj uygulamalarında kullanımı', 'makale', false],
    ['Chain extenders for improving melt strength of recycled PET in blow moulding', 'makale', true],
    ['Doğal lif takviyeli kompozitlerde ara yüzey modifikasyonu', 'bildiri', false],
    ['Thermal degradation kinetics of post-consumer polyolefins', 'bildiri', false],
    ['Döngüsel ekonomi ve plastik ambalaj', 'kitap_bolumu', false],
  ],
  chem: [
    ['Anti-caking performance of ferrocyanide-free additives in rock salt under humid storage', 'makale', true],
    ['Kaya tuzunda beyazlık değerini etkileyen safsızlıkların spektroskopik analizi', 'makale', true],
    ['Treatment of brine wastewater from salt processing by membrane distillation', 'makale', false],
    ['Endüstriyel atık sularda ağır metal gideriminde düşük maliyetli adsorbanlar', 'bildiri', false],
    ['Life cycle assessment of salt purification routes', 'bildiri', false],
    ['Endüstriyel tuz teknolojisi', 'kitap_bolumu', false],
  ],
  electric: [
    ['Energy monitoring of induction motors in SMEs using low-cost IoT sensors', 'makale', true],
    ['Fabrika ölçekli reaktif güç kompanzasyonunda harmonik etkilerin incelenmesi', 'makale', true],
    ['Model predictive control of permanent magnet synchronous motor drives', 'makale', false],
    ['Endüstriyel IoT ağlarında enerji verisinin gerçek zamanlı toplanması', 'bildiri', false],
    ['Fault detection in variable frequency drives using current signature analysis', 'bildiri', false],
    ['Güç elektroniği uygulamaları', 'kitap_bolumu', false],
  ],
  industrial: [
    ['OEE-based downtime analysis in assembly lines: a lean transformation case', 'makale', true],
    ['Yalın üretim uygulamalarının KOBİ’lerde verimliliğe etkisi', 'makale', true],
    ['Supplier selection under uncertainty with fuzzy multi-criteria methods', 'makale', false],
    ['Montaj hatlarında ergonomik risk değerlendirmesi', 'bildiri', false],
    ['Data-driven scrap reduction in discrete manufacturing', 'bildiri', true],
    ['Üretim planlamada karar destek sistemleri', 'kitap_bolumu', false],
  ],
  robot: [
    ['Vision-guided robotic bin picking for machined parts', 'makale', true],
    ['Esnek üretim hücrelerinde robot programlama sürelerinin kısaltılması', 'makale', true],
    ['Tool wear prediction in CNC milling using spindle current signals', 'makale', false],
    ['Endüstriyel robotlarda kalibrasyon yöntemleri', 'bildiri', false],
    ['Design of a low-cost automated fixture for small-batch production', 'bildiri', true],
    ['Mekatronik sistem tasarımı', 'kitap_bolumu', false],
  ],
  wood: [
    ['Tannin-modified urea-formaldehyde adhesives for low-emission MDF panels', 'makale', true],
    ['Yonga levhada formaldehit emisyonunu azaltan tutkal katkılarının etkisi', 'makale', true],
    ['Hot-press parameters and their effect on the physical properties of MDF', 'makale', false],
    ['Ahşap kompozitlerde nem-iklim döngüsünün boyutsal kararlılığa etkisi', 'bildiri', false],
    ['Bio-based binders for wood composites: a review', 'bildiri', false],
    ['Orman ürünleri endüstrisinde sürdürülebilirlik', 'kitap_bolumu', false],
  ],
};

const VENUES: Record<Domain, { j: string[]; c: string[]; b: string }> = {
  metal: { j: ['Journal of Foundry Science and Engineering', 'Metalurji ve Malzeme Dergisi', 'Materials Processing Letters'], c: ['Uluslararası Döküm Teknolojileri Kongresi', 'International Symposium on Casting and Solidification'], b: 'Advances in Cast Iron Technology' },
  ai: { j: ['Journal of Industrial Vision Systems', 'Applied Machine Intelligence', 'Bilişim Teknolojileri Dergisi'], c: ['Sinyal İşleme ve İletişim Uygulamaları Kurultayı', 'International Conference on Industrial AI'], b: 'Yapay Zekâ ve Endüstri 4.0' },
  energy: { j: ['Applied Thermal Systems', 'Isı Bilimi ve Tekniği Dergisi', 'Energy Efficiency in Industry'], c: ['Ulusal Tesisat Mühendisliği Kongresi', 'International Heat Transfer Symposium'], b: 'Endüstriyel Enerji Yönetimi' },
  food: { j: ['Journal of Food Preservation Research', 'Gıda Bilimi ve Teknolojisi Dergisi', 'Packaging Science Letters'], c: ['Ulusal Gıda Mühendisliği Kongresi', 'International Food Safety Conference'], b: 'Gıda Güvenliği ve Kalite' },
  polymer: { j: ['Polymer Recycling Journal', 'Polimer Bilim ve Teknoloji Dergisi', 'Composite Materials Letters'], c: ['Ulusal Polimer Bilim ve Teknoloji Kongresi', 'International Packaging Symposium'], b: 'Sürdürülebilir Ambalaj Malzemeleri' },
  chem: { j: ['Industrial Chemistry Research', 'Kimya Mühendisliği Dergisi', 'Water Treatment Letters'], c: ['Ulusal Kimya Mühendisliği Kongresi', 'International Symposium on Salt Technology'], b: 'Endüstriyel Kimya Uygulamaları' },
  electric: { j: ['Journal of Electrical Drives', 'Elektrik-Elektronik Mühendisliği Dergisi', 'Industrial IoT Letters'], c: ['Elektrik-Elektronik ve Biyomedikal Mühendisliği Konferansı', 'International Power Electronics Symposium'], b: 'Endüstride Enerji İzleme' },
  industrial: { j: ['Journal of Lean Manufacturing', 'Endüstri Mühendisliği Dergisi', 'Operations Analytics Review'], c: ['Yöneylem Araştırması ve Endüstri Mühendisliği Kongresi', 'International Conference on Production Research'], b: 'Yalın Dönüşüm Uygulamaları' },
  robot: { j: ['Robotics and Automation Letters (TR)', 'Mekatronik Mühendisliği Dergisi', 'Journal of Machining Processes'], c: ['Otomatik Kontrol Ulusal Toplantısı', 'International Robotics Symposium'], b: 'Endüstriyel Robotik' },
  wood: { j: ['Wood Composites Journal', 'Orman Endüstri Mühendisliği Dergisi', 'Bio-based Materials Letters'], c: ['Ulusal Ahşap ve Mobilya Kongresi', 'International Panel Products Symposium'], b: 'Ahşap Kompozit Teknolojisi' },
};

const PROJECTS: Record<Domain, [string, string][]> = {
  metal: [['Sfero dökümde gözenek oluşumunun yapay zekâ destekli tahmini', 'TÜBİTAK 1001'], ['Tarım makinesi döküm parçalarında aşınma direncinin artırılması', 'TÜBİTAK 1505'], ['Döküm laboratuvarı altyapısının güçlendirilmesi', 'BAP']],
  ai: [['Hat içi görüntü tabanlı kusur tespit sistemi', 'TÜBİTAK 1505'], ['Az etiketli verilerle endüstriyel anomali tespiti', 'TÜBİTAK 1001'], ['Gömülü yapay zekâ donanım altyapısı', 'BAP']],
  energy: [['Konveyörlü fırınlarda atık ısı geri kazanımı', 'TÜBİTAK 1505'], ['Endüstriyel kurutucularda hava dağılımının optimizasyonu', 'TÜBİTAK 1001'], ['Termal ölçüm altyapısının kurulması', 'BAP']],
  food: [['Kuru baklagillerde modifiye atmosfer ile raf ömrü uzatma', 'TÜBİTAK 1505'], ['Tahıl depolamada zararlı kontrolü', 'TÜBİTAK 1001'], ['Gıda analiz laboratuvarı akreditasyon hazırlığı', 'BAP']],
  polymer: [['Yüksek rPET içerikli şişelerde mukavemet iyileştirme', 'TÜBİTAK 1505'], ['Biyobozunur kompozit ambalaj geliştirme', 'TÜBİTAK 1001'], ['Polimer karakterizasyon altyapısı', 'BAP']],
  chem: [['Kaya tuzunda topaklanma önleyici geliştirme', 'TÜBİTAK 1505'], ['Tuzlu atık suların membran ile arıtımı', 'TÜBİTAK 1001'], ['Kimyasal analiz altyapısı', 'BAP']],
  electric: [['KOBİ’ler için düşük maliyetli enerji izleme sistemi', 'TÜBİTAK 1505'], ['Motor sürücülerinde arıza teşhisi', 'TÜBİTAK 1001'], ['Motor test standı kurulumu', 'BAP']],
  industrial: [['Montaj hatlarında veri tabanlı duruş analizi', 'TÜBİTAK 1505'], ['Belirsizlik altında tedarikçi seçimi', 'TÜBİTAK 1001'], ['Yalın üretim eğitim laboratuvarı', 'BAP']],
  robot: [['Görüntü kılavuzlu robotik besleme hücresi', 'TÜBİTAK 1505'], ['CNC frezelemede takım aşınması tahmini', 'TÜBİTAK 1001'], ['Mekatronik deney seti geliştirme', 'BAP']],
  wood: [['E0 sınıfı MDF için tanen esaslı tutkal', 'TÜBİTAK 1505'], ['Biyo-esaslı bağlayıcılarla ahşap kompozitler', 'TÜBİTAK 1001'], ['Emisyon test odası altyapısı', 'BAP']],
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function domainsOf(a: Pick<Academic, 'tags'>): Domain[] {
  const d = [...new Set(a.tags.map((t) => TAG_DOMAIN[t]).filter((x): x is Domain => !!x))];
  return d.length ? d : ['industrial'];
}

/** ORCID'den aktarılan yayınlar (5–8 adet, deterministik) */
export function generatePublications(a: Pick<Academic, 'id' | 'tags'>, year = new Date().getFullYear()): Publication[] {
  const h = hash(a.id);
  const n = 5 + (h % 4);
  const doms = domainsOf(a);
  const picked: { d: Domain; t: T }[] = [];
  // Alanlar arasında sırayla dolaş: ilk alan ağırlıklı
  for (let i = 0; picked.length < n && i < 40; i++) {
    const d = doms[i % doms.length]!;
    const list = TITLES[d];
    const t = list[(Math.floor(i / doms.length) + (h % list.length)) % list.length]!;
    // Aynı yayın tekrar etmesin; en fazla bir kitap bölümü
    if (picked.some((p) => p.t[0] === t[0]) || (t[1] === 'kitap_bolumu' && picked.some((p) => p.t[1] === 'kitap_bolumu'))) continue;
    picked.push({ d, t });
  }
  return picked.map(({ d, t }, i) => {
    const y = year - Math.min(8, Math.floor(i * 1.3) + ((h >> i) & 1));
    const v = VENUES[d];
    const venue = t[1] === 'makale' ? v.j[(h + i) % v.j.length]! : t[1] === 'bildiri' ? v.c[(h + i) % v.c.length]! : v.b;
    return {
      id: `pub-${a.id}-${i}`,
      title: t[0],
      venue,
      year: y,
      type: t[1],
      doi: `10.5555/örnek.${y}.${String((h >> (i % 16)) % 9000 + 1000)}`,
      industry: t[2],
      source: 'ORCID' as const,
    };
  });
}

/** YÖK Akademik'ten aktarılan projeler (2–3 adet) */
export function generateProjects(a: Pick<Academic, 'id' | 'tags'>, year = new Date().getFullYear()): ScholarProject[] {
  const h = hash(`${a.id}-yok`);
  const d = domainsOf(a)[0]!;
  const n = 2 + (h % 2);
  const roles: ScholarProject['role'][] = ['Yürütücü', 'Araştırmacı', 'Danışman'];
  return PROJECTS[d].slice(0, n).map(([title, program], i) => {
    const start = year - 1 - i * 2 - (h % 2);
    const dur = program === 'BAP' ? 1 : 2;
    return { id: `yok-${a.id}-${i}`, title, program, role: roles[(h + i) % roles.length]!, years: `${start}–${start + dur}`, source: 'YÖK Akademik' as const };
  });
}

const DAY = 86_400_000;
const NOW = Date.now();

function seedFor(id: string, orcid: string, orcidDaysAgo: number, yokDaysAgo?: number): ScholarRecord {
  const a = SEED_ACADEMICS.find((x) => x.id === id)!;
  return {
    orcid,
    total: a.publications,
    pubs: generatePublications(a),
    projects: yokDaysAgo != null ? generateProjects(a) : [],
    orcidAt: NOW - orcidDaysAgo * DAY,
    yokAt: yokDaysAgo != null ? NOW - yokDaysAgo * DAY : undefined,
  };
}

export const SCHOLAR_SEED: ScholarState = {
  a1: seedFor('a1', '0000-0002-7183-4412', 12, 12),
  a3: seedFor('a3', '0000-0001-6634-2085', 40, 40),
};

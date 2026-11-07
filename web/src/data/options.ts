import type { CollaborationType, EmployeeRange, InvestmentNeed, ReportReason, Stage } from '@/types';

export const SLOGAN_TR = 'Doğru İş Birliği, Doğru Eşleşmeyle Başlar.';
export const SLOGAN_EN = 'Where Innovation Meets Opportunity.';

export const SECTORS = [
  'Yapay Zekâ',
  'Siber Güvenlik',
  'Savunma Sanayii',
  'Sağlık Teknolojileri',
  'Enerji & Temiz Teknoloji',
  'Fintech',
  'Akıllı Tarım',
  'Endüstri 4.0',
  'Mobilite & Otomotiv',
  'Uzay & Havacılık',
  'Eğitim Teknolojileri',
  'Lojistik & Tedarik Zinciri',
];

export const EXPERTISE = [
  'Makine Öğrenmesi',
  'Bilgisayarlı Görü',
  'Doğal Dil İşleme',
  'Gömülü Sistemler',
  'IoT',
  'Bulut & DevOps',
  'Blokzincir',
  'Robotik',
  'Kriptografi',
  'Veri Analitiği',
  'Mobil Uygulama',
  'RF & Haberleşme',
  'Batarya Teknolojileri',
  'Dijital İkiz',
  'AR / VR',
  'Biyoinformatik',
  'Kompozit Malzeme',
  'PLC & SCADA',
];

export const TECHNOPARKS: { name: string; city: string }[] = [
  { name: 'ODTÜ Teknokent', city: 'Ankara' },
  { name: 'Bilkent Cyberpark', city: 'Ankara' },
  { name: 'Hacettepe Teknokent', city: 'Ankara' },
  { name: 'İTÜ ARI Teknokent', city: 'İstanbul' },
  { name: 'Teknopark İstanbul', city: 'İstanbul' },
  { name: 'Yıldız Teknopark', city: 'İstanbul' },
  { name: 'İzmir Teknopark', city: 'İzmir' },
  { name: 'ULUTEK Teknopark', city: 'Bursa' },
  { name: 'Erciyes Teknopark', city: 'Kayseri' },
  { name: 'Konya Teknokent', city: 'Konya' },
  { name: 'ÇAKÜ Teknokent', city: 'Çankırı' },
];

export const CITIES = Array.from(new Set(TECHNOPARKS.map((t) => t.city)));

export const EMPLOYEE_RANGES: { value: EmployeeRange; label: string }[] = [
  { value: '1-5', label: '1–5 kişi' },
  { value: '6-20', label: '6–20 kişi' },
  { value: '21-50', label: '21–50 kişi' },
  { value: '50+', label: '50+ kişi' },
];

export const STAGES: { value: Stage; label: string; progress: number }[] = [
  { value: 'idea', label: 'Fikir', progress: 0.15 },
  { value: 'mvp', label: 'MVP / Prototip', progress: 0.35 },
  { value: 'first_customer', label: 'İlk Müşteri', progress: 0.55 },
  { value: 'growth', label: 'Büyüme', progress: 0.78 },
  { value: 'mature', label: 'Olgun', progress: 1 },
];

export const COLLABORATION_TYPES: { value: CollaborationType; label: string }[] = [
  { value: 'joint_rnd', label: 'Ortak Ar-Ge' },
  { value: 'joint_product', label: 'Ortak Ürün' },
  { value: 'project_subcontractor', label: 'Proje Ortaklığı (TÜBİTAK / AB)' },
  { value: 'subcontracting', label: 'Hizmet / Taşeronluk' },
  { value: 'supply_distribution', label: 'Tedarik & Distribütörlük' },
  { value: 'investment', label: 'Yatırım' },
  { value: 'mentorship', label: 'Mentorluk' },
  { value: 'staff_sharing', label: 'Personel / Stajyer Paylaşımı' },
  { value: 'equipment_sharing', label: 'Laboratuvar & Ekipman' },
];

export const INVESTMENT_NEEDS: { value: InvestmentNeed; label: string }[] = [
  { value: 'none', label: 'Yatırım ihtiyacı yok' },
  { value: 'seed', label: 'Tohum (Seed)' },
  { value: 'series_a', label: 'Seri A' },
  { value: 'growth', label: 'Büyüme yatırımı' },
];

export const INTERNATIONAL_GOALS = ['Avrupa Birliği', 'Körfez Ülkeleri', 'Kuzey Amerika', 'Orta Asya', 'Afrika', 'Uzak Doğu', 'Horizon Europe', 'Eureka / Eurostars'];

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam veya toplu mesaj' },
  { value: 'fake_profile', label: 'Sahte / yanıltıcı profil' },
  { value: 'sales_pitch', label: 'Agresif satış girişimi' },
  { value: 'inappropriate', label: 'Uygunsuz içerik veya davranış' },
  { value: 'other', label: 'Diğer' },
];

export const label = {
  stage: (v: Stage) => STAGES.find((s) => s.value === v)?.label ?? v,
  size: (v: EmployeeRange) => EMPLOYEE_RANGES.find((s) => s.value === v)?.label ?? v,
  collab: (v: CollaborationType) => COLLABORATION_TYPES.find((s) => s.value === v)?.label ?? v,
  investment: (v: InvestmentNeed) => INVESTMENT_NEEDS.find((s) => s.value === v)?.label ?? v,
};

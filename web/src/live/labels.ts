export { label } from '@/data/options';

export const URGENCY = { this_month: 'Bu ay', this_quarter: 'Bu çeyrek', general: 'Genel ilgi' } as const;
export const VISIBILITY = { public: 'Herkese açık', matched_only: 'Yalnızca eşleşince görünür' } as const;
export const REGION = { same_technopark: 'Aynı teknokent', same_city: 'Aynı şehir', turkey: 'Tüm Türkiye' } as const;
export const CERTIFICATES = {
  iso_9001: 'ISO 9001',
  iso_27001: 'ISO 27001',
  rnd_center: 'Ar-Ge merkezi',
  design_center: 'Tasarım merkezi',
  facility_security: 'Tesis güvenlik belgesi',
  patent: 'Patent',
  other: 'Diğer',
} as const;
export const OUTCOMES = { met: 'Görüşüldü', proposal: 'Teklif verildi', contract: 'Sözleşme imzalandı', no_result: 'Sonuçsuz' } as const;
export const MEETING_TYPES = { online: 'Çevrim içi', in_person: 'Yüz yüze' } as const;
export const MEETING_STATUS = {
  proposed: 'Önerildi',
  accepted: 'Kabul edildi',
  declined: 'Reddedildi',
  cancelled: 'İptal edildi',
  completed: 'Tamamlandı',
} as const;
export const VERIFICATION = { pending: 'Onay bekliyor', approved: 'Onaylı', rejected: 'Reddedildi' } as const;
export const ROLES = {
  company_admin: 'Firma yöneticisi',
  company_member: 'Üye',
  technopark_admin: 'Teknokent yöneticisi',
  super_admin: 'Platform yöneticisi',
} as const;
export const REPORT_REASON_LABEL = {
  spam: 'Spam',
  fake_profile: 'Sahte profil',
  inappropriate: 'Uygunsuz içerik',
  sales_pitch: 'Doğrudan satış',
  other: 'Diğer',
} as const;
export const MISSING = {
  logoUrl: 'logo',
  foundedYear: 'kuruluş yılı',
  employeeRange: 'çalışan sayısı',
  stage: 'aşama',
  sectors: 'sektör',
  technologies: 'teknoloji',
  description: 'açıklama (en az 80 karakter)',
  offers: 'sunuyorum',
  needs: 'arıyorum',
  certificates: 'belge',
  references: 'referans',
  name: 'ad',
} as Record<string, string>;

export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
export const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
export const fmtMoney = (n?: number | null) =>
  n == null ? '' : new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n);
export const toDateInput = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');
export function toLocalInput(d: Date | string) {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
}

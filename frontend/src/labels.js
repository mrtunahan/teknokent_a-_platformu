/** Sabit değerlerin Türkçe etiketleri. */
export const COLLABORATION = {
  subcontracting: 'Taşeronluk / hizmet alımı',
  joint_rnd: 'Ortak AR-GE projesi',
  project_subcontractor: 'Projede alt yüklenicilik (TÜBİTAK, KOSGEB, Horizon)',
  joint_product: 'Ortak ürün',
  supply_distribution: 'Tedarik / distribütörlük',
  investment: 'Yatırım',
  mentorship: 'Mentorluk',
  staff_sharing: 'Personel / stajyer paylaşımı',
  equipment_sharing: 'Ekipman / laboratuvar paylaşımı',
};
export const STAGES = {
  idea: 'Fikir', mvp: 'MVP', first_customer: 'İlk müşteri', growth: 'Büyüme', mature: 'Olgun',
};
export const EMPLOYEES = { '1-5': '1–5 kişi', '6-20': '6–20 kişi', '21-50': '21–50 kişi', '50+': '50+ kişi' };
export const URGENCY = { this_month: 'Bu ay', this_quarter: 'Bu çeyrek', general: 'Genel ilgi' };
export const VISIBILITY = { public: 'Herkese açık', matched_only: 'Yalnızca eşleşince görünür' };
export const REGION = { same_technopark: 'Aynı teknokent', same_city: 'Aynı şehir', turkey: 'Tüm Türkiye' };
export const CERTIFICATES = {
  iso_9001: 'ISO 9001',
  iso_27001: 'ISO 27001',
  rnd_center: 'AR-GE merkezi',
  design_center: 'Tasarım merkezi',
  facility_security: 'Tesis güvenlik belgesi',
  patent: 'Patent',
  other: 'Diğer',
};
export const OUTCOMES = { met: 'Görüşüldü', proposal: 'Teklif verildi', contract: 'Sözleşme imzalandı', no_result: 'Sonuçsuz' };
export const MEETING_TYPES = { online: 'Online', in_person: 'Yüz yüze' };
export const MEETING_STATUS = {
  proposed: 'Önerildi', accepted: 'Kabul edildi', declined: 'Reddedildi', cancelled: 'İptal edildi', completed: 'Tamamlandı',
};
export const VERIFICATION = { pending: 'Onay bekliyor', approved: 'Onaylı', rejected: 'Reddedildi' };
export const ROLES = {
  company_admin: 'Firma yöneticisi', company_member: 'Üye', technopark_admin: 'Teknokent yöneticisi', super_admin: 'Platform yöneticisi',
};
export const REPORT_REASONS = {
  spam: 'Spam', fake_profile: 'Sahte profil', inappropriate: 'Uygunsuz içerik', sales_pitch: 'Doğrudan satış', other: 'Diğer',
};

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
export const fmtMoney = (n) => (n == null ? '' : new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n));

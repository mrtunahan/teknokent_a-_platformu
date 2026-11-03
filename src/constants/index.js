/** Platform genelinde kullanılan sabit değer listeleri. */

const ROLES = Object.freeze({
  COMPANY_ADMIN: 'company_admin', // profili düzenler, davet gönderir
  COMPANY_MEMBER: 'company_member', // kaydırır, mesajlaşır
  TECHNOPARK_ADMIN: 'technopark_admin', // kendi teknokentindeki firmaları onaylar, paneli görür
  SUPER_ADMIN: 'super_admin', // platform yöneticisi
});

const EMPLOYEE_RANGES = ['1-5', '6-20', '21-50', '50+'];

const STAGES = ['idea', 'mvp', 'first_customer', 'growth', 'mature'];

const COLLABORATION_TYPES = [
  'subcontracting', // taşeronluk / hizmet alımı
  'joint_rnd', // ortak AR-GE projesi
  'project_subcontractor', // proje içinde alt yüklenicilik (TÜBİTAK 1501/1507/1511, KOSGEB, Horizon Europe)
  'joint_product', // ortak ürün
  'supply_distribution', // tedarik / distribütörlük
  'investment', // yatırım
  'mentorship', // mentorluk
  'staff_sharing', // personel / stajyer paylaşımı
  'equipment_sharing', // ekipman / laboratuvar paylaşımı
];

/**
 * Birbiriyle "uyumlu" sayılan (aynı olmayan ama yakın) iş birliği türleri. Simetrik kullanılır.
 * Aynı tür = 1, uyumlu tür = 0.5, diğer = 0.
 */
const COMPATIBLE_COLLABORATION_PAIRS = [
  ['subcontracting', 'joint_rnd'],
  ['subcontracting', 'project_subcontractor'],
  ['joint_rnd', 'project_subcontractor'],
  ['joint_rnd', 'joint_product'],
  ['joint_product', 'supply_distribution'],
  ['investment', 'mentorship'],
  ['staff_sharing', 'equipment_sharing'],
];

const URGENCY = ['this_month', 'this_quarter', 'general'];
const NEED_VISIBILITY = ['public', 'matched_only'];
const REGION_PREFERENCES = ['same_technopark', 'same_city', 'turkey'];

const CERTIFICATE_TYPES = [
  'iso_9001',
  'iso_27001',
  'rnd_center', // AR-GE merkezi
  'design_center', // tasarım merkezi
  'facility_security', // tesis güvenlik belgesi
  'patent',
  'other',
];

const TAG_TYPES = ['sector', 'technology', 'competence'];

const SWIPE_DIRECTIONS = ['right', 'left', 'super'];

const OUTCOME_RESULTS = ['met', 'proposal', 'contract', 'no_result'];

const MEETING_TYPES = ['in_person', 'online'];
const MEETING_STATUSES = ['proposed', 'accepted', 'declined', 'cancelled', 'completed'];

const VERIFICATION_STATUSES = ['pending', 'approved', 'rejected'];

/** Kurumsal e-posta zorunluluğu: ücretsiz/kişisel e-posta sağlayıcıları kabul edilmez. */
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.com.tr', 'outlook.com', 'outlook.com.tr',
  'live.com', 'msn.com', 'yahoo.com', 'yahoo.com.tr', 'ymail.com', 'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'yandex.com', 'yandex.com.tr', 'yandex.ru', 'mail.ru', 'gmx.com', 'gmx.net', 'proton.me',
  'protonmail.com', 'zoho.com', 'mynet.com', 'windowslive.com', 'tutanota.com', 'hey.com',
]);

const KVKK_CONSENT_VERSION = '2026-11-01';

module.exports = {
  ROLES,
  EMPLOYEE_RANGES,
  STAGES,
  COLLABORATION_TYPES,
  COMPATIBLE_COLLABORATION_PAIRS,
  URGENCY,
  NEED_VISIBILITY,
  REGION_PREFERENCES,
  CERTIFICATE_TYPES,
  TAG_TYPES,
  SWIPE_DIRECTIONS,
  OUTCOME_RESULTS,
  MEETING_TYPES,
  MEETING_STATUSES,
  VERIFICATION_STATUSES,
  FREE_EMAIL_DOMAINS,
  KVKK_CONSENT_VERSION,
};

/**
 * Alan modelleri. Değer kümeleri backend'deki `src/constants/index.js` ile hizalıdır
 * (EMPLOYEE_RANGES, STAGES, COLLABORATION_TYPES) — böylece HTTP adaptörü dönüşümsüz eşleşir.
 */

export type EmployeeRange = '1-5' | '6-20' | '21-50' | '50+';
export type Stage = 'idea' | 'mvp' | 'first_customer' | 'growth' | 'mature';
export type CollaborationType =
  | 'subcontracting'
  | 'joint_rnd'
  | 'project_subcontractor'
  | 'joint_product'
  | 'supply_distribution'
  | 'investment'
  | 'mentorship'
  | 'staff_sharing'
  | 'equipment_sharing';

export type InvestmentNeed = 'none' | 'seed' | 'series_a' | 'growth';
export type ReportReason = 'spam' | 'fake_profile' | 'inappropriate' | 'sales_pitch' | 'other';
export type SwipeDirection = 'right' | 'left' | 'super';

export interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  /** Logo yoksa monogram + bu gradyan kullanılır */
  brand: [string, string];
  tagline: string;
  description: string;
  foundedYear: number;
  technopark: string;
  city: string;
  website: string;
  sector: string;
  expertise: string[];
  products: string[];
  seeking: string[];
  offering: string[];
  collaborationTypes: CollaborationType[];
  rndNeeds: string[];
  employeeRange: EmployeeRange;
  stage: Stage;
  investmentNeed: InvestmentNeed;
  seekingInvestor: boolean;
  seekingProjectPartner: boolean;
  hasRndCenter: boolean;
  internationalGoals: string[];
  exportFocused: boolean;
  verified: boolean;
  contact: { name: string; title: string; email: string; phone?: string };
  /** Kapak görseli için tema (soyut, üretilmiş arka plan) */
  cover: 'mesh' | 'grid' | 'waves' | 'orbit';
}

export interface Match {
  id: string;
  companyId: string;
  createdAt: number;
  /** Sistem tarafından hesaplanan uyum skoru 0-100 */
  score: number;
  reasons: string[];
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface ChatAttachment {
  name: string;
  size: number;
  type: string;
}

export interface Message {
  id: string;
  matchId: string;
  from: 'me' | 'them' | 'system';
  text: string;
  createdAt: number;
  status: MessageStatus;
  attachment?: ChatAttachment;
  meeting?: { when: string; mode: 'online' | 'in_person'; topic: string };
}

export type NotificationKind = 'match' | 'like' | 'message' | 'view' | 'system';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
  companyId?: string;
  link?: string;
}

export interface Filters {
  sectors: string[];
  expertise: string[];
  cities: string[];
  technoparks: string[];
  sizes: EmployeeRange[];
  collaborationTypes: CollaborationType[];
  investmentNeed: 'any' | 'needs' | 'none';
  projectPartnership: boolean;
  rndCapable: boolean;
  exportFocused: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'everyone' | 'same_technopark' | 'matches_only';
  showContactAfterMatch: boolean;
  showInFeatured: boolean;
  readReceipts: boolean;
  emailNotifications: boolean;
  allowAnalytics: boolean;
}

/** Oturum açmış kullanıcının firması: onboarding formu buraya yazar. */
export type MyCompany = Company & { kvkkConsentAt?: number; marketingConsent?: boolean };

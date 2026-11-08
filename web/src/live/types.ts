import type { CollaborationType, EmployeeRange, Stage } from '@/types';

export type Role = 'company_admin' | 'company_member' | 'technopark_admin' | 'super_admin';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type Urgency = 'this_month' | 'this_quarter' | 'general';
export type Visibility = 'public' | 'matched_only';
export type Region = 'same_technopark' | 'same_city' | 'turkey';
export type CertificateType = 'iso_9001' | 'iso_27001' | 'rnd_center' | 'design_center' | 'facility_security' | 'patent' | 'other';
export type OutcomeResult = 'met' | 'proposal' | 'contract' | 'no_result';
export type MeetingStatus = 'proposed' | 'accepted' | 'declined' | 'cancelled' | 'completed';

export interface User {
  _id: string;
  email: string;
  fullName: string;
  title?: string;
  phone?: string;
  role: Role;
  company?: string | null;
  technopark?: string | null;
  consents?: { kvkkVersion?: string; kvkkAcceptedAt?: string; marketing?: boolean };
}

export interface SessionCompany {
  _id: string;
  name: string;
  logoUrl?: string;
  technopark?: string;
  verification?: { status: VerificationStatus; note?: string };
}

export interface Tag {
  id: string;
  name: string;
  type: 'sector' | 'technology' | 'competence';
  slug?: string;
  parent?: string | null;
}

export interface TagRef {
  id: string;
  name: string;
  type?: string;
}

export interface Offer {
  id?: string;
  tag: TagRef | null;
  collaborationType: CollaborationType;
  description?: string;
}

export interface Need extends Offer {
  urgency?: Urgency;
  budgetRange?: { min?: number; max?: number; currency?: string };
  expiresAt?: string | null;
  visibility?: Visibility;
}

export interface Card {
  id: string;
  name: string;
  logoUrl?: string;
  technopark?: { id: string; name: string; city?: string } | string;
  city?: string;
  stage?: Stage;
  employeeRange?: EmployeeRange;
  sectors: TagRef[];
  verified: boolean;
  matchPercent: number | null;
  reasons: string[];
  offers: Offer[];
  needs: Need[];
  exploration?: boolean;
}

export interface Certificate {
  id: string;
  type: CertificateType;
  title?: string;
  validUntil?: string | null;
  document?: { name: string; size: number; contentType: string } | null;
}

export interface Reference {
  title: string;
  client?: string;
  description?: string;
  hidden?: boolean;
}

export interface CompanyDetail extends Card {
  website?: string;
  foundedYear?: number;
  technologies: TagRef[];
  description?: string;
  certificates: Certificate[];
  references: Reference[];
  matched: boolean;
}

export interface OwnCompany extends CompanyDetail {
  taxNumber: string;
  verificationStatus: VerificationStatus;
  verificationNote?: string;
  underReview?: boolean;
  preferences?: { region?: Region; requiredCertificates?: CertificateType[]; blockedSectors?: (TagRef | string)[] };
  blockedCompanies?: ({ _id: string; name: string; logoUrl?: string } | string)[];
  completion: { percent: number; missing: string[] };
}

export interface CompanySummary {
  id: string;
  name: string;
  logoUrl?: string;
  verified?: boolean;
}

export interface MatchItem {
  id: string;
  company: CompanySummary | null;
  matchPercent: number;
  reasons: string[];
  status: 'active' | 'closed';
  createdAt: string;
  lastMessageAt?: string;
  unreadCount: number;
  pendingMeetings: number;
  outcome: OutcomeResult | null;
  outcomeDue: boolean;
}

export interface Meeting {
  _id: string;
  proposedBy: string;
  proposedSlots: string[];
  startsAt?: string;
  durationMinutes: number;
  type: 'online' | 'in_person';
  location?: string;
  note?: string;
  status: MeetingStatus;
  createdAt: string;
}

export interface Outcome {
  result: OutcomeResult;
  estimatedValue?: number;
  rating?: number;
  feedback?: string;
}

export interface MatchDetail {
  id: string;
  company: CompanySummary | null;
  matchPercent: number;
  reasons: string[];
  status: 'active' | 'closed';
  createdAt: string;
  meetings: Meeting[];
  myOutcome: Outcome | null;
}

export interface ChatMessage {
  id: string;
  content: string;
  senderCompany: string;
  senderName: string;
  mine: boolean;
  createdAt: string;
  matchId?: string;
}

export interface Member {
  _id: string;
  fullName: string;
  title?: string;
  email: string;
  role: Role;
}

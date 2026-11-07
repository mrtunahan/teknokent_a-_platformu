import type { Company, MyCompany, ReportReason, SwipeDirection } from '@/types';

export interface SwipeResult {
  matched: boolean;
  /** Eşleşme oluştuysa backend'in verdiği eşleşme kimliği */
  matchId?: string;
}

/**
 * Uygulamanın veri kaynağı sözleşmesi. Bileşenler bu arayüze bağımlıdır; mock ve HTTP adaptörleri
 * birbirinin yerine geçebilir (VITE_DATA_SOURCE=mock | http).
 */
export interface DataSource {
  readonly kind: 'mock' | 'http';
  listCandidates(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  swipe(targetId: string, direction: SwipeDirection): Promise<SwipeResult>;
  sendMessage(matchId: string, text: string): Promise<void>;
  /** Demo: karşı tarafın otomatik yanıtı (HTTP adaptöründe gerçek zamanlı kanal kullanılır) */
  simulateReply?(matchId: string, company: Company, lastText: string): Promise<string>;
  report(targetId: string, reason: ReportReason, details?: string): Promise<void>;
  block(targetId: string): Promise<void>;
  saveProfile(profile: MyCompany): Promise<void>;
}

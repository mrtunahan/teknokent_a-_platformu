import type { Company, EmployeeRange, Stage } from '@/types';
import type { DataSource } from './types';

/**
 * Mevcut TeknoMatch Express API'sine (`/api/v1`) bağlanan adaptör.
 * Uç noktalar: GET /feed, GET /companies/:id, POST /swipes, POST /matches/:id/messages,
 * POST /reports, POST /companies/me/blocks/:id, PATCH /companies/me.
 * Gerçek zamanlı mesajlar Socket.IO üzerinden gelir (bkz. ../../frontend/src/socket.js).
 */
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
const TOKEN_KEY = 'teknomatch.token';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = (() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  })();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}/api/v1${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `İstek başarısız (${res.status})`);
  return data as T;
}

type ApiTag = { _id: string; name: string } | string;
type ApiCompany = {
  _id: string;
  name: string;
  logoUrl?: string;
  website?: string;
  foundedYear?: number;
  employeeRange?: EmployeeRange;
  stage?: Stage;
  city?: string;
  technopark?: { name?: string } | string;
  sectors?: ApiTag[];
  technologies?: ApiTag[];
  description?: string;
  offers?: { tag: ApiTag; collaborationType: Company['collaborationTypes'][number]; description?: string }[];
  needs?: { tag: ApiTag; collaborationType: Company['collaborationTypes'][number]; description?: string }[];
  verification?: { status?: string };
};

const tagName = (t: ApiTag) => (typeof t === 'string' ? t : t.name);
const PALETTE: [string, string][] = [
  ['#2f7bff', '#8b5cf6'],
  ['#14b8a6', '#2f7bff'],
  ['#8b5cf6', '#ec4899'],
  ['#22d3ee', '#10b981'],
];

export function toCompany(c: ApiCompany): Company {
  const offers = c.offers ?? [];
  const needs = c.needs ?? [];
  return {
    id: c._id,
    name: c.name,
    logoUrl: c.logoUrl || undefined,
    brand: PALETTE[c.name.length % PALETTE.length]!,
    tagline: c.description?.split('.')[0] ?? '',
    description: c.description ?? '',
    foundedYear: c.foundedYear ?? new Date().getFullYear(),
    technopark: typeof c.technopark === 'string' ? c.technopark : c.technopark?.name ?? '',
    city: c.city ?? '',
    website: c.website ?? '',
    sector: c.sectors?.[0] ? tagName(c.sectors[0]) : 'Teknoloji',
    expertise: (c.technologies ?? []).map(tagName),
    products: [],
    seeking: needs.map((n) => n.description || tagName(n.tag)),
    offering: offers.map((o) => o.description || tagName(o.tag)),
    collaborationTypes: Array.from(new Set([...offers, ...needs].map((x) => x.collaborationType))),
    rndNeeds: [],
    employeeRange: c.employeeRange ?? '6-20',
    stage: c.stage ?? 'mvp',
    investmentNeed: needs.some((n) => n.collaborationType === 'investment') ? 'seed' : 'none',
    seekingInvestor: needs.some((n) => n.collaborationType === 'investment'),
    seekingProjectPartner: needs.some((n) => n.collaborationType === 'project_subcontractor'),
    hasRndCenter: false,
    internationalGoals: [],
    exportFocused: false,
    verified: c.verification?.status === 'approved',
    contact: { name: '', title: '', email: '' },
    cover: 'mesh',
  };
}

export const httpSource: DataSource = {
  kind: 'http',
  async listCandidates() {
    const data = await request<{ items?: { company: ApiCompany }[] } | { company: ApiCompany }[]>('GET', '/feed');
    const items = Array.isArray(data) ? data : data.items ?? [];
    return items.map((i) => toCompany(i.company));
  },
  async getCompany(id) {
    const data = await request<{ company: ApiCompany } | ApiCompany>('GET', `/companies/${id}`);
    return toCompany('company' in data ? data.company : data);
  },
  async swipe(targetId, direction) {
    const r = await request<{ match?: { _id: string } }>('POST', '/swipes', { targetCompanyId: targetId, direction });
    return { matched: !!r.match, matchId: r.match?._id };
  },
  async sendMessage(matchId, text) {
    await request('POST', `/matches/${matchId}/messages`, { body: text });
  },
  async report(targetId, reason, details) {
    await request('POST', '/reports', { targetCompanyId: targetId, reason, details });
  },
  async block(targetId) {
    await request('POST', `/companies/me/blocks/${targetId}`);
  },
  async saveProfile(p) {
    await request('PATCH', '/companies/me', {
      name: p.name,
      website: p.website,
      foundedYear: p.foundedYear,
      employeeRange: p.employeeRange,
      stage: p.stage,
      city: p.city,
      description: p.description,
    });
  },
};

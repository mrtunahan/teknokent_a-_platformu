import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { storage, uid } from '@/lib/utils';
import {
  FIRMS,
  LABS,
  ORG_PEOPLE,
  PERSONAS,
  cityOfFirm,
  isTechFirm,
  localTtos,
  orgOf,
  orgsOfType,
  ttoName,
  type OrgRole,
  firmOf,
  seedState,
  type Academic,
  type Firm,
  type Funding,
  type KopruState,
  type Notification,
  type Need,
  type NeedEvent,
  type Project,
  type ProjectMessage,
  type Role,
  type Stage,
} from './data';

const KEY = 'teknoortak.kopru.v1';

/* ------------------------------- Eşleştirme -------------------------------- */

const STOP = new Set('ve ile için bir bu olan daha çok gibi kadar sonra mevcut olarak üzerinde altında yüksek düşük sorun sorunu isteniyor gerekli yapılan yaşanıyor değil'.split(' '));

/** Kaba Türkçe kök: küçük harf, harf dışı ayır, ilk 5 harf (ekleri yok sayar) */
function stems(text: string): Set<string> {
  return new Set(
    text
      .toLocaleLowerCase('tr')
      .split(/[^a-zçğıöşü0-9]+/i)
      .filter((w) => w.length >= 4 && !STOP.has(w))
      .map((w) => w.slice(0, 5)),
  );
}

export type Solver = { kind: 'academic'; data: Academic } | { kind: 'firm'; data: Firm };
export interface Candidate {
  solver: Solver;
  score: number;
  reasons: string[];
}

export function solverName(s: Solver) {
  return s.data.name;
}

export const solverCity = (s: Solver) => orgOf(s.data.orgId).city;
/** Akademisyenin üniversitesi / firmanın teknokenti */
export const solverOrg = (s: Solver) => orgOf(s.data.orgId);

function rank(need: Pick<Need, 'title' | 'summary' | 'details' | 'tags'>, solver: Solver, city?: string): Candidate {
  const tags = solver.data.tags;
  const common = need.tags.filter((t) => tags.includes(t));
  // İhtiyaçta çok sayıda alan seçilmiş olabilir: en fazla 3 ortak alan tam uyum sayılır
  const tagScore = need.tags.length ? Math.min(1, common.length / Math.min(3, need.tags.length)) : 0;

  const labs = solver.kind === 'academic' ? solver.data.labIds.map((id) => LABS.find((l) => l.id === id)!).filter(Boolean) : [];
  const solverText = [solver.data.summary, tags.join(' '), ...labs.map((l) => `${l.name} ${l.equipment.join(' ')}`)].join(' ');
  const a = stems(`${need.title} ${need.summary} ${need.details}`);
  const b = stems(solverText);
  const hits = [...a].filter((w) => b.has(w));
  const textScore = a.size ? Math.min(1, hits.length / Math.max(3, Math.min(8, a.size * 0.2))) : 0;

  let score = 0.62 * tagScore + 0.38 * textScore;
  const reasons: string[] = [];
  if (common.length) reasons.push(`Ortak uzmanlık: ${common.slice(0, 3).join(', ')}`);
  const labHit = labs.find((l) => l.tags.some((t) => need.tags.includes(t)));
  if (labHit) reasons.push(`Laboratuvar: ${labHit.equipment.slice(0, 2).join(', ')}`);
  if (solver.kind === 'academic') {
    if (solver.data.industryProjects >= 5) reasons.push(`${solver.data.industryProjects} sanayi projesi deneyimi`);
    if (solver.data.availability === 'dolu') score *= 0.7;
    if (solver.data.availability === 'sinirli') score *= 0.9;
  } else {
    reasons.push('Teknokent firması · uygulama/ürünleştirme');
  }
  if (!common.length && hits.length) reasons.push('Uzmanlık metninde benzer kavramlar');
  // Yakınlık: aynı ildeki çözüm sağlayıcıya küçük bir öncelik (saha ziyareti, numune taşıma)
  if (city && solverCity(solver) === city) {
    score += 0.06;
    reasons.push(`Aynı ilde · ${city}`);
  }
  return { solver, score: Math.round(Math.min(0.98, score) * 100), reasons };
}

/** city: ihtiyaç sahibinin ili (yakınlık önceliği için) */
export function candidatesFor(need: Pick<Need, 'title' | 'summary' | 'details' | 'tags'>, academics: Academic[], city?: string): Candidate[] {
  const pool: Solver[] = [
    ...academics.filter((a) => a.approved).map((a) => ({ kind: 'academic' as const, data: a })),
    ...FIRMS.filter(isTechFirm).map((f) => ({ kind: 'firm' as const, data: f })),
  ];
  return pool
    .map((s) => rank(need, s, city))
    .filter((c) => c.score >= 15)
    .sort((x, y) => y.score - x.score);
}

/* ------------------------------- Bildirimler -------------------------------- */

/** Bildirim kutusu anahtarları: firm:<id>, academic:<id>, tto:<üniversite>, osb:<id>, teknokent:<id>, platform */
export function inboxKeyOf(role: Role, orgSel: Record<OrgRole, string>): string {
  switch (role) {
    case 'firma':
      return `firm:${PERSONAS.firma.firmId}`;
    case 'tfirma':
      return `firm:${PERSONAS.tfirma.firmId}`;
    case 'akademisyen':
      return `academic:${PERSONAS.akademisyen.academicId}`;
    case 'tto':
    case 'osb':
    case 'teknokent':
      return `${role}:${orgSel[role]}`;
    default:
      return 'platform';
  }
}
/** Çözüm sağlayıcının (akademisyen veya firma) bildirim kutusu */
export const solverInbox = (solverId: string) => (FIRMS.some((f) => f.id === solverId) ? `firm:${solverId}` : `academic:${solverId}`);
export const firmInbox = (firmId: string) => `firm:${firmId}`;

/** Rolün "kendisi" olduğu çözüm sağlayıcı kimliği (akademisyen a1 / teknokent firması t0) */
export function solverIdOf(role: Role): string | null {
  if (role === 'akademisyen') return PERSONAS.akademisyen.academicId;
  if (role === 'tfirma') return PERSONAS.tfirma.firmId;
  return null;
}

/* -------------------------------- Kapsam ---------------------------------- */

/** Rol ve seçili kuruma göre bir ihtiyacın görünür olup olmadığı */
export function needInScope(state: KopruState, role: Role, n: Need): boolean {
  const sel = state.orgSel;
  switch (role) {
    case 'firma':
      return n.firmId === PERSONAS.firma.firmId;
    case 'tfirma':
      return n.invites.some((i) => i.solverId === PERSONAS.tfirma.firmId);
    case 'osb':
      return firmOf(n.firmId).orgId === sel.osb;
    case 'teknokent':
      return n.invites.some((i) => i.kind === 'firm' && firmOf(i.solverId).orgId === sel.teknokent);
    case 'tto':
      // Kendisine yönlendirilen ihtiyaçlar + kendi akademisyenlerinin davet edildiği ihtiyaçlar
      return n.ttoIds.includes(sel.tto) || n.invites.some((i) => state.academics.find((a) => a.id === i.solverId)?.orgId === sel.tto);
    default:
      return true;
  }
}

export function projectInScope(state: KopruState, role: Role, p: Project): boolean {
  const need = state.needs.find((n) => n.id === p.needId);
  if (!need) return false;
  if (role === 'akademisyen') return p.solverId === PERSONAS.akademisyen.academicId;
  if (role === 'tfirma') return p.solverId === PERSONAS.tfirma.firmId;
  if (role === 'teknokent') return p.kind === 'firm' && firmOf(p.solverId).orgId === state.orgSel.teknokent;
  if (role === 'tto') return needInScope(state, role, need) || state.academics.find((a) => a.id === p.solverId)?.orgId === state.orgSel.tto;
  return needInScope(state, role, need);
}

/* --------------------------------- Mağaza ---------------------------------- */

export interface NeedInput {
  title: string;
  summary: string;
  details: string;
  category: Need['category'];
  tags: string[];
  budget: Need['budget'];
  funding: Funding;
  urgency: Need['urgency'];
  confidential: boolean;
  route: Need['route'];
}

export type Persona = { name: string; title: string; orgId?: string };

/** Rolün o anki kişisi: yönetici rollerinde seçili kurumun yöneticisi */
export function personaOf(role: Role, orgSel: Record<OrgRole, string>): Persona {
  if (role === 'tto' || role === 'osb' || role === 'teknokent') return { ...ORG_PEOPLE[orgSel[role]]!, orgId: orgSel[role] };
  if (role === 'firma') return { ...PERSONAS.firma, orgId: firmOf(PERSONAS.firma.firmId).orgId };
  if (role === 'akademisyen') return { ...PERSONAS.akademisyen, orgId: 'u-caku' };
  if (role === 'tfirma') return { ...PERSONAS.tfirma, orgId: firmOf(PERSONAS.tfirma.firmId).orgId };
  return PERSONAS.platform;
}

interface Ctx {
  state: KopruState;
  role: Role;
  setRole: (r: Role) => void;
  me: Persona;
  /** Yönetici rolünde bakılan kurumu değiştir */
  setOrg: (role: OrgRole, orgId: string) => void;
  findSolver: (id: string) => Solver | null;
  createNeed: (input: NeedInput) => string;
  startReview: (needId: string) => void;
  setTtoNote: (needId: string, note: string) => void;
  invite: (needId: string, solverIds: string[], by: 'tto' | 'firma') => void;
  respond: (needId: string, solverId: string, accept: boolean, note?: string) => void;
  /** Akademisyen, uzmanlığına uyan açık bir ihtiyaca kendisi ilgi bildirir */
  express: (needId: string, academicId: string, note?: string) => void;
  signNda: (needId: string, solverId: string) => void;
  startProject: (needId: string, solverId: string) => string;
  advance: (projectId: string, patch?: { value?: number; program?: Funding }) => void;
  sendMessage: (projectId: string, msg: Omit<ProjectMessage, 'at'>) => void;
  approveAcademic: (id: string, ok: boolean) => void;
  updateAcademic: (id: string, patch: Partial<Academic>) => void;
  /** Bildirim gönder: `to` bir veya birden çok kutu anahtarı; `link` rol yolundan sonraki kısım (ör. "projeler/p1") */
  notify: (to: string | string[], text: string, link?: string, kind?: string) => void;
  /** Bu rolün (seçili kurumun) bildirim kutusu ve okunmamış sayısı */
  inbox: { key: string; items: Notification[]; unread: number };
  markRead: (ids?: string[]) => void;
  /** Özellik modülü verisi: anahtar yoksa `seed` döner */
  ext: <T>(key: string, seed: T) => T;
  setExt: <T>(key: string, seed: T, fn: (prev: T) => T) => void;
  reset: () => void;
}

const C = createContext<Ctx | null>(null);

function load(): KopruState {
  const s = storage.get<KopruState>(KEY);
  return s?.version === 3 ? s : seedState();
}

export function KopruProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<KopruState>(load);
  const [role, setRoleState] = useState<Role>(() => storage.get<Role>(`${KEY}.role`) ?? 'firma');

  useEffect(() => storage.set(KEY, state), [state]);
  const setRole = useCallback((r: Role) => {
    setRoleState(r);
    storage.set(`${KEY}.role`, r);
  }, []);

  const findSolver = useCallback(
    (id: string): Solver | null => {
      const a = state.academics.find((x) => x.id === id);
      if (a) return { kind: 'academic', data: a };
      const f = FIRMS.find((x) => x.id === id);
      return f ? { kind: 'firm', data: f } : null;
    },
    [state.academics],
  );

  const value = useMemo<Ctx>(() => {
    const ev = (actor: string, text: string): NeedEvent => ({ at: Date.now(), actor, text });
    const nameOf = (id: string) => state.academics.find((a) => a.id === id)?.name ?? FIRMS.find((f) => f.id === id)?.name ?? '—';
    const patchNeed = (id: string, fn: (n: Need) => Need) => setState((s) => ({ ...s, needs: s.needs.map((n) => (n.id === id ? fn(n) : n)) }));
    const patchProject = (id: string, fn: (p: Project) => Project) => setState((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? fn(p) : p)) }));
    const notify = (to: string | string[], text: string, link?: string, kind?: string) => {
      const list = [...new Set(Array.isArray(to) ? to : [to])];
      const at = Date.now();
      setState((s) => ({ ...s, notifications: [...list.map((t) => ({ id: uid('bn'), to: t, text, link, kind, at, read: false })), ...s.notifications].slice(0, 400) }));
    };
    const needOf = (id: string) => state.needs.find((n) => n.id === id);
    /** İhtiyaçla ilgili TTO kutuları: inceleyen TTO varsa o, yoksa yönlendirilenler */
    const ttoInboxes = (n: Need) => (n.ttoOrg ? [n.ttoOrg] : n.ttoIds).map((u) => `tto:${u}`);
    const projectParties = (p: Project) => {
      const n = needOf(p.needId);
      return n ? [firmInbox(n.firmId), solverInbox(p.solverId), ...ttoInboxes(n)] : [solverInbox(p.solverId)];
    };
    const inboxKey = inboxKeyOf(role, state.orgSel);
    const inboxItems = state.notifications.filter((x) => x.to === inboxKey);

    return {
      state,
      role,
      setRole,
      me: personaOf(role, state.orgSel),
      setOrg(r, orgId) {
        setState((s) => ({ ...s, orgSel: { ...s.orgSel, [r]: orgId } }));
      },
      findSolver,
      notify,
      inbox: { key: inboxKey, items: inboxItems, unread: inboxItems.filter((x) => !x.read).length },
      markRead(ids) {
        setState((s) => ({ ...s, notifications: s.notifications.map((x) => (x.to === inboxKey && (!ids || ids.includes(x.id)) ? { ...x, read: true } : x)) }));
      },
      ext<T>(key: string, seed: T): T {
        return (key in state.ext ? state.ext[key] : seed) as T;
      },
      setExt<T>(key: string, seed: T, fn: (prev: T) => T) {
        setState((s) => ({ ...s, ext: { ...s.ext, [key]: fn((key in s.ext ? s.ext[key] : seed) as T) } }));
      },
      createNeed(input) {
        const id = uid('n');
        const firm = firmOf(PERSONAS.firma.firmId);
        const ttoIds = input.route === 'il' ? localTtos(cityOfFirm(firm.id)) : orgsOfType('universite').map((o) => o.id);
        const to = input.route === 'il' ? ttoIds.map(ttoName).join(', ') : 'tüm ağ';
        setState((s) => ({
          ...s,
          needs: [{ id, firmId: firm.id, ...input, ttoIds, status: 'yeni', createdAt: Date.now(), invites: [], events: [ev(firm.name, `İhtiyaç bildirildi${input.confidential ? ' (gizli)' : ''} · ${to}`)] }, ...s.needs],
        }));
        notify(ttoIds.map((u) => `tto:${u}`), `Yeni ihtiyaç: ${input.title} (${firm.name})`, `ihtiyaclar/${id}`, 'need');
        notify(`osb:${firm.orgId}`, `${firm.name} yeni bir ihtiyaç bildirdi`, `ihtiyaclar/${id}`, 'need');
        return id;
      },
      startReview(needId) {
        const u = state.orgSel.tto;
        patchNeed(needId, (n) => (n.status === 'yeni' ? { ...n, status: 'inceleme', ttoOrg: u, ttoOwner: ORG_PEOPLE[u]!.name, events: [...n.events, ev(ttoName(u), 'İncelemeyi üstlendi')] } : n));
        const n = needOf(needId);
        if (n?.status === 'yeni') notify(firmInbox(n.firmId), `${ttoName(u)} ihtiyacınızı incelemeye aldı: ${n.title}`, `ihtiyaclar/${needId}`, 'need');
      },
      setTtoNote(needId, note) {
        patchNeed(needId, (n) => ({ ...n, ttoNote: note }));
      },
      invite(needId, solverIds, by) {
        // Teknokent firmalarının bu demoda kendi kullanıcısı yok: kısa süre sonra kendiliğinden yanıt verirler
        solverIds
          .filter((sid) => sid !== PERSONAS.tfirma.firmId && FIRMS.some((f) => f.id === sid && isTechFirm(f)))
          .forEach((sid, i) =>
            setTimeout(() => {
              patchNeed(needId, (n) =>
                n.invites.some((x) => x.solverId === sid && x.status === 'bekliyor')
                  ? {
                      ...n,
                      invites: n.invites.map((x) => (x.solverId === sid ? { ...x, status: 'kabul', ndaAt: n.confidential ? Date.now() : x.ndaAt, note: 'Ön görüşmeye hazırız; benzer bir hatta kurulum deneyimimiz var.' } : x)),
                      events: [...n.events, ev(nameOf(sid), 'Daveti kabul etti')],
                    }
                  : n,
              );
              const n = needOf(needId);
              if (n) notify([firmInbox(n.firmId), ...ttoInboxes(n)], `${nameOf(sid)} davetinizi kabul etti: ${n.title}`, `ihtiyaclar/${needId}`, 'invite');
            }, 2500 + i * 1200),
          );
        patchNeed(needId, (n) => {
          const fresh = solverIds.filter((sid) => !n.invites.some((i) => i.solverId === sid));
          if (!fresh.length) return n;
          const byOrg = by === 'tto' ? state.orgSel.tto : undefined;
          const invites = [...n.invites, ...fresh.map((sid) => ({ solverId: sid, kind: (FIRMS.some((f) => f.id === sid) ? 'firm' : 'academic') as 'firm' | 'academic', by, byOrg, status: 'bekliyor' as const, at: Date.now() }))];
          const who = byOrg ? ttoName(byOrg) : firmOf(n.firmId).name;
          // Başka üniversitenin akademisyeni davet edildiyse o üniversitenin TTO'su da bilgilendirilir
          const otherTtos = [...new Set(fresh.map((sid) => state.academics.find((a) => a.id === sid)?.orgId).filter((u): u is string => !!u && u !== byOrg))];
          const base = fresh.length === 1 ? `${nameOf(fresh[0]!)} davet edildi` : `${fresh.length} çözüm sağlayıcı davet edildi: ${fresh.map(nameOf).join(', ')}`;
          const text = otherTtos.length ? `${base} (${otherTtos.map(ttoName).join(', ')} bilgilendirildi)` : base;
          return { ...n, invites, status: n.status === 'yeni' || n.status === 'inceleme' ? 'eslestirme' : n.status, events: [...n.events, ev(who, text)] };
        });
        const n = needOf(needId);
        if (n) {
          const fresh = solverIds.filter((sid) => !n.invites.some((i) => i.solverId === sid));
          const who = by === 'tto' ? ttoName(state.orgSel.tto) : firmOf(n.firmId).name;
          for (const sid of fresh) {
            notify(solverInbox(sid), `${who} sizi bir ihtiyaca davet etti: ${n.title}`, `ihtiyaclar/${needId}`, 'invite');
            const a = state.academics.find((x) => x.id === sid);
            if (a && (by !== 'tto' || a.orgId !== state.orgSel.tto)) notify(`tto:${a.orgId}`, `${a.name} bir ihtiyaca davet edildi (${who}): ${n.title}`, `ihtiyaclar/${needId}`, 'invite');
            const f = FIRMS.find((x) => x.id === sid);
            if (f) notify(`teknokent:${f.orgId}`, `${f.name} bir sanayi ihtiyacına davet edildi: ${n.title}`, `ihtiyaclar/${needId}`, 'invite');
          }
          if (by === 'tto' && fresh.length) notify(firmInbox(n.firmId), `${who} ihtiyacınız için ${fresh.length} uzman davet etti`, `ihtiyaclar/${needId}`, 'invite');
        }
      },
      respond(needId, solverId, accept, note) {
        patchNeed(needId, (n) => ({
          ...n,
          invites: n.invites.map((i) => (i.solverId === solverId ? { ...i, status: accept ? 'kabul' : 'ret', note } : i)),
          events: [...n.events, ev(nameOf(solverId), accept ? 'Daveti kabul etti' : 'Daveti geri çevirdi')],
        }));
        const n = needOf(needId);
        if (n) notify([firmInbox(n.firmId), ...ttoInboxes(n)], `${nameOf(solverId)} ${accept ? 'davetinizi kabul etti' : 'daveti geri çevirdi'}: ${n.title}`, `ihtiyaclar/${needId}`, 'invite');
      },
      express(needId, academicId, note) {
        patchNeed(needId, (n) =>
          n.invites.some((i) => i.solverId === academicId)
            ? n
            : {
                ...n,
                status: n.status === 'yeni' || n.status === 'inceleme' ? 'eslestirme' : n.status,
                invites: [...n.invites, { solverId: academicId, kind: FIRMS.some((f) => f.id === academicId) ? 'firm' : 'academic', by: 'akademisyen', status: 'kabul', at: Date.now(), note }],
                events: [...n.events, ev(nameOf(academicId), 'İhtiyaca ilgi bildirdi')],
              },
        );
        const n = needOf(needId);
        if (n && !n.invites.some((i) => i.solverId === academicId)) notify([firmInbox(n.firmId), ...ttoInboxes(n)], `${nameOf(academicId)} ihtiyacınıza ilgi bildirdi: ${n.title}`, `ihtiyaclar/${needId}`, 'invite');
      },
      signNda(needId, solverId) {
        patchNeed(needId, (n) => ({
          ...n,
          invites: n.invites.map((i) => (i.solverId === solverId ? { ...i, ndaAt: Date.now() } : i)),
          events: [...n.events, ev(nameOf(solverId), 'Gizlilik taahhüdünü onayladı')],
        }));
      },
      startProject(needId, solverId) {
        const id = uid('p');
        const kind = FIRMS.some((f) => f.id === solverId) ? 'firm' : 'academic';
        setState((s) => ({
          ...s,
          needs: s.needs.map((n) => (n.id === needId ? { ...n, status: 'proje', projectId: id, events: [...n.events, ev(firmOf(n.firmId).name, `${nameOf(solverId)} ile proje başlatıldı`)] } : n)),
          projects: [...s.projects, { id, needId, solverId, kind, stage: 'gorusme', startedAt: Date.now(), history: [{ at: Date.now(), stage: 'gorusme' }], messages: [] }],
        }));
        const n = needOf(needId);
        if (n) notify([solverInbox(solverId), ...ttoInboxes(n)], `${firmOf(n.firmId).name} sizinle proje başlattı: ${n.title}`, `projeler/${id}`, 'project');
        return id;
      },
      advance(projectId, patch) {
        const proj = state.projects.find((x) => x.id === projectId);
        if (proj && proj.stage !== 'tamamlandi') {
          const nd = needOf(proj.needId);
          notify(projectParties(proj), `Proje aşaması ilerledi: ${nd?.title ?? ''}`, `projeler/${projectId}`, 'stage');
        }
        const order: Stage[] = ['gorusme', 'nda', 'teklif', 'sozlesme', 'basvuru', 'yurutme', 'tamamlandi'];
        const label: Record<Stage, string> = { gorusme: 'Ön görüşme', nda: 'Gizlilik sözleşmesi imzalandı', teklif: 'Teklif iletildi', sozlesme: 'Sözleşme imzalandı', basvuru: 'Destek başvurusu yapıldı', yurutme: 'Yürütme başladı', tamamlandi: 'Proje tamamlandı' };
        setState((s) => {
          const p = s.projects.find((x) => x.id === projectId);
          if (!p || p.stage === 'tamamlandi') return s;
          const program = patch?.program ?? p.program;
          let next = order[order.indexOf(p.stage) + 1]!;
          // Destek başvurusu yalnızca dış destek programı seçildiyse gerekli
          if (next === 'basvuru' && (!program || program === 'oz' || program === 'bilinmiyor')) next = 'yurutme';
          const now = Date.now();
          return {
            ...s,
            projects: s.projects.map((x) => (x.id === projectId ? { ...x, ...patch, stage: next, history: [...x.history, { at: now, stage: next }], closedAt: next === 'tamamlandi' ? now : x.closedAt } : x)),
            needs: s.needs.map((n) => (n.id === p.needId ? { ...n, status: next === 'tamamlandi' ? 'kapandi' : n.status, events: [...n.events, { at: now, actor: 'Proje', text: label[next] }] } : n)),
          };
        });
      },
      sendMessage(projectId, msg) {
        patchProject(projectId, (p) => ({ ...p, messages: [...p.messages, { ...msg, at: Date.now() }] }));
        const p = state.projects.find((x) => x.id === projectId);
        if (p) {
          const mine = msg.from === 'firma' ? firmInbox(needOf(p.needId)?.firmId ?? '') : msg.from === 'cozucu' ? solverInbox(p.solverId) : `tto:${state.orgSel.tto}`;
          notify(projectParties(p).filter((x) => x !== mine), `${msg.name}: ${msg.text.slice(0, 80)}`, `projeler/${projectId}`, 'message');
        }
      },
      approveAcademic(id, ok) {
        setState((s) => ({ ...s, academics: ok ? s.academics.map((a) => (a.id === id ? { ...a, approved: true } : a)) : s.academics.filter((a) => a.id !== id) }));
        if (ok) notify(`academic:${id}`, 'Profiliniz TTO tarafından onaylandı; artık eşleştirme önerilerinde görünüyorsunuz.', 'profil', 'approval');
      },
      updateAcademic(id, patch) {
        setState((s) => ({ ...s, academics: s.academics.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
      },
      reset() {
        setState(seedState());
      },
    };
  }, [state, role, setRole, findSolver]);


  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useKopru() {
  const v = useContext(C);
  if (!v) throw new Error('KopruProvider eksik');
  return v;
}

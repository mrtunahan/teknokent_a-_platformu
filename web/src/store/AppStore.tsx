import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { DEMO_COMPANIES, DEMO_ME } from '@/data/companies';
import { compatibility } from '@/lib/score';
import { storage, uid } from '@/lib/utils';
import { dataSource } from '@/services';
import type {
  AppNotification,
  ChatAttachment,
  Company,
  Filters,
  Match,
  Message,
  MyCompany,
  PrivacySettings,
  ReportReason,
  SwipeDirection,
} from '@/types';

const STORAGE_KEY = 'teknomatch.demo.v2';

export const EMPTY_FILTERS: Filters = {
  sectors: [],
  expertise: [],
  cities: [],
  technoparks: [],
  sizes: [],
  collaborationTypes: [],
  investmentNeed: 'any',
  projectPartnership: false,
  rndCapable: false,
  exportFocused: false,
};

interface State {
  onboarded: boolean;
  me: MyCompany;
  companies: Company[];
  swipes: Record<string, SwipeDirection>;
  swipeOrder: string[];
  matches: Match[];
  messages: Record<string, Message[]>;
  typing: Record<string, boolean>;
  unread: Record<string, number>;
  favorites: string[];
  blocked: string[];
  reported: string[];
  notifications: AppNotification[];
  filters: Filters;
  privacy: PrivacySettings;
  profileViews: number[]; // son 14 gün
}

const H = 3600_000;
const D = 24 * H;

function seedState(): State {
  const now = Date.now();
  const byId = (id: string) => DEMO_COMPANIES.find((c) => c.id === id)!;
  const mk = (companyId: string, ago: number): Match => ({
    id: `m_${companyId}`,
    companyId,
    createdAt: now - ago,
    ...compatibility(DEMO_ME, byId(companyId)),
  });
  // c002 = Kalkan Siber, c010 = Mekatron Endüstri: hazır eşleşmeler
  const matches = [mk('c010', 2 * D), mk('c002', 5 * D)];
  const msg = (matchId: string, from: Message['from'], text: string, ago: number, extra: Partial<Message> = {}): Message => ({
    id: uid('msg'),
    matchId,
    from,
    text,
    createdAt: now - ago,
    status: 'read',
    ...extra,
  });
  return {
    onboarded: false,
    me: DEMO_ME,
    companies: DEMO_COMPANIES,
    swipes: { c010: 'right', c002: 'right' },
    swipeOrder: ['c002', 'c010'],
    matches,
    messages: {
      m_c010: [
        msg('m_c010', 'system', 'Eşleştiniz! Ortak hedef: Ortak Ürün', 2 * D),
        msg('m_c010', 'them', 'Merhaba! Orion Data Cloud ile Mekatron Twin’i entegre etmek bizim için çok değerli olur.', 2 * D - 2 * H),
        msg('m_c010', 'me', 'Merhaba Hakan Bey, biz de aynı fikirdeyiz. Pilot fabrikalarınızdan birinde PoC yapabilir miyiz?', 2 * D - 3 * H),
        msg('m_c010', 'them', 'Kesinlikle. İzmir’deki pres hattımız uygun, sensör verisini haftaya açabiliriz.', 1 * D),
        msg('m_c010', 'me', 'Teknik mimari sunumumuzu ekliyorum.', 20 * H, {
          attachment: { name: 'Orion-Mekatron-Entegrasyon.pdf', size: 2_340_000, type: 'application/pdf' },
        }),
        msg('m_c010', 'them', 'Teşekkürler, ekip inceliyor. Perşembe 14:00 toplantı için uygun musunuz?', 3 * H),
      ],
      m_c002: [
        msg('m_c002', 'system', 'Eşleştiniz! Ortak hedef: Ortak Ar-Ge', 5 * D),
        msg('m_c002', 'me', 'Merhaba, OT verilerinin güvenli aktarımı konusunda birlikte bir TÜBİTAK 1501 projesi düşünüyoruz.', 5 * D - H),
        msg('m_c002', 'them', 'Merhaba, çok yerinde bir fikir. Bu dönemki çağrıya yetişebiliriz.', 4 * D),
      ],
    },
    typing: {},
    unread: { m_c010: 1 },
    favorites: ['c001', 'c015'],
    blocked: [],
    reported: [],
    notifications: [
      { id: uid('n'), kind: 'message', title: 'Mekatron Endüstri', body: 'Perşembe 14:00 toplantı için uygun musunuz?', createdAt: now - 3 * H, read: false, companyId: 'c010', link: '/demo/messages/m_c010' },
      { id: uid('n'), kind: 'like', title: 'Yeni bir firma sizi beğendi', body: 'Eşleşmek için keşfet ekranında kaydırmaya devam edin.', createdAt: now - 6 * H, read: false, link: '/demo/discover' },
      { id: uid('n'), kind: 'view', title: 'Profiliniz 38 kez görüntülendi', body: 'Bu hafta görünürlüğünüz %24 arttı.', createdAt: now - 1 * D, read: false, link: '/demo' },
      { id: uid('n'), kind: 'match', title: 'Yeni eşleşme: Mekatron Endüstri', body: 'İş birliğini başlatmak için ilk mesajı gönderin.', createdAt: now - 2 * D, read: true, companyId: 'c010', link: '/demo/messages/m_c010' },
      { id: uid('n'), kind: 'system', title: 'Firma doğrulamanız tamamlandı', body: 'Profilinizde artık doğrulanmış rozeti görünüyor.', createdAt: now - 6 * D, read: true, link: '/demo/profile' },
    ],
    filters: EMPTY_FILTERS,
    privacy: {
      profileVisibility: 'everyone',
      showContactAfterMatch: true,
      showInFeatured: true,
      readReceipts: true,
      emailNotifications: true,
      allowAnalytics: false,
    },
    profileViews: [12, 18, 15, 22, 19, 27, 31, 24, 29, 35, 33, 41, 38, 46],
  };
}

type Action =
  | { type: 'swipe'; id: string; dir: SwipeDirection }
  | { type: 'undo' }
  | { type: 'match'; match: Match; note: AppNotification }
  | { type: 'addMessage'; message: Message }
  | { type: 'setStatus'; matchId: string; messageId: string; status: Message['status'] }
  | { type: 'typing'; matchId: string; on: boolean }
  | { type: 'readChat'; matchId: string }
  | { type: 'toggleFavorite'; id: string }
  | { type: 'block'; id: string }
  | { type: 'unblock'; id: string }
  | { type: 'report'; id: string }
  | { type: 'notify'; note: AppNotification }
  | { type: 'readNotification'; id?: string }
  | { type: 'setFilters'; filters: Filters }
  | { type: 'setPrivacy'; privacy: Partial<PrivacySettings> }
  | { type: 'saveProfile'; me: MyCompany }
  | { type: 'skipOnboarding' }
  | { type: 'resetDeck' }
  | { type: 'reset' };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'swipe':
      return { ...s, swipes: { ...s.swipes, [a.id]: a.dir }, swipeOrder: [...s.swipeOrder, a.id] };
    case 'undo': {
      const last = s.swipeOrder[s.swipeOrder.length - 1];
      if (!last || s.matches.some((m) => m.companyId === last)) return s;
      const { [last]: _removed, ...rest } = s.swipes;
      return { ...s, swipes: rest, swipeOrder: s.swipeOrder.slice(0, -1) };
    }
    case 'match':
      if (s.matches.some((m) => m.id === a.match.id)) return s;
      return {
        ...s,
        matches: [a.match, ...s.matches],
        messages: {
          ...s.messages,
          [a.match.id]: [
            { id: uid('msg'), matchId: a.match.id, from: 'system', text: `Eşleştiniz! ${a.match.reasons[0] ?? ''}`, createdAt: Date.now(), status: 'read' },
          ],
        },
        notifications: [a.note, ...s.notifications],
      };
    case 'addMessage': {
      const list = s.messages[a.message.matchId] ?? [];
      const unread = a.message.from === 'them' ? { ...s.unread, [a.message.matchId]: (s.unread[a.message.matchId] ?? 0) + 1 } : s.unread;
      return { ...s, messages: { ...s.messages, [a.message.matchId]: [...list, a.message] }, unread };
    }
    case 'setStatus':
      return {
        ...s,
        messages: {
          ...s.messages,
          [a.matchId]: (s.messages[a.matchId] ?? []).map((m) => (m.id === a.messageId ? { ...m, status: a.status } : m)),
        },
      };
    case 'typing':
      return { ...s, typing: { ...s.typing, [a.matchId]: a.on } };
    case 'readChat':
      return { ...s, unread: { ...s.unread, [a.matchId]: 0 } };
    case 'toggleFavorite':
      return { ...s, favorites: s.favorites.includes(a.id) ? s.favorites.filter((f) => f !== a.id) : [...s.favorites, a.id] };
    case 'block':
      return {
        ...s,
        blocked: [...new Set([...s.blocked, a.id])],
        matches: s.matches.filter((m) => m.companyId !== a.id),
        favorites: s.favorites.filter((f) => f !== a.id),
      };
    case 'unblock':
      return { ...s, blocked: s.blocked.filter((b) => b !== a.id) };
    case 'report':
      return { ...s, reported: [...new Set([...s.reported, a.id])] };
    case 'notify':
      return { ...s, notifications: [a.note, ...s.notifications] };
    case 'readNotification':
      return { ...s, notifications: s.notifications.map((n) => (!a.id || n.id === a.id ? { ...n, read: true } : n)) };
    case 'setFilters':
      return { ...s, filters: a.filters };
    case 'setPrivacy':
      return { ...s, privacy: { ...s.privacy, ...a.privacy } };
    case 'saveProfile':
      return { ...s, me: a.me, onboarded: true };
    case 'skipOnboarding':
      return { ...s, onboarded: true };
    case 'resetDeck': {
      const keep = new Set(s.matches.map((m) => m.companyId));
      const swipes = Object.fromEntries(Object.entries(s.swipes).filter(([id]) => keep.has(id)));
      return { ...s, swipes, swipeOrder: s.swipeOrder.filter((id) => keep.has(id)) };
    }
    case 'reset':
      return seedState();
  }
}

function load(): State {
  const saved = storage.get<Partial<State>>(STORAGE_KEY);
  const base = seedState();
  if (!saved) return base;
  return { ...base, ...saved, companies: base.companies, typing: {} };
}

function matchesFilters(c: Company, f: Filters) {
  if (f.sectors.length && !f.sectors.includes(c.sector)) return false;
  if (f.expertise.length && !c.expertise.some((e) => f.expertise.includes(e))) return false;
  if (f.cities.length && !f.cities.includes(c.city)) return false;
  if (f.technoparks.length && !f.technoparks.includes(c.technopark)) return false;
  if (f.sizes.length && !f.sizes.includes(c.employeeRange)) return false;
  if (f.collaborationTypes.length && !c.collaborationTypes.some((t) => f.collaborationTypes.includes(t))) return false;
  if (f.investmentNeed === 'needs' && c.investmentNeed === 'none') return false;
  if (f.investmentNeed === 'none' && c.investmentNeed !== 'none') return false;
  if (f.projectPartnership && !c.seekingProjectPartner) return false;
  if (f.rndCapable && !c.hasRndCenter) return false;
  if (f.exportFocused && !c.exportFocused) return false;
  return true;
}

export const activeFilterCount = (f: Filters) =>
  f.sectors.length +
  f.expertise.length +
  f.cities.length +
  f.technoparks.length +
  f.sizes.length +
  f.collaborationTypes.length +
  (f.investmentNeed !== 'any' ? 1 : 0) +
  (f.projectPartnership ? 1 : 0) +
  (f.rndCapable ? 1 : 0) +
  (f.exportFocused ? 1 : 0);

function useStoreValue() {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const { typing: _t, companies: _c, ...persist } = state;
    storage.set(STORAGE_KEY, persist);
  }, [state]);

  const companyById = useCallback((id: string) => state.companies.find((c) => c.id === id), [state.companies]);

  const deck = useMemo(
    () =>
      state.companies.filter(
        (c) => !state.swipes[c.id] && !state.blocked.includes(c.id) && matchesFilters(c, state.filters),
      ),
    [state.companies, state.swipes, state.blocked, state.filters],
  );

  /** Kaydırma: eşleşme oluşursa Match nesnesini döndürür. */
  const swipe = useCallback(async (id: string, dir: SwipeDirection): Promise<Match | null> => {
    dispatch({ type: 'swipe', id, dir });
    const res = await dataSource.swipe(id, dir);
    if (!res.matched) return null;
    const company = stateRef.current.companies.find((c) => c.id === id)!;
    const match: Match = {
      id: res.matchId ?? `m_${id}`,
      companyId: id,
      createdAt: Date.now(),
      ...compatibility(stateRef.current.me, company),
    };
    dispatch({
      type: 'match',
      match,
      note: {
        id: uid('n'),
        kind: 'match',
        title: `Yeni eşleşme: ${company.name}`,
        body: 'İş birliğini başlatmak için ilk mesajı gönderin.',
        createdAt: Date.now(),
        read: false,
        companyId: id,
        link: `/demo/messages/${match.id}`,
      },
    });
    return match;
  }, []);

  const sendMessage = useCallback(async (matchId: string, text: string, extra?: { attachment?: ChatAttachment; meeting?: Message['meeting'] }) => {
    const message: Message = { id: uid('msg'), matchId, from: 'me', text, createdAt: Date.now(), status: 'sending', ...extra };
    dispatch({ type: 'addMessage', message });
    await dataSource.sendMessage(matchId, text);
    dispatch({ type: 'setStatus', matchId, messageId: message.id, status: 'sent' });
    setTimeout(() => dispatch({ type: 'setStatus', matchId, messageId: message.id, status: 'delivered' }), 600);

    const match = stateRef.current.matches.find((m) => m.id === matchId);
    const company = match && stateRef.current.companies.find((c) => c.id === match.companyId);
    if (!company || !dataSource.simulateReply) return;
    setTimeout(() => {
      dispatch({ type: 'setStatus', matchId, messageId: message.id, status: 'read' });
      dispatch({ type: 'typing', matchId, on: true });
    }, 1400);
    const reply = await dataSource.simulateReply(matchId, company, extra?.meeting ? 'toplantı' : extra?.attachment ? 'dosya' : text);
    dispatch({ type: 'typing', matchId, on: false });
    dispatch({ type: 'addMessage', message: { id: uid('msg'), matchId, from: 'them', text: reply, createdAt: Date.now(), status: 'read' } });
  }, []);

  const report = useCallback(async (id: string, reason: ReportReason, details?: string) => {
    await dataSource.report(id, reason, details);
    dispatch({ type: 'report', id });
  }, []);

  const block = useCallback(async (id: string) => {
    await dataSource.block(id);
    dispatch({ type: 'block', id });
  }, []);

  const saveProfile = useCallback(async (me: MyCompany) => {
    await dataSource.saveProfile(me);
    dispatch({ type: 'saveProfile', me });
  }, []);

  /** Bana gelen beğeniler (demo): karşılıklı olmayan, henüz kaydırılmamış firmalar */
  const stats = useMemo(() => {
    const liked = Object.entries(state.swipes).filter(([, d]) => d !== 'left').length;
    const passed = Object.values(state.swipes).filter((d) => d === 'left').length;
    const conversations = state.matches.filter((m) => (state.messages[m.id] ?? []).some((x) => x.from !== 'system')).length;
    const unreadMessages = Object.values(state.unread).reduce((a, b) => a + b, 0);
    const unreadNotifications = state.notifications.filter((n) => !n.read).length;
    return {
      liked,
      passed,
      likedMe: 9 + state.matches.length * 2,
      matches: state.matches.length,
      conversations,
      totalViews: state.profileViews.reduce((a, b) => a + b, 0),
      unreadMessages,
      unreadNotifications,
    };
  }, [state.swipes, state.matches, state.messages, state.unread, state.notifications, state.profileViews]);

  return { state, dispatch, deck, companyById, swipe, sendMessage, report, block, saveProfile, stats };
}

type Store = ReturnType<typeof useStoreValue>;
const Ctx = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore, AppStoreProvider içinde kullanılmalı');
  return v;
}

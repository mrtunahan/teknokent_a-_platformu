import { Building2, Compass, HeartHandshake, LayoutDashboard, LogOut, MessagesSquare, ShieldCheck, UserCog } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Shell, type NavItem } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import { api } from './api';
import { useAuth } from './auth';
import { getSocket, useSocketEvent } from './socket';
import type { MatchItem } from './types';
import { Logo } from './ui';
import { ROLES } from './labels';

/* ------------------------- Paylaşılan eşleşme durumu ------------------------- */

interface LiveData {
  matches: MatchItem[] | null;
  matchesError: Error | null;
  reloadMatches: () => Promise<void>;
  unread: number;
  markRead: (matchId: string) => void;
}

const Ctx = createContext<LiveData | null>(null);
export const useLive = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLive, LiveShell içinde kullanılmalı');
  return v;
};

function LiveDataProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [matches, setMatches] = useState<MatchItem[] | null>(null);
  const [matchesError, setError] = useState<Error | null>(null);
  const location = useLocation();
  const toast = useToast();

  const reloadMatches = useCallback(async () => {
    if (!enabled) return;
    try {
      const r = await api.get<{ matches: MatchItem[] }>('/matches');
      setMatches(r.matches);
      setError(null);
    } catch (e) {
      setError(e as Error);
    }
  }, [enabled]);

  useEffect(() => {
    void reloadMatches();
  }, [reloadMatches]);

  useEffect(() => {
    if (enabled) getSocket();
  }, [enabled]);

  useSocketEvent<{ matchId: string; senderName?: string; content?: string }>('message:new', (m) => {
    const viewing = location.pathname === `/app/messages/${m.matchId}`;
    setMatches((list) =>
      list?.map((x) => (String(x.id) === String(m.matchId) ? { ...x, lastMessageAt: new Date().toISOString(), unreadCount: viewing ? 0 : x.unreadCount + 1 } : x)) ?? list,
    );
    if (!viewing && m.senderName) toast({ title: `Yeni mesaj · ${m.senderName}`, body: m.content?.slice(0, 90), tone: 'info' });
  });
  useSocketEvent('match:new', () => {
    toast({ title: 'Yeni eşleşme! 🎉', body: 'Karşılıklı ilgi oluştu. Eşleşmelerim sayfasından mesaj gönderin.' });
    void reloadMatches();
  });
  useSocketEvent<{ company?: { name: string } }>('interest:super', (p) => toast({ title: 'Süper ilgi aldınız', body: `${p.company?.name ?? 'Bir firma'} sizinle özellikle ilgileniyor.`, tone: 'info' }));
  useSocketEvent('meeting:proposed', () => {
    toast({ title: 'Yeni toplantı önerisi', tone: 'info' });
    void reloadMatches();
  });

  const value = useMemo<LiveData>(
    () => ({
      matches,
      matchesError,
      reloadMatches,
      unread: (matches ?? []).reduce((a, m) => a + (m.unreadCount || 0), 0),
      markRead: (id) => setMatches((l) => l?.map((m) => (String(m.id) === String(id) ? { ...m, unreadCount: 0 } : m)) ?? l),
    }),
    [matches, matchesError, reloadMatches],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ---------------------------------- Kabuk ----------------------------------- */

export default function LiveShell() {
  const auth = useAuth();
  const navigate = useNavigate();
  const user = auth.user!;
  const enabled = auth.isCompanyUser && auth.approved;

  return (
    <LiveDataProvider enabled={enabled}>
      <ShellInner
        onLogout={() => {
          auth.logout();
          navigate('/giris', { replace: true });
        }}
        userName={user.fullName}
        role={ROLES[user.role]}
      />
    </LiveDataProvider>
  );
}

function ShellInner({ onLogout, userName, role }: { onLogout: () => void; userName: string; role: string }) {
  const auth = useAuth();
  const { unread } = useLive();

  const nav: NavItem[] = auth.isPanelUser
    ? [
        { to: '/app/panel', label: 'Teknokent Paneli', short: 'Panel', icon: ShieldCheck },
        { to: '/app/account', label: 'Hesabım', short: 'Hesap', icon: UserCog },
      ]
    : [
        { to: '/app', label: 'Genel Bakış', short: 'Bakış', icon: LayoutDashboard, end: true },
        { to: '/app/discover', label: 'Firmaları Keşfet', short: 'Keşfet', icon: Compass },
        { to: '/app/matches', label: 'Eşleşmelerim', icon: HeartHandshake },
        { to: '/app/messages', label: 'Mesajlar', icon: MessagesSquare, badge: unread },
        { to: '/app/profile', label: 'Firma Profilim', icon: Building2 },
        { to: '/app/account', label: 'Hesabım', short: 'Hesap', icon: UserCog },
      ];
  const mobile = auth.isPanelUser ? nav : [nav[0]!, nav[1]!, nav[2]!, nav[3]!];
  const companyName = auth.company?.name;

  return (
    <Shell
      nav={nav}
      mobile={mobile}
      fullBleedPrefix="/app/messages/"
      user={{ name: userName, title: auth.user?.title || role }}
      messagesHref={auth.isCompanyUser ? '/app/messages' : undefined}
      messagesBadge={unread}
      searchHref={auth.isCompanyUser && auth.approved ? '/app/discover' : undefined}
      profile={{
        name: companyName || userName,
        subtitle: companyName ? userName : role,
        verified: auth.approved,
        logo: <Logo company={{ name: companyName || userName, logoUrl: auth.company?.logoUrl }} size={36} />,
        href: auth.isPanelUser ? '/app/account' : '/app/profile',
      }}
      banner={
        auth.isCompanyUser && !auth.approved ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs text-amber-800">
            {auth.company?.verification?.status === 'rejected'
              ? `Firma başvurunuz onaylanmadı${auth.company.verification.note ? `: ${auth.company.verification.note}` : '.'}`
              : 'Firmanız teknokent yönetiminin onayını bekliyor. Bu sürede profilinizi tamamlayabilirsiniz.'}
          </div>
        ) : undefined
      }
      footer={
        <button onClick={onLogout} className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-slate-500 hover:text-slate-900">
          <LogOut className="h-3.5 w-3.5" /> Çıkış yap
        </button>
      }
    />
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Bookmark,
  Building2,
  Compass,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  MoreHorizontal,
  Settings,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useStore } from '@/store/AppStore';
import { BrandMark, CompanyLogo, VerifiedBadge } from '@/components/ui';
import { cn } from '@/lib/utils';

type Item = { to: string; label: string; icon: typeof Compass; badge?: 'messages' | 'notifications'; end?: boolean };

const NAV: Item[] = [
  { to: '/app', label: 'Genel Bakış', icon: LayoutDashboard, end: true },
  { to: '/app/profile', label: 'Firma Profilim', icon: Building2 },
  { to: '/app/discover', label: 'Firmaları Keşfet', icon: Compass },
  { to: '/app/matches', label: 'Eşleşmelerim', icon: HeartHandshake },
  { to: '/app/messages', label: 'Mesajlar', icon: MessagesSquare, badge: 'messages' },
  { to: '/app/favorites', label: 'Favorilerim', icon: Bookmark },
  { to: '/app/notifications', label: 'Bildirimler', icon: Bell, badge: 'notifications' },
  { to: '/app/settings', label: 'Hesap Ayarları', icon: Settings },
];

const MOBILE: Item[] = [NAV[0]!, NAV[2]!, NAV[3]!, NAV[4]!];

export function AppShell() {
  const { state, stats } = useStore();
  const location = useLocation();
  const [more, setMore] = useState(false);
  const badge = (b?: Item['badge']) => (b === 'messages' ? stats.unreadMessages : b === 'notifications' ? stats.unreadNotifications : 0);
  const fullBleed = location.pathname.startsWith('/app/messages/');

  return (
    <div className="relative min-h-[100svh] bg-ink-950">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/3 h-[30rem] w-[40rem] rounded-full bg-electric-500/[0.08] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[24rem] w-[30rem] rounded-full bg-violet-500/[0.06] blur-[120px]" />
      </div>

      {/* Sidebar (masaüstü) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-white/[0.06] bg-ink-900/60 px-4 py-6 backdrop-blur-xl lg:flex">
        <Link to="/" className="px-2" aria-label="Ana sayfa">
          <BrandMark />
        </Link>
        <nav className="mt-10 flex-1 space-y-1" aria-label="Uygulama menüsü">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="block">
              {({ isActive }) => (
                <span className={cn('relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition', isActive ? 'text-white' : 'text-slate-400 hover:bg-white/[0.03] hover:text-white')}>
                  {isActive && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl border border-white/[0.08] bg-white/[0.06]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                  {isActive && <motion.span layoutId="nav-dot" className="absolute -left-4 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-electric-400 shadow-[0_0_12px_#4d94ff]" />}
                  <item.icon className={cn('relative h-[18px] w-[18px]', isActive && 'text-electric-300')} />
                  <span className="relative flex-1">{item.label}</span>
                  {badge(item.badge) > 0 && <span className="relative rounded-full bg-electric-500 px-2 py-0.5 text-[10px] font-semibold text-white">{badge(item.badge)}</span>}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <Link to="/app/profile" className="glass flex items-center gap-3 rounded-2xl p-3 transition hover:border-white/15">
          <CompanyLogo company={state.me} size={38} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 truncate text-sm font-semibold text-white">
              {state.me.name} {state.me.verified && <VerifiedBadge />}
            </div>
            <div className="truncate text-xs text-slate-500">{state.me.technopark}</div>
          </div>
        </Link>
        <Link to="/" className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 hover:text-white">
          <LogOut className="h-3.5 w-3.5" /> Ana sayfaya dön
        </Link>
      </aside>

      {/* Mobil üst bar */}
      <header className={cn('sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.06] bg-ink-950/70 px-4 py-3 backdrop-blur-xl lg:hidden', fullBleed && 'hidden')}>
        <Link to="/" aria-label="Ana sayfa">
          <BrandMark />
        </Link>
        <div className="flex items-center gap-1">
          <NavLink to="/app/notifications" className="relative rounded-xl p-2 text-slate-300" aria-label="Bildirimler">
            <Bell className="h-5 w-5" />
            {stats.unreadNotifications > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-electric-400 ring-2 ring-ink-950" />}
          </NavLink>
          <Link to="/app/profile" aria-label="Firma profilim">
            <CompanyLogo company={state.me} size={32} />
          </Link>
        </div>
      </header>

      <main className={cn('relative lg:pl-[264px]', !fullBleed && 'pb-28 lg:pb-0')}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname.split('/').slice(0, 3).join('/')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobil alt navigasyon */}
      <nav className={cn('safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-ink-900/85 backdrop-blur-xl lg:hidden', fullBleed && 'hidden')} aria-label="Alt menü">
        <div className="mx-auto grid max-w-md grid-cols-5 px-2 py-1.5">
          {MOBILE.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="relative flex flex-col items-center gap-1 py-1.5">
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="mnav" className="absolute inset-x-3 inset-y-0 rounded-xl bg-white/[0.06]" />}
                  <span className="relative">
                    <item.icon className={cn('h-5 w-5', isActive ? 'text-electric-300' : 'text-slate-400')} />
                    {badge(item.badge) > 0 && <span className="absolute -right-2 -top-1 rounded-full bg-electric-500 px-1.5 text-[9px] font-bold text-white">{badge(item.badge)}</span>}
                  </span>
                  <span className={cn('relative text-[10px]', isActive ? 'text-white' : 'text-slate-500')}>{item.label.split(' ').pop()}</span>
                </>
              )}
            </NavLink>
          ))}
          <button onClick={() => setMore((v) => !v)} className="flex flex-col items-center gap-1 py-1.5" aria-expanded={more}>
            <MoreHorizontal className="h-5 w-5 text-slate-400" />
            <span className="text-[10px] text-slate-500">Daha fazla</span>
          </button>
        </div>
        <AnimatePresence>
          {more && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="glass-strong absolute bottom-full right-3 mb-2 w-56 rounded-2xl p-2">
              {[NAV[1]!, NAV[5]!, NAV[6]!, NAV[7]!].map((item) => (
                <NavLink key={item.to} to={item.to} onClick={() => setMore(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5">
                  <item.icon className="h-4 w-4" /> {item.label}
                </NavLink>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

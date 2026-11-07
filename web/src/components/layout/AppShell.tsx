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
import { useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useStore } from '@/store/AppStore';
import { BrandMark, CompanyLogo, VerifiedBadge } from '@/components/ui';
import { cn } from '@/lib/utils';

export type NavItem = { to: string; label: string; short?: string; icon: typeof Compass; badge?: number; end?: boolean };

export interface ShellProps {
  nav: NavItem[];
  /** Mobil alt menüde doğrudan görünen öğeler (en fazla 4); kalanlar "Daha fazla" menüsüne gider */
  mobile: NavItem[];
  /** Sohbet ekranı gibi, mobilde üst/alt barların gizlendiği rotalar */
  fullBleedPrefix: string;
  profile: { name: string; subtitle?: string; verified?: boolean; logo: ReactNode; href: string };
  notificationsHref?: string;
  notificationsBadge?: number;
  banner?: ReactNode;
  footer?: ReactNode;
}

/** Uygulama kabuğu: masaüstünde sidebar, mobilde üst bar + alt navigasyon. Demo ve canlı uygulama paylaşır. */
export function Shell({ nav, mobile, fullBleedPrefix, profile, notificationsHref, notificationsBadge = 0, banner, footer }: ShellProps) {
  const location = useLocation();
  const [more, setMore] = useState(false);
  const fullBleed = location.pathname.startsWith(fullBleedPrefix);
  const moreItems = nav.filter((n) => !mobile.includes(n));

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
        <nav className="mt-10 flex-1 space-y-1 overflow-y-auto" aria-label="Uygulama menüsü">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="block">
              {({ isActive }) => (
                <span className={cn('relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition', isActive ? 'text-white' : 'text-slate-400 hover:bg-white/[0.03] hover:text-white')}>
                  {isActive && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl border border-white/[0.08] bg-white/[0.06]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                  {isActive && <motion.span layoutId="nav-dot" className="absolute -left-4 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-electric-400 shadow-[0_0_12px_#4d94ff]" />}
                  <item.icon className={cn('relative h-[18px] w-[18px]', isActive && 'text-electric-300')} />
                  <span className="relative flex-1">{item.label}</span>
                  {!!item.badge && <span className="relative rounded-full bg-electric-500 px-2 py-0.5 text-[10px] font-semibold text-white">{item.badge}</span>}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <Link to={profile.href} className="glass flex items-center gap-3 rounded-2xl p-3 transition hover:border-white/15">
          {profile.logo}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 truncate text-sm font-semibold text-white">
              <span className="truncate">{profile.name}</span> {profile.verified && <VerifiedBadge />}
            </div>
            {profile.subtitle && <div className="truncate text-xs text-slate-500">{profile.subtitle}</div>}
          </div>
        </Link>
        {footer}
      </aside>

      {/* Mobil üst bar */}
      <header className={cn('sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.06] bg-ink-950/70 px-4 py-3 backdrop-blur-xl lg:hidden', fullBleed && 'hidden')}>
        <Link to="/" aria-label="Ana sayfa">
          <BrandMark />
        </Link>
        <div className="flex items-center gap-1">
          {notificationsHref && (
            <NavLink to={notificationsHref} className="relative rounded-xl p-2 text-slate-300" aria-label="Bildirimler">
              <Bell className="h-5 w-5" />
              {notificationsBadge > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-electric-400 ring-2 ring-ink-950" />}
            </NavLink>
          )}
          <Link to={profile.href} aria-label="Profilim">
            {profile.logo}
          </Link>
        </div>
      </header>

      <main className={cn('relative lg:pl-[264px]', !fullBleed && 'pb-28 lg:pb-0')}>
        {!location.pathname.startsWith(fullBleedPrefix.replace(/\/$/, '')) && banner}
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
        <div className={cn('mx-auto grid max-w-md px-2 py-1.5', moreItems.length ? 'grid-cols-5' : 'grid-cols-4')}>
          {mobile.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="relative flex flex-col items-center gap-1 py-1.5">
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="mnav" className="absolute inset-x-3 inset-y-0 rounded-xl bg-white/[0.06]" />}
                  <span className="relative">
                    <item.icon className={cn('h-5 w-5', isActive ? 'text-electric-300' : 'text-slate-400')} />
                    {!!item.badge && <span className="absolute -right-2 -top-1 rounded-full bg-electric-500 px-1.5 text-[9px] font-bold text-white">{item.badge}</span>}
                  </span>
                  <span className={cn('relative text-[10px]', isActive ? 'text-white' : 'text-slate-500')}>{item.short ?? item.label.split(' ').pop()}</span>
                </>
              )}
            </NavLink>
          ))}
          {moreItems.length > 0 && (
            <button onClick={() => setMore((v) => !v)} className="flex flex-col items-center gap-1 py-1.5" aria-expanded={more}>
              <MoreHorizontal className="h-5 w-5 text-slate-400" />
              <span className="text-[10px] text-slate-500">Daha fazla</span>
            </button>
          )}
        </div>
        <AnimatePresence>
          {more && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="glass-strong absolute bottom-full right-3 mb-2 w-60 rounded-2xl p-2">
              {moreItems.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={() => setMore(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5">
                  <item.icon className="h-4 w-4" /> {item.label}
                  {!!item.badge && <span className="ml-auto rounded-full bg-electric-500 px-2 text-[10px] font-semibold text-white">{item.badge}</span>}
                </NavLink>
              ))}
              {footer && <div className="mt-1 border-t border-white/[0.06] pt-1">{footer}</div>}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </div>
  );
}

/** Demo (yerel örnek veri) kabuğu */
export function AppShell() {
  const { state, stats } = useStore();
  const nav: NavItem[] = [
    { to: '/demo', label: 'Genel Bakış', short: 'Bakış', icon: LayoutDashboard, end: true },
    { to: '/demo/profile', label: 'Firma Profilim', icon: Building2 },
    { to: '/demo/discover', label: 'Firmaları Keşfet', short: 'Keşfet', icon: Compass },
    { to: '/demo/matches', label: 'Eşleşmelerim', icon: HeartHandshake },
    { to: '/demo/messages', label: 'Mesajlar', icon: MessagesSquare, badge: stats.unreadMessages },
    { to: '/demo/favorites', label: 'Favorilerim', icon: Bookmark },
    { to: '/demo/notifications', label: 'Bildirimler', icon: Bell, badge: stats.unreadNotifications },
    { to: '/demo/settings', label: 'Hesap Ayarları', icon: Settings },
  ];
  return (
    <Shell
      nav={nav}
      mobile={[nav[0]!, nav[2]!, nav[3]!, nav[4]!]}
      fullBleedPrefix="/demo/messages/"
      profile={{ name: state.me.name, subtitle: state.me.technopark, verified: state.me.verified, logo: <CompanyLogo company={state.me} size={36} />, href: '/demo/profile' }}
      notificationsHref="/demo/notifications"
      notificationsBadge={stats.unreadNotifications}
      banner={
        <div className="border-b border-amber-300/10 bg-amber-300/[0.06] px-4 py-2 text-center text-xs text-amber-200/90">
          Demo modundasınız — veriler örnektir ve yalnızca bu tarayıcıda saklanır.{' '}
          <Link to="/kayit" className="font-medium underline-offset-2 hover:underline">
            Gerçek hesap oluşturun →
          </Link>
        </div>
      }
      footer={
        <Link to="/" className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 hover:text-white">
          <LogOut className="h-3.5 w-3.5" /> Demodan çık
        </Link>
      }
    />
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
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

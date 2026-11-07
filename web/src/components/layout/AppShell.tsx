import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Bookmark,
  Building2,
  Compass,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  MessagesSquare,
  MoreHorizontal,
  Search,
  Settings,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '@/store/AppStore';
import { BrandMark, CompanyLogo, VerifiedBadge } from '@/components/ui';
import { cn, initials } from '@/lib/utils';

export type NavItem = { to: string; label: string; short?: string; icon: typeof Compass; badge?: number; end?: boolean };

export interface ShellProps {
  nav: NavItem[];
  /** Mobil alt menüde doğrudan görünen öğeler (en fazla 4); kalanlar "Daha fazla" menüsüne gider */
  mobile: NavItem[];
  /** Sohbet ekranı gibi, mobilde üst/alt barların gizlendiği rotalar */
  fullBleedPrefix: string;
  /** Sidebar altındaki firma kartı */
  profile: { name: string; subtitle?: string; verified?: boolean; logo: ReactNode; href: string };
  /** Üst bardaki kullanıcı */
  user: { name: string; title?: string };
  notificationsHref?: string;
  notificationsBadge?: number;
  messagesHref?: string;
  messagesBadge?: number;
  /** Üst bar araması: Enter'a basıldığında gidilecek adres */
  searchHref?: string;
  banner?: ReactNode;
  footer?: ReactNode;
}

/** Uygulama kabuğu: 260px beyaz sidebar + üst bar (masaüstü), mobilde üst bar + alt navigasyon. */
export function Shell({ nav, mobile, fullBleedPrefix, profile, user, notificationsHref, notificationsBadge = 0, messagesHref, messagesBadge = 0, searchHref, banner, footer }: ShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [more, setMore] = useState(false);
  const [q, setQ] = useState('');
  const fullBleed = location.pathname.startsWith(fullBleedPrefix);
  const moreItems = nav.filter((n) => !mobile.includes(n));
  const showBanner = !location.pathname.startsWith(fullBleedPrefix.replace(/\/$/, ''));

  return (
    <div className="relative min-h-[100svh] bg-slate-50">
      {/* Sidebar (masaüstü) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-slate-200 bg-white px-4 py-5 lg:flex">
        <Link to="/" className="px-2" aria-label="Ana sayfa">
          <BrandMark />
        </Link>
        <nav className="mt-8 flex-1 space-y-1 overflow-y-auto" aria-label="Uygulama menüsü">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="block">
              {({ isActive }) => (
                <span className={cn('relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition', isActive ? 'text-primary-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}>
                  {isActive && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-primary-50" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                  <item.icon className="relative h-[18px] w-[18px]" />
                  <span className="relative flex-1">{item.label}</span>
                  {!!item.badge && <span className="relative grid h-5 min-w-5 place-items-center rounded-full bg-primary-500 px-1.5 text-[10px] font-bold text-white">{item.badge}</span>}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <Link to={profile.href} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-slate-300">
          {profile.logo}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 truncate text-sm font-semibold text-slate-900">
              <span className="truncate">{profile.name}</span> {profile.verified && <VerifiedBadge tone="orange" />}
            </div>
            {profile.subtitle && <div className="mt-0.5 inline-block max-w-full truncate rounded-md bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">{profile.subtitle}</div>}
          </div>
        </Link>
        {footer}
      </aside>

      {/* Üst bar */}
      <header className={cn('sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl lg:pl-[260px]', fullBleed && 'hidden lg:block')}>
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="Ana sayfa" className="lg:hidden">
            <BrandMark />
          </Link>
          {searchHref && (
            <form
              className="relative hidden max-w-md flex-1 md:block"
              onSubmit={(e) => {
                e.preventDefault();
                navigate(searchHref + (q ? `?q=${encodeURIComponent(q)}` : ''));
              }}
            >
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-500/10" placeholder="Teknoloji veya firma ara..." aria-label="Teknoloji veya firma ara" />
            </form>
          )}
          <div className="ml-auto flex items-center gap-1">
            {notificationsHref && (
              <NavLink to={notificationsHref} className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Bildirimler">
                <Bell className="h-5 w-5" />
                {notificationsBadge > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary-500 ring-2 ring-white" />}
              </NavLink>
            )}
            {messagesHref && (
              <NavLink to={messagesHref} className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Mesajlar">
                <MessageSquare className="h-5 w-5" />
                {messagesBadge > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary-500 ring-2 ring-white" />}
              </NavLink>
            )}
            <span className="mx-2 hidden h-8 w-px bg-slate-200 sm:block" />
            <Link to={profile.href} className="flex items-center gap-3 rounded-xl py-1 pl-1 pr-2 transition hover:bg-slate-50">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{initials(user.name)}</span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-sm font-semibold text-slate-900">{user.name}</span>
                {user.title && <span className="block text-xs text-slate-500">{user.title}</span>}
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main className={cn('relative lg:pl-[260px]', !fullBleed && 'pb-28 lg:pb-0')}>
        {showBanner && banner}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname.split('/').slice(0, 3).join('/')}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobil alt navigasyon */}
      <nav className={cn('safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-xl lg:hidden', fullBleed && 'hidden')} aria-label="Alt menü">
        <div className={cn('mx-auto grid max-w-md px-2 py-1.5', moreItems.length ? 'grid-cols-5' : 'grid-cols-4')}>
          {mobile.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="relative flex flex-col items-center gap-1 py-1.5">
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="mnav" className="absolute inset-x-3 inset-y-0 rounded-xl bg-primary-50" />}
                  <span className="relative">
                    <item.icon className={cn('h-5 w-5', isActive ? 'text-primary-600' : 'text-slate-400')} />
                    {!!item.badge && <span className="absolute -right-2 -top-1 rounded-full bg-primary-500 px-1.5 text-[9px] font-bold text-white">{item.badge}</span>}
                  </span>
                  <span className={cn('relative text-[10px] font-medium', isActive ? 'text-primary-600' : 'text-slate-500')}>{item.short ?? item.label.split(' ').pop()}</span>
                </>
              )}
            </NavLink>
          ))}
          {moreItems.length > 0 && (
            <button onClick={() => setMore((v) => !v)} className="flex flex-col items-center gap-1 py-1.5" aria-expanded={more}>
              <MoreHorizontal className="h-5 w-5 text-slate-400" />
              <span className="text-[10px] font-medium text-slate-500">Daha fazla</span>
            </button>
          )}
        </div>
        <AnimatePresence>
          {more && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="glass-strong absolute bottom-full right-3 mb-2 w-60 rounded-2xl p-2">
              {moreItems.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={() => setMore(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                  <item.icon className="h-4 w-4" /> {item.label}
                  {!!item.badge && <span className="ml-auto rounded-full bg-primary-500 px-2 text-[10px] font-semibold text-white">{item.badge}</span>}
                </NavLink>
              ))}
              {footer && <div className="mt-1 border-t border-slate-100 pt-1">{footer}</div>}
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
      user={{ name: state.me.contact.name, title: state.me.contact.title }}
      notificationsHref="/demo/notifications"
      notificationsBadge={stats.unreadNotifications}
      messagesHref="/demo/messages"
      messagesBadge={stats.unreadMessages}
      searchHref="/demo/discover"
      footer={
        <Link to="/" className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 hover:text-slate-900">
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
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

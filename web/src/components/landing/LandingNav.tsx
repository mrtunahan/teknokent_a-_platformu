import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark, ButtonLink } from '@/components/ui';
import { homeFor, useAuth } from '@/live/auth';
import { cn } from '@/lib/utils';

const links = [
  ['Nasıl Çalışır', '/#nasil-calisir'],
  ['Avantajlar', '/#avantajlar'],
  ['Firmalar', '/#firmalar'],
  ['Hikâyeler', '/#hikayeler'],
] as const;

export function LandingNav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const auth = useAuth();
  const signedIn = !!auth.user;
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 24));

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
      <nav
        className={cn(
          'mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-500',
          scrolled ? 'glass-strong' : 'border border-transparent',
        )}
      >
        <Link to="/" aria-label="TeknoMatch ana sayfa">
          <BrandMark />
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {links.map(([l, h]) => (
            <a key={h} href={h.slice(1)} className="rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:text-white">
              {l}
            </a>
          ))}
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <ButtonLink to="/demo/discover" variant="ghost" size="sm">
            Demo
          </ButtonLink>
          {signedIn ? (
            <ButtonLink to={homeFor(auth)} size="sm">
              Uygulamaya git
            </ButtonLink>
          ) : (
            <>
              <ButtonLink to="/giris" variant="ghost" size="sm">
                Giriş Yap
              </ButtonLink>
              <ButtonLink to="/kayit" size="sm">
                Ücretsiz Başla
              </ButtonLink>
            </>
          )}
        </div>
        <button className="rounded-lg p-2 text-slate-300 md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menü" aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="glass-strong mx-auto mt-2 max-w-6xl rounded-2xl p-3 md:hidden">
            {links.map(([l, h]) => (
              <a key={h} href={h.slice(1)} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-white/5">
                {l}
              </a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ButtonLink to={signedIn ? homeFor(auth) : '/giris'} variant="secondary" size="sm">
                {signedIn ? 'Uygulamaya git' : 'Giriş Yap'}
              </ButtonLink>
              <ButtonLink to="/demo/discover" size="sm">
                Demoyu dene
              </ButtonLink>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

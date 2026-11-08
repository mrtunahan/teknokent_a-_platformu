import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Menu, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark, ButtonLink } from '@/components/ui';
import { homeFor, useAuth } from '@/live/auth';
import { cn } from '@/lib/utils';

const links = [
  ['Platform', '/#platform'],
  ['Teknoparklar', '/#teknoparklar'],
  ['Çözümler', '/#cozumler'],
  ['Başarı Hikayeleri', '/#hikayeler'],
] as const;

/** Üstte canlı bilgi bandı + yapışkan beyaz navigasyon. */
export function LandingNav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const auth = useAuth();
  const signedIn = !!auth.user;
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 24));

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="bg-slate-900 text-white">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-center gap-2 overflow-hidden px-4 text-[12px] sm:px-6">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
          </span>
          <span className="shrink-0 font-bold text-primary-400">
            <Sparkles className="mr-1 inline h-3 w-3" />
            Yapay Zeka Destekli B2B Motoru:
          </span>
          <span className="truncate text-slate-300">Son 24 saatte Ar-Ge odaklı 42 yeni kurumsal eşleşme gerçekleşti.</span>
        </div>
      </div>
      <nav className={cn('border-b transition-all duration-300', scrolled ? 'border-slate-200 bg-white/95 shadow-glass backdrop-blur-xl' : 'border-transparent bg-white/70 backdrop-blur-md')}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="TeknoOrtak ana sayfa">
            <BrandMark />
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {links.map(([l, h]) => (
              <a key={h} href={h.slice(1)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900">
                {l}
              </a>
            ))}
          </div>
          <div className="hidden items-center gap-2 md:flex">
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
                  Platforma Katıl
                </ButtonLink>
              </>
            )}
          </div>
          <button className="rounded-lg p-2 text-slate-600 md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menü" aria-expanded={open}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="glass-strong mx-3 mt-2 rounded-2xl p-3 md:hidden">
            {links.map(([l, h]) => (
              <a key={h} href={h.slice(1)} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {l}
              </a>
            ))}
            <Link to="/demo/discover" className="block rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Demoyu dene
            </Link>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ButtonLink to={signedIn ? homeFor(auth) : '/giris'} variant="secondary" size="sm">
                {signedIn ? 'Uygulamaya git' : 'Giriş Yap'}
              </ButtonLink>
              <ButtonLink to="/kayit" size="sm">
                Platforma Katıl
              </ButtonLink>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

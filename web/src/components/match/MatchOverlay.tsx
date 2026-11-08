import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMotionPrefs } from '@/hooks/useMotionPrefs';
import { Button, CompanyLogo, VerifiedBadge } from '@/components/ui';
import type { Company, Match } from '@/types';

interface Props {
  match: Match | null;
  me: Company;
  other: Company | null;
  onStart: () => void;
  onContinue: () => void;
}

/** Canvas tabanlı parçacık patlaması: tek canvas, ~180 parçacık, yerçekimi + sürtünme. */
function ParticleBurst({ count }: { count: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const colors = ['#FF5E00', '#FF7A33', '#FFA370', '#2563EB', '#0F172A', '#CBD5E1'];
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.42;
    const parts = Array.from({ length: count }, (_, i) => {
      const a = Math.random() * Math.PI * 2;
      const v = 4 + Math.random() * 11;
      return {
        x: cx,
        y: cy,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 3,
        r: 1.2 + Math.random() * 3.2,
        c: colors[i % colors.length]!,
        life: 1,
        decay: 0.006 + Math.random() * 0.01,
        rect: Math.random() > 0.6,
        rot: Math.random() * Math.PI,
      };
    });
    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      let alive = 0;
      for (const p of parts) {
        if (p.life <= 0) continue;
        alive++;
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + 0.12;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += 0.1;
        p.life -= p.decay;
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.c;
        ctx.shadowColor = p.c;
        ctx.shadowBlur = 0;
        if (p.rect) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (alive) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [count]);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />;
}

function MiniProfile({ company, side, delay, reduced }: { company: Company; side: 'left' | 'right'; delay: number; reduced: boolean }) {
  const from = side === 'left' ? -120 : 120;
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, x: from, rotate: side === 'left' ? -10 : 10 }}
      animate={{ opacity: 1, x: 0, rotate: side === 'left' ? -3 : 3 }}
      transition={{ delay, type: 'spring', stiffness: 140, damping: 16 }}
      className="flex w-full flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-card sm:p-5"
    >
      <CompanyLogo company={company} size={64} />
      <div className="mt-3 flex max-w-full items-center gap-1 font-display text-sm font-extrabold text-slate-900 sm:text-base">
        <span className="truncate">{company.name}</span> {company.verified && <VerifiedBadge className="shrink-0" />}
      </div>
      <div className="mt-1 flex max-w-full items-center gap-1 truncate text-[11px] text-slate-500">
        <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{company.technopark || company.city}</span>
      </div>
      <span className="mt-2 max-w-full truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{company.sector}</span>
    </motion.div>
  );
}

export function MatchOverlay({ match, me, other, onStart, onContinue }: Props) {
  const { reduced, isMobile } = useMotionPrefs();
  const open = !!match && !!other;

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onContinue();
      if (e.key === 'Enter') onStart();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onStart, onContinue]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="match"
          role="dialog"
          aria-modal="true"
          aria-label={`${other!.name} ile eşleştiniz`}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
        >
          <div className="absolute inset-0 bg-slate-100/80 backdrop-blur-md" onClick={onContinue} />
          <motion.div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[70vmax] w-[70vmax] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,94,0,0.18) 0%, rgba(255,94,0,0.06) 35%, transparent 65%)' }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1], opacity: 1 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
          {!reduced && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 [perspective:900px]">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute left-1/2 top-1/2 rounded-full border-2 border-dashed border-primary-300/60"
                  style={{ width: 520 + i * 160, height: 520 + i * 160, x: '-50%', y: '-50%' }}
                  initial={{ scale: 0.3, opacity: 0, rotateX: 70 }}
                  animate={{ scale: 1, opacity: 1, rotateX: 70 - i * 6, rotateZ: i % 2 ? -360 : 360 }}
                  transition={{ scale: { delay: 0.1 + i * 0.08, type: 'spring', stiffness: 80, damping: 14 }, opacity: { delay: 0.1 + i * 0.08 }, rotateZ: { duration: 24 + i * 6, repeat: Infinity, ease: 'linear' } }}
                />
              ))}
            </div>
          )}
          {!reduced && <ParticleBurst count={isMobile ? 80 : 160} />}

          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-float sm:p-8"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-primary-600">✦ Karşılıklı İlgi</span>
            <h2 className="mt-4 font-display text-5xl font-black tracking-tight text-slate-900 sm:text-6xl" aria-label="IT'S A MATCH!">
              {["IT'S", 'A', 'MATCH!'].map((w, i) => (
                <motion.span
                  key={w}
                  className={`mr-[0.22em] inline-block last:mr-0 ${i === 2 ? 'text-primary-500' : ''}`}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.25 + i * 0.1, type: 'spring', stiffness: 300, damping: 16 }}
                  aria-hidden
                >
                  {w}
                </motion.span>
              ))}
            </h2>
            <p className="mt-2 text-slate-500">
              <span className="font-bold text-slate-900">{other!.name}</span> da sizinle iş birliği yapmak istiyor.
            </p>

            <div className="relative mt-7 grid grid-cols-2 items-center gap-6 sm:gap-10">
              <MiniProfile company={me} side="left" delay={0.3} reduced={reduced} />
              <MiniProfile company={other!} side="right" delay={0.3} reduced={reduced} />
              <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
                <motion.span
                  className="block whitespace-nowrap rounded-full bg-brand-gradient px-3 py-1.5 text-xs font-black tracking-wide text-white shadow-glow ring-4 ring-white"
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.3, 1] }}
                  transition={{ delay: 0.7, duration: 0.55 }}
                >
                  %{match!.score} SİNERJİ
                </motion.span>
              </div>
            </div>

            {match!.reasons.length > 0 && (
              <motion.ul className="mt-6 space-y-2 text-left" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
                {match!.reasons.map((r) => (
                  <li key={r} className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" /> {r}
                  </li>
                ))}
              </motion.ul>
            )}

            <motion.div className="mt-6 flex flex-col gap-2.5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
              <Button size="lg" onClick={onStart} autoFocus className="w-full">
                İş Birliğini Başlat <ArrowRight className="h-4 w-4" />
              </Button>
              <button onClick={onContinue} className="h-12 w-full rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">
                Keşfetmeye Devam Et
              </button>
            </motion.div>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" /> İlk temas protokolü 7 gün boyunca önceliklidir.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

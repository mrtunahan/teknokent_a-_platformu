import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMotionPrefs } from '@/hooks/useMotionPrefs';
import { Button, CompanyLogo } from '@/components/ui';
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
    const colors = ['#4d94ff', '#7cb4ff', '#8b5cf6', '#a78bfa', '#2dd4bf', '#ffffff'];
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
        ctx.shadowBlur = 12;
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

const TITLE = "IT'S A MATCH!";

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
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
        >
          <motion.div className="absolute inset-0 bg-ink-950/90 backdrop-blur-xl" />
          {/* Işık patlaması */}
          <motion.div
            className="absolute left-1/2 top-[42%] h-[60vmax] w-[60vmax] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(77,148,255,0.45) 0%, rgba(139,92,246,0.25) 30%, rgba(45,212,191,0.08) 55%, transparent 70%)' }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.25, 1], opacity: [0, 1, 0.8] }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
          {/* 3D halkalar */}
          {!reduced && (
            <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 [perspective:900px]">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute left-1/2 top-1/2 rounded-full border"
                  style={{
                    width: 260 + i * 130,
                    height: 260 + i * 130,
                    x: '-50%',
                    y: '-50%',
                    borderColor: ['#4d94ff', '#8b5cf6', '#2dd4bf', '#7cb4ff'][i] + '55',
                    boxShadow: `0 0 40px ${['#4d94ff', '#8b5cf6', '#2dd4bf', '#7cb4ff'][i]}33, inset 0 0 40px ${['#4d94ff', '#8b5cf6', '#2dd4bf', '#7cb4ff'][i]}22`,
                  }}
                  initial={{ scale: 0.2, opacity: 0, rotateX: 70, rotateZ: 0 }}
                  animate={{ scale: 1, opacity: 1, rotateX: 70 - i * 6, rotateZ: i % 2 ? -360 : 360 }}
                  transition={{
                    scale: { delay: 0.15 + i * 0.08, type: 'spring', stiffness: 80, damping: 14 },
                    opacity: { delay: 0.15 + i * 0.08 },
                    rotateZ: { duration: 18 + i * 6, repeat: Infinity, ease: 'linear' },
                  }}
                />
              ))}
            </div>
          )}
          {!reduced && <ParticleBurst count={isMobile ? 90 : 180} />}

          <div className="relative z-10 flex w-full max-w-xl flex-col items-center px-6 text-center">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="eyebrow">
              <Sparkles className="h-3.5 w-3.5 text-electric-300" /> Karşılıklı ilgi
            </motion.div>

            <h2 className="mt-6 flex flex-wrap justify-center gap-x-[0.25em] font-display text-5xl font-extrabold tracking-tight sm:text-7xl [perspective:600px]" aria-label={TITLE}>
              {TITLE.split(' ').map((word, i, arr) => (
                <motion.span
                  key={word}
                  className={`inline-block pb-1 ${i === arr.length - 1 ? 'text-gradient' : 'text-white'} drop-shadow-[0_0_30px_rgba(77,148,255,0.45)]`}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 40, rotateX: -80, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                  transition={{ delay: 0.35 + i * 0.12, type: 'spring', stiffness: 260, damping: 15 }}
                  aria-hidden
                >
                  {word}
                </motion.span>
              ))}
            </h2>

            <motion.p className="mt-4 text-slate-300" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
              <span className="font-semibold text-white">{other!.name}</span> da sizinle iş birliği yapmak istiyor.
            </motion.p>

            {/* Logolar ortada buluşur */}
            <div className="relative mt-10 flex h-32 items-center justify-center">
              <motion.div
                initial={{ x: reduced ? -60 : '-60vw', rotate: -25, opacity: 0 }}
                animate={{ x: -38, rotate: -8, opacity: 1 }}
                transition={{ delay: 0.25, type: 'spring', stiffness: 110, damping: 14 }}
                className="relative z-10"
              >
                <CompanyLogo company={me} size={112} className="ring-4 ring-ink-900 shadow-[0_20px_60px_-10px_rgba(47,123,255,0.7)]" />
              </motion.div>
              <motion.div
                initial={{ x: reduced ? 60 : '60vw', rotate: 25, opacity: 0 }}
                animate={{ x: 38, rotate: 8, opacity: 1 }}
                transition={{ delay: 0.25, type: 'spring', stiffness: 110, damping: 14 }}
                className="relative"
              >
                <CompanyLogo company={other!} size={112} className="ring-4 ring-ink-900" />
              </motion.div>
              <motion.div
                className="absolute left-1/2 top-1/2 z-20 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand-gradient shadow-glow ring-4 ring-ink-900"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.35, 1] }}
                transition={{ delay: 0.75, duration: 0.6 }}
              >
                <span className="font-display text-sm font-bold text-white">%{match!.score}</span>
              </motion.div>
            </div>

            {match!.reasons.length > 0 && (
              <motion.ul className="mt-8 flex flex-wrap justify-center gap-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05 }}>
                {match!.reasons.map((r) => (
                  <li key={r} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-slate-300">
                    {r}
                  </li>
                ))}
              </motion.ul>
            )}

            <motion.div className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15 }}>
              <Button size="lg" onClick={onStart} autoFocus>
                İş Birliğini Başlat <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="secondary" onClick={onContinue}>
                Keşfetmeye Devam Et
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

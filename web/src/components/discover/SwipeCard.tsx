import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { ArrowUpRight, Building2, Globe, Layers, MapPin, Rocket, Users } from 'lucide-react';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { label } from '@/data/options';
import { useMotionPrefs } from '@/hooks/useMotionPrefs';
import { Chip, CompanyLogo, VerifiedBadge } from '@/components/ui';
import type { Company, SwipeDirection } from '@/types';
import { CoverArt } from './CoverArt';
import { ScoreRing } from './ScoreRing';

export type SwipeAction = SwipeDirection | 'up';

export interface SwipeCardHandle {
  fling: (dir: SwipeDirection) => Promise<void>;
}

interface Props {
  company: Company;
  score: number;
  reasons: string[];
  /** Destedeki sıra: 0 = en üstteki, sürüklenebilir kart */
  index: number;
  onSwiped: (dir: SwipeDirection) => void;
  onDetails: () => void;
}

const SWIPE_X = 120;
const SWIPE_UP = 110;

export const SwipeCard = forwardRef<SwipeCardHandle, Props>(function SwipeCard({ company, score, reasons, index, onSwiped, onDetails }, ref) {
  const { reduced } = useMotionPrefs();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const rotate = useTransform(x, [-320, 0, 320], [-16, 0, 16]);
  const likeOpacity = useTransform(x, [24, 130], [0, 1]);
  const nopeOpacity = useTransform(x, [-130, -24], [1, 0]);
  const infoOpacity = useTransform(y, [-120, -30], [1, 0]);
  const glow = useTransform(x, [-200, 0, 200], ['rgba(244,63,94,0.45)', 'rgba(0,0,0,0)', 'rgba(45,212,191,0.45)']);
  const shadow = useTransform(glow, (g) => `0 0 0 1px rgba(255,255,255,0.06), 0 30px 80px -30px rgba(0,0,0,.9), 0 0 60px -10px ${g}`);
  const flying = useRef(false);
  const isTop = index === 0;

  const fling = async (dir: SwipeDirection) => {
    if (flying.current) return;
    flying.current = true;
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const spring = reduced ? { duration: 0.18 } : { type: 'spring' as const, stiffness: 140, damping: 22, mass: 0.9 };
    if (dir === 'super') {
      await Promise.all([animate(y, -window.innerHeight, spring), animate(scale, 0.82, spring)]);
    } else {
      const sign = dir === 'right' ? 1 : -1;
      await Promise.all([
        animate(x, sign * (w * 0.75 + 300), spring),
        animate(y, y.get() + 60, spring),
        animate(scale, dir === 'right' ? 0.85 : 0.95, spring),
      ]);
    }
    onSwiped(dir);
  };

  useImperativeHandle(ref, () => ({ fling }));

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.x > SWIPE_X || velocity.x > 700) return void fling('right');
    if (offset.x < -SWIPE_X || velocity.x < -700) return void fling('left');
    if (offset.y < -SWIPE_UP || velocity.y < -800) onDetails();
    animate(x, 0, { type: 'spring', stiffness: 400, damping: 28 });
    animate(y, 0, { type: 'spring', stiffness: 400, damping: 28 });
  };

  const stageIdx = ['idea', 'mvp', 'first_customer', 'growth', 'mature'].indexOf(company.stage);

  return (
    <motion.article
      className="absolute inset-0 touch-none select-none [will-change:transform]"
      style={{ x, y, rotate, scale, zIndex: 10 - index, cursor: isTop ? 'grab' : 'default' }}
      drag={isTop}
      dragMomentum={false}
      onDragEnd={onDragEnd}
      whileDrag={{ cursor: 'grabbing' }}
      initial={false}
      animate={{
        // Arkadaki kartlar derinlik hissi için küçülür ve aşağı kayar
        translateY: index * 14,
        scaleX: 1 - index * 0.045,
        scaleY: 1 - index * 0.045,
        opacity: index > 2 ? 0 : 1 - index * 0.18,
        filter: index ? `brightness(${1 - index * 0.18})` : 'brightness(1)',
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      aria-hidden={!isTop}
      aria-label={isTop ? `${company.name} firma kartı` : undefined}
    >
      <motion.div className="relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-ink-850 shadow-card" style={{ boxShadow: shadow }}>
        {/* Kapak */}
        <div className="relative h-[30%] min-h-[120px] shrink-0">
          <CoverArt company={company} className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink-850/30 to-ink-850" />
          <div className="absolute left-5 top-5 flex gap-2">
            <Chip className="!border-white/15 !bg-black/30 !text-white backdrop-blur-md">{company.sector}</Chip>
          </div>
          <div className="absolute right-4 top-4 rounded-2xl bg-black/30 p-1.5 backdrop-blur-md">
            <ScoreRing value={score} size={50} stroke={4} />
          </div>
          <div className="absolute -bottom-6 left-5">
            <CompanyLogo company={company} size={64} className="ring-4 ring-ink-850" />
          </div>
        </div>

        {/* İçerik */}
        <div className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-8 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 truncate font-display text-[1.6rem] font-bold leading-tight tracking-tight text-white">
                {company.name} {company.verified && <VerifiedBadge className="shrink-0 text-xl" />}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
                <MapPin className="h-3.5 w-3.5" /> {company.technopark} · {company.city}
              </p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,black_88%,transparent)]">
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-300 sm:line-clamp-3">{company.description}</p>

          {reasons[0] && (
            <div className="mt-3 inline-flex items-center gap-2 self-start rounded-xl border border-aqua-400/20 bg-aqua-400/[0.07] px-3 py-1.5 text-xs text-aqua-300">
              <span className="h-1.5 w-1.5 rounded-full bg-aqua-300" /> {reasons[0]}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {company.expertise.map((e) => (
              <Chip key={e} tone="blue">
                {e}
              </Chip>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="mb-1.5 font-medium uppercase tracking-wider text-violet-400">Arıyor</div>
              <ul className="space-y-1 text-slate-300">
                {company.seeking.slice(0, 2).map((s) => (
                  <li key={s} className="line-clamp-1">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="mb-1.5 font-medium uppercase tracking-wider text-aqua-300">Sunuyor</div>
              <ul className="space-y-1 text-slate-300">
                {company.offering.slice(0, 2).map((s) => (
                  <li key={s} className="line-clamp-1">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          </div>

          <div className="shrink-0 pt-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> {label.size(company.employeeRange)}
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" /> {company.products[0]}
              </span>
              <span className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> {company.website}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Rocket className="h-3.5 w-3.5 shrink-0 text-electric-300" />
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className={`h-1 flex-1 rounded-full ${i <= stageIdx ? 'bg-gradient-to-r from-electric-400 to-violet-400' : 'bg-white/10'}`} />
                ))}
              </div>
              <span className="text-xs text-slate-300">{label.stage(company.stage)}</span>
            </div>
          </div>
        </div>

        {/* Kaydırma damgaları */}
        {isTop && (
          <>
            <motion.div style={{ opacity: likeOpacity }} className="pointer-events-none absolute left-6 top-8 -rotate-12 rounded-2xl border-[3px] border-aqua-300 px-4 py-1.5 font-display text-2xl font-extrabold tracking-wider text-aqua-300 shadow-[0_0_30px_rgba(45,212,191,0.4)]">
              İLGİLENİYORUM
            </motion.div>
            <motion.div style={{ opacity: nopeOpacity }} className="pointer-events-none absolute right-6 top-8 rotate-12 rounded-2xl border-[3px] border-rose-400 px-4 py-1.5 font-display text-2xl font-extrabold tracking-wider text-rose-400">
              GEÇ
            </motion.div>
            <motion.div style={{ opacity: infoOpacity }} className="pointer-events-none absolute inset-x-0 bottom-10 mx-auto flex w-max items-center gap-2 rounded-full bg-electric-500/90 px-4 py-2 text-sm font-semibold text-white">
              <ArrowUpRight className="h-4 w-4" /> Detayları incele
            </motion.div>
          </>
        )}
        <Building2 className="pointer-events-none absolute bottom-4 right-4 h-24 w-24 text-white/[0.015]" aria-hidden />
      </motion.div>
    </motion.article>
  );
});

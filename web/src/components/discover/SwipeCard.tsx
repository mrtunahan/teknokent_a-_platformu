import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { ArrowUpRight, Briefcase, Globe, MapPin, Target, TrendingUp, Users } from 'lucide-react';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { label } from '@/data/options';
import { useMotionPrefs } from '@/hooks/useMotionPrefs';
import { CompanyLogo, VerifiedBadge } from '@/components/ui';
import type { Company, SwipeDirection } from '@/types';
import { CoverArt } from './CoverArt';

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
  const glow = useTransform(x, [-200, 0, 200], ['rgba(244,63,94,0.55)', 'rgba(255,255,255,0)', 'rgba(255,94,0,0.6)']);
  const shadow = useTransform(glow, (g) => `0 1px 2px rgba(15,23,42,0.05), 0 24px 60px -24px rgba(15,23,42,0.28), 0 0 0 3px ${g}`);
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
        opacity: index > 2 ? 0 : 1 - index * 0.12,
        filter: index ? `brightness(${1 - index * 0.04})` : 'brightness(1)',
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      aria-hidden={!isTop}
      aria-label={isTop ? `${company.name} firma kartı` : undefined}
    >
      <motion.div className="relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white" style={{ boxShadow: shadow }}>
        <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
          {/* Üst bilgi */}
          <div className="flex items-center justify-between gap-2">
            <span className="truncate rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">{company.sector}</span>
            <span className="shrink-0 rounded-full bg-brand-gradient px-3 py-1 text-xs font-black tracking-wide text-white shadow-glow">%{score} UYUM</span>
          </div>

          {/* Firma başlığı */}
          <div className="mt-4 flex items-center gap-3">
            <CompanyLogo company={company} size={52} />
            <div className="min-w-0">
              <h2 className="flex items-center gap-1.5 truncate font-display text-xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[1.4rem]">
                <span className="truncate">{company.name}</span> {company.verified && <VerifiedBadge className="shrink-0" />}
                <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">A.Ş.</span>
              </h2>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5 shrink-0" /> {[company.technopark, `${company.city}, TR`, company.foundedYear ? `Kuruluş: ${company.foundedYear}` : ''].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,black_86%,transparent)]">
            {/* Görsel alanı */}
            <div className="relative h-24 overflow-hidden rounded-2xl sm:h-28">
              <CoverArt company={company} className="absolute inset-0 h-full w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/10 to-transparent" />
              {company.products[0] && (
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/80">Öne çıkan çözüm</div>
                  <div className="truncate font-display text-lg font-extrabold text-white">{company.products[0]}™</div>
                </div>
              )}
            </div>

            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600 sm:line-clamp-3">{company.description}</p>

            {reasons[0] && (
              <div className="mt-3 flex gap-3 rounded-xl border border-primary-200 bg-primary-50 p-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-500 text-white">
                  <Target className="h-4 w-4" />
                </span>
                <div className="min-w-0 text-xs">
                  <div className="font-bold text-slate-900">Stratejik hedef uyuşması</div>
                  <div className="mt-0.5 line-clamp-2 text-slate-600">{reasons.slice(0, 2).join(' · ')}</div>
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-1.5">
              {company.expertise.map((e) => (
                <span key={e} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {e}
                </span>
              ))}
            </div>
          </div>

          {/* Meta bilgiler */}
          <div className="mt-3 grid shrink-0 grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <Users className="h-3.5 w-3.5 text-slate-400" /> Ekip: <span className="font-semibold text-slate-800">{label.size(company.employeeRange)}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Briefcase className="h-3.5 w-3.5 text-slate-400" /> Model: <span className="font-semibold text-slate-800">{businessModel(company)}</span>
            </div>
            {company.website && (
              <div className="col-span-2 flex items-center gap-2 truncate text-slate-500 sm:col-span-1">
                <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400" /> <span className="truncate font-semibold text-blue-600">{company.website}</span>
              </div>
            )}
            <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
              <TrendingUp className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <div className="flex flex-1 gap-0.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= stageIdx ? 'bg-primary-500' : 'bg-slate-200'}`} />
                ))}
              </div>
              <span className="font-semibold text-slate-800">{label.stage(company.stage)}</span>
            </div>
          </div>
        </div>

        {/* Kaydırma damgaları */}
        {isTop && (
          <>
            <motion.div style={{ opacity: likeOpacity }} className="pointer-events-none absolute left-5 top-16 -rotate-12 rounded-xl border-[3px] border-primary-500 bg-white/90 px-3 py-1 font-display text-xl font-black tracking-wider text-primary-500">
              İLGİLENİYORUM
            </motion.div>
            <motion.div style={{ opacity: nopeOpacity }} className="pointer-events-none absolute right-5 top-16 rotate-12 rounded-xl border-[3px] border-rose-500 bg-white/90 px-3 py-1 font-display text-xl font-black tracking-wider text-rose-500">
              GEÇ
            </motion.div>
            <motion.div style={{ opacity: infoOpacity }} className="pointer-events-none absolute inset-x-0 bottom-10 mx-auto flex w-max items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              <ArrowUpRight className="h-4 w-4" /> Detayları incele
            </motion.div>
          </>
        )}
      </motion.div>
    </motion.article>
  );
});

/** Ürün listesinden iş modeli tahmini (demo verisinde ayrı alan yok). */
export function businessModel(c: Company) {
  if (c.businessModel) return c.businessModel;
  return c.products.some((p) => /api|platform|cloud|saas|yazılım|panel|analitik|llm/i.test(p)) ? 'B2B & SaaS' : 'B2B';
}

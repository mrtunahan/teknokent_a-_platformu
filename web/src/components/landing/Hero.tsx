import { motion, useTransform, type MotionValue } from 'framer-motion';
import { ArrowRight, Heart, MapPin, Sparkles } from 'lucide-react';
import { DEMO_COMPANIES } from '@/data/companies';
import { SLOGAN_EN } from '@/data/options';
import { useMotionPrefs } from '@/hooks/useMotionPrefs';
import { useMouseParallax } from '@/hooks/useMouseParallax';
import { NetworkBackdrop } from '@/components/three/NetworkBackdrop';
import { ButtonLink, Chip, CompanyLogo, VerifiedBadge } from '@/components/ui';
import type { Company } from '@/types';

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const { allowParallax, reduced } = useMotionPrefs();
  const { x, y } = useMouseParallax(allowParallax);

  return (
    <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden pt-28 pb-16 sm:pt-32">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(47,123,255,0.22),transparent_60%)]" />
      <div className="absolute inset-0 -z-20 bg-grid mask-radial opacity-60" />
      <div className="absolute inset-0 -z-10">
        <NetworkBackdrop />
      </div>
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-ink-950" />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:px-8">
        <div className="relative z-10 text-center lg:text-left">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }}>
            <span className="eyebrow">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aqua-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-aqua-400" />
              </span>
              {SLOGAN_EN}
            </span>
          </motion.div>

          <h1 className="mt-7 font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.035em] text-white sm:text-6xl lg:text-[4rem] xl:text-[4.4rem]">
            {['Teknoloji Dünyasında', 'Doğru Eşleşmeyi Bul.'].map((line, i) => (
              <span key={line} className="block overflow-hidden pb-1">
                <motion.span
                  className={i === 1 ? 'block text-gradient' : 'block'}
                  initial={{ y: reduced ? 0 : '105%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1, delay: 0.1 + i * 0.12, ease }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg lg:mx-0"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.35, ease }}
          >
            Teknokent firmalarını, girişimleri ve teknoloji ekosisteminin tüm paydaşlarını bir araya getiriyoruz. İş birliği yapabileceğiniz firmaları keşfedin, eşleşin ve birlikte büyüyün.
          </motion.p>

          <motion.div
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.5, ease }}
          >
            <ButtonLink to="/kayit" size="lg" className="w-full sm:w-auto">
              Hemen Eşleşmeye Başla <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink to="/#nasil-calisir" variant="secondary" size="lg" className="w-full sm:w-auto">
              Platformu Keşfet
            </ButtonLink>
          </motion.div>

          <motion.div
            className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500 lg:justify-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
          >
            {[
              ['1.200+', 'teknoloji firması'],
              ['86', 'teknokent'],
              ['4.800+', 'eşleşme'],
            ].map(([n, l]) => (
              <span key={l}>
                <span className="font-display text-lg font-semibold text-white">{n}</span> {l}
              </span>
            ))}
          </motion.div>
        </div>

        <FloatingCards x={x} y={y} />
      </div>
    </section>
  );
}

/* --------------------------- 3D yüzen firma kartları -------------------------- */

const layout = [
  { id: 'c001', className: 'left-[2%] top-[6%] sm:left-[6%]', depth: 40, rot: -8, delay: 0 },
  { id: 'c005', className: 'right-[0%] top-[30%] sm:right-[2%]', depth: 70, rot: 7, delay: 0.15 },
  { id: 'c009', className: 'left-[8%] bottom-[2%] sm:left-[14%]', depth: 25, rot: -3, delay: 0.3 },
];

function FloatingCards({ x, y }: { x: MotionValue<number>; y: MotionValue<number> }) {
  const rotY = useTransform(x, [-1, 1], [-10, 10]);
  const rotX = useTransform(y, [-1, 1], [8, -8]);
  return (
    <motion.div
      className="relative mx-auto aspect-[1/1.02] w-full max-w-[540px] [perspective:1400px]"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.2, delay: 0.2, ease }}
    >
      <motion.div className="absolute inset-0 [transform-style:preserve-3d]" style={{ rotateX: rotX, rotateY: rotY }}>
        {/* Merkez ışık çekirdeği + halkalar */}
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-electric-500/25 blur-3xl" />
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 rounded-full border border-white/[0.07]"
            style={{ width: 220 + i * 120, height: 220 + i * 120, x: '-50%', y: '-50%', rotateX: 64 }}
            animate={{ rotateZ: i % 2 ? -360 : 360 }}
            transition={{ duration: 60 + i * 20, repeat: Infinity, ease: 'linear' }}
          >
            <span className="absolute -top-1 left-1/2 h-2 w-2 rounded-full bg-electric-300 shadow-[0_0_12px_#4d94ff]" />
          </motion.div>
        ))}

        <ConnectionLines />

        {layout.map((l, i) => {
          const company = DEMO_COMPANIES.find((c) => c.id === l.id)!;
          return <FloatCard key={l.id} company={company} x={x} y={y} {...l} index={i} />;
        })}

        {/* Match göstergesi */}
        <motion.div
          className="absolute left-1/2 top-[47%] z-20 -translate-x-1/2"
          style={{ translateZ: 110 }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.1, type: 'spring', stiffness: 260, damping: 18 }}
        >
          <div className="glass-strong flex items-center gap-2.5 rounded-full py-2 pl-2 pr-4 shadow-glow">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-gradient">
              <Heart className="h-4 w-4 fill-white text-white" />
            </span>
            <span className="text-sm font-semibold text-white">
              %94 uyum <span className="font-normal text-slate-400">· Match!</span>
            </span>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function FloatCard({
  company,
  className,
  depth,
  rot,
  delay,
  index,
  x,
  y,
}: {
  company: Company;
  className: string;
  depth: number;
  rot: number;
  delay: number;
  index: number;
  x: MotionValue<number>;
  y: MotionValue<number>;
}) {
  const tx = useTransform(x, [-1, 1], [-depth * 0.35, depth * 0.35]);
  const ty = useTransform(y, [-1, 1], [-depth * 0.25, depth * 0.25]);
  return (
    <motion.div
      className={`absolute z-10 w-[64%] max-w-[300px] ${className}`}
      style={{ x: tx, y: ty, translateZ: depth, rotateZ: rot }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.5 + delay, duration: 1, ease }}
    >
      <div className="animate-float" style={{ animationDelay: `${-index * 2.3}s` }}>
        <div className="glass-strong rounded-3xl p-4 shadow-card sm:p-5">
          <div className="flex items-center gap-3">
            <CompanyLogo company={company} size={44} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate font-display text-[15px] font-semibold text-white">
                {company.name} {company.verified && <VerifiedBadge />}
              </div>
              <div className="flex items-center gap-1 truncate text-xs text-slate-400">
                <MapPin className="h-3 w-3" /> {company.technopark}
              </div>
            </div>
          </div>
          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-400">{company.tagline}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {company.expertise.slice(0, 2).map((e) => (
              <Chip key={e} tone={index === 1 ? 'violet' : index === 2 ? 'aqua' : 'blue'} className="!px-2 !py-0.5 !text-[10px]">
                {e}
              </Chip>
            ))}
          </div>
          {index === 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-aqua-300">
              <Sparkles className="h-3 w-3" /> Aradığınız yetkinliğe sahip
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ConnectionLines() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden style={{ transform: 'translateZ(10px)' }}>
      <defs>
        <linearGradient id="ln" x1="0" x2="1">
          <stop offset="0" stopColor="#4d94ff" stopOpacity="0.1" />
          <stop offset=".5" stopColor="#a78bfa" stopOpacity="0.8" />
          <stop offset="1" stopColor="#2dd4bf" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      {[
        'M 25 22 C 45 30, 55 40, 50 50',
        'M 78 45 C 66 48, 58 49, 50 50',
        'M 32 82 C 40 70, 46 58, 50 50',
      ].map((d, i) => (
        <g key={d}>
          <path d={d} fill="none" stroke="url(#ln)" strokeWidth="0.35" vectorEffect="non-scaling-stroke" />
          <motion.path
            d={d}
            fill="none"
            stroke="#9ec5ff"
            strokeWidth="1.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0.08, pathOffset: 0, opacity: 0 }}
            animate={{ pathOffset: [0, 0.92], opacity: [0, 1, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.8, ease: 'easeInOut' }}
          />
        </g>
      ))}
    </svg>
  );
}

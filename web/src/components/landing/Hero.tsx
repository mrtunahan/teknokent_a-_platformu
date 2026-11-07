import { motion, useTransform, type MotionValue } from 'framer-motion';
import { ArrowRight, BadgeCheck, Cpu, Heart, MapPin, Search, ShieldCheck, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_COMPANIES } from '@/data/companies';
import { TECHNOPARKS } from '@/data/options';
import { useMotionPrefs } from '@/hooks/useMotionPrefs';
import { useMouseParallax } from '@/hooks/useMouseParallax';
import { useStore, EMPTY_FILTERS } from '@/store/AppStore';
import { NetworkBackdrop } from '@/components/three/NetworkBackdrop';
import { Button, ButtonLink, CompanyLogo, VerifiedBadge } from '@/components/ui';
import type { Company } from '@/types';

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const { allowParallax, reduced } = useMotionPrefs();
  const { x, y } = useMouseParallax(allowParallax);

  return (
    <section className="relative isolate overflow-hidden pb-14 pt-36 sm:pt-40">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_70%_55%_at_75%_10%,rgba(255,94,0,0.10),transparent_60%)]" />
      <div className="absolute inset-0 -z-20 bg-dots opacity-50 mask-radial" />
      <div className="absolute inset-0 -z-10 opacity-70">
        <NetworkBackdrop />
      </div>
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-slate-50" />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:px-8">
        <div className="relative z-10 text-center lg:text-left">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }}>
            <span className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-[11px] font-bold uppercase tracking-wider text-slate-700 shadow-glass">
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-white">Türkiye Teknoloji Ağı Ekosistemi</span>
              v2.4
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Canlı
              </span>
            </span>
          </motion.div>

          <h1 className="mt-7 font-display text-[2.7rem] font-black leading-[1.02] tracking-[-0.04em] text-slate-900 sm:text-6xl lg:text-[4.2rem] xl:text-[4.6rem]">
            {[
              ['Teknoloji Dünyasında', ''],
              ['Doğru Eşleşmeyi', 'text-primary-500'],
              ['Bul.', ''],
            ].map(([line, cls], i) => (
              <span key={line} className="block overflow-hidden pb-1">
                <motion.span className={`block ${cls}`} initial={{ y: reduced ? 0 : '105%' }} animate={{ y: 0 }} transition={{ duration: 1, delay: 0.1 + i * 0.1, ease }}>
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-500 sm:text-lg lg:mx-0" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.35, ease }}>
            Teknokent firmalarını, girişimleri ve teknoloji ekosisteminin tüm paydaşlarını bir araya getiriyoruz. İş birliği yapabileceğiniz firmaları keşfedin, eşleşin ve birlikte büyüyün.
          </motion.p>

          <motion.div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.5, ease }}>
            <ButtonLink to="/kayit" size="lg" className="w-full sm:w-auto">
              Hemen Eşleşmeye Başla <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink to="/#platform" variant="secondary" size="lg" className="w-full sm:w-auto">
              Platformu Keşfet
            </ButtonLink>
          </motion.div>

          <motion.div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 lg:justify-start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 1 }}>
            {[
              ['1.200+', 'teknoloji firması'],
              ['86', 'teknokent'],
              ['4.800+', 'eşleşme'],
            ].map(([n, l]) => (
              <div key={l} className="text-center lg:text-left">
                <div className="font-display text-2xl font-black tracking-tight text-slate-900">{n}</div>
                <div className="text-xs font-medium text-slate-500">{l}</div>
              </div>
            ))}
          </motion.div>

          <motion.div className="mt-8 flex flex-wrap items-center justify-center gap-2 lg:justify-start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 1 }}>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Doğrulanmış ağ</span>
            {['Sanayi ve Teknoloji Bakanlığı', 'TÜBİTAK TEYDEB'].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-glass">
                <ShieldCheck className="h-3.5 w-3.5 text-primary-500" /> {t}
              </span>
            ))}
          </motion.div>
        </div>

        <FloatingCards x={x} y={y} />
      </div>

      <SearchBar />
    </section>
  );
}

/* --------------------------- Arama ve filtre barı -------------------------- */

const TRL = Array.from({ length: 9 }, (_, i) => i + 1);

function SearchBar() {
  const navigate = useNavigate();
  const { dispatch } = useStore();
  const [q, setQ] = useState('');
  const [park, setPark] = useState('');
  const [trl, setTrl] = useState('');
  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9, duration: 0.8, ease }}
      onSubmit={(e) => {
        e.preventDefault();
        // Demo keşif ekranına filtrelerle git (TRL, demo verisinde ürün aşamasına yaklaşık eşlenir)
        dispatch({ type: 'setFilters', filters: { ...EMPTY_FILTERS, technoparks: park ? [park] : [] } });
        const qs = new URLSearchParams();
        if (q) qs.set('q', q);
        if (trl) qs.set('trl', trl);
        navigate(`/demo/discover${qs.toString() ? `?${qs}` : ''}`);
      }}
      className="relative z-10 mx-auto mt-14 w-[calc(100%-2rem)] max-w-5xl rounded-2xl border border-slate-200 bg-white p-2 shadow-float sm:w-[calc(100%-3rem)]"
      aria-label="Eşleşme arama"
    >
      <div className="grid gap-2 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto]">
        <label className="relative flex items-center">
          <Search className="pointer-events-none absolute left-4 h-5 w-5 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="h-12 w-full rounded-xl bg-transparent pl-12 pr-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 hover:bg-slate-50 focus:bg-slate-50" placeholder="Ne tür bir teknoloji arıyorsunuz?" aria-label="Ne tür bir teknoloji arıyorsunuz?" />
        </label>
        <label className="relative flex items-center border-slate-200 md:border-l">
          <MapPin className="pointer-events-none absolute left-4 h-4 w-4 text-slate-400" />
          <select value={park} onChange={(e) => setPark(e.target.value)} className="h-12 w-full appearance-none rounded-xl bg-transparent pl-11 pr-3 text-sm font-medium text-slate-700 outline-none hover:bg-slate-50" aria-label="Teknopark / Lokasyon">
            <option value="">Teknopark / Lokasyon</option>
            {TECHNOPARKS.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name} · {t.city}
              </option>
            ))}
          </select>
        </label>
        <label className="relative flex items-center border-slate-200 md:border-l">
          <Cpu className="pointer-events-none absolute left-4 h-4 w-4 text-slate-400" />
          <select value={trl} onChange={(e) => setTrl(e.target.value)} className="h-12 w-full appearance-none rounded-xl bg-transparent pl-11 pr-3 text-sm font-medium text-slate-700 outline-none hover:bg-slate-50" aria-label="TRL seviyesi">
            <option value="">TRL Seviyesi (1-9)</option>
            {TRL.map((n) => (
              <option key={n} value={n}>
                TRL {n}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" className="h-12">
          <SlidersHorizontal className="h-4 w-4" /> Eşleşmeleri Filtrele
        </Button>
      </div>
    </motion.form>
  );
}

/* --------------------------- 3D yüzen firma kartları -------------------------- */

const layout = [
  { id: 'c001', className: 'left-[0%] top-[4%] sm:left-[4%]', depth: 40, rot: -6, delay: 0, pct: 94 },
  { id: 'c005', className: 'right-[0%] top-[33%]', depth: 70, rot: 5, delay: 0.15, pct: 88 },
  { id: 'c009', className: 'left-[6%] bottom-[0%] sm:left-[12%]', depth: 25, rot: -2, delay: 0.3, pct: 81 },
];

function FloatingCards({ x, y }: { x: MotionValue<number>; y: MotionValue<number> }) {
  const rotY = useTransform(x, [-1, 1], [-8, 8]);
  const rotX = useTransform(y, [-1, 1], [6, -6]);
  return (
    <motion.div className="relative mx-auto aspect-[1/1] w-full max-w-[520px] [perspective:1400px]" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, delay: 0.2, ease }}>
      <motion.div className="absolute inset-0 [transform-style:preserve-3d]" style={{ rotateX: rotX, rotateY: rotY }}>
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-200/50 blur-3xl" />
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 rounded-full border border-dashed border-slate-300/70"
            style={{ width: 220 + i * 120, height: 220 + i * 120, x: '-50%', y: '-50%', rotateX: 64 }}
            animate={{ rotateZ: i % 2 ? -360 : 360 }}
            transition={{ duration: 60 + i * 20, repeat: Infinity, ease: 'linear' }}
          >
            <span className="absolute -top-1.5 left-1/2 h-3 w-3 rounded-full bg-primary-500 shadow-glow" />
          </motion.div>
        ))}
        <ConnectionLines />
        {layout.map((l, i) => {
          const company = DEMO_COMPANIES.find((c) => c.id === l.id)!;
          return <FloatCard key={l.id} company={company} x={x} y={y} {...l} index={i} />;
        })}
        <motion.div className="absolute left-1/2 top-[47%] z-20 -translate-x-1/2" style={{ translateZ: 110 }} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.1, type: 'spring', stiffness: 260, damping: 18 }}>
          <div className="flex items-center gap-2.5 rounded-full bg-slate-900 py-2 pl-2 pr-4 shadow-float">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-500">
              <Heart className="h-4 w-4 fill-white text-white" />
            </span>
            <span className="text-sm font-bold text-white">
              %94 <span className="text-primary-400">MATCH!</span>
            </span>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function FloatCard({ company, className, depth, rot, delay, index, pct, x, y }: { company: Company; className: string; depth: number; rot: number; delay: number; index: number; pct: number; x: MotionValue<number>; y: MotionValue<number> }) {
  const tx = useTransform(x, [-1, 1], [-depth * 0.35, depth * 0.35]);
  const ty = useTransform(y, [-1, 1], [-depth * 0.25, depth * 0.25]);
  return (
    <motion.div className={`absolute z-10 w-[66%] max-w-[300px] ${className}`} style={{ x: tx, y: ty, translateZ: depth, rotateZ: rot }} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + delay, duration: 1, ease }}>
      <div className="animate-float" style={{ animationDelay: `${-index * 2.3}s` }}>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-float">
          <div className="flex items-center gap-3">
            <CompanyLogo company={company} size={42} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 truncate font-display text-[15px] font-bold text-slate-900">
                {company.name} {company.verified && <VerifiedBadge />}
              </div>
              <div className="flex items-center gap-1 truncate text-xs text-slate-500">
                <MapPin className="h-3 w-3" /> {company.technopark}
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-bold text-primary-600">%{pct}</span>
          </div>
          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">{company.tagline}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {company.expertise.slice(0, 2).map((e) => (
              <span key={e} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {e}
              </span>
            ))}
          </div>
          {index === 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-primary-600">
              <Sparkles className="h-3 w-3" /> Aradığınız yetkinliğe sahip
            </div>
          )}
          {index === 2 && (
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-blue-600">
              <BadgeCheck className="h-3 w-3" /> Teknokent onaylı
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
      {['M 25 22 C 45 30, 55 40, 50 50', 'M 78 45 C 66 48, 58 49, 50 50', 'M 32 82 C 40 70, 46 58, 50 50'].map((d, i) => (
        <g key={d}>
          <path d={d} fill="none" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          <motion.path
            d={d}
            fill="none"
            stroke="#FF5E00"
            strokeWidth="2"
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

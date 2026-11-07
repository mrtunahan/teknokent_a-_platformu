import { motion } from 'framer-motion';
import { useId, useState } from 'react';

/** Hafif, bağımlılıksız SVG grafikler (alan, çubuk, halka). */

export function AreaChart({ data, labels, height = 200, color = '#4d94ff' }: { data: number[]; labels: string[]; height?: number; color?: string }) {
  const id = useId().replace(/:/g, '');
  const [hover, setHover] = useState<number | null>(null);
  const w = 600;
  const h = height;
  const pad = { t: 16, b: 28, l: 8, r: 8 };
  const max = Math.max(...data) * 1.15;
  const step = (w - pad.l - pad.r) / (data.length - 1);
  const pts = data.map((v, i) => [pad.l + i * step, pad.t + (h - pad.t - pad.b) * (1 - v / max)] as const);
  // Yumuşak eğri (Catmull-Rom → Bezier)
  const path = pts.reduce((acc, [x, y], i, a) => {
    if (i === 0) return `M ${x} ${y}`;
    const [x0, y0] = a[i - 1]!;
    const [xp, yp] = a[i - 2] ?? a[i - 1]!;
    const [xn, yn] = a[i + 1] ?? [x, y];
    const c1x = x0 + (x - xp) / 6;
    const c1y = y0 + (y - yp) / 6;
    const c2x = x - (xn - x0) / 6;
    const c2y = y - (yn - y0) / 6;
    return `${acc} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x} ${y}`;
  }, '');
  const area = `${path} L ${pts[pts.length - 1]![0]} ${h - pad.b} L ${pts[0]![0]} ${h - pad.b} Z`;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full overflow-visible" role="img" aria-label="Profil görüntülenme grafiği" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`${id}-a`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.35" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-l`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#4d94ff" />
            <stop offset=".6" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#2dd4bf" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={pad.l} x2={w - pad.r} y1={pad.t + (h - pad.t - pad.b) * f} y2={pad.t + (h - pad.t - pad.b) * f} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 6" />
        ))}
        <motion.path d={area} fill={`url(#${id}-a)`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.3 }} />
        <motion.path d={path} fill="none" stroke={`url(#${id}-l)`} strokeWidth="2.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }} />
        {pts.map(([x, y], i) => (
          <g key={i}>
            <rect x={x - step / 2} y={0} width={step} height={h} fill="transparent" onMouseEnter={() => setHover(i)} />
            {hover === i && (
              <>
                <line x1={x} x2={x} y1={pad.t} y2={h - pad.b} stroke="rgba(255,255,255,0.15)" />
                <circle cx={x} cy={y} r="5" fill="#0b1020" stroke="#7cb4ff" strokeWidth="2.5" />
              </>
            )}
            {(i % 2 === 0 || i === pts.length - 1) && (
              <text x={x} y={h - 8} textAnchor="middle" className="fill-slate-500 text-[11px]">
                {labels[i]}
              </text>
            )}
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div className="glass-strong pointer-events-none absolute -translate-x-1/2 rounded-lg px-2.5 py-1.5 text-xs" style={{ left: `${(pts[hover]![0] / w) * 100}%`, top: `${(pts[hover]![1] / h) * 100 - 22}%` }}>
          <span className="font-semibold text-white">{data[hover]}</span> <span className="text-slate-400">görüntülenme</span>
        </div>
      )}
    </div>
  );
}

export function BarChart({ series, labels }: { series: { name: string; color: string; values: number[] }[]; labels: string[] }) {
  const max = Math.max(1, ...series.flatMap((s) => s.values)) * 1.1;
  return (
    <div>
      <div className="flex h-44 items-end gap-2 sm:gap-3">
        {labels.map((l, i) => (
          <div key={l} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div className="flex h-full w-full items-end justify-center gap-1">
              {series.map((s, si) => (
                <motion.div
                  key={s.name}
                  title={`${s.name}: ${s.values[i]}`}
                  className="w-full max-w-[14px] rounded-t-md"
                  style={{ background: `linear-gradient(to top, ${s.color}55, ${s.color})` }}
                  initial={{ height: 0 }}
                  animate={{ height: `${(s.values[i]! / max) * 100}%` }}
                  transition={{ duration: 0.9, delay: 0.1 + i * 0.05 + si * 0.08, ease: [0.16, 1, 0.3, 1] }}
                />
              ))}
            </div>
            <span className="text-[11px] text-slate-500">{l}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-4 text-xs text-slate-400">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /> {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Donut({ items, size = 150 }: { items: { label: string; value: number; color: string }[]; size?: number }) {
  const total = items.reduce((a, b) => a + b.value, 0) || 1;
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <svg width={size} height={size} className="-rotate-90 shrink-0" role="img" aria-label="Sektör dağılımı">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
        {items.map((it, i) => {
          const len = (it.value / total) * c;
          const el = (
            <motion.circle
              key={it.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={it.color}
              strokeWidth="14"
              strokeDasharray={`${Math.max(len - 3, 0)} ${c}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.12 }}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <ul className="w-full space-y-2 text-sm">
        {items.map((it) => (
          <li key={it.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} /> {it.label}
            </span>
            <span className="text-slate-500">%{Math.round((it.value / total) * 100)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sparkline({ values, color = '#4d94ff' }: { values: number[]; color?: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - ((v - min) / (max - min || 1)) * 26}`).join(' ');
  return (
    <svg viewBox="0 0 100 32" className="h-8 w-24" aria-hidden preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

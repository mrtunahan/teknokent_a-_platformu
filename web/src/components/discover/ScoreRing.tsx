import { motion } from 'framer-motion';

export function ScoreRing({ value, size = 56, stroke = 5, label = true }: { value: number; size?: number; stroke?: number; label?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} aria-label={`Uyum skoru yüzde ${value}`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="score-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FF8A3D" />
            <stop offset="1" stopColor="#FF5E00" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#F1F5F9" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#score-g)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      {label && (
        <span className="absolute font-display font-bold text-slate-900" style={{ fontSize: size * 0.28 }}>
          {value}
        </span>
      )}
    </div>
  );
}

import { lazy, Suspense } from 'react';
import { useMotionPrefs } from '@/hooks/useMotionPrefs';

const NetworkScene = lazy(() => import('./NetworkScene'));

/** Masaüstünde Three.js ağı; mobil/reduced-motion'da statik SVG ağ (sıfır GPU maliyeti). */
export function NetworkBackdrop() {
  const { allow3D } = useMotionPrefs();
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {allow3D ? (
        <Suspense fallback={<StaticNetwork />}>
          <NetworkScene />
        </Suspense>
      ) : (
        <StaticNetwork />
      )}
    </div>
  );
}

function StaticNetwork() {
  const nodes = Array.from({ length: 28 }, (_, i) => {
    const a = i * 2.39996;
    const r = 18 + ((i * 37) % 30);
    return { x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r * 0.7, c: ['#FF5E00', '#2563EB', '#0F172A'][i % 3]! };
  });
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full opacity-60 mask-radial">
      {nodes.map((n, i) =>
        nodes.slice(i + 1).map((m, j) => {
          const d = Math.hypot(n.x - m.x, n.y - m.y);
          return d < 16 ? <line key={`${i}-${j}`} x1={n.x} y1={n.y} x2={m.x} y2={m.y} stroke={n.c} strokeOpacity={0.25 * (1 - d / 16)} strokeWidth={0.12} /> : null;
        }),
      )}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={0.45} fill={n.c} />
      ))}
    </svg>
  );
}

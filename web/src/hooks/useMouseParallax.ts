import { useEffect } from 'react';
import { useMotionValue, useSpring, type MotionValue } from 'framer-motion';

/** Pencere genelinde -1..1 aralığında yumuşatılmış fare konumu. */
export function useMouseParallax(enabled = true): { x: MotionValue<number>; y: MotionValue<number> } {
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const x = useSpring(rx, { stiffness: 60, damping: 18, mass: 0.6 });
  const y = useSpring(ry, { stiffness: 60, damping: 18, mass: 0.6 });
  useEffect(() => {
    if (!enabled) return;
    const onMove = (e: PointerEvent) => {
      rx.set((e.clientX / window.innerWidth) * 2 - 1);
      ry.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [enabled, rx, ry]);
  return { x, y };
}

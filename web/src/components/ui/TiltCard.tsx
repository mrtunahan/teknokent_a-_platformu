import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type { ReactNode } from 'react';
import { useMotionPrefs } from '@/hooks/useMotionPrefs';
import { cn } from '@/lib/utils';

/** Hover'da fareye göre eğilen, üzerinde ışık parlaması gezen kart (derinlik hissi). */
export function TiltCard({ children, className, max = 10 }: { children: ReactNode; className?: string; max?: number }) {
  const { allowParallax } = useMotionPrefs();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 200, damping: 20 });
  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(420px circle at ${gx} ${gy}, rgba(255,94,0,0.14), transparent 45%)`;

  return (
    <motion.div
      className={cn('group relative [transform-style:preserve-3d]', className)}
      style={allowParallax ? { rotateX: rx, rotateY: ry, transformPerspective: 900 } : undefined}
      onPointerMove={(e) => {
        if (!allowParallax) return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
    >
      {children}
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: glare }} />
    </motion.div>
  );
}

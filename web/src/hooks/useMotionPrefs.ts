import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

function useMedia(query: string) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

/**
 * Animasyon bütçesi: reduced-motion tercihinde ağır efektler kapanır, mobilde/dokunmatikte
 * 3D sahne yerine hafif CSS alternatifi kullanılır.
 */
export function useMotionPrefs() {
  const reduced = !!useReducedMotion();
  const isMobile = useMedia('(max-width: 768px)');
  const coarse = useMedia('(pointer: coarse)');
  return { reduced, isMobile, coarse, allow3D: !reduced && !isMobile, allowParallax: !reduced && !coarse };
}

export { useMedia };

import type { Company } from '@/types';

/** Firma kartı kapağı için marka renklerinden üretilen soyut görsel (harici görsel gerektirmez). */
export function CoverArt({ company, className }: { company: Pick<Company, 'brand' | 'cover' | 'id'>; className?: string }) {
  const [a, b] = company.brand;
  const id = `cv-${company.id}`;
  return (
    <svg className={className} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
        <radialGradient id={`${id}-r`} cx="0.75" cy="0.1" r="0.9">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="200" fill="#FFFFFF" />
      <rect width="400" height="200" fill={`url(#${id}-g)`} opacity="0.55" />
      {company.cover === 'grid' &&
        Array.from({ length: 14 }, (_, i) => (
          <g key={i} stroke="#fff" strokeOpacity={0.09}>
            <line x1={i * 30} y1="0" x2={i * 30 - 60} y2="200" />
            <line x1="0" y1={i * 18} x2="400" y2={i * 18 + 30} />
          </g>
        ))}
      {company.cover === 'waves' &&
        Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M0 ${60 + i * 14} C 100 ${20 + i * 14}, 220 ${120 + i * 14}, 400 ${50 + i * 14}`} fill="none" stroke="#fff" strokeOpacity={0.06 + i * 0.012} strokeWidth="1.2" />
        ))}
      {company.cover === 'orbit' &&
        Array.from({ length: 6 }, (_, i) => <circle key={i} cx="320" cy="40" r={30 + i * 32} fill="none" stroke="#fff" strokeOpacity={0.14 - i * 0.018} />)}
      {company.cover === 'mesh' && (
        <>
          <circle cx="80" cy="170" r="120" fill={b} opacity="0.45" />
          <circle cx="330" cy="20" r="110" fill={a} opacity="0.55" />
          {Array.from({ length: 22 }, (_, i) => (
            <circle key={i} cx={(i * 73) % 400} cy={(i * 41) % 200} r="1.4" fill="#fff" opacity="0.35" />
          ))}
        </>
      )}
      <rect width="400" height="200" fill={`url(#${id}-r)`} />
    </svg>
  );
}

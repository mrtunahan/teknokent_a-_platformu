import { motion } from 'framer-motion';
import { Bookmark, Heart, Info, RotateCcw, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { label } from '@/data/options';
import { cn } from '@/lib/utils';
import type { CollaborationType } from '@/types';

function Btn({ onClick, aria, className, children, size = 'sm', disabled, active }: { onClick: () => void; aria: string; className?: string; children: ReactNode; size?: 'sm' | 'md' | 'lg'; disabled?: boolean; active?: boolean }) {
  const dims = { sm: 'h-11 w-11', md: 'h-12 w-12 sm:h-[52px] sm:w-[52px]', lg: 'h-14 w-14' }[size];
  return (
    <motion.button
      type="button"
      aria-label={aria}
      title={aria}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      className={cn('grid place-items-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-35', dims, className)}
    >
      {children}
    </motion.button>
  );
}

/** Kartın altındaki yüzen aksiyon barı: Geri al · Geç · Detay · Beğen · Favori */
export function ActionBar({
  onUndo,
  onPass,
  onInfo,
  onLike,
  onFavorite,
  canUndo,
  disabled,
  favorite,
}: {
  onUndo?: () => void;
  onPass: () => void;
  onInfo: () => void;
  onLike: () => void;
  onFavorite?: () => void;
  canUndo?: boolean;
  disabled?: boolean;
  favorite?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative z-20 flex items-center gap-2 rounded-full border border-slate-200 bg-white p-2 shadow-float sm:gap-3">
        {onUndo && (
          <Btn aria="Geri al (Z)" onClick={onUndo} disabled={!canUndo} className="text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <RotateCcw className="h-5 w-5" />
          </Btn>
        )}
        <Btn aria="Geç (←)" size="md" onClick={onPass} disabled={disabled} className="border border-slate-200 bg-white text-rose-500 hover:border-rose-200 hover:bg-rose-50">
          <X className="h-6 w-6" strokeWidth={2.75} />
        </Btn>
        <Btn aria="Detayları incele (↑)" onClick={onInfo} disabled={disabled} className="bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900">
          <Info className="h-5 w-5" />
        </Btn>
        <Btn aria="Beğen (→)" size="lg" onClick={onLike} disabled={disabled} className="bg-primary-500 text-white shadow-glow hover:bg-primary-600">
          <Heart className="h-6 w-6 fill-white" />
        </Btn>
        {onFavorite && (
          <Btn aria={favorite ? 'Favorilerden çıkar' : 'Favoriye ekle'} active={favorite} onClick={onFavorite} disabled={disabled} className={favorite ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}>
            <Bookmark className={cn('h-5 w-5', favorite && 'fill-blue-600')} />
          </Btn>
        )}
      </div>
      <p className="mt-4 hidden items-center gap-3 text-xs text-slate-500 sm:flex">
        <span>
          <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-sans font-semibold text-slate-700 shadow-glass">←</kbd> Geç
        </span>
        <span>
          <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-sans font-semibold text-slate-700 shadow-glass">→</kbd> Beğen
        </span>
        {onUndo && (
          <span>
            <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-sans font-semibold text-slate-700 shadow-glass">Z</kbd> Geri al
          </span>
        )}
        <span>
          <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-sans font-semibold text-slate-700 shadow-glass">↑</kbd> Detay
        </span>
      </p>
    </div>
  );
}

/** Büyük uyum skoru dairesi (x/100) */
export function BigScore({ value }: { value: number }) {
  const size = 132;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} aria-label={`Uyum skoru ${value}/100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#F1F5F9" strokeWidth={stroke} fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke="#FF5E00" strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - value / 100) }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} />
      </svg>
      <div className="absolute text-center">
        <span className="font-display text-4xl font-black tracking-tight text-slate-900">{value}</span>
        <span className="text-sm font-bold text-slate-400">/100</span>
      </div>
    </div>
  );
}

export const scoreLabel = (s: number) => (s >= 80 ? 'Çok Yüksek Uyum' : s >= 65 ? 'Yüksek Uyum' : s >= 50 ? 'Orta Uyum' : 'Potansiyel Uyum');

/** Sağ uyum analizi paneli */
export function MatchAnalysis({
  score,
  name,
  factors,
  collaborationTypes,
  activeTypes,
  counter,
  stats,
}: {
  score: number | null;
  name: string;
  factors: { label: string; value: number; note: string }[];
  collaborationTypes: CollaborationType[];
  activeTypes: CollaborationType[];
  counter?: { remaining: number; total: number };
  stats?: { label: string; value: number }[];
}) {
  return (
    <div className="space-y-4">
      <motion.section key={name} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-glass">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Uyum Analizi</div>
        {score != null && (
          <div className="mt-4 flex flex-col items-center text-center">
            <BigScore value={score} />
            <div className="mt-3 rounded-full bg-primary-50 px-3 py-1 text-sm font-bold text-primary-600">{scoreLabel(score)}</div>
            <div className="mt-1 text-xs text-slate-500">{name} ile</div>
          </div>
        )}
        {factors.length > 0 && (
          <ul className="mt-5 space-y-4">
            {factors.map((f) => (
              <li key={f.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-800">{f.label}</span>
                  <span className="font-bold text-slate-900">%{f.value}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <motion.div className="h-full rounded-full bg-primary-500" initial={{ width: 0 }} animate={{ width: `${f.value}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{f.note}</p>
              </li>
            ))}
          </ul>
        )}
        {collaborationTypes.length > 0 && (
          <>
            <div className="my-5 h-px bg-slate-100" />
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">İş Birliği Türleri</div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {collaborationTypes.map((t) => {
                const on = activeTypes.includes(t);
                return (
                  <span key={t} className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', on ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600')}>
                    {label.collab(t)}
                  </span>
                );
              })}
            </div>
          </>
        )}
      </motion.section>

      {(counter || stats) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-glass">
          {counter && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Günlük Keşif</div>
                <div className="text-sm font-bold text-slate-900">
                  {counter.remaining}/{counter.total} <span className="font-semibold text-slate-500">Kaldı</span>
                </div>
              </div>
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${(counter.remaining / Math.max(counter.total, 1)) * 100}%` }} />
              </div>
            </>
          )}
          {stats && (
            <div className={cn('grid grid-cols-3 gap-2 text-center', counter && 'mt-4')}>
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl bg-slate-50 py-3">
                  <div className="font-display text-xl font-black text-slate-900">{s.value}</div>
                  <div className="text-[11px] font-medium text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/** Uyum skorundan açıklanabilir alt kırılımlar (demo / API'de alt skor yoksa) */
export function deriveFactors(score: number, opts: { reasons: string[]; hasRnd?: boolean; sector?: string }) {
  const clamp = (n: number) => Math.max(35, Math.min(99, Math.round(n)));
  return [
    { label: 'Teknolojik Tamamlayıcılık', value: clamp(score + 4), note: opts.reasons[0] ?? 'Yetkinlikleriniz birbirini tamamlıyor' },
    { label: 'Sektörel Deneyim', value: clamp(score - 6), note: opts.sector ? `${opts.sector} alanında saha deneyimi` : 'Benzer sektörlerde deneyim' },
    { label: 'Fikri Mülkiyet & Patent', value: clamp(opts.hasRnd ? score - 3 : score - 18), note: opts.hasRnd ? 'Tescilli Ar-Ge merkezi ve patent portföyü' : 'Ar-Ge kapasitesi gelişiyor' },
  ];
}

import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Info, RotateCcw, SlidersHorizontal, Sparkles, Star, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { activeFilterCount, useStore } from '@/store/AppStore';
import { compatibility } from '@/lib/score';
import { Button, Chip, CompanyLogo, EmptyState } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { CompanyDetailSheet } from '@/components/discover/CompanyDetail';
import { FilterDrawer } from '@/components/discover/FilterDrawer';
import { ScoreRing } from '@/components/discover/ScoreRing';
import { SwipeCard, type SwipeCardHandle } from '@/components/discover/SwipeCard';
import { MatchOverlay } from '@/components/match/MatchOverlay';
import type { Match, SwipeDirection } from '@/types';
import { label } from '@/data/options';

function ActionButton({ onClick, label: aria, className, children, size = 'md' }: { onClick: () => void; label: string; className?: string; children: React.ReactNode; size?: 'sm' | 'md' }) {
  return (
    <motion.button
      type="button"
      aria-label={aria}
      title={aria}
      onClick={onClick}
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      className={`grid place-items-center rounded-full border border-white/10 bg-ink-850/80 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] backdrop-blur-xl ${size === 'md' ? 'h-14 w-14 sm:h-16 sm:w-16' : 'h-11 w-11 sm:h-12 sm:w-12'} ${className}`}
    >
      {children}
    </motion.button>
  );
}

export default function Discover() {
  const { state, dispatch, deck, swipe, companyById } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const topRef = useRef<SwipeCardHandle>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const busy = useRef(false);

  // Uyum skoruna göre sırala (en uyumlu üstte)
  const ranked = useMemo(
    () =>
      deck
        .map((c) => ({ company: c, ...compatibility(state.me, c) }))
        .sort((a, b) => b.score - a.score),
    [deck, state.me],
  );
  const top = ranked[0];
  const visible = ranked.slice(0, 3);
  const filterCount = activeFilterCount(state.filters);

  const onSwiped = useCallback(
    async (dir: SwipeDirection) => {
      if (!top) return;
      busy.current = false;
      const m = await swipe(top.company.id, dir);
      if (m) setTimeout(() => setMatch(m), 120);
      else if (dir === 'super') toast({ title: 'Süper ilgi gönderildi', body: `${top.company.name} öne çıkan bildirim alacak.`, tone: 'info' });
    },
    [top, swipe, toast],
  );

  const trigger = useCallback((dir: SwipeDirection) => {
    if (busy.current || !topRef.current) return;
    busy.current = true;
    void topRef.current.fling(dir);
  }, []);

  // Klavye kısayolları
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (detailId || match || filtersOpen) return;
      const t = e.target as HTMLElement;
      if (t.closest('input,textarea,select')) return;
      if (e.key === 'ArrowRight') trigger('right');
      else if (e.key === 'ArrowLeft') trigger('left');
      else if (e.key === 'ArrowUp' && top) {
        e.preventDefault();
        setDetailId(top.company.id);
      } else if (e.key.toLowerCase() === 'z') dispatch({ type: 'undo' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [trigger, top, detailId, match, filtersOpen, dispatch]);

  const detail = detailId ? companyById(detailId) ?? null : null;
  const detailScore = detail ? compatibility(state.me, detail) : undefined;
  const matchedCompany = match ? companyById(match.companyId) ?? null : null;
  const canUndo = state.swipeOrder.length > 0 && !state.matches.some((m) => m.companyId === state.swipeOrder[state.swipeOrder.length - 1]);

  return (
    <div className="mx-auto flex min-h-[calc(100svh-120px)] max-w-6xl flex-col px-4 pt-5 sm:px-6 lg:min-h-[100svh] lg:px-8 lg:pt-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">Firmaları Keşfet</h1>
          <p className="mt-1 text-sm text-slate-400">
            <span className="text-white">{ranked.length}</span> firma profilinize göre sıralandı
          </p>
        </div>
        <Button variant="secondary" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal className="h-4 w-4" /> <span className="hidden sm:inline">Filtreler</span>
          {filterCount > 0 && <span className="rounded-full bg-electric-500 px-2 py-0.5 text-[10px] font-semibold">{filterCount}</span>}
        </Button>
      </div>

      <div className="mt-4 grid flex-1 gap-8 sm:mt-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Deste */}
        <div className="flex flex-col items-center">
          <div className="relative h-[calc(100svh-350px)] min-h-[330px] max-h-[620px] lg:h-[min(620px,calc(100svh-250px))] w-full max-w-[420px]">
            {ranked.length === 0 ? (
              <div className="absolute inset-0 grid place-items-center">
                <EmptyState
                  icon={<Sparkles className="h-6 w-6" />}
                  title={filterCount ? 'Filtrelere uyan firma kalmadı' : 'Şimdilik hepsi bu kadar!'}
                  description={filterCount ? 'Filtreleri genişleterek daha fazla firma keşfedebilirsiniz.' : 'Tüm önerileri değerlendirdiniz. Geçtiğiniz firmaları tekrar görmek için desteyi yenileyin.'}
                  action={
                    filterCount ? (
                      <Button variant="secondary" onClick={() => setFiltersOpen(true)}>
                        Filtreleri düzenle
                      </Button>
                    ) : (
                      <Button variant="secondary" onClick={() => dispatch({ type: 'resetDeck' })}>
                        <RotateCcw className="h-4 w-4" /> Desteyi yenile
                      </Button>
                    )
                  }
                />
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {visible
                  .map((r, i) => (
                    <motion.div key={r.company.id} className="absolute inset-0" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0 } }}>
                      <SwipeCard
                        ref={i === 0 ? topRef : undefined}
                        company={r.company}
                        score={r.score}
                        reasons={r.reasons}
                        index={i}
                        onSwiped={onSwiped}
                        onDetails={() => setDetailId(r.company.id)}
                      />
                    </motion.div>
                  ))
                  .reverse()}
              </AnimatePresence>
            )}
          </div>

          {/* Aksiyonlar */}
          <div className="relative z-20 mt-4 flex items-center justify-center gap-3 sm:gap-4">
            <ActionButton size="sm" label="Geri al (Z)" onClick={() => canUndo && dispatch({ type: 'undo' })} className={canUndo ? 'text-amber-300' : 'pointer-events-none text-slate-600 opacity-50'}>
              <RotateCcw className="h-5 w-5" />
            </ActionButton>
            <ActionButton label="Geç (←)" onClick={() => trigger('left')} className="text-rose-400 hover:border-rose-400/40 hover:shadow-[0_0_30px_-5px_rgba(244,63,94,0.6)]">
              <X className="h-7 w-7" strokeWidth={2.5} />
            </ActionButton>
            <ActionButton size="sm" label="Detayları incele (↑)" onClick={() => top && setDetailId(top.company.id)} className="text-electric-300">
              <Info className="h-5 w-5" />
            </ActionButton>
            <ActionButton label="Beğen (→)" onClick={() => trigger('right')} className="text-aqua-300 hover:border-aqua-400/40 hover:shadow-[0_0_30px_-5px_rgba(45,212,191,0.6)]">
              <Heart className="h-7 w-7 fill-current" />
            </ActionButton>
            <ActionButton size="sm" label="Süper ilgi" onClick={() => trigger('super')} className="text-violet-400">
              <Star className="h-5 w-5 fill-current" />
            </ActionButton>
          </div>
          <p className="mt-4 hidden text-xs text-slate-500 sm:block">
            Kısayollar: <kbd className="rounded bg-white/10 px-1.5">←</kbd> geç · <kbd className="rounded bg-white/10 px-1.5">→</kbd> beğen · <kbd className="rounded bg-white/10 px-1.5">↑</kbd> detay · <kbd className="rounded bg-white/10 px-1.5">Z</kbd> geri al
          </p>
        </div>

        {/* Uyum analizi paneli */}
        <aside className="hidden space-y-4 lg:block">
          <AnimatePresence mode="wait">
            {top && (
              <motion.div key={top.company.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }} className="glass rounded-3xl p-6">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Uyum analizi</div>
                <div className="mt-4 flex items-center gap-4">
                  <ScoreRing value={top.score} size={72} stroke={6} />
                  <div>
                    <div className="font-display text-lg font-semibold text-white">{top.score >= 80 ? 'Çok yüksek uyum' : top.score >= 65 ? 'Yüksek uyum' : 'Potansiyel uyum'}</div>
                    <div className="text-xs text-slate-400">{top.company.name} ile</div>
                  </div>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {top.reasons.map((r) => (
                    <li key={r} className="flex gap-2 text-sm text-slate-300">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-300" /> {r}
                    </li>
                  ))}
                </ul>
                <div className="hairline my-5" />
                <div className="text-xs text-slate-500">İş birliği türleri</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {top.company.collaborationTypes.map((t) => (
                    <Chip key={t} tone={state.me.collaborationTypes.includes(t) ? 'aqua' : 'default'} className="!text-[11px]">
                      {label.collab(t)}
                    </Chip>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Son eşleşmeler</div>
              <button onClick={() => navigate('/demo/matches')} className="text-xs text-electric-300 hover:underline">
                Tümü
              </button>
            </div>
            <div className="mt-4 flex -space-x-2">
              {state.matches.slice(0, 6).map((m) => {
                const c = companyById(m.companyId);
                return c ? (
                  <button key={m.id} onClick={() => navigate(`/demo/messages/${m.id}`)} title={c.name} className="transition hover:z-10 hover:-translate-y-1">
                    <CompanyLogo company={c} size={40} className="ring-2 ring-ink-900" />
                  </button>
                ) : null;
              })}
              {state.matches.length === 0 && <p className="text-sm text-slate-500">Henüz eşleşme yok — kaydırmaya başlayın!</p>}
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              {[
                ['Beğeni', Object.values(state.swipes).filter((d) => d !== 'left').length],
                ['Geçilen', Object.values(state.swipes).filter((d) => d === 'left').length],
                ['Eşleşme', state.matches.length],
              ].map(([l, v]) => (
                <div key={l as string} className="rounded-2xl bg-white/[0.03] py-3">
                  <div className="font-display text-xl font-bold text-white">{v}</div>
                  <div className="text-[11px] text-slate-500">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <FilterDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)} />
      <CompanyDetailSheet
        company={detail}
        open={!!detail}
        onClose={() => setDetailId(null)}
        score={detailScore?.score}
        reasons={detailScore?.reasons}
        onLike={
          detail && top?.company.id === detail.id
            ? () => {
                setDetailId(null);
                setTimeout(() => trigger('right'), 250);
              }
            : undefined
        }
        onPass={
          detail && top?.company.id === detail.id
            ? () => {
                setDetailId(null);
                setTimeout(() => trigger('left'), 250);
              }
            : undefined
        }
      />
      <MatchOverlay
        match={match}
        me={state.me}
        other={matchedCompany}
        onStart={() => {
          const id = match!.id;
          setMatch(null);
          navigate(`/demo/messages/${id}`);
        }}
        onContinue={() => setMatch(null)}
      />
    </div>
  );
}

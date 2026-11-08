import { motion } from 'framer-motion';
import { Cpu, RotateCcw, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { activeFilterCount, useStore } from '@/store/AppStore';
import { compatibility } from '@/lib/score';
import { Button, EmptyState } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { CompanyDetailSheet } from '@/components/discover/CompanyDetail';
import { ActionBar, MatchAnalysis, deriveFactors } from '@/components/discover/DeckControls';
import { FilterDrawer } from '@/components/discover/FilterDrawer';
import { SwipeCard, type SwipeCardHandle } from '@/components/discover/SwipeCard';
import { MatchOverlay } from '@/components/match/MatchOverlay';
import type { Company, Match, Stage, SwipeDirection } from '@/types';

const DAILY_LIMIT = 25;

/** TRL (1-9) → ürün aşaması yaklaşık eşlemesi (demo verisinde TRL alanı yok) */
const TRL_STAGE: Record<number, Stage[]> = {
  1: ['idea'], 2: ['idea'], 3: ['idea', 'mvp'], 4: ['mvp'], 5: ['mvp', 'first_customer'], 6: ['first_customer'], 7: ['first_customer', 'growth'], 8: ['growth', 'mature'], 9: ['mature'],
};

const norm = (s: string) => s.toLocaleLowerCase('tr');
const matchesQuery = (c: Company, q: string) =>
  !q || [c.name, c.sector, c.description, c.tagline, ...c.expertise, ...c.products, ...c.offering].some((x) => norm(x).includes(norm(q)));

export default function Discover() {
  const { state, dispatch, deck, swipe, companyById } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const trl = Number(params.get('trl')) || 0;
  const topRef = useRef<SwipeCardHandle>(null);
  const [filtersOpen, setFiltersOpen] = useState(params.get('filters') === '1');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const busy = useRef(false);

  // Uyum skoruna göre sırala (en uyumlu üstte); üst bar / ana sayfa araması uygulanır
  const ranked = useMemo(
    () =>
      deck
        .filter((c) => matchesQuery(c, q) && (!trl || TRL_STAGE[trl]!.includes(c.stage)))
        .map((c) => ({ company: c, ...compatibility(state.me, c) }))
        .sort((a, b) => b.score - a.score),
    [deck, state.me, q, trl],
  );
  const top = ranked[0];
  const visible = ranked.slice(0, 3);
  const filterCount = activeFilterCount(state.filters) + (q ? 1 : 0) + (trl ? 1 : 0);
  const liked = Object.values(state.swipes).filter((d) => d !== 'left').length;
  const passed = Object.values(state.swipes).filter((d) => d === 'left').length;
  const remaining = Math.max(0, DAILY_LIMIT - state.swipeOrder.length);

  const onSwiped = useCallback(
    async (dir: SwipeDirection) => {
      if (!top) return;
      busy.current = false;
      const m = await swipe(top.company.id, dir);
      if (m) setTimeout(() => setMatch(m), 120);
    },
    [top, swipe],
  );

  const trigger = useCallback((dir: SwipeDirection) => {
    if (busy.current || !topRef.current) return;
    busy.current = true;
    void topRef.current.fling(dir);
  }, []);

  const toggleFavorite = useCallback(() => {
    if (!top) return;
    const on = state.favorites.includes(top.company.id);
    dispatch({ type: 'toggleFavorite', id: top.company.id });
    toast({ title: on ? 'Favorilerden çıkarıldı' : 'Favorilere eklendi', body: top.company.name, tone: 'info' });
  }, [top, state.favorites, dispatch, toast]);

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
    <div className="mx-auto flex max-w-6xl flex-col px-4 pb-6 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Firmaları Keşfet <span className="rounded-md bg-primary-50 px-2 py-0.5 text-[11px] font-black tracking-wider text-primary-600">BETA</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-bold text-slate-900">{ranked.length}</span> firma profilinize göre akıllı sıralandı
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-glass md:inline-flex">
            <Cpu className="h-3.5 w-3.5 text-primary-500" /> Akıllı Eşleşme Algoritması v2.4
          </span>
          <Button variant="secondary" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" /> Filtreler{filterCount > 0 && ` (${filterCount})`}
          </Button>
        </div>
      </div>

      {(q || trl > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {q && (
            <button onClick={() => { params.delete('q'); setParams(params, { replace: true }); }} className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              “{q}” <X className="h-3 w-3" />
            </button>
          )}
          {trl > 0 && (
            <button onClick={() => { params.delete('trl'); setParams(params, { replace: true }); }} className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              TRL {trl} <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      <div className="mt-5 grid flex-1 gap-8 lg:grid-cols-[minmax(0,1fr)_330px]">
        {/* Deste */}
        <div className="flex flex-col items-center">
          <div className="relative h-[calc(100svh-370px)] max-h-[640px] min-h-[360px] w-full max-w-[440px] lg:h-[min(640px,calc(100svh-290px))]">
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
              visible
                .map((r, i) => (
                  <motion.div key={r.company.id} className="absolute inset-0" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
                    <SwipeCard ref={i === 0 ? topRef : undefined} company={r.company} score={r.score} reasons={r.reasons} index={i} onSwiped={onSwiped} onDetails={() => setDetailId(r.company.id)} />
                  </motion.div>
                ))
                .reverse()
            )}
          </div>

          <div className="mt-5">
            <ActionBar
              onUndo={() => canUndo && dispatch({ type: 'undo' })}
              canUndo={canUndo}
              onPass={() => trigger('left')}
              onInfo={() => top && setDetailId(top.company.id)}
              onLike={() => trigger('right')}
              onFavorite={toggleFavorite}
              favorite={!!top && state.favorites.includes(top.company.id)}
              disabled={!top}
            />
          </div>
        </div>

        <aside className="hidden lg:block">
          {top ? (
            <MatchAnalysis
              score={top.score}
              name={top.company.name}
              factors={deriveFactors(top.score, { reasons: top.reasons, hasRnd: top.company.hasRndCenter, sector: top.company.sector })}
              collaborationTypes={top.company.collaborationTypes}
              activeTypes={top.company.collaborationTypes.filter((t) => state.me.collaborationTypes.includes(t))}
              counter={{ remaining, total: DAILY_LIMIT }}
              stats={[
                { label: 'Beğeni', value: liked },
                { label: 'Geçilen', value: passed },
                { label: 'Eşleşme', value: state.matches.length },
              ]}
            />
          ) : (
            <MatchAnalysis score={null} name="" factors={[]} collaborationTypes={[]} activeTypes={[]} counter={{ remaining, total: DAILY_LIMIT }} stats={[{ label: 'Beğeni', value: liked }, { label: 'Geçilen', value: passed }, { label: 'Eşleşme', value: state.matches.length }]} />
          )}
        </aside>
      </div>

      <FilterDrawer
        open={filtersOpen}
        onClose={() => {
          setFiltersOpen(false);
          if (params.get('filters')) {
            params.delete('filters');
            setParams(params, { replace: true });
          }
        }}
      />
      <CompanyDetailSheet
        company={detail}
        open={!!detail}
        onClose={() => setDetailId(null)}
        score={detailScore?.score}
        reasons={detailScore?.reasons}
        onLike={detail && top?.company.id === detail.id ? () => { setDetailId(null); setTimeout(() => trigger('right'), 250); } : undefined}
        onPass={detail && top?.company.id === detail.id ? () => { setDetailId(null); setTimeout(() => trigger('left'), 250); } : undefined}
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

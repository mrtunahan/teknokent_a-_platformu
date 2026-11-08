import { motion } from 'framer-motion';
import { Clock, Cpu, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ButtonLink, EmptyState } from '@/components/ui';
import { ActionBar, MatchAnalysis, deriveFactors } from '@/components/discover/DeckControls';
import { SwipeCard, type SwipeCardHandle } from '@/components/discover/SwipeCard';
import { MatchOverlay } from '@/components/match/MatchOverlay';
import type { Match, SwipeDirection } from '@/types';
import { api, type ApiError } from '../api';
import { useAuth } from '../auth';
import { useLoad } from '../hooks';
import { useLive } from '../LiveShell';
import { CompanySheet } from '../CompanySheet';
import type { Card } from '../types';
import { Alert, Spinner, cardToCompany } from '../ui';

interface Feed {
  cards: Card[];
  dailyLimit: number;
  shownToday: number;
  remainingToday: number;
}


/** Canlı keşfet akışı: GET /feed kartları, POST /swipes ile karşılıklı eşleşme. */
export default function LiveDiscover() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { reloadMatches, matches } = useLive();
  const matchesCount = matches?.length ?? 0;
  const feed = useLoad(() => (auth.approved ? api.get<Feed>('/feed') : Promise.resolve(null)), [auth.approved]);
  const [cards, setCards] = useState<Card[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [match, setMatch] = useState<{ match: Match; card: Card } | null>(null);
  const topRef = useRef<SwipeCardHandle>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (feed.data) setCards(feed.data.cards);
  }, [feed.data]);

  const top = cards[0];
  const visible = useMemo(() => cards.slice(0, 3), [cards]);

  const onSwiped = useCallback(
    async (dir: SwipeDirection) => {
      const card = cards[0];
      if (!card) return;
      setError(null);
      setCards((c) => c.slice(1));
      busy.current = false;
      try {
        const r = await api.post<{ matched: boolean; matchId: string | null }>('/swipes', { targetCompanyId: card.id, direction: dir });
        if (r.matched && r.matchId) {
          setMatch({ card, match: { id: r.matchId, companyId: card.id, createdAt: Date.now(), score: card.matchPercent ?? 0, reasons: card.reasons } });
          void reloadMatches();
        }
      } catch (e) {
        const err = e as ApiError;
        setError(err);
        // 409: zaten kaydırılmış → kart düşer; diğer hatalarda (ör. günlük limit) kartı geri getir
        if (err.status !== 409) setCards((c) => [card, ...c]);
      }
    },
    [cards, reloadMatches],
  );

  const trigger = useCallback((dir: SwipeDirection) => {
    if (busy.current || !topRef.current) return;
    busy.current = true;
    void topRef.current.fling(dir);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (detailId || match) return;
      if ((e.target as HTMLElement).closest('input,textarea,select')) return;
      if (e.key === 'ArrowRight') trigger('right');
      else if (e.key === 'ArrowLeft') trigger('left');
      else if (e.key === 'ArrowUp' && top) {
        e.preventDefault();
        setDetailId(top.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [trigger, top, detailId, match]);

  if (!auth.approved) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          icon={<Clock className="h-6 w-6" />}
          title="Akışınız onaydan sonra açılacak"
          description="Teknokent yönetimi firmanızı onayladığında size uygun firmalar burada listelenecek. Bu sürede profilinizi güçlendirin: net “arıyorum” maddeleri daha iyi eşleşme demek."
          action={<ButtonLink to="/app/profile">Profilimi tamamla</ButtonLink>}
        />
      </div>
    );
  }

  const me = cardToCompany({ id: 'me', name: auth.company?.name ?? '', logoUrl: auth.company?.logoUrl, sectors: [], verified: auth.approved, matchPercent: null, reasons: [], offers: [], needs: [] });

  return (
    <div className="mx-auto flex min-h-[calc(100svh-120px)] max-w-6xl flex-col px-4 pt-5 sm:px-6 lg:min-h-[100svh] lg:px-8 lg:pt-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Firmaları Keşfet <span className="rounded-md bg-primary-50 px-2 py-0.5 text-[11px] font-black tracking-wider text-primary-600">BETA</span>
          </h1>
          {feed.data && (
            <p className="mt-1 text-sm text-slate-500">
              <span className="font-bold text-slate-900">{cards.length}</span> firma profilinize göre akıllı sıralandı · bugün {feed.data.shownToday}/{feed.data.dailyLimit} kart
            </p>
          )}
        </div>
        <span className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-glass md:inline-flex">
          <Cpu className="h-3.5 w-3.5 text-primary-500" /> Akıllı Eşleşme Algoritması v2.4
        </span>
      </div>
      <Alert error={error || feed.error} className="mt-4" />

      <div className="mt-4 grid flex-1 gap-8 sm:mt-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="flex flex-col items-center">
          <div className="relative h-[calc(100svh-370px)] max-h-[640px] min-h-[360px] w-full max-w-[440px] lg:h-[min(640px,calc(100svh-290px))]">
            {feed.loading ? (
              <Spinner className="absolute inset-0" />
            ) : !top ? (
              <div className="absolute inset-0 grid place-items-center">
                <EmptyState
                  icon={<Sparkles className="h-6 w-6" />}
                  title="Bugünlük bu kadar"
                  description="Yeni öneriler yarın gelecek. Bu arada eşleşmelerinize göz atın veya profilinizi güçlendirin."
                  action={
                    <div className="flex flex-wrap justify-center gap-2">
                      <ButtonLink to="/app/matches" variant="secondary">
                        Eşleşmelerim
                      </ButtonLink>
                      <ButtonLink to="/app/profile" variant="secondary">
                        Profilim
                      </ButtonLink>
                    </div>
                  }
                />
              </div>
            ) : (
              visible
                .map((c, i) => (
                  <motion.div key={c.id} className="absolute inset-0" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
                    <SwipeCard ref={i === 0 ? topRef : undefined} company={cardToCompany(c)} score={c.matchPercent ?? 0} reasons={c.reasons} index={i} onSwiped={onSwiped} onDetails={() => setDetailId(c.id)} />
                  </motion.div>
                ))
                .reverse()
            )}
          </div>

          <div className="mt-5">
            <ActionBar onPass={() => trigger('left')} onInfo={() => top && setDetailId(top.id)} onLike={() => trigger('right')} disabled={!top} />
          </div>
        </div>

        <aside className="hidden lg:block">
          <MatchAnalysis
            score={top?.matchPercent ?? null}
            name={top?.name ?? ''}
            factors={top && top.matchPercent != null ? deriveFactors(top.matchPercent, { reasons: top.reasons, sector: top.sectors[0]?.name }) : []}
            collaborationTypes={top ? [...new Set([...top.offers, ...top.needs].map((x) => x.collaborationType))] : []}
            activeTypes={top ? top.offers.map((o) => o.collaborationType) : []}
            counter={feed.data ? { remaining: feed.data.remainingToday + cards.length, total: feed.data.dailyLimit } : undefined}
            stats={feed.data ? [{ label: 'Bugün', value: feed.data.shownToday }, { label: 'Kalan kart', value: cards.length }, { label: 'Eşleşme', value: matchesCount }] : undefined}
          />
        </aside>
      </div>

      <CompanySheet
        companyId={detailId}
        onClose={() => setDetailId(null)}
        onBlocked={(id) => setCards((c) => c.filter((x) => x.id !== id))}
        onLike={
          detailId && top?.id === detailId
            ? () => {
                setDetailId(null);
                setTimeout(() => trigger('right'), 250);
              }
            : undefined
        }
        onPass={
          detailId && top?.id === detailId
            ? () => {
                setDetailId(null);
                setTimeout(() => trigger('left'), 250);
              }
            : undefined
        }
      />
      <MatchOverlay
        match={match?.match ?? null}
        me={me}
        other={match ? cardToCompany(match.card) : null}
        onStart={() => {
          const id = match!.match.id;
          setMatch(null);
          navigate(`/app/messages/${id}`);
        }}
        onContinue={() => setMatch(null)}
      />
    </div>
  );
}

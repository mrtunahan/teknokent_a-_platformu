import { motion } from 'framer-motion';
import { Clock, Heart, Info, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ButtonLink, Chip, EmptyState } from '@/components/ui';
import { ScoreRing } from '@/components/discover/ScoreRing';
import { SwipeCard, type SwipeCardHandle } from '@/components/discover/SwipeCard';
import { MatchOverlay } from '@/components/match/MatchOverlay';
import type { Match, SwipeDirection } from '@/types';
import { api, type ApiError } from '../api';
import { useAuth } from '../auth';
import { useLoad } from '../hooks';
import { label } from '../labels';
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

function ActionButton({ onClick, label: aria, className, children, size = 'md', disabled }: { onClick: () => void; label: string; className?: string; children: React.ReactNode; size?: 'sm' | 'md'; disabled?: boolean }) {
  return (
    <motion.button
      type="button"
      aria-label={aria}
      title={aria}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scale: 0.9 }}
      className={`grid place-items-center rounded-full border border-white/10 bg-ink-850/80 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] backdrop-blur-xl disabled:opacity-40 ${size === 'md' ? 'h-14 w-14 sm:h-16 sm:w-16' : 'h-11 w-11 sm:h-12 sm:w-12'} ${className}`}
    >
      {children}
    </motion.button>
  );
}

/** Canlı keşfet akışı: GET /feed kartları, POST /swipes ile karşılıklı eşleşme. */
export default function LiveDiscover() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { reloadMatches } = useLive();
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
          <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">Firmaları Keşfet</h1>
          {feed.data && (
            <p className="mt-1 text-sm text-slate-400">
              Bugün <span className="text-white">{feed.data.shownToday}</span>/{feed.data.dailyLimit} kart · uyum skoruna göre sıralandı
            </p>
          )}
        </div>
      </div>
      <Alert error={error || feed.error} className="mt-4" />

      <div className="mt-4 grid flex-1 gap-8 sm:mt-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col items-center">
          <div className="relative h-[calc(100svh-350px)] max-h-[620px] min-h-[330px] w-full max-w-[420px] lg:h-[min(620px,calc(100svh-250px))]">
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

          <div className="relative z-20 mt-4 flex items-center justify-center gap-4">
            <ActionButton label="Şimdilik değil (←)" disabled={!top} onClick={() => trigger('left')} className="text-rose-400 hover:border-rose-400/40">
              <X className="h-7 w-7" strokeWidth={2.5} />
            </ActionButton>
            <ActionButton size="sm" label="Detayları incele (↑)" disabled={!top} onClick={() => top && setDetailId(top.id)} className="text-electric-300">
              <Info className="h-5 w-5" />
            </ActionButton>
            <ActionButton label="İlgileniyorum (→)" disabled={!top} onClick={() => trigger('right')} className="text-aqua-300 hover:border-aqua-400/40">
              <Heart className="h-7 w-7 fill-current" />
            </ActionButton>
          </div>
          <p className="mt-4 hidden text-xs text-slate-500 sm:block">
            Kısayollar: <kbd className="rounded bg-white/10 px-1.5">←</kbd> geç · <kbd className="rounded bg-white/10 px-1.5">→</kbd> ilgileniyorum · <kbd className="rounded bg-white/10 px-1.5">↑</kbd> detay
          </p>
        </div>

        <aside className="hidden space-y-4 lg:block">
          {top && (
            <motion.div key={top.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="glass rounded-3xl p-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Uyum analizi</div>
              {top.matchPercent != null && (
                <div className="mt-4 flex items-center gap-4">
                  <ScoreRing value={top.matchPercent} size={72} stroke={6} />
                  <div>
                    <div className="font-display text-lg font-semibold text-white">{top.matchPercent >= 75 ? 'Çok yüksek uyum' : top.matchPercent >= 55 ? 'Yüksek uyum' : 'Potansiyel uyum'}</div>
                    <div className="text-xs text-slate-400">{top.exploration ? 'Keşif önerisi' : `${top.name} ile`}</div>
                  </div>
                </div>
              )}
              <ul className="mt-5 space-y-2.5">
                {top.reasons.map((r) => (
                  <li key={r} className="flex gap-2 text-sm text-slate-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-300" /> {r}
                  </li>
                ))}
              </ul>
              {top.offers.length > 0 && (
                <>
                  <div className="hairline my-5" />
                  <div className="text-xs text-slate-500">İş birliği türleri</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[...new Set([...top.offers, ...top.needs].map((x) => x.collaborationType))].map((t) => (
                      <Chip key={t} className="!text-[11px]">
                        {label.collab(t)}
                      </Chip>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
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

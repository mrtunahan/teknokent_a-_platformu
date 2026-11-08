import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Bookmark, CheckCheck, Eye, Heart, HeartHandshake, Info, MapPin, MessageCircle, MessagesSquare, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '@/store/AppStore';
import { compatibility } from '@/lib/score';
import { cn, timeAgo } from '@/lib/utils';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, ButtonLink, Chip, CompanyLogo, EmptyState, VerifiedBadge } from '@/components/ui';
import { TiltCard } from '@/components/ui/TiltCard';
import { CompanyDetailSheet } from '@/components/discover/CompanyDetail';
import { ScoreRing } from '@/components/discover/ScoreRing';
import type { NotificationKind } from '@/types';

/* -------------------------------- Eşleşmelerim ------------------------------ */

export function Matches() {
  const { state, companyById } = useStore();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'new' | 'active'>('all');

  const rows = state.matches
    .map((m) => ({ m, c: companyById(m.companyId)!, talked: (state.messages[m.id] ?? []).some((x) => x.from !== 'system') }))
    .filter((r) => r.c && (tab === 'all' || (tab === 'new' ? !r.talked : r.talked)));
  const d = detail ? state.matches.find((m) => m.id === detail) : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader title="Eşleşmelerim" description="Karşılıklı ilgi gösterdiğiniz firmalar. İletişim kanalı açık." />
      <div className="mt-6 inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1" role="tablist">
        {(
          [
            ['all', 'Tümü'],
            ['new', 'Yeni'],
            ['active', 'Görüşülen'],
          ] as const
        ).map(([v, l]) => (
          <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)} className="relative rounded-xl px-4 py-2 text-sm">
            {tab === v && <motion.span layoutId="match-tab" className="absolute inset-0 rounded-xl bg-slate-100" />}
            <span className={cn('relative', tab === v ? 'text-slate-900' : 'text-slate-500')}>{l}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={<HeartHandshake className="h-6 w-6" />} title="Henüz eşleşme yok" description="Keşfet ekranında ilgilendiğiniz firmalara “İlgileniyorum” deyin. Onlar da sizinle ilgilendiğinde burada görünecek." action={<ButtonLink to="/demo/discover">Keşfetmeye başla</ButtonLink>} />
        </div>
      ) : (
        <motion.div layout className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {rows.map(({ m, c, talked }, i) => (
              <motion.div key={m.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.04 }}>
                <TiltCard className="h-full rounded-3xl" max={6}>
                  <div className="glass flex h-full flex-col rounded-3xl p-5">
                    <div className="flex items-start gap-3">
                      <CompanyLogo company={c} size={52} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate font-semibold text-slate-900">
                          {c.name} {c.verified && <VerifiedBadge />}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="h-3 w-3" /> {c.technopark}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{timeAgo(m.createdAt)} eşleşildi</div>
                      </div>
                      <ScoreRing value={m.score} size={46} stroke={4} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {!talked && <Chip tone="aqua">Yeni</Chip>}
                      {m.reasons.slice(0, 2).map((r) => (
                        <Chip key={r} className="!text-[11px]">
                          {r}
                        </Chip>
                      ))}
                    </div>
                    <div className="mt-auto flex gap-2 pt-5">
                      <Button className="flex-1" size="sm" onClick={() => navigate(`/demo/messages/${m.id}`)}>
                        <MessageCircle className="h-4 w-4" /> {talked ? 'Sohbete git' : 'İlk mesajı gönder'}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setDetail(m.id)} aria-label="Profili gör">
                        <Info className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
      <CompanyDetailSheet company={d ? companyById(d.companyId) ?? null : null} open={!!d} onClose={() => setDetail(null)} score={d?.score} reasons={d?.reasons} />
    </div>
  );
}

/* --------------------------------- Favoriler -------------------------------- */

export function Favorites() {
  const { state, dispatch, companyById } = useStore();
  const [detail, setDetail] = useState<string | null>(null);
  const list = state.favorites.map((id) => companyById(id)).filter(Boolean) as NonNullable<ReturnType<typeof companyById>>[];
  const dc = detail ? companyById(detail) ?? null : null;
  const ds = dc ? compatibility(state.me, dc) : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader title="Favorilerim" description="Daha sonra değerlendirmek üzere kaydettiğiniz firmalar." />
      {list.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={<Bookmark className="h-6 w-6" />} title="Favori listeniz boş" description="Firma detaylarında “Favorilere ekle” ile ilginizi çeken firmaları kaydedin." action={<ButtonLink to="/demo/discover">Firmaları keşfet</ButtonLink>} />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {list.map((c) => {
              const s = compatibility(state.me, c);
              const matched = state.matches.some((m) => m.companyId === c.id);
              const swiped = state.swipes[c.id];
              return (
                <motion.div key={c.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }} className="glass flex flex-col rounded-3xl p-5">
                  <div className="flex items-start gap-3">
                    <CompanyLogo company={c} size={48} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                        {c.name} {c.verified && <VerifiedBadge />}
                      </div>
                      <div className="text-xs text-slate-500">
                        {c.sector} · {c.city}
                      </div>
                    </div>
                    <button onClick={() => dispatch({ type: 'toggleFavorite', id: c.id })} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-rose-600" aria-label="Favorilerden çıkar">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-slate-500">{c.tagline}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <Chip tone={matched ? 'aqua' : swiped ? 'violet' : 'blue'}>{matched ? 'Eşleşildi' : swiped === 'left' ? 'Gizlendi' : swiped ? 'İlgi gönderildi · yanıt bekleniyor' : `%${s.score} uyum`}</Chip>
                    <button onClick={() => setDetail(c.id)} className="text-sm text-primary-600 hover:underline">
                      Detaylar
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      <CompanyDetailSheet company={dc} open={!!dc} onClose={() => setDetail(null)} score={ds?.score} reasons={ds?.reasons} />
    </div>
  );
}

/* -------------------------------- Bildirimler ------------------------------- */

const KIND: Record<NotificationKind, { icon: typeof Bell; color: string }> = {
  match: { icon: Sparkles, color: '#0F172A' },
  like: { icon: Heart, color: '#ec4899' },
  message: { icon: MessagesSquare, color: '#FF5E00' },
  view: { icon: Eye, color: '#2563EB' },
  system: { icon: Bell, color: '#f59e0b' },
};

export function Notifications() {
  const { state, dispatch, companyById } = useStore();
  const navigate = useNavigate();
  const unread = state.notifications.filter((n) => !n.read).length;
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        title="Bildirimler"
        description={unread ? `${unread} okunmamış bildirim` : 'Tüm bildirimler okundu'}
        actions={
          unread > 0 && (
            <Button variant="secondary" size="sm" onClick={() => dispatch({ type: 'readNotification' })}>
              <CheckCheck className="h-4 w-4" /> Tümünü okundu işaretle
            </Button>
          )
        }
      />
      <ul className="mt-6 space-y-2">
        {state.notifications.map((n, i) => {
          const k = KIND[n.kind];
          const c = n.companyId ? companyById(n.companyId) : undefined;
          return (
            <motion.li key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <button
                onClick={() => {
                  dispatch({ type: 'readNotification', id: n.id });
                  if (n.link) navigate(n.link);
                }}
                className={cn('flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition', n.read ? 'border-transparent hover:bg-slate-50' : 'border-slate-200 bg-white hover:bg-slate-100')}
              >
                {c ? (
                  <CompanyLogo company={c} size={42} />
                ) : (
                  <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl" style={{ background: `${k.color}1f`, color: k.color }}>
                    <k.icon className="h-5 w-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className={cn('text-sm', n.read ? 'text-slate-600' : 'font-semibold text-slate-900')}>{n.title}</span>
                    <span className="shrink-0 text-xs text-slate-500">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">{n.body}</p>
                </div>
                {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-500 shadow-[0_0_8px_#FF5E00]" />}
              </button>
            </motion.li>
          );
        })}
      </ul>
      <p className="mt-8 text-center text-xs text-slate-500">
        Bildirim tercihlerinizi{' '}
        <Link to="/demo/settings" className="text-primary-600 hover:underline">
          Hesap Ayarları
        </Link>{' '}
        bölümünden yönetebilirsiniz.
      </p>
    </div>
  );
}

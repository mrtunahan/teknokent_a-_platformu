import { motion } from 'framer-motion';
import { CalendarClock, ClipboardCheck, HeartHandshake, Info, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn, timeAgo } from '@/lib/utils';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, ButtonLink, Chip, EmptyState, VerifiedBadge } from '@/components/ui';
import { TiltCard } from '@/components/ui/TiltCard';
import { ScoreRing } from '@/components/discover/ScoreRing';
import { OUTCOMES } from '../labels';
import { useLive } from '../LiveShell';
import { CompanySheet } from '../CompanySheet';
import { Alert, Logo, Spinner } from '../ui';

export default function LiveMatches() {
  const { matches, matchesError, reloadMatches } = useLive();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'new' | 'active' | 'closed'>('all');

  const rows = (matches ?? []).filter((m) =>
    tab === 'all' ? true : tab === 'new' ? m.status === 'active' && !m.lastMessageAt : tab === 'active' ? m.status === 'active' && !!m.lastMessageAt : m.status !== 'active',
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader title="Eşleşmelerim" description="Karşılıklı ilgi gösterdiğiniz firmalar. İletişim kanalı açık." />
      <div className="mt-6 inline-flex flex-wrap rounded-2xl border border-slate-200 bg-slate-50 p-1" role="tablist">
        {(
          [
            ['all', 'Tümü'],
            ['new', 'Yeni'],
            ['active', 'Görüşülen'],
            ['closed', 'Kapanan'],
          ] as const
        ).map(([v, l]) => (
          <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)} className="relative rounded-xl px-4 py-2 text-sm">
            {tab === v && <motion.span layoutId="live-match-tab" className="absolute inset-0 rounded-xl bg-slate-100" />}
            <span className={cn('relative', tab === v ? 'text-slate-900' : 'text-slate-500')}>{l}</span>
          </button>
        ))}
      </div>
      <Alert error={matchesError} className="mt-6" />
      {!matches && !matchesError ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={<HeartHandshake className="h-6 w-6" />} title="Bu listede eşleşme yok" description="Keşfet ekranında ilgilendiğiniz firmalara “İlgileniyorum” deyin. Onlar da sizinle ilgilendiğinde burada görünür." action={<ButtonLink to="/app/discover">Keşfetmeye başla</ButtonLink>} />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}>
              <TiltCard className="h-full rounded-3xl" max={6}>
                <div className={cn('glass flex h-full flex-col rounded-3xl p-5', m.status !== 'active' && 'opacity-60')}>
                  <div className="flex items-start gap-3">
                    <Logo company={m.company} size={52} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 truncate font-semibold text-slate-900">
                        {m.company?.name ?? 'Silinmiş firma'} {m.company?.verified && <VerifiedBadge />}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{timeAgo(+new Date(m.createdAt))} eşleşildi</div>
                    </div>
                    <ScoreRing value={m.matchPercent} size={46} stroke={4} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {m.status !== 'active' && <Chip>Kapandı</Chip>}
                    {m.status === 'active' && !m.lastMessageAt && <Chip tone="aqua">Yeni</Chip>}
                    {m.unreadCount > 0 && <Chip tone="blue">{m.unreadCount} okunmamış</Chip>}
                    {m.pendingMeetings > 0 && (
                      <Chip tone="violet">
                        <CalendarClock className="h-3 w-3" /> {m.pendingMeetings} toplantı
                      </Chip>
                    )}
                    {m.outcome && <Chip tone="aqua">{OUTCOMES[m.outcome]}</Chip>}
                    {m.outcomeDue && (
                      <Chip tone="violet">
                        <ClipboardCheck className="h-3 w-3" /> Sonuç bekleniyor
                      </Chip>
                    )}
                    {m.reasons.slice(0, 2).map((r) => (
                      <Chip key={r} className="!text-[11px]">
                        {r}
                      </Chip>
                    ))}
                  </div>
                  <div className="mt-auto flex gap-2 pt-5">
                    <Button className="flex-1" size="sm" onClick={() => navigate(`/app/messages/${m.id}${m.outcomeDue ? '?outcome=1' : ''}`)}>
                      <MessageCircle className="h-4 w-4" /> {m.lastMessageAt ? 'Sohbete git' : 'İlk mesajı gönder'}
                    </Button>
                    {m.company && (
                      <Button variant="secondary" size="sm" onClick={() => setDetail(m.company!.id)} aria-label="Profili gör">
                        <Info className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      )}
      <CompanySheet companyId={detail} onClose={() => setDetail(null)} onBlocked={() => void reloadMatches()} />
    </div>
  );
}

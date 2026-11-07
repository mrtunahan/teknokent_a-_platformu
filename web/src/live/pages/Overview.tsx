import { motion } from 'framer-motion';
import { ArrowRight, CalendarClock, ClipboardCheck, Compass, HeartHandshake, MessagesSquare, Sparkles, Target } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { timeAgo } from '@/lib/utils';
import { PageHeader } from '@/components/layout/AppShell';
import { ButtonLink, Chip } from '@/components/ui';
import { BarChart, Donut } from '@/components/dashboard/Charts';
import { api } from '../api';
import { useAuth } from '../auth';
import { useLoad } from '../hooks';
import { MISSING, OUTCOMES, VERIFICATION } from '../labels';
import { useLive } from '../LiveShell';
import type { OwnCompany } from '../types';
import { Alert, Logo, Spinner } from '../ui';

const COLORS = ['#4d94ff', '#8b5cf6', '#2dd4bf', '#f59e0b'];

export default function LiveOverview() {
  const auth = useAuth();
  const { matches } = useLive();
  const profile = useLoad(() => api.get<{ company: OwnCompany }>('/companies/me'), []);
  const feed = useLoad(() => (auth.approved ? api.get<{ shownToday: number; dailyLimit: number; remainingToday: number; cards: unknown[] }>('/feed') : Promise.resolve(null)), [auth.approved]);
  const c = profile.data?.company;
  const list = matches ?? [];

  const stats = useMemo(() => {
    const active = list.filter((m) => m.status === 'active');
    return {
      matches: list.length,
      conversations: active.filter((m) => m.lastMessageAt).length,
      unread: list.reduce((a, m) => a + m.unreadCount, 0),
      meetings: list.reduce((a, m) => a + m.pendingMeetings, 0),
      outcomeDue: list.filter((m) => m.outcomeDue),
      avgScore: list.length ? Math.round(list.reduce((a, m) => a + m.matchPercent, 0) / list.length) : 0,
    };
  }, [list]);

  const monthly = useMemo(() => {
    const months: { key: string; label: string; n: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('tr-TR', { month: 'short' }), n: 0 });
    }
    list.forEach((m) => {
      const d = new Date(m.createdAt);
      const x = months.find((mm) => mm.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (x) x.n += 1;
    });
    return months;
  }, [list]);

  const outcomeMix = useMemo(() => {
    const counts = new Map<string, number>();
    list.forEach((m) => m.outcome && counts.set(m.outcome, (counts.get(m.outcome) ?? 0) + 1));
    const items = [...counts.entries()].map(([k, v], i) => ({ label: OUTCOMES[k as keyof typeof OUTCOMES], value: v, color: COLORS[i % COLORS.length]! }));
    return items.length ? items : [{ label: 'Henüz bildirilmedi', value: 1, color: '#334155' }];
  }, [list]);

  const kpis = [
    { label: 'Gerçekleşen eşleşmeler', value: stats.matches, icon: HeartHandshake, color: '#2dd4bf', to: '/app/matches' },
    { label: 'Devam eden görüşmeler', value: stats.conversations, icon: MessagesSquare, color: '#4d94ff', to: '/app/messages', sub: stats.unread ? `${stats.unread} okunmamış mesaj` : undefined },
    { label: 'Bekleyen toplantılar', value: stats.meetings, icon: CalendarClock, color: '#8b5cf6', to: '/app/matches' },
    { label: 'Bugünkü öneriler', value: feed.data ? feed.data.cards.length : '—', icon: Compass, color: '#f59e0b', to: '/app/discover', sub: feed.data ? `günlük limit ${feed.data.dailyLimit} kart` : undefined },
  ];

  const recent = [...list].filter((m) => m.lastMessageAt).sort((a, b) => +new Date(b.lastMessageAt!) - +new Date(a.lastMessageAt!)).slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        title={`Hoş geldiniz, ${auth.user?.fullName.split(' ')[0] ?? ''}`}
        description={auth.company ? `${auth.company.name} · ekosistemdeki iş birliği fırsatlarınızın özeti` : undefined}
        actions={
          auth.approved && (
            <ButtonLink to="/app/discover">
              <Sparkles className="h-4 w-4" /> Keşfetmeye başla
            </ButtonLink>
          )
        }
      />
      <Alert error={profile.error} />

      {stats.outcomeDue.length > 0 && (
        <div className="rounded-3xl border border-violet-400/20 bg-gradient-to-r from-violet-500/15 via-electric-500/10 to-transparent p-5">
          <div className="flex items-center gap-2 font-semibold text-white">
            <ClipboardCheck className="h-5 w-5 text-violet-400" /> {stats.outcomeDue.length} eşleşmenin sonucunu bildirmediniz
          </div>
          <p className="mt-1 text-sm text-slate-300">İki hafta önceki eşleşmeleriniz görüşmeye, teklife veya sözleşmeye dönüştü mü? Cevabınız sonraki önerileri iyileştirir.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {stats.outcomeDue.slice(0, 4).map((m) => (
              <Link key={m.id} to={`/app/messages/${m.id}?outcome=1`} className="glass inline-flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-3 text-sm text-white hover:border-white/20">
                <Logo company={m.company} size={24} /> {m.company?.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Link to={k.to} className="glass group relative block h-full overflow-hidden rounded-3xl p-4 transition hover:border-white/15 sm:p-5">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40" style={{ background: k.color }} />
              <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${k.color}1f`, color: k.color }}>
                <k.icon className="h-[18px] w-[18px]" />
              </span>
              <div className="mt-4 font-display text-3xl font-bold tracking-tight text-white">{matches ? k.value : '—'}</div>
              <div className="mt-1 text-xs text-slate-400 sm:text-sm">{k.label}</div>
              {k.sub && <div className="mt-2 text-[11px] text-aqua-300">{k.sub}</div>}
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="glass rounded-3xl p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">Profil gücü</h2>
              <p className="text-sm text-slate-400">Eksiksiz profiller üst sırada görünür</p>
            </div>
            {c && <Chip tone={c.verificationStatus === 'approved' ? 'aqua' : 'violet'}>{VERIFICATION[c.verificationStatus]}</Chip>}
          </div>
          {!c ? (
            <Spinner />
          ) : (
            <>
              <div className="mt-6 flex items-end gap-2">
                <span className="font-display text-5xl font-bold text-white">%{c.completion.percent}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div className="h-full rounded-full bg-brand-gradient" initial={{ width: 0 }} animate={{ width: `${c.completion.percent}%` }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} />
              </div>
              {c.completion.missing.length > 0 ? (
                <>
                  <p className="mt-4 text-sm text-slate-400">Eksik: {c.completion.missing.map((k) => MISSING[k] ?? k).join(', ')}</p>
                  <ButtonLink to="/app/profile" variant="secondary" size="sm" className="mt-4">
                    Profili tamamla <ArrowRight className="h-4 w-4" />
                  </ButtonLink>
                </>
              ) : (
                <p className="mt-4 text-sm text-aqua-300">Profiliniz eksiksiz. 🎉</p>
              )}
            </>
          )}
        </div>
        <div className="glass rounded-3xl p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-white">Aylık eşleşmeler</h2>
          <p className="mb-6 text-sm text-slate-400">Son 6 ay · ortalama uyum %{stats.avgScore}</p>
          <BarChart labels={monthly.map((m) => m.label)} series={[{ name: 'Eşleşme', color: '#2dd4bf', values: monthly.map((m) => m.n) }]} />
        </div>
        <div className="glass rounded-3xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-white">
            <Target className="h-4 w-4 text-electric-300" /> İş sonuçları
          </h2>
          <p className="mb-5 text-sm text-slate-400">Bildirdiğiniz eşleşme sonuçları</p>
          <Donut items={outcomeMix} />
        </div>
      </div>

      <div className="glass rounded-3xl p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-white">Son görüşmeler</h2>
          <Link to="/app/messages" className="text-sm text-electric-300 hover:underline">
            Tümü
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-white/[0.05]">
          {recent.map((m) => (
            <li key={m.id}>
              <Link to={`/app/messages/${m.id}`} className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-3 transition hover:bg-white/[0.03]">
                <Logo company={m.company} size={42} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-white">{m.company?.name}</span>
                    <span className="shrink-0 text-xs text-slate-500">{timeAgo(+new Date(m.lastMessageAt!))}</span>
                  </div>
                  <p className="truncate text-sm text-slate-400">%{m.matchPercent} uyum · {m.reasons[0]}</p>
                </div>
                {m.unreadCount > 0 && <span className="h-2.5 w-2.5 rounded-full bg-electric-400 shadow-[0_0_10px_#4d94ff]" />}
              </Link>
            </li>
          ))}
          {matches && recent.length === 0 && <li className="py-8 text-center text-sm text-slate-500">Henüz görüşme yok.</li>}
        </ul>
      </div>
    </div>
  );
}

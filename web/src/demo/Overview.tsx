import { motion } from 'framer-motion';
import { ArrowRight, Eye, Heart, HeartHandshake, MessagesSquare, SlidersHorizontal, Sparkles, ThumbsUp, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/store/AppStore';
import { compatibility } from '@/lib/score';
import { cn, timeAgo } from '@/lib/utils';
import { PageHeader } from '@/components/layout/AppShell';
import { ButtonLink, CompanyLogo, VerifiedBadge } from '@/components/ui';
import { AreaChart, BarChart, Donut, Sparkline } from '@/components/dashboard/Charts';
import { ScoreRing } from '@/components/discover/ScoreRing';

/** Donut ve vurgu renkleri: turuncu, koyu slate, mavi, açık slate */
const COLORS = ['#FF5E00', '#0F172A', '#2563EB', '#94A3B8', '#CBD5E1'];

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn('rounded-2xl border border-slate-200 bg-white p-5 shadow-glass sm:p-6', className)}>{children}</section>;
}

export default function Overview() {
  const { state, stats, deck, companyById } = useStore();

  const days = useMemo(
    () =>
      state.profileViews.map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (state.profileViews.length - 1 - i));
        return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
      }),
    [state.profileViews],
  );

  const recommended = useMemo(
    () =>
      deck
        .map((c) => ({ c, ...compatibility(state.me, c) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 4),
    [deck, state.me],
  );

  const sectorMix = useMemo(() => {
    const counts = new Map<string, number>();
    Object.entries(state.swipes)
      .filter(([, d]) => d !== 'left')
      .forEach(([id]) => {
        const c = companyById(id);
        if (c) counts.set(c.sector, (counts.get(c.sector) ?? 0) + 1);
      });
    const arr = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const items = arr.slice(0, 4).map(([label, value], i) => ({ label, value, color: COLORS[i]! }));
    const rest = arr.slice(4).reduce((a, [, v]) => a + v, 0);
    if (rest) items.push({ label: 'Diğer', value: rest, color: COLORS[4]! });
    return items.length ? items : [{ label: 'Henüz beğeni yok', value: 1, color: '#E2E8F0' }];
  }, [state.swipes, companyById]);

  const conversion = Math.round((stats.matches / Math.max(stats.liked, 1)) * 100);
  const kpis = [
    { label: 'Profil Görüntülenmesi', value: stats.totalViews, badge: '+%24', badgeTone: 'up', sub: 'son 14 gün', icon: Eye, spark: state.profileViews },
    { label: 'Beğendiğim Firmalar', value: stats.liked, sub: `${stats.passed} geçildi`, icon: ThumbsUp, spark: [2, 3, 3, 5, 4, 6, stats.liked] },
    { label: 'Beni Beğenen Firmalar', value: stats.likedMe, badge: '+3 bu hafta', badgeTone: 'orange', icon: Heart, spark: [3, 4, 4, 6, 7, 8, stats.likedMe] },
    { label: 'Gerçekleşen Eşleşmeler', value: stats.matches, badge: `%${conversion} dönüşüm`, badgeTone: 'orange', icon: HeartHandshake, spark: [0, 1, 1, 1, 2, 2, stats.matches] },
  ] as const;

  const conversations = state.matches
    .map((m) => {
      const msgs = (state.messages[m.id] ?? []).filter((x) => x.from !== 'system');
      const last = msgs.at(-1);
      const meeting = msgs.some((x) => x.meeting || /toplantı/i.test(x.text));
      return { m, c: companyById(m.companyId), last, status: !last ? 'Yeni eşleşme' : last.from === 'them' ? 'Yanıt bekleniyor' : meeting ? 'Toplantı planlanıyor' : 'Görüşme sürüyor' };
    })
    .filter((x) => x.c)
    .sort((a, b) => (b.last?.createdAt ?? b.m.createdAt) - (a.last?.createdAt ?? a.m.createdAt))
    .slice(0, 4);

  const activeMatches = state.matches.filter((m) => (state.messages[m.id] ?? []).some((x) => x.from !== 'system')).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title={`Hoş geldiniz, ${state.me.name}`}
        description="Ekosistemdeki görünürlüğünüz ve iş birliği fırsatlarınızın özeti."
        actions={
          <>
            <ButtonLink to="/demo/discover?filters=1" variant="secondary">
              <SlidersHorizontal className="h-4 w-4" /> Filtrele
            </ButtonLink>
            <ButtonLink to="/demo/discover">
              <Sparkles className="h-4 w-4" /> Keşfetmeye başla
            </ButtonLink>
          </>
        }
      />

      {!state.onboarded && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 rounded-2xl border border-primary-200 bg-primary-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-500 text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <div className="font-bold text-slate-900">Demo profiliyle geziniyorsunuz</div>
              <p className="mt-0.5 text-sm text-slate-600">Kendi firmanızın profilini oluşturun; uyum skorları buna göre yeniden hesaplanır.</p>
            </div>
          </div>
          <ButtonLink to="/demo/kayit" size="sm" className="shrink-0">
            Profilimi oluştur <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </motion.div>
      )}

      {/* Metrik kartları */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="h-full !p-4 sm:!p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-700">
                  <k.icon className="h-[18px] w-[18px]" />
                </span>
                {'badge' in k && (
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold', k.badgeTone === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-primary-50 text-primary-600')}>
                    {k.badgeTone === 'up' && <TrendingUp className="h-3 w-3" />} {k.badge}
                  </span>
                )}
              </div>
              <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-[13px] sm:normal-case sm:tracking-normal">{k.label}</div>
              <div className="mt-1 flex items-end justify-between gap-2">
                <span className="font-display text-3xl font-black tracking-tight text-slate-900">{k.value}</span>
                <span className="hidden sm:block">
                  <Sparkline values={[...k.spark]} color="#FF5E00" />
                </span>
              </div>
              {'sub' in k && <div className="mt-1 text-xs text-slate-500">{k.sub}</div>}
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">Profil Görüntülenmeleri</h2>
              <p className="text-sm text-slate-500">Son 14 Gün</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
              <TrendingUp className="h-3.5 w-3.5" /> %24 artış
            </span>
          </div>
          <div className="mt-4">
            <AreaChart data={state.profileViews} labels={days} initialHover={state.profileViews.length - 1} />
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-lg font-bold text-slate-900">İlgi Alanı Dağılımı</h2>
          <p className="mb-6 text-sm text-slate-500">Beğendiğiniz firmaların sektörleri</p>
          <Donut items={sectorMix} />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <h2 className="font-display text-lg font-bold text-slate-900">Haftalık Etkileşim</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-500">Gelen Beğeniler</div>
              <div className="mt-1 font-display text-2xl font-black text-slate-900">{stats.likedMe}</div>
            </div>
            <div className="rounded-xl bg-primary-50 p-4">
              <div className="text-xs font-semibold text-primary-700">Yeni Eşleşmeler</div>
              <div className="mt-1 font-display text-2xl font-black text-slate-900">
                {stats.matches} <span className="text-sm font-semibold text-primary-600">{activeMatches} Aktif</span>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <BarChart
              labels={['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']}
              series={[
                { name: 'Beğeni', color: '#FF5E00', values: [6, 9, 7, 12, 10, 4, 3] },
                { name: 'Eşleşme', color: '#0F172A', values: [1, 3, 2, 4, 3, 1, 1] },
              ]}
            />
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">Devam Eden Görüşmeler</h2>
              <p className="text-sm text-slate-500">{stats.conversations} aktif sohbet</p>
            </div>
            <Link to="/demo/messages" className="text-sm font-semibold text-primary-600 hover:underline">
              Tümü
            </Link>
          </div>
          <ul className="mt-4 space-y-2">
            {conversations.map(({ m, c, last, status }) => (
              <li key={m.id}>
                <Link to={`/demo/messages/${m.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-slate-300 hover:bg-slate-50">
                  <CompanyLogo company={c!} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-slate-900">{c!.name}</span>
                      {c!.verified && <VerifiedBadge />}
                      <span className="ml-auto shrink-0 text-xs text-slate-400">{last ? timeAgo(last.createdAt) : timeAgo(m.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {last ? (
                        <>
                          {last.from === 'me' && <span className="text-slate-400">Siz: </span>}
                          {last.attachment ? `📎 ${last.attachment.name}` : last.text}
                        </>
                      ) : (
                        'İlk mesajı gönderin'
                      )}
                    </p>
                  </div>
                  <span className={cn('hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold sm:inline-block', status === 'Yanıt bekleniyor' ? 'bg-primary-50 text-primary-600' : status === 'Toplantı planlanıyor' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600')}>{status}</span>
                  {(state.unread[m.id] ?? 0) > 0 && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary-500" />}
                </Link>
              </li>
            ))}
            {conversations.length === 0 && (
              <li className="py-8 text-center text-sm text-slate-500">
                <MessagesSquare className="mx-auto mb-2 h-6 w-6" /> Henüz görüşme yok.
              </li>
            )}
          </ul>
        </Card>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-slate-900">Önerilen Firmalar</h2>
          <Link to="/demo/discover" className="text-sm font-semibold text-primary-600 hover:underline">
            Keşfet’e git
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {recommended.map(({ c, score, reasons }, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
              <Link to="/demo/discover" className="block h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-glass transition hover:-translate-y-0.5 hover:shadow-card">
                <div className="flex items-start justify-between">
                  <CompanyLogo company={c} size={46} />
                  <ScoreRing value={score} size={44} stroke={4} />
                </div>
                <div className="mt-4 flex items-center gap-1.5 font-bold text-slate-900">
                  {c.name} {c.verified && <VerifiedBadge />}
                </div>
                <div className="text-xs text-slate-500">
                  {c.sector} · {c.city}
                </div>
                <p className="mt-3 line-clamp-2 text-xs font-medium text-primary-600">{reasons[0]}</p>
              </Link>
            </motion.div>
          ))}
          {recommended.length === 0 && <p className="text-sm text-slate-500">Tüm önerileri değerlendirdiniz.</p>}
        </div>
      </div>
    </div>
  );
}

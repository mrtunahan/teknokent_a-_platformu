import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Eye, Heart, HeartHandshake, MessagesSquare, Sparkles, ThumbsUp } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/store/AppStore';
import { compatibility } from '@/lib/score';
import { timeAgo } from '@/lib/utils';
import { PageHeader } from '@/components/layout/AppShell';
import { ButtonLink, Chip, CompanyLogo, VerifiedBadge } from '@/components/ui';
import { AreaChart, BarChart, Donut, Sparkline } from '@/components/dashboard/Charts';
import { ScoreRing } from '@/components/discover/ScoreRing';

const COLORS = ['#4d94ff', '#8b5cf6', '#2dd4bf', '#f59e0b', '#ec4899'];

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
    const ids = Object.entries(state.swipes)
      .filter(([, d]) => d !== 'left')
      .map(([id]) => id);
    const counts = new Map<string, number>();
    ids.forEach((id) => {
      const c = companyById(id);
      if (c) counts.set(c.sector, (counts.get(c.sector) ?? 0) + 1);
    });
    const arr = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const items = arr.slice(0, 4).map(([label, value], i) => ({ label, value, color: COLORS[i]! }));
    const rest = arr.slice(4).reduce((a, [, v]) => a + v, 0);
    if (rest) items.push({ label: 'Diğer', value: rest, color: COLORS[4]! });
    return items.length ? items : [{ label: 'Henüz beğeni yok', value: 1, color: '#334155' }];
  }, [state.swipes, companyById]);

  const kpis = [
    { label: 'Profil görüntülenmesi', value: stats.totalViews, delta: '+24%', icon: Eye, color: '#4d94ff', spark: state.profileViews },
    { label: 'Beğendiğim firmalar', value: stats.liked, delta: `${stats.passed} geçildi`, icon: ThumbsUp, color: '#8b5cf6', spark: [2, 3, 3, 5, 4, 6, stats.liked] },
    { label: 'Beni beğenen firmalar', value: stats.likedMe, delta: '+3 bu hafta', icon: Heart, color: '#ec4899', spark: [3, 4, 4, 6, 7, 8, stats.likedMe] },
    { label: 'Gerçekleşen eşleşmeler', value: stats.matches, delta: `%${Math.round((stats.matches / Math.max(stats.liked, 1)) * 100)} dönüşüm`, icon: HeartHandshake, color: '#2dd4bf', spark: [0, 1, 1, 1, 2, 2, stats.matches] },
  ];

  const conversations = state.matches
    .map((m) => ({ m, c: companyById(m.companyId), last: (state.messages[m.id] ?? []).filter((x) => x.from !== 'system').at(-1) }))
    .filter((x) => x.c && x.last)
    .sort((a, b) => b.last!.createdAt - a.last!.createdAt)
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        title={`Hoş geldiniz, ${state.me.name}`}
        description="Ekosistemdeki görünürlüğünüz ve iş birliği fırsatlarınızın özeti."
        actions={
          <ButtonLink to="/demo/discover">
            <Sparkles className="h-4 w-4" /> Keşfetmeye başla
          </ButtonLink>
        }
      />

      {!state.onboarded && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl border border-electric-400/20 bg-gradient-to-r from-electric-500/15 via-violet-500/10 to-transparent p-5 sm:flex sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold text-white">Demo profiliyle geziniyorsunuz</div>
            <p className="mt-1 text-sm text-slate-300">Kendi firmanızın profilini oluşturun; uyum skorları buna göre yeniden hesaplanır.</p>
          </div>
          <ButtonLink to="/demo/kayit" variant="secondary" size="sm" className="mt-4 sm:mt-0">
            Profilimi oluştur <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </motion.div>
      )}

      {/* KPI kartları */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="glass group relative overflow-hidden rounded-3xl p-4 sm:p-5">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40" style={{ background: k.color }} />
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${k.color}1f`, color: k.color }}>
                <k.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="hidden sm:block">
                <Sparkline values={k.spark} color={k.color} />
              </span>
            </div>
            <div className="mt-4 font-display text-3xl font-bold tracking-tight text-white">{k.value}</div>
            <div className="mt-1 text-xs text-slate-400 sm:text-sm">{k.label}</div>
            <div className="mt-2 text-[11px] text-aqua-300">{k.delta}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="glass rounded-3xl p-5 sm:p-6 xl:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">Profil görüntülenmeleri</h2>
              <p className="text-sm text-slate-400">Son 14 gün</p>
            </div>
            <Chip tone="aqua">
              <ArrowUpRight className="h-3 w-3" /> %24 artış
            </Chip>
          </div>
          <div className="mt-4">
            <AreaChart data={state.profileViews} labels={days} />
          </div>
        </div>
        <div className="glass rounded-3xl p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-white">İlgi alanı dağılımı</h2>
          <p className="mb-5 text-sm text-slate-400">Beğendiğiniz firmaların sektörleri</p>
          <Donut items={sectorMix} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="glass rounded-3xl p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-white">Haftalık etkileşim</h2>
          <p className="mb-6 text-sm text-slate-400">Beğeniler ve eşleşmeler</p>
          <BarChart
            labels={['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']}
            series={[
              { name: 'Beğeni', color: '#4d94ff', values: [6, 9, 7, 12, 10, 4, 3] },
              { name: 'Eşleşme', color: '#2dd4bf', values: [1, 3, 2, 4, 3, 1, 1] },
            ]}
          />
        </div>

        <div className="glass rounded-3xl p-5 sm:p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">Devam eden görüşmeler</h2>
              <p className="text-sm text-slate-400">{stats.conversations} aktif sohbet</p>
            </div>
            <Link to="/demo/messages" className="text-sm text-electric-300 hover:underline">
              Tümü
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-white/[0.05]">
            {conversations.map(({ m, c, last }) => (
              <li key={m.id}>
                <Link to={`/demo/messages/${m.id}`} className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-3 transition hover:bg-white/[0.03]">
                  <CompanyLogo company={c!} size={42} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-white">{c!.name}</span>
                      <span className="shrink-0 text-xs text-slate-500">{timeAgo(last!.createdAt)}</span>
                    </div>
                    <p className="truncate text-sm text-slate-400">
                      {last!.from === 'me' && <span className="text-slate-500">Siz: </span>}
                      {last!.attachment ? `📎 ${last!.attachment.name}` : last!.text}
                    </p>
                  </div>
                  {(state.unread[m.id] ?? 0) > 0 && <span className="h-2.5 w-2.5 rounded-full bg-electric-400 shadow-[0_0_10px_#4d94ff]" />}
                </Link>
              </li>
            ))}
            {conversations.length === 0 && (
              <li className="py-8 text-center text-sm text-slate-500">
                <MessagesSquare className="mx-auto mb-2 h-6 w-6" /> Henüz görüşme yok.
              </li>
            )}
          </ul>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-white">Önerilen firmalar</h2>
          <Link to="/demo/discover" className="text-sm text-electric-300 hover:underline">
            Keşfet’e git
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {recommended.map(({ c, score, reasons }, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}>
              <Link to="/demo/discover" className="glass block h-full rounded-3xl p-5 transition hover:-translate-y-1 hover:border-white/15">
                <div className="flex items-start justify-between">
                  <CompanyLogo company={c} size={46} />
                  <ScoreRing value={score} size={44} stroke={4} />
                </div>
                <div className="mt-4 flex items-center gap-1.5 font-semibold text-white">
                  {c.name} {c.verified && <VerifiedBadge />}
                </div>
                <div className="text-xs text-slate-500">
                  {c.sector} · {c.city}
                </div>
                <p className="mt-3 line-clamp-2 text-xs text-aqua-300">{reasons[0]}</p>
              </Link>
            </motion.div>
          ))}
          {recommended.length === 0 && <p className="text-sm text-slate-500">Tüm önerileri değerlendirdiniz.</p>}
        </div>
      </div>
    </div>
  );
}

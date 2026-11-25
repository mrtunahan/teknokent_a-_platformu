/**
 * Teknokent firması rolü (TeknoOrtak firma ağı + sanayi davetleri).
 * SÖZLEŞME:
 *  - TechFirmHome(): rota "" (tfirma genel bakış)
 */
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Clock, Compass, FolderKanban, HandHeart, HeartHandshake, Inbox, Lock, MessagesSquare, Sparkles, XCircle } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, ButtonLink, CompanyLogo, EmptyState } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { cn, timeAgo } from '@/lib/utils';
import { useStore } from '@/store/AppStore';
import { PERSONAS, STAGES, cityOfFirm, firmOf, orgOf, type Invite, type Need } from '../data';
import { candidatesFor, projectInScope, useKopru } from '../store';
import { Avatar, Card, NeedRow, ScoreBar, Stat } from '../ui';

const ME = PERSONAS.tfirma.firmId;
const OPEN = new Set<Need['status']>(['yeni', 'inceleme', 'eslestirme']);

const INVITE_TONE: Record<Invite['status'], { text: string; cls: string; Icon: typeof Clock }> = {
  bekliyor: { text: 'Yanıtınız bekleniyor', cls: 'bg-amber-50 text-amber-700 ring-amber-200', Icon: Clock },
  kabul: { text: 'Kabul ettiniz', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', Icon: CheckCircle2 },
  ret: { text: 'Geri çevirdiniz', cls: 'bg-slate-100 text-slate-600 ring-slate-200', Icon: XCircle },
};

export function TechFirmHome() {
  const k = useKopru();
  const toast = useToast();
  const { state: net, stats, companyById, deck } = useStore();
  const firm = firmOf(ME);
  const org = orgOf(firm.orgId);
  const myCity = cityOfFirm(ME);

  const invited = useMemo(
    () =>
      k.state.needs
        .filter((n) => n.invites.some((i) => i.solverId === ME))
        .sort((a, b) => {
          const sa = a.invites.find((i) => i.solverId === ME)!;
          const sb = b.invites.find((i) => i.solverId === ME)!;
          return Number(sb.status === 'bekliyor') - Number(sa.status === 'bekliyor') || sb.at - sa.at;
        }),
    [k.state.needs],
  );
  const pending = invited.filter((n) => n.invites.find((i) => i.solverId === ME)!.status === 'bekliyor');

  const fits = useMemo(
    () =>
      k.state.needs
        .filter((n) => OPEN.has(n.status) && !n.invites.some((i) => i.solverId === ME))
        .filter((n) => n.route === 'ag' || cityOfFirm(n.firmId) === myCity)
        .map((n) => ({ n, c: candidatesFor(n, k.state.academics, cityOfFirm(n.firmId)).find((c) => c.solver.data.id === ME) }))
        .filter((x): x is { n: Need; c: NonNullable<typeof x.c> } => !!x.c && x.c.score >= 25)
        .sort((a, b) => b.c.score - a.c.score),
    [k.state.needs, k.state.academics, myCity],
  );

  const projects = k.state.projects.filter((p) => projectInScope(k.state, 'tfirma', p));
  const active = projects.filter((p) => p.stage !== 'tamamlandi');
  const recentMatches = [...net.matches].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);

  const express = (n: Need) => {
    k.express(n.id, ME, 'Ürünümüzle bu ihtiyaca hızlı bir pilot çözüm sunabiliriz.');
    toast({ title: 'İlgi bildirildi', body: `${firmOf(n.firmId).name} ve TTO bilgilendirildi.`, tone: 'success' });
  };

  const shortcuts = [
    { to: '/demo/discover', icon: Compass, title: 'Firmaları keşfet', value: deck.length, unit: 'yeni firma önerisi', tone: 'from-primary-500 to-primary-600' },
    { to: '/demo/matches', icon: HeartHandshake, title: 'Eşleşmelerim', value: stats.matches, unit: 'karşılıklı eşleşme', tone: 'from-blue-500 to-blue-700' },
    { to: '/demo/messages', icon: MessagesSquare, title: 'Mesajlar', value: stats.unreadMessages, unit: `okunmamış · ${stats.conversations} sohbet`, tone: 'from-slate-700 to-slate-900' },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        title={`Hoş geldiniz, ${PERSONAS.tfirma.name.split(' ')[0]}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700">{firm.name}</span> · {org.name} · {firm.sector}
          </span>
        }
        actions={
          <>
            <ButtonLink to="/demo/discover" variant="secondary" size="sm">
              <Compass className="h-4 w-4" /> Firma ağını keşfet
            </ButtonLink>
            <ButtonLink to="/kopru/tfirma/ihtiyaclar" size="sm">
              <Inbox className="h-4 w-4" /> Sanayi davetleri
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Bekleyen davet" value={pending.length} hint="Sanayiden gelen" icon={<Inbox className="h-4 w-4 text-primary-500" />} />
        <Stat label="Aktif proje" value={active.length} hint={`${projects.length} proje toplam`} icon={<FolderKanban className="h-4 w-4 text-blue-600" />} />
        <Stat label="Ağ eşleşmesi" value={stats.matches} hint="TeknoOrtak firma ağı" icon={<HeartHandshake className="h-4 w-4 text-primary-500" />} />
        <Stat label="Okunmamış mesaj" value={stats.unreadMessages} hint={`${stats.conversations} aktif sohbet`} icon={<MessagesSquare className="h-4 w-4 text-blue-600" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card
            title="Sanayiden davetler"
            description="OSB firmaları ve TTO'ların sizi davet ettiği ihtiyaçlar"
            actions={
              <Link to="/kopru/tfirma/ihtiyaclar" className="shrink-0 text-sm font-semibold text-primary-600 hover:text-primary-700">
                Tümü
              </Link>
            }
          >
            {invited.length === 0 ? (
              <EmptyState icon={<Inbox className="h-6 w-6" />} title="Henüz davet yok" description="TTO, ürününüze uyan bir sanayi ihtiyacı geldiğinde sizi davet eder." />
            ) : (
              <div className="-mx-3 divide-y divide-slate-100">
                {invited.map((n) => {
                  const inv = n.invites.find((i) => i.solverId === ME)!;
                  const t = INVITE_TONE[inv.status];
                  return (
                    <NeedRow
                      key={n.id}
                      need={n}
                      to={`/kopru/tfirma/ihtiyaclar/${n.id}`}
                      extra={
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1', t.cls)}>
                            <t.Icon className="h-3.5 w-3.5" /> {t.text}
                          </span>
                          {n.confidential && !inv.ndaAt && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                              <Lock className="h-3 w-3" /> Gizlilik taahhüdü gerekli
                            </span>
                          )}
                          <span className="text-xs text-slate-400">Davet: {timeAgo(inv.at)}</span>
                        </div>
                      }
                    />
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Size uygun açık ihtiyaçlar" description={`Ürün ve uzmanlık alanlarınıza göre · ${myCity} ve tüm ağa açık ihtiyaçlar`}>
            {fits.length === 0 ? (
              <p className="text-sm text-slate-500">Şu an profilinize uyan açık ihtiyaç yok. Yeni ihtiyaçlar geldiğinde burada görünecek.</p>
            ) : (
              <div className="-mx-3 divide-y divide-slate-100">
                {fits.map(({ n, c }) => (
                  <div key={n.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <NeedRow
                        need={n}
                        to={`/kopru/tfirma/ihtiyaclar/${n.id}`}
                        extra={
                          <div className="mt-1.5 space-y-1">
                            <ScoreBar value={c.score} />
                            {c.reasons[0] && <div className="text-xs text-slate-500">{c.reasons[0]}</div>}
                          </div>
                        }
                      />
                    </div>
                    <div className="px-3 pb-3 sm:pb-0">
                      <Button size="sm" variant="secondary" onClick={() => express(n)} aria-label={`İlgi bildir: ${n.title}`}>
                        <HandHeart className="h-4 w-4" /> İlgi bildir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card title="Firma ağı (TeknoOrtak)" description="Teknokent firmalarıyla eşleşin, ortak proje kurun">
            <div className="grid gap-2">
              {shortcuts.map((s, i) => (
                <motion.div key={s.to} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link to={s.to} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-primary-300 hover:shadow-card">
                    <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white', s.tone)}>
                      <s.icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900">{s.title}</span>
                      <span className="block truncate text-xs text-slate-500">
                        <span className="font-bold tabular-nums text-slate-700">{s.value}</span> {s.unit}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-primary-600" />
                  </Link>
                </motion.div>
              ))}
            </div>
            {recentMatches.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Son eşleşmeler</div>
                <ul className="space-y-1">
                  {recentMatches.map((m) => {
                    const c = companyById(m.companyId);
                    if (!c) return null;
                    return (
                      <li key={m.id}>
                        <Link to={`/demo/messages/${m.id}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50">
                          <CompanyLogo company={c} size={32} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-900">{c.name}</span>
                            <span className="block truncate text-xs text-slate-500">{c.sector} · {timeAgo(m.createdAt)}</span>
                          </span>
                          <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-bold text-primary-700 ring-1 ring-primary-200">%{m.score}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Card>

          <Card
            title="Projelerim"
            description="Sanayi ihtiyaçlarından doğan projeler"
            actions={
              <Link to="/kopru/tfirma/projeler" className="shrink-0 text-sm font-semibold text-primary-600 hover:text-primary-700">
                Tümü
              </Link>
            }
          >
            {projects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                <div className="flex items-center gap-2 font-semibold text-slate-700">
                  <Sparkles className="h-4 w-4 text-primary-500" /> İlk projeniz bir davet uzağınızda
                </div>
                <p className="mt-1">Bir daveti kabul edin; firma sizi seçtiğinde proje burada görünür ve TTO süreci takip eder.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {projects.slice(0, 4).map((p) => {
                  const need = k.state.needs.find((n) => n.id === p.needId);
                  const owner = need ? firmOf(need.firmId) : null;
                  const idx = STAGES.findIndex((s) => s.key === p.stage);
                  const pct = Math.round(((idx + (p.stage === 'tamamlandi' ? 1 : 0.5)) / STAGES.length) * 100);
                  return (
                    <li key={p.id}>
                      <Link to={`/kopru/tfirma/projeler/${p.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-primary-300">
                        {owner && <Avatar name={owner.name} brand={owner.brand} size={36} square />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">{need?.title ?? 'Proje'}</span>
                          <span className="mt-1 flex items-center gap-2">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <span className="block h-full rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
                            </span>
                            <span className="shrink-0 text-xs font-semibold text-slate-600">{STAGES[idx]?.label}</span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

import { ArrowRight, Building2, CheckCircle2, Clock, Cpu, FlaskConical, GraduationCap, Inbox, Lock, Mail, MapPin, UserCheck, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/AppShell';
import { BarChart, Donut } from '@/components/dashboard/Charts';
import { Button, EmptyState } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { cn, timeAgo } from '@/lib/utils';
import { CATEGORY, CITIES, FIRMS, LABS, ORGS, PERSONAS, STATUS, cityOfFirm, firmOf, orgOf, ttoName, type Academic, type Need, type NeedCategory, type NeedStatus, type Org, type Role } from '../data';
import { candidatesFor, needInScope, useKopru } from '../store';
import { Avatar, Card, NeedRow, ScoreBar, Stat, StatusChip, Tag, fmtTL } from '../ui';
import { TagPicker } from './NeedForm';
import { useVisibleProjects } from './Projects';

const ME = PERSONAS.akademisyen.academicId!;

/* ------------------------------- Akademisyen ------------------------------- */

export function AcademicHome() {
  const k = useKopru();
  const me = k.state.academics.find((a) => a.id === ME)!;
  const invited = k.state.needs.filter((n) => n.invites.some((i) => i.solverId === ME));
  const pending = invited.filter((n) => n.invites.find((i) => i.solverId === ME)!.status === 'bekliyor');
  const fits = useMemo(
    () =>
      k.state.needs
        .filter((n) => (n.status === 'yeni' || n.status === 'inceleme' || n.status === 'eslestirme') && !n.invites.some((i) => i.solverId === ME))
        .filter((n) => n.route === 'ag' || n.ttoIds.includes(me.orgId))
        .map((n) => ({ n, c: candidatesFor(n, k.state.academics, cityOfFirm(n.firmId)).find((c) => c.solver.data.id === ME) }))
        .filter((x): x is { n: Need; c: NonNullable<typeof x.c> } => !!x.c && x.c.score >= 25)
        .sort((a, b) => b.c.score - a.c.score),
    [k.state],
  );
  const projects = useVisibleProjects('akademisyen');

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader title={`Hoş geldiniz, ${me.name}`} description={`${me.department} · ${orgOf(me.orgId).name}`} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Bekleyen davet" value={pending.length} />
        <Stat label="Size uygun ihtiyaç" value={fits.length} />
        <Stat label="Aktif proje" value={projects.filter((p) => p.stage !== 'tamamlandi').length} />
        <Stat label="Sanayi projesi (toplam)" value={me.industryProjects + projects.filter((p) => p.stage === 'tamamlandi').length} />
      </div>

      <Card title="Size gelen davetler" description="TTO veya firma tarafından davet edildiğiniz ihtiyaçlar">
        {invited.length === 0 ? (
          <EmptyState icon={<Inbox className="h-6 w-6" />} title="Henüz davet yok" description="TTO, uzmanlığınıza uyan bir ihtiyaç geldiğinde sizi davet eder." />
        ) : (
          <div className="-mx-3 divide-y divide-slate-100">
            {invited.map((n) => {
              const inv = n.invites.find((i) => i.solverId === ME)!;
              return (
                <NeedRow
                  key={n.id}
                  need={n}
                  to={`/kopru/akademisyen/ihtiyaclar/${n.id}`}
                  extra={
                    <div className={cn('mt-1 inline-flex items-center gap-1 text-xs font-semibold', inv.status === 'bekliyor' ? 'text-amber-700' : inv.status === 'kabul' ? 'text-emerald-700' : 'text-slate-500')}>
                      {inv.status === 'bekliyor' ? <Clock className="h-3.5 w-3.5" /> : inv.status === 'kabul' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      {inv.status === 'bekliyor' ? 'Yanıtınız bekleniyor' : inv.status === 'kabul' ? 'Kabul ettiniz' : 'Geri çevirdiniz'}
                      {n.confidential && !inv.ndaAt && <span className="ml-2 inline-flex items-center gap-1 text-slate-500"><Lock className="h-3 w-3" /> Gizli</span>}
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Uzmanlığınıza uygun açık ihtiyaçlar" description="Davet beklemeden ilgi bildirebilirsiniz">
        {fits.length === 0 ? (
          <p className="text-sm text-slate-500">Şu an profilinize uyan açık ihtiyaç yok. Uzmanlık profilinizi güncel tutun.</p>
        ) : (
          <div className="-mx-3 divide-y divide-slate-100">
            {fits.map(({ n, c }) => (
              <NeedRow key={n.id} need={n} to={`/kopru/akademisyen/ihtiyaclar/${n.id}`} extra={<div className="mt-1.5"><ScoreBar value={c.score} /></div>} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export function AcademicProfile() {
  const k = useKopru();
  const toast = useToast();
  const me = k.state.academics.find((a) => a.id === ME)!;
  const [f, setF] = useState({ summary: me.summary, tags: me.tags, availability: me.availability });
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader title="Uzmanlık profilim" description="Eşleştirme bu bilgilere göre yapılır. TTO onaylı profiller önerilir." />
      <div className="glass flex items-center gap-4 rounded-2xl p-5">
        <Avatar name={me.name} brand={me.brand} size={56} />
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg font-bold text-slate-900">{me.name}</div>
          <div className="text-sm text-slate-500">{me.department}</div>
          <div className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
            <Mail className="h-3.5 w-3.5" /> {me.email} · <UserCheck className="h-3.5 w-3.5 text-emerald-600" /> TTO onaylı
          </div>
        </div>
        <div className="hidden gap-6 text-center sm:flex">
          <div>
            <div className="font-display text-xl font-extrabold text-slate-900">{me.publications}</div>
            <div className="text-xs text-slate-500">yayın</div>
          </div>
          <div>
            <div className="font-display text-xl font-extrabold text-slate-900">{me.industryProjects}</div>
            <div className="text-xs text-slate-500">sanayi projesi</div>
          </div>
        </div>
      </div>
      <form
        className="glass space-y-5 rounded-2xl p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          k.updateAcademic(ME, f);
          toast({ title: 'Profil güncellendi', body: 'Eşleştirme önerileri yeni bilgilere göre hesaplanır.' });
        }}
      >
        <div>
          <label className="label" htmlFor="ap-sum">Uzmanlık özeti</label>
          <textarea id="ap-sum" className="input" rows={3} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} />
        </div>
        <div>
          <span className="label">Uzmanlık alanları</span>
          <TagPicker value={f.tags} onChange={(tags) => setF({ ...f, tags })} />
        </div>
        <div>
          <label className="label" htmlFor="ap-av">Sanayi projelerine uygunluk</label>
          <select id="ap-av" className="input !w-auto" value={f.availability} onChange={(e) => setF({ ...f, availability: e.target.value as Academic['availability'] })}>
            <option value="uygun">Uygunum</option>
            <option value="sinirli">Sınırlı zamanım var</option>
            <option value="dolu">Şu an yeni proje alamıyorum</option>
          </select>
        </div>
        <div className="flex justify-end">
          <Button type="submit">Kaydet</Button>
        </div>
      </form>
      <Card title="Laboratuvarlarım">
        {me.labIds.map((id) => {
          const l = LABS.find((x) => x.id === id)!;
          return (
            <div key={id} className="flex items-start gap-3">
              <FlaskConical className="mt-0.5 h-5 w-5 text-blue-600" />
              <div>
                <div className="font-semibold text-slate-900">{l.name}</div>
                <div className="mt-1 flex flex-wrap gap-1">{l.equipment.map((e) => <Tag key={e}>{e}</Tag>)}</div>
                <div className="mt-1 text-xs text-slate-500">{l.service}</div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

/* ----------------------------------- TTO ----------------------------------- */

const COLS: NeedStatus[] = ['yeni', 'inceleme', 'eslestirme', 'proje', 'kapandi'];

export function TtoPool() {
  const k = useKopru();
  const my = k.state.orgSel.tto;
  const needs = k.state.needs.filter((n) => needInScope(k.state, 'tto', n));
  const waiting = needs.reduce((a, n) => a + n.invites.filter((i) => i.status === 'bekliyor').length, 0);
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader title={`İhtiyaç havuzu · ${ttoName(my)}`} description={`${orgOf(my).city} içinden ve tüm ağa açık gönderilen ihtiyaçlar; diğer TTO’ların akademisyenlerinizi davet ettiği süreçler de burada.`} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Yeni (incelenmemiş)" value={needs.filter((n) => n.status === 'yeni').length} />
        <Stat label="Yanıt bekleyen davet" value={waiting} />
        <Stat label="Aktif proje" value={k.state.projects.filter((p) => p.stage !== 'tamamlandi' && needs.some((n) => n.id === p.needId)).length} />
        <Stat label="Onay bekleyen akademisyen" value={k.state.academics.filter((a) => !a.approved && a.orgId === my).length} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {COLS.map((c) => {
          const items = needs.filter((n) => n.status === c);
          return (
            <section key={c} className="min-w-0 rounded-2xl bg-slate-100/70 p-3" aria-label={STATUS[c]}>
              <div className="mb-3 flex items-center justify-between px-1">
                <StatusChip status={c} />
                <span className="text-xs font-semibold text-slate-500">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((n) => {
                  const firm = firmOf(n.firmId);
                  const acc = n.invites.filter((i) => i.status === 'kabul').length;
                  return (
                    <Link key={n.id} to={`/kopru/tto/ihtiyaclar/${n.id}`} className="block rounded-xl border border-slate-200 bg-white p-3 shadow-glass transition hover:border-primary-300">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Avatar name={firm.name} brand={firm.brand} size={20} square />
                        <span className="truncate">{firm.name}</span>
                        {n.urgency === 'acil' && <span className="ml-auto rounded bg-rose-50 px-1 text-[10px] font-bold text-rose-600">ACİL</span>}
                      </div>
                      <div className="mt-1.5 flex items-start gap-1 text-sm font-semibold leading-snug text-slate-900">
                        {n.confidential && <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />}
                        {n.title}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-semibold">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{orgOf(firm.orgId).short}</span>
                        {n.route === 'ag' && <span className="rounded bg-violet-50 px-1.5 py-0.5 text-violet-700">Tüm ağ</span>}
                        {n.ttoOrg && n.ttoOrg !== my && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">{ttoName(n.ttoOrg)} yürütüyor</span>}
                        {!n.ttoIds.includes(my) && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">Akademisyeniniz davetli</span>}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{CATEGORY[n.category]}</span>
                        <span>{n.invites.length ? `${acc}/${n.invites.length} kabul` : timeAgo(n.createdAt)}</span>
                      </div>
                    </Link>
                  );
                })}
                {items.length === 0 && <p className="px-1 py-4 text-center text-xs text-slate-400">Boş</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function Approvals() {
  const k = useKopru();
  const toast = useToast();
  const my = k.state.orgSel.tto;
  const pending = k.state.academics.filter((a) => !a.approved && a.orgId === my);
  const domain = k.state.academics.find((a) => a.orgId === my)?.email.split('@')[1] ?? 'edu.tr';
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader title="Akademisyen onayları" description={`${orgOf(my).name} kurumsal e-postasıyla (@${domain}) kayıt olan akademisyenler ${ttoName(my)} onayıyla rehbere ve eşleştirmeye katılır.`} />
      {pending.length === 0 ? (
        <div className="glass rounded-2xl p-8">
          <EmptyState icon={<UserCheck className="h-6 w-6" />} title="Onay bekleyen kayıt yok" description="Yeni kayıtlar burada listelenir." />
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((a) => (
            <div key={a.id} className="glass flex flex-wrap items-start gap-4 rounded-2xl p-5">
              <Avatar name={a.name} brand={a.brand} size={44} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900">{a.name}</div>
                <div className="text-xs text-slate-500">
                  {a.department} · {a.email}
                </div>
                <p className="mt-2 text-sm text-slate-600">{a.summary}</p>
                <div className="mt-2 flex flex-wrap gap-1">{a.tags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => { k.approveAcademic(a.id, false); toast({ title: 'Kayıt reddedildi', tone: 'info' }); }}>
                  Reddet
                </Button>
                <Button size="sm" onClick={() => { k.approveAcademic(a.id, true); toast({ title: `${a.name} onaylandı`, body: 'Artık rehberde ve eşleştirme önerilerinde görünür.' }); }}>
                  Onayla
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Kurum panelleri ---------------------------- */

const STATUS_COLOR: Record<NeedStatus, string> = { yeni: '#F59E0B', inceleme: '#2563EB', eslestirme: '#FF5E00', proje: '#10B981', kapandi: '#94A3B8' };

export function Dashboard() {
  const { role } = useParams() as { role: Role };
  const k = useKopru();
  const sel = k.state.orgSel;
  const scope = k.state.needs.filter((n) => needInScope(k.state, role, n));
  const projects = useVisibleProjects(role);
  const solved = scope.filter((n) => n.status === 'proje' || n.status === 'kapandi').length;
  const rate = scope.length ? Math.round((solved / scope.length) * 100) : 0;
  const volume = projects.reduce((a, p) => a + (p.value ?? 0), 0);
  const firstAccept = scope
    .map((n) => {
      const t = n.invites.filter((i) => i.status === 'kabul').map((i) => i.at);
      return t.length ? (Math.min(...t) - n.createdAt) / 86_400_000 : null;
    })
    .filter((x): x is number => x != null);
  const avgDays = firstAccept.length ? (firstAccept.reduce((a, b) => a + b, 0) / firstAccept.length).toFixed(1) : '—';
  const accepted = scope.flatMap((n) => n.invites.filter((i) => i.status === 'kabul'));
  const cats = Object.keys(CATEGORY) as NeedCategory[];
  const deptCount = new Map<string, number>();
  accepted.filter((i) => i.kind === 'academic').forEach((i) => {
    const a = k.state.academics.find((x) => x.id === i.solverId);
    if (role === 'tto' && a?.orgId !== sel.tto) return;
    const d = a && `${orgOf(a.orgId).short} · ${a.department}`;
    if (d) deptCount.set(d, (deptCount.get(d) ?? 0) + 1);
  });
  const tkFirms = new Map<string, number>();
  accepted.filter((i) => i.kind === 'firm' && (role !== 'teknokent' || firmOf(i.solverId).orgId === sel.teknokent)).forEach((i) => tkFirms.set(i.solverId, (tkFirms.get(i.solverId) ?? 0) + 1));

  const title =
    role === 'osb' ? `${orgOf(sel.osb).short} · Sanayi–Akademi paneli` : role === 'teknokent' ? `${orgOf(sel.teknokent).short} · Sanayiye katkı paneli` : role === 'tto' ? `${ttoName(sel.tto)} · Etki raporu` : 'Ağ geneli etki raporu';
  const desc =
    role === 'osb'
      ? 'Bölge firmalarının üniversiteler ve teknokentlerle çözdüğü ihtiyaçlar (hangi ilden olursa olsun)'
      : role === 'teknokent'
        ? 'Teknokent firmalarının davet edildiği ve katkı verdiği sanayi ihtiyaçları'
        : role === 'tto'
          ? 'Size yönlendirilen ihtiyaçlar ve akademisyenlerinizin katıldığı süreçler'
          : `${CITIES.length} il · ${ORGS.length} kurum · ihtiyaçtan sözleşmeye dönüşüm`;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader title={title} description={desc} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="İhtiyaç" value={scope.length} />
        <Stat label="Çözüme bağlanan" value={`%${rate}`} hint={`${solved} ihtiyaç projede/tamamlandı`} />
        <Stat label="İlk kabul süresi" value={avgDays === '—' ? '—' : `${avgDays} gün`} hint="ortalama" />
        <Stat label="Proje" value={projects.length} hint={`${projects.filter((p) => p.stage === 'tamamlandi').length} tamamlandı`} />
        <Stat label="Proje hacmi" value={fmtTL(volume)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="İhtiyaç durumları">
          <Donut items={COLS.map((s) => ({ label: STATUS[s], value: scope.filter((n) => n.status === s).length, color: STATUS_COLOR[s] }))} />
        </Card>
        <Card title="İhtiyaç türleri">
          <BarChart labels={cats.map((c) => CATEGORY[c].split(' ')[0]!)} series={[{ name: 'İhtiyaç', color: '#FF5E00', values: cats.map((c) => scope.filter((n) => n.category === c).length) }]} />
        </Card>
        <Card title="Katkı veren birimler" description="Daveti kabul eden akademisyenlerin bölümleri">
          {deptCount.size === 0 ? (
            <p className="text-sm text-slate-500">Henüz veri yok.</p>
          ) : (
            <ul className="space-y-2">
              {[...deptCount.entries()].sort((a, b) => b[1] - a[1]).map(([d, c]) => (
                <li key={d} className="flex items-center gap-3 text-sm">
                  <GraduationCap className="h-4 w-4 text-blue-600" />
                  <span className="flex-1 text-slate-700">{d}</span>
                  <span className="font-semibold text-slate-900">{c}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Teknokent firmalarının katkısı">
          {tkFirms.size === 0 ? (
            <p className="text-sm text-slate-500">Henüz bir teknokent firması davet kabul etmedi. TTO ihtiyaç sayfasından teknokent firmalarını da davet edebilir.</p>
          ) : (
            <ul className="space-y-2">
              {[...tkFirms.entries()].map(([id, c]) => {
                const f = firmOf(id);
                return (
                  <li key={id} className="flex items-center gap-3 text-sm">
                    <Avatar name={f.name} brand={f.brand} size={28} square />
                    <span className="flex-1 text-slate-700">{f.name}</span>
                    <span className="font-semibold text-slate-900">{c} ihtiyaç</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
      <Card title="Son ihtiyaçlar">
        <div className="-mx-3 divide-y divide-slate-100">
          {scope.slice(0, 6).map((n) => <NeedRow key={n.id} need={n} to={`/kopru/${role}/ihtiyaclar/${n.id}`} />)}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------ Platform: kurum ağı ------------------------ */

const TYPE_LABEL = { universite: 'Üniversite · TTO', teknokent: 'Teknokent', osb: 'OSB' } as const;

export function Network() {
  const k = useKopru();
  const { needs, projects, academics } = k.state;
  const cityOf = (firmId: string) => cityOfFirm(firmId);
  const solverCity = (id: string) => {
    const a = academics.find((x) => x.id === id);
    return a ? orgOf(a.orgId).city : orgOf(firmOf(id).orgId).city;
  };
  const cross = projects.filter((p) => {
    const n = needs.find((x) => x.id === p.needId);
    return n && cityOf(n.firmId) !== solverCity(p.solverId);
  });
  const crossInvites = needs.flatMap((n) => n.invites.filter((i) => i.status === 'kabul' && solverCity(i.solverId) !== cityOf(n.firmId)).map((i) => ({ n, i })));

  const metrics = (o: Org): [string, number][] => {
    if (o.type === 'osb') {
      const ns = needs.filter((n) => firmOf(n.firmId).orgId === o.id);
      return [['firma', FIRMS.filter((f) => f.orgId === o.id).length], ['ihtiyaç', ns.length], ['çözüme bağlanan', ns.filter((n) => n.status === 'proje' || n.status === 'kapandi').length]];
    }
    if (o.type === 'teknokent') {
      const fs = FIRMS.filter((f) => f.orgId === o.id).map((f) => f.id);
      return [['firma', fs.length], ['kabul edilen davet', needs.reduce((a, n) => a + n.invites.filter((i) => fs.includes(i.solverId) && i.status === 'kabul').length, 0)]];
    }
    const ac = academics.filter((a) => a.orgId === o.id);
    return [
      ['akademisyen', ac.filter((a) => a.approved).length],
      ['laboratuvar', LABS.filter((l) => l.universityId === o.id).length],
      ['yönlendirilen ihtiyaç', needs.filter((n) => n.ttoIds.includes(o.id)).length],
      ['proje', projects.filter((p) => ac.some((a) => a.id === p.solverId)).length],
    ];
  };
  const icon = (o: Org) => (o.type === 'osb' ? <Building2 className="h-4 w-4" /> : o.type === 'teknokent' ? <Cpu className="h-4 w-4" /> : <FlaskConical className="h-4 w-4" />);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader title="Kurum ağı" description="Platforma bağlı OSB’ler, teknokentler ve üniversite TTO’ları. Yeni kurum eklemek veri girişiyle yapılır; her kurum kendi panelini görür." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="İl" value={CITIES.length} />
        <Stat label="Kurum" value={ORGS.length} hint={`${ORGS.filter((o) => o.type === 'osb').length} OSB · ${ORGS.filter((o) => o.type === 'teknokent').length} teknokent · ${ORGS.filter((o) => o.type === 'universite').length} TTO`} />
        <Stat label="İller arası iş birliği" value={crossInvites.length} hint="başka ilden kabul edilen davet" />
        <Stat label="İller arası proje" value={cross.length} />
      </div>

      {CITIES.map((c) => (
        <Card key={c} title={<span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-primary-600" /> {c}</span>}>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {ORGS.filter((o) => o.city === c).map((o) => (
              <div key={o.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {icon(o)} {TYPE_LABEL[o.type]}
                </div>
                <div className="mt-1 font-semibold text-slate-900">{o.tto ?? o.short}</div>
                {o.universityId && <div className="text-xs text-slate-500">{orgOf(o.universityId).name}</div>}
                <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {metrics(o).map(([l, v]) => (
                    <div key={l} className="flex gap-1">
                      <dt className="text-slate-500">{l}</dt>
                      <dd className="font-semibold text-slate-900">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Card title="İller arası eşleşmeler" description="Bir ildeki firmanın ihtiyacına başka ilden kabul veren uzman veya firma">
        {crossInvites.length === 0 ? (
          <p className="text-sm text-slate-500">Henüz yok. Firmalar ihtiyaçlarını “Tüm ağ”a açtığında burada görünür.</p>
        ) : (
          <ul className="space-y-2">
            {crossInvites.map(({ n, i }) => {
              const s = k.findSolver(i.solverId)!;
              return (
                <li key={n.id + i.solverId}>
                  <Link to={`/kopru/platform/ihtiyaclar/${n.id}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm hover:border-primary-300">
                    <span className="font-semibold text-slate-900">{firmOf(n.firmId).name}</span>
                    <span className="text-xs text-slate-500">{orgOf(firmOf(n.firmId).orgId).short}</span>
                    <ArrowRight className="h-4 w-4 text-primary-500" />
                    <span className="font-semibold text-slate-900">{s.data.name}</span>
                    <span className="text-xs text-slate-500">{orgOf(s.data.orgId).short} · {orgOf(s.data.orgId).city}</span>
                    <span className="ml-auto truncate text-xs text-slate-500">{n.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

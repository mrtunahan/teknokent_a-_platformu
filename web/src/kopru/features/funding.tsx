/**
 * Destek programları (TÜBİTAK 1505/1501, KOSGEB…): çağrı dönemleri, son tarihler ve başvuru takibi.
 * SÖZLEŞME:
 *  - FundingPage(): rota "destek"
 *  - ProjectFunding({ projectId }): proje sayfasında başvuru kartı
 */
import { ArrowRight, CalendarClock, Check, FileText, HandCoins, Info, PlusCircle, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, Drawer, EmptyState, Modal } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { cn, timeAgo } from '@/lib/utils';
import { firmOf, orgOf, ttoName, type Role } from '../data';
import { useKopru } from '../store';
import { Avatar, Card, Stat, Timeline, fmtTL } from '../ui';
import {
  APP_FLOW,
  APP_STATUS,
  NEXT,
  PROGRAMS,
  academicOfApp,
  appInScope,
  applicantOf,
  canCreateFor,
  canEditChecklist,
  canMove,
  daysLeft,
  fmtDay,
  nextDeadline,
  programFromFunding,
  programOf,
  progressOf,
  useFunding,
  type AppStatus,
  type FundingApp,
  type ProgramId,
} from './funding-data';

function useRole(): Role {
  const k = useKopru();
  const { role } = useParams() as { role?: Role };
  return role ?? k.role;
}

/* --------------------------------- Rozetler -------------------------------- */

export function Countdown({ deadline, className }: { deadline: number | null; className?: string }) {
  if (deadline == null) return <span className={cn('inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200', className)}>Sürekli açık</span>;
  const d = daysLeft(deadline);
  const tone = d <= 0 ? 'bg-slate-100 text-slate-500 ring-slate-200' : d <= 14 ? 'bg-rose-50 text-rose-700 ring-rose-200' : d <= 30 ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-slate-50 text-slate-600 ring-slate-200';
  const text = d < 0 ? 'Süre doldu' : d === 0 ? 'Bugün son gün' : `${d} gün kaldı`;
  return <span className={cn('inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ring-1', tone, className)} title={fmtDay(deadline)}>{text}</span>;
}

function StatusBadge({ status }: { status: AppStatus }) {
  return <span className={cn('inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1', APP_STATUS[status].tone)}>{APP_STATUS[status].label}</span>;
}

/** Başvuru durumu boru hattı: Hazırlık → Başvuruldu → Ön değerlendirme → Panel → Sonuç */
function Pipeline({ status }: { status: AppStatus }) {
  const steps: { key: string; label: string }[] = [...APP_FLOW.map((s) => ({ key: s, label: APP_STATUS[s].label })), { key: 'sonuc', label: 'Sonuç' }];
  const idx = status === 'revizyon' ? 1 : (APP_FLOW as string[]).includes(status) ? APP_FLOW.indexOf(status) : 4;
  const final = status === 'kabul' || status === 'ret';
  return (
    <ol className="flex gap-1" aria-label={`Başvuru durumu: ${APP_STATUS[status].label}`}>
      {steps.map((s, i) => {
        const done = i < idx || (final && i === 4);
        const cur = i === idx && !final;
        const color = final && i === 4 ? (status === 'kabul' ? 'bg-emerald-500' : 'bg-rose-500') : done ? 'bg-emerald-500' : cur ? (status === 'revizyon' ? 'bg-orange-500' : 'bg-primary-500') : 'bg-slate-200';
        return (
          <li key={s.key} className="min-w-0 flex-1">
            <div className={cn('h-1.5 rounded-full', color)} />
            <div className={cn('mt-1 truncate text-[10px] font-semibold', cur ? 'text-primary-700' : done ? 'text-emerald-700' : 'text-slate-400')}>
              {i === 4 && final ? APP_STATUS[status].label : i === 1 && status === 'revizyon' ? 'Revizyon' : s.label}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full min-w-[60px] overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label="Kontrol listesi ilerlemesi">
        <div className={cn('h-full rounded-full', value === 100 ? 'bg-emerald-500' : 'bg-primary-500')} style={{ width: `${value}%` }} />
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-700">%{value}</span>
    </div>
  );
}

/* ---------------------------- Başvuru parçaları ---------------------------- */

function Checklist({ app }: { app: FundingApp }) {
  const k = useKopru();
  const role = useRole();
  const f = useFunding();
  const editable = canEditChecklist(k.state, role, app);
  return (
    <ul className="space-y-1.5">
      {app.checklist.map((c) => (
        <li key={c.id}>
          <label className={cn('flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm', editable ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default')}>
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-primary-500"
              checked={c.done}
              disabled={!editable}
              onChange={() => f.toggle(app.id, c.id)}
            />
            <span className={cn(c.done ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-900')}>{c.label}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

function Actions({ app, size = 'sm' }: { app: FundingApp; size?: 'sm' | 'md' }) {
  const k = useKopru();
  const role = useRole();
  const f = useFunding();
  const toast = useToast();
  const next = (NEXT[app.status] ?? []).filter((n) => canMove(k.state, role, app, n.to));
  if (!next.length) return null;
  const incomplete = progressOf(app) < 100;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {next.map((n) => {
          const blocked = n.to === 'basvuruldu' && app.status === 'hazirlik' && incomplete;
          return (
            <Button
              key={n.to}
              size={size}
              variant={n.tone ?? 'primary'}
              disabled={blocked}
              onClick={() => {
                f.move(app.id, n.to);
                toast({ title: `Başvuru durumu: ${APP_STATUS[n.to].label}`, body: 'Firma, çözüm sağlayıcı ve TTO bilgilendirildi.', tone: n.to === 'ret' ? 'warning' : 'success' });
              }}
            >
              {n.to === 'kabul' && <Check className="h-4 w-4" />}
              {n.label}
            </Button>
          );
        })}
      </div>
      {app.status === 'hazirlik' && incomplete && <p className="text-xs text-amber-700">Başvuruyu göndermek için kontrol listesindeki tüm belgeler tamamlanmalı.</p>}
    </div>
  );
}

function AppMeta({ app }: { app: FundingApp }) {
  const k = useKopru();
  const firm = firmOf(app.applicant);
  const acId = academicOfApp(k.state, app);
  const ac = acId ? k.state.academics.find((a) => a.id === acId) : undefined;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3">
        <Avatar name={firm.name} brand={firm.brand} size={32} square />
        <div className="min-w-0 text-sm">
          <div className="truncate font-semibold text-slate-900">{firm.name}</div>
          <div className="text-xs text-slate-500">Başvuran · {orgOf(firm.orgId).short}</div>
        </div>
      </div>
      <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3">
        {ac ? <Avatar name={ac.name} brand={ac.brand} size={32} /> : <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-400"><Users className="h-4 w-4" aria-hidden /></span>}
        <div className="min-w-0 text-sm">
          <div className="truncate font-semibold text-slate-900">{ac?.name ?? 'Akademik ortak yok'}</div>
          <div className="text-xs text-slate-500">{ac ? `${programOf(app.programId).id === '1505' ? 'Yürütücü' : 'Danışman'} · ${orgOf(ac.orgId).short}` : 'Firma tek başına başvuruyor'}</div>
        </div>
      </div>
    </div>
  );
}

function AppDrawer({ app, onClose }: { app: FundingApp | null; onClose: () => void }) {
  const role = useRole();
  const p = app ? programOf(app.programId) : null;
  return (
    <Drawer open={!!app} onClose={onClose} title="Başvuru ayrıntıları">
      {app && p && (
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: p.color }}>{p.short}</span>
              <StatusBadge status={app.status} />
            </div>
            <h3 className="mt-1 font-display text-lg font-bold text-slate-900">{app.title}</h3>
            <div className="mt-1 text-sm text-slate-500">Talep edilen bütçe: <strong className="text-slate-900">{fmtTL(app.budget)}</strong></div>
          </div>
          <Pipeline status={app.status} />
          <AppMeta app={app} />
          {(app.status === 'hazirlik' || app.status === 'revizyon') && (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm">
              <span className="text-slate-600">{app.deadline ? `Son tarih: ${fmtDay(app.deadline)}` : 'Program sürekli açık'}</span>
              <Countdown deadline={app.deadline} />
            </div>
          )}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-slate-900">Kontrol listesi</h4>
              <div className="w-32"><ProgressBar value={progressOf(app)} /></div>
            </div>
            <Checklist app={app} />
          </div>
          <Actions app={app} />
          {app.projectId && (
            <Link to={`/kopru/${role}/projeler/${app.projectId}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:underline">
              Bağlı projeyi aç <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-900">Geçmiş</h4>
            <Timeline events={app.events} />
          </div>
          <p className="text-xs text-slate-400">Program bilgileri ve tarihler örnektir; resmî çağrı duyurusu esas alınmalıdır.</p>
        </div>
      )}
    </Drawer>
  );
}

/* ------------------------------ Başvuru formu ------------------------------ */

function NewAppModal({ open, onClose, projectId, program }: { open: boolean; onClose: () => void; projectId?: string; program?: ProgramId }) {
  const k = useKopru();
  const role = useRole();
  const f = useFunding();
  const toast = useToast();
  const fixedProject = projectId ? k.state.projects.find((p) => p.id === projectId) : undefined;
  const fixedNeed = fixedProject ? k.state.needs.find((n) => n.id === fixedProject.needId) : undefined;
  const applicant = fixedNeed?.firmId ?? applicantOf(role);
  // Firmanın kendi projeleri (proje kartından açıldıysa sabit)
  const projects = fixedProject ? [fixedProject] : k.state.projects.filter((p) => k.state.needs.find((n) => n.id === p.needId)?.firmId === applicant && p.stage !== 'tamamlandi');
  const titleOf = (pid: string) => k.state.needs.find((n) => n.id === k.state.projects.find((p) => p.id === pid)?.needId)?.title ?? '';
  const [prog, setProg] = useState<ProgramId>(program ?? programFromFunding(fixedProject?.program ?? fixedNeed?.funding) ?? '1505');
  const [pid, setPid] = useState(projectId ?? '');
  const [title, setTitle] = useState(projectId ? titleOf(projectId) : '');
  const [budget, setBudget] = useState(fixedProject?.value ? String(fixedProject.value) : '');
  if (!applicant) return null;
  const p = programOf(prog);
  const proj = k.state.projects.find((x) => x.id === pid);
  const dl = nextDeadline(p);

  return (
    <Modal open={open} onClose={onClose} title="Destek başvurusu başlat">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const b = Number(budget);
          if (!title.trim() || !(b > 0)) return;
          f.create({ programId: prog, projectId: pid || undefined, applicant, title: title.trim(), budget: Math.round(b) });
          onClose();
          toast({ title: `${p.short} başvurusu oluşturuldu`, body: 'Kontrol listesini tamamlayarak başvuruyu gönderime hazırlayın; TTO bilgilendirildi.' });
        }}
      >
        {fixedNeed && <p className="text-sm text-slate-500">Başvuran: <strong className="text-slate-900">{firmOf(applicant).name}</strong></p>}
        <div>
          <label className="label" htmlFor="fa-prog">Destek programı</label>
          <select id="fa-prog" className="input" value={prog} onChange={(e) => setProg(e.target.value as ProgramId)}>
            {PROGRAMS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{p.budget}</span>
            <Countdown deadline={dl} />
            {dl && <span>Son tarih (örnek): {fmtDay(dl)}</span>}
          </div>
        </div>
        {!fixedProject && (
          <div>
            <label className="label" htmlFor="fa-proj">Bağlı proje (isteğe bağlı)</label>
            <select
              id="fa-proj"
              className="input"
              value={pid}
              onChange={(e) => {
                setPid(e.target.value);
                if (e.target.value && !title) setTitle(titleOf(e.target.value));
                const pv = k.state.projects.find((x) => x.id === e.target.value)?.value;
                if (pv && !budget) setBudget(String(pv));
              }}
            >
              <option value="">Projesiz başvuru</option>
              {projects.map((x) => <option key={x.id} value={x.id}>{titleOf(x.id)}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="label" htmlFor="fa-title">Başvuru başlığı</label>
          <input id="fa-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ör. Döküm parçalarında gözenek oluşumunun azaltılması" required />
        </div>
        <div>
          <label className="label" htmlFor="fa-budget">Talep edilen bütçe (₺)</label>
          <input id="fa-budget" type="number" min={1} inputMode="numeric" className="input" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="ör. 450000" required />
        </div>
        {p.needsAcademic && proj?.kind !== 'academic' && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {p.short} için bir üniversite yürütücüsü gerekir. Akademisyenle yürüyen bir projeyi bağlayın veya TTO’nun eşleştirmesini isteyin.
          </p>
        )}
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Hazırlanacak belgeler</div>
          <ul className="mt-1.5 space-y-0.5 text-sm text-slate-700">{p.checklist.map((c) => <li key={c}>• {c}</li>)}</ul>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Vazgeç</Button>
          <Button type="submit" disabled={!title.trim() || !(Number(budget) > 0)}>
            <PlusCircle className="h-4 w-4" /> Başvuruyu oluştur
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------------------------- Sayfa ---------------------------------- */

type Filter = 'all' | 'hazirlik' | 'basvuruldu' | 'on_degerlendirme' | 'panel' | 'sonuc';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'hazirlik', label: 'Hazırlık' },
  { key: 'basvuruldu', label: 'Başvuruldu' },
  { key: 'on_degerlendirme', label: 'Ön değerlendirme' },
  { key: 'panel', label: 'Panel' },
  { key: 'sonuc', label: 'Sonuçlanan' },
];
const inFilter = (f: Filter, a: FundingApp) => f === 'all' || (f === 'sonuc' ? ['kabul', 'ret', 'revizyon'].includes(a.status) : a.status === f);

function DeadlineDate({ t }: { t: number }) {
  const d = new Date(t);
  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-center leading-none">
      <div>
        <div className="font-display text-lg font-extrabold text-slate-900">{d.getDate()}</div>
        <div className="mt-0.5 text-[10px] font-semibold uppercase text-slate-500">{d.toLocaleDateString('tr-TR', { month: 'short' })}</div>
      </div>
    </div>
  );
}

export function FundingPage() {
  const k = useKopru();
  const role = useRole();
  const f = useFunding();
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ program?: ProgramId } | null>(null);
  const canStart = !!applicantOf(role);
  const sel = k.state.orgSel;

  const apps = useMemo(() => f.data.apps.filter((a) => appInScope(k.state, role, a)).sort((a, b) => (b.events.at(-1)?.at ?? b.createdAt) - (a.events.at(-1)?.at ?? a.createdAt)), [f.data.apps, k.state, role]);
  const shown = apps.filter((a) => inFilter(filter, a));
  const open = f.data.apps.find((a) => a.id === openId) ?? null;

  const decided = apps.filter((a) => a.status === 'kabul' || a.status === 'ret');
  const acceptRate = decided.length ? Math.round((decided.filter((a) => a.status === 'kabul').length / decided.length) * 100) : null;
  const totalBudget = apps.reduce((s, a) => s + a.budget, 0);

  // Yaklaşan son tarihler: program çağrıları + hazırlıktaki başvurular
  const upcoming = [
    ...PROGRAMS.filter((p) => p.nextInDays != null).map((p) => ({ key: `p-${p.id}`, t: nextDeadline(p)!, title: p.name, sub: `Sonraki çağrı son tarihi (örnek) · ${p.budget}`, color: p.color, appId: undefined as string | undefined })),
    ...apps.filter((a) => (a.status === 'hazirlik' || a.status === 'revizyon') && a.deadline && daysLeft(a.deadline) >= 0).map((a) => ({ key: `a-${a.id}`, t: a.deadline!, title: a.title, sub: `${firmOf(a.applicant).name} · ${programOf(a.programId).short} · kontrol listesi %${progressOf(a)}`, color: programOf(a.programId).color, appId: a.id as string | undefined })),
  ].sort((a, b) => a.t - b.t);

  const scopeText =
    role === 'firma' || role === 'tfirma' ? `${firmOf(applicantOf(role)!).name} başvuruları`
    : role === 'akademisyen' ? 'Yürütücü veya danışman olduğunuz başvurular'
    : role === 'tto' ? `${ttoName(sel.tto)} · akademisyenlerinizin ve yönlendirilen ihtiyaçların başvuruları`
    : role === 'osb' ? `${orgOf(sel.osb).short} firmalarının başvuruları`
    : role === 'teknokent' ? `${orgOf(sel.teknokent).short} firmalarının başvuruları`
    : 'Ağdaki tüm başvurular';

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        title="Destek programları"
        description="Çağrı dönemleri, son tarihler ve başvuru takibi. Program bilgileri ve tarihler örnektir; resmî çağrı duyurusu esas alınmalıdır."
        actions={canStart ? <Button onClick={() => setCreating({})}><PlusCircle className="h-4 w-4" /> Başvuru başlat</Button> : undefined}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Başvuru" value={apps.length} hint={`${apps.filter((a) => a.status === 'hazirlik').length} hazırlıkta`} icon={<FileText className="h-4 w-4 text-slate-400" />} />
        <Stat label="Değerlendirmede" value={apps.filter((a) => ['basvuruldu', 'on_degerlendirme', 'panel', 'revizyon'].includes(a.status)).length} />
        <Stat label="Talep edilen bütçe" value={fmtTL(totalBudget)} icon={<HandCoins className="h-4 w-4 text-slate-400" />} />
        <Stat label="Kabul oranı" value={acceptRate == null ? '—' : `%${acceptRate}`} hint={decided.length ? `${decided.length} sonuçlanan başvuru` : 'Henüz sonuçlanan başvuru yok'} />
      </div>

      <Card title="Yaklaşan son tarihler" description="≤14 gün kırmızı, ≤30 gün sarı">
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-500">Yaklaşan bir son tarih yok.</p>
        ) : (
          <ol className="space-y-3">
            {upcoming.map((u) => (
              <li key={u.key} className="flex items-center gap-3">
                <DeadlineDate t={u.t} />
                <span className="h-10 w-1 shrink-0 rounded-full" style={{ background: u.color }} aria-hidden />
                <div className="min-w-0 flex-1">
                  {u.appId ? (
                    <button type="button" onClick={() => setOpenId(u.appId!)} className="block max-w-full truncate text-left text-sm font-semibold text-slate-900 hover:text-primary-600">
                      {u.title}
                    </button>
                  ) : (
                    <div className="truncate text-sm font-semibold text-slate-900">{u.title}</div>
                  )}
                  <div className="truncate text-xs text-slate-500">{u.sub}</div>
                </div>
                <Countdown deadline={u.t} />
              </li>
            ))}
            {PROGRAMS.filter((p) => p.nextInDays == null).map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-dashed border-slate-300 text-slate-400"><CalendarClock className="h-5 w-5" aria-hidden /></span>
                <span className="h-10 w-1 shrink-0 rounded-full" style={{ background: p.color }} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">{p.name}</div>
                  <div className="truncate text-xs text-slate-500">Başvurular yıl boyunca alınır (örnek)</div>
                </div>
                <Countdown deadline={null} />
              </li>
            ))}
          </ol>
        )}
      </Card>

      <section aria-labelledby="programs-h" className="space-y-3">
        <h2 id="programs-h" className="font-display text-base font-bold text-slate-900">Programlar</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {PROGRAMS.map((p) => (
            <article key={p.id} className="glass flex flex-col rounded-2xl p-5" aria-label={p.name}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: p.color }}>{p.agency}</span>
                <Countdown deadline={nextDeadline(p)} />
              </div>
              <h3 className="mt-1.5 font-display font-bold text-slate-900">{p.name}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{p.summary}</p>
              <dl className="mt-3 space-y-1.5 text-xs">
                <div><dt className="inline font-semibold text-slate-700">Kimler başvurur: </dt><dd className="inline text-slate-500">{p.who}</dd></div>
                <div><dt className="inline font-semibold text-slate-700">Süre: </dt><dd className="inline text-slate-500">{p.duration}</dd></div>
                <div><dt className="inline font-semibold text-slate-700">Bütçe: </dt><dd className="inline text-slate-500">{p.budget}</dd></div>
              </dl>
              <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Örnek bilgi</span>
                {canStart && (
                  <Button size="sm" variant="secondary" aria-label={`Bu programa başvur: ${p.short}`} onClick={() => setCreating({ program: p.id })}>
                    Bu programa başvur
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <Card title="Başvurular" description={scopeText}>
        {apps.length === 0 ? (
          <EmptyState
            icon={<HandCoins className="h-6 w-6" />}
            title="Henüz başvuru yok"
            description={canStart ? 'Bir program seçip başvuru başlatın; kontrol listesi ve son tarih otomatik oluşturulur.' : role === 'akademisyen' ? 'Yürütücü veya danışman olarak yer aldığınız destek başvuruları burada görünür.' : 'Kapsamınızdaki firmalar başvuru başlattığında burada görünür.'}
            action={canStart ? <Button onClick={() => setCreating({})}><PlusCircle className="h-4 w-4" /> Başvuru başlat</Button> : undefined}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Durum filtresi">
              {FILTERS.map((x) => (
                <button key={x.key} type="button" onClick={() => setFilter(x.key)} aria-pressed={filter === x.key} className={cn('rounded-full border px-3 py-1 text-xs font-semibold transition', filter === x.key ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
                  {x.label} ({apps.filter((a) => inFilter(x.key, a)).length})
                </button>
              ))}
            </div>

            {shown.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">Bu filtrede başvuru yok.</p>
            ) : (
              <>
                {/* Geniş ekran: tablo */}
                <div className="hidden lg:block">
                  <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                        <th className="w-[34%] pb-2 font-semibold">Başvuru</th>
                        <th className="pb-2 font-semibold">Program</th>
                        <th className="w-[22%] pb-2 font-semibold">Durum</th>
                        <th className="pb-2 font-semibold">Kontrol listesi</th>
                        <th className="pb-2 font-semibold">Son tarih</th>
                        <th className="w-24 pb-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {shown.map((a) => (
                        <tr key={a.id} className="align-top">
                          <td className="py-3 pr-3">
                            <div className="font-semibold text-slate-900">{a.title}</div>
                            <div className="mt-0.5 text-xs text-slate-500">{firmOf(a.applicant).name} · {fmtTL(a.budget)}</div>
                          </td>
                          <td className="py-3 pr-3 text-slate-700">{programOf(a.programId).short}</td>
                          <td className="py-3 pr-3">
                            <StatusBadge status={a.status} />
                            <div className="mt-2"><Pipeline status={a.status} /></div>
                          </td>
                          <td className="py-3 pr-3"><ProgressBar value={progressOf(a)} /></td>
                          <td className="py-3 pr-3">
                            {a.status === 'hazirlik' || a.status === 'revizyon' ? <Countdown deadline={a.deadline} /> : <span className="text-xs text-slate-500">{timeAgo(a.events.at(-1)?.at ?? a.createdAt)} güncellendi</span>}
                          </td>
                          <td className="py-3 text-right">
                            <Button size="sm" variant="secondary" onClick={() => setOpenId(a.id)}>
                              Ayrıntılar<span className="sr-only">: {a.title}</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Dar ekran: kart */}
                <ul className="space-y-3 lg:hidden">
                  {shown.map((a) => (
                    <li key={a.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: programOf(a.programId).color }}>{programOf(a.programId).short}</span>
                        <StatusBadge status={a.status} />
                      </div>
                      <div className="mt-1 font-semibold text-slate-900">{a.title}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{firmOf(a.applicant).name} · {fmtTL(a.budget)}</div>
                      <div className="mt-3"><Pipeline status={a.status} /></div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1"><ProgressBar value={progressOf(a)} /></div>
                        {(a.status === 'hazirlik' || a.status === 'revizyon') && <Countdown deadline={a.deadline} />}
                      </div>
                      <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={() => setOpenId(a.id)}>
                        Ayrıntılar<span className="sr-only">: {a.title}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </Card>

      <AppDrawer app={open} onClose={() => setOpenId(null)} />
      {creating && <NewAppModal open onClose={() => setCreating(null)} program={creating.program} />}
    </div>
  );
}

/* ------------------------------ Proje kartı -------------------------------- */

export function ProjectFunding({ projectId }: { projectId: string }) {
  const k = useKopru();
  const role = useRole();
  const f = useFunding();
  const [creating, setCreating] = useState(false);
  const p = k.state.projects.find((x) => x.id === projectId);
  if (!p) return null;
  const need = k.state.needs.find((n) => n.id === p.needId);
  const app = f.data.apps.find((a) => a.projectId === projectId) ?? f.data.apps.find((a) => !a.projectId && a.needId === p.needId);
  const funding = p.program ?? need?.funding;
  const suggested = programFromFunding(funding);
  const external = !!suggested || funding === 'bilinmiyor';

  if (app) {
    const prog = programOf(app.programId);
    return (
      <Card title="Destek başvurusu" description={prog.name} actions={<StatusBadge status={app.status} />}>
        <div className="space-y-4">
          <Pipeline status={app.status} />
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-slate-500">Bütçe: <strong className="text-slate-900">{fmtTL(app.budget)}</strong></span>
            {app.status === 'hazirlik' || app.status === 'revizyon' ? <Countdown deadline={app.deadline} /> : <span className="text-xs text-slate-500">{timeAgo(app.events.at(-1)?.at ?? app.createdAt)} güncellendi</span>}
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Kontrol listesi</span>
              <div className="w-28"><ProgressBar value={progressOf(app)} /></div>
            </div>
            <Checklist app={app} />
          </div>
          <Actions app={app} />
          <Link to={`/kopru/${role}/destek`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:underline">
            Destek programlarında aç <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <p className="text-[11px] text-slate-400">Program bilgileri ve tarihler örnektir.</p>
        </div>
      </Card>
    );
  }

  if (external) {
    const sp = suggested ? programOf(suggested) : null;
    const can = canCreateFor(k.state, role, p);
    return (
      <Card title="Destek başvurusu" description={sp ? `${sp.name} için henüz başvuru dosyası yok.` : 'TTO uygun programı önerecek.'}>
        <div className="space-y-3">
          {sp && (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <span>Sonraki çağrı (örnek){nextDeadline(sp) ? `: ${fmtDay(nextDeadline(sp)!)}` : ''}</span>
              <Countdown deadline={nextDeadline(sp)} />
            </div>
          )}
          {can ? (
            <Button size="sm" className="w-full" onClick={() => setCreating(true)}>
              <PlusCircle className="h-4 w-4" /> Başvuru oluştur
            </Button>
          ) : (
            <p className="text-xs text-slate-500">Başvuru dosyasını firma veya TTO oluşturur.</p>
          )}
          <Link to={`/kopru/${role}/destek`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:underline">
            Uygun destek programlarını gör <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {creating && <NewAppModal open onClose={() => setCreating(false)} projectId={p.id} program={suggested ?? undefined} />}
      </Card>
    );
  }

  return (
    <Card title="Destek programları">
      <p className="flex items-start gap-2 text-sm text-slate-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden /> Bu proje öz kaynakla yürütülüyor. Benzer çalışmalar için TÜBİTAK veya KOSGEB desteği mümkün olabilir.
      </p>
      <Link to={`/kopru/${role}/destek`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:underline">
        Uygun destek programlarını gör <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </Card>
  );
}

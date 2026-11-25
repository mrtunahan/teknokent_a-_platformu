import { ArrowLeft, ArrowRight, FileSpreadsheet, FolderKanban, Send } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, EmptyState } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { cn, timeAgo } from '@/lib/utils';
import { FUNDING, STAGES, firmOf, ttoName, type Funding, type Project, type Role } from '../data';
import { projectInScope, useKopru } from '../store';
import { Avatar, Card, SolverAvatar, SolverKind, Stepper, fmtTL } from '../ui';
import { ProjectDocuments, ProjectMeetings, useStageGate } from '../features/collab';
import { ProjectFunding } from '../features/funding';
import { ProjectIp } from '../features/ip';
import { ProjectFeedback } from '../features/feedback';
import { PROJECT_HEADERS, downloadCsv, fileStamp, projectRows, slugify } from '../features/export';

/** Rolün (ve seçili kurumun) görebileceği projeler */
export function useVisibleProjects(role: Role) {
  const k = useKopru();
  return k.state.projects.filter((p) => projectInScope(k.state, role, p));
}

const stageLabel = (p: Project) => STAGES.find((s) => s.key === p.stage)!.label;

export function ProjectList() {
  const { role } = useParams() as { role: Role };
  const k = useKopru();
  const list = useVisibleProjects(role);
  const toast = useToast();
  const canExport = role === 'tto' || role === 'osb' || role === 'teknokent' || role === 'platform';
  const exportCsv = () => {
    const sel = k.state.orgSel;
    const scopeName = role === 'osb' ? sel.osb : role === 'teknokent' ? sel.teknokent : role === 'tto' ? sel.tto : 'ag';
    downloadCsv(`projeler-${slugify(scopeName)}-${fileStamp()}`, PROJECT_HEADERS, projectRows(list, k.state.needs, (sid) => k.findSolver(sid)?.data.name ?? '—'));
    toast({ title: 'Proje listesi indirildi', body: `${list.length} kayıt · Excel ile açabilirsiniz.` });
  };
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        title={role === 'akademisyen' ? 'Projelerim' : 'Projeler'}
        description="İhtiyaçtan doğan üniversite–sanayi projeleri ve aşamaları."
        actions={
          canExport ? (
            <Button size="sm" variant="secondary" onClick={exportCsv} disabled={list.length === 0}>
              <FileSpreadsheet className="h-4 w-4" /> Excel (CSV) indir
            </Button>
          ) : undefined
        }
      />
      {list.length === 0 ? (
        <EmptyState icon={<FolderKanban className="h-6 w-6" />} title="Henüz proje yok" description={role === 'firma' ? 'Bir ihtiyacınıza kabul veren uzmanla projeyi başlattığınızda burada görünür.' : 'İhtiyaçlar projeye dönüştükçe burada görünür.'} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((p) => {
            const need = k.state.needs.find((n) => n.id === p.needId)!;
            const firm = firmOf(need.firmId);
            const s = k.findSolver(p.solverId);
            const pct = Math.round(((STAGES.findIndex((x) => x.key === p.stage) + (p.stage === 'tamamlandi' ? 1 : 0.5)) / STAGES.length) * 100);
            return (
              <Link key={p.id} to={`/kopru/${role}/projeler/${p.id}`} className="glass block rounded-2xl p-5 transition hover:border-primary-300">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className={cn('rounded-full px-2.5 py-0.5 ring-1', p.stage === 'tamamlandi' ? 'bg-slate-100 text-slate-600 ring-slate-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200')}>{stageLabel(p)}</span>
                  {p.program && p.program !== 'oz' && p.program !== 'bilinmiyor' && <span className="text-slate-500">{FUNDING[p.program].split(' (')[0]}</span>}
                </div>
                <div className="mt-2 font-display text-lg font-bold text-slate-900">{need.title}</div>
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                  <Avatar name={firm.name} brand={firm.brand} size={24} square /> {firm.name}
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  {s && <SolverAvatar solver={s} size={24} />} <span className="truncate">{s?.data.name}</span>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-xs text-slate-500">
                  <span>{timeAgo(p.startedAt)} başladı</span>
                  <span>{fmtTL(p.value)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ProjectDetail() {
  const { role, id } = useParams() as { role: Role; id: string };
  const k = useKopru();
  const toast = useToast();
  const p = k.state.projects.find((x) => x.id === id);
  const [text, setText] = useState('');
  const [value, setValue] = useState('');
  const [program, setProgram] = useState<Funding | ''>('');
  // Aşama koşulu (ör. gizlilik sözleşmesi iki tarafça onaylanmadan ilerlenemez)
  const gate = useStageGate(id);
  if (!p) return <div className="p-8"><EmptyState icon={<FolderKanban className="h-6 w-6" />} title="Proje bulunamadı" description="Senaryo sıfırlanmış olabilir." /></div>;

  const need = k.state.needs.find((n) => n.id === p.needId)!;
  const firm = firmOf(need.firmId);
  const s = k.findSolver(p.solverId)!;
  const effectiveProgram = (program || p.program || need.funding) as Funding;
  const skipFunding = effectiveProgram === 'oz' || effectiveProgram === 'bilinmiyor';
  const canAdvance = role === 'firma' || role === 'tto' || role === 'akademisyen' || role === 'tfirma';
  const myFrom = role === 'firma' ? 'firma' : role === 'tto' ? 'tto' : 'cozucu';
  const myName = role === 'firma' ? firm.name : role === 'tto' ? ttoName(k.state.orgSel.tto) : s.data.name;
  const nextLabel: Partial<Record<Project['stage'], string>> = {
    gorusme: 'Ön görüşme yapıldı',
    nda: 'Gizlilik sözleşmesi imzalandı',
    teklif: 'Teklif kabul edildi',
    sozlesme: skipFunding ? 'Sözleşme imzalandı → yürütme' : 'Sözleşme imzalandı',
    basvuru: 'Destek başvurusu yapıldı',
    yurutme: 'Projeyi tamamla',
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <Link to={`/kopru/${role}/projeler`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Projeler
      </Link>
      <div className="glass rounded-2xl p-5 sm:p-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Proje</div>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-slate-900">{need.title}</h1>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
            <Avatar name={firm.name} brand={firm.brand} size={36} square />
            <div className="min-w-0 text-sm">
              <div className="font-semibold text-slate-900">{firm.name}</div>
              <div className="text-xs text-slate-500">İhtiyaç sahibi · {firm.sector}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
            <SolverAvatar solver={s} size={36} />
            <div className="min-w-0 text-sm">
              <div className="truncate font-semibold text-slate-900">{s.data.name}</div>
              <SolverKind solver={s} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-3 text-sm">
            <div className="text-xs text-slate-500">Bütçe · program</div>
            <div className="font-semibold text-slate-900">{fmtTL(p.value)}</div>
            <div className="text-xs text-slate-500">{FUNDING[effectiveProgram]}</div>
          </div>
        </div>
        <div className="mt-5">
          <Stepper stage={p.stage} skipFunding={skipFunding} />
        </div>

        {canAdvance && p.stage !== 'tamamlandi' && (
          <div className="mt-5 flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-4">
            {p.stage === 'teklif' && (
              <>
                <div>
                  <label className="label" htmlFor="pj-val">Teklif tutarı (₺)</label>
                  <input id="pj-val" type="number" min={0} className="input !w-44 !py-2.5" value={value} onChange={(e) => setValue(e.target.value)} placeholder="ör. 350000" />
                </div>
                <div>
                  <label className="label" htmlFor="pj-prog">Finansman</label>
                  <select id="pj-prog" className="input !w-auto !py-2.5" value={program || p.program || need.funding} onChange={(e) => setProgram(e.target.value as Funding)}>
                    {Object.entries(FUNDING).filter(([v]) => v !== 'bilinmiyor').map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </>
            )}
            <p className="flex-1 text-xs text-slate-500">
              {!gate.ok && gate.reason ? <span className="font-semibold text-amber-700">{gate.reason}</span> : role === 'akademisyen' || role === 'tfirma' ? 'Aşamayı siz de güncelleyebilirsiniz; TTO ve firma bilgilendirilir.' : role === 'tto' ? 'Sözleşme ve destek başvurusu adımları TTO tarafından yürütülür.' : 'Taraflar aşamayı güncelleyebilir; TTO süreci izler.'}
            </p>
            <Button
              disabled={!gate.ok}
              onClick={() => {
                const patch: { value?: number; program?: Funding } = {};
                if (p.stage === 'teklif') {
                  if (value) patch.value = Number(value);
                  patch.program = effectiveProgram === 'bilinmiyor' ? 'oz' : effectiveProgram;
                }
                k.advance(p.id, patch);
                setValue('');
                toast({ title: nextLabel[p.stage] ?? 'Aşama güncellendi' });
              }}
            >
              {nextLabel[p.stage]} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
        <ProjectDocuments projectId={p.id} />
        <ProjectMeetings projectId={p.id} />
        <Card title="Proje yazışmaları" description="Firma, uzman ve TTO aynı alanda.">
          <ul className="space-y-3">
            {p.messages.length === 0 && <li className="text-sm text-slate-500">Henüz mesaj yok. Ön görüşme için bir tarih önererek başlayın.</li>}
            {p.messages.map((m, i) => (
              <li key={i} className={cn('max-w-[85%] rounded-2xl px-4 py-3 text-sm', m.from === myFrom ? 'ml-auto bg-primary-500 text-white' : m.from === 'tto' ? 'bg-blue-50 text-blue-950' : 'bg-slate-100 text-slate-800')}>
                <div className={cn('mb-0.5 text-xs font-semibold', m.from === myFrom ? 'text-white/80' : 'text-slate-500')}>
                  {m.name} · {timeAgo(m.at)}
                </div>
                {m.text}
              </li>
            ))}
          </ul>
          {(role === 'firma' || role === 'tto' || role === 'akademisyen') && (
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim()) return;
                k.sendMessage(p.id, { from: myFrom, name: myName, text: text.trim() });
                setText('');
              }}
            >
              <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Mesaj yazın…" aria-label="Proje mesajı" />
              <Button type="submit" disabled={!text.trim()} aria-label="Gönder">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}
        </Card>
        </div>
        <div className="min-w-0 space-y-6">
        <ProjectFeedback projectId={p.id} />
        <ProjectFunding projectId={p.id} />
        <ProjectIp projectId={p.id} />
        <Card title="Aşama geçmişi">
          <ol className="space-y-2 text-sm">
            {[...p.history].reverse().map((h, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="text-slate-900">{STAGES.find((x) => x.key === h.stage)!.label}</span>
                <span className="text-xs text-slate-500">{timeAgo(h.at)}</span>
              </li>
            ))}
          </ol>
          <Link to={`/kopru/${role}/ihtiyaclar/${need.id}`} className="mt-4 inline-block text-sm font-semibold text-primary-600 hover:underline">
            İhtiyaç kaydını aç
          </Link>
        </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Proje belgeleri: dosya yükleme, şablondan gizlilik sözleşmesi / sözleşme, görüntüleme + yazdırma,
 * rol bazlı e-onay ve aşama kapısı (useStageGate).
 */
import { CheckCircle2, Download, Eye, FilePlus2, FileSignature, FileText, Lock, Printer, ShieldCheck, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Modal } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { cn, fileSize, timeAgo, uid } from '@/lib/utils';
import type { Project } from '../data';
import { useKopru } from '../store';
import {
  DOC_TYPES,
  bodyToHtml,
  contractText,
  docStatus,
  fmtStamp,
  isEffective,
  ndaText,
  otherInboxes,
  partyLabel,
  partyName,
  printDocument,
  projectParty,
  requiredParties,
  shownParties,
  stageGate,
  templateCtx,
  useCollab,
  type CollabDoc,
  type DocType,
  type Party,
} from './collab-core';

// Tarayıcı depolama kotası (~5 MB) dolmasın diye küçük tutulur
const MAX_STORE = 700 * 1024;
const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg';
const EXT_OK = /\.(pdf|docx?|xlsx?|png|jpe?g)$/i;

/** Aşama ilerletme koşulu: belgelere bağlı. Hook her zaman koşulsuz çağrılır; proje yoksa { ok: true } */
export function useStageGate(projectId: string): { ok: boolean; reason?: string } {
  const k = useKopru();
  const { data } = useCollab();
  const p = k.state.projects.find((x) => x.id === projectId);
  return useMemo(() => (p ? stageGate(p, data.docs) : { ok: true }), [p, data.docs]);
}

const TONE = {
  ok: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  wait: 'bg-amber-50 text-amber-700 ring-amber-200',
  plain: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export function ProjectDocuments({ projectId }: { projectId: string }) {
  const { k, data, update } = useCollab();
  const toast = useToast();
  const [upload, setUpload] = useState(false);
  const [tpl, setTpl] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const p = k.state.projects.find((x) => x.id === projectId);
  const need = p ? k.state.needs.find((n) => n.id === p.needId) : undefined;
  if (!p || !need) return null;

  const docs = data.docs.filter((d) => d.projectId === projectId).sort((a, b) => b.at - a.at);
  const party = projectParty(k, p);
  const solver = k.findSolver(p.solverId);
  const kind = p.kind;

  // OSB / teknokent yönetimi: yalnızca sayılar
  if (k.role === 'osb' || k.role === 'teknokent') {
    const eff = docs.filter((d) => requiredParties(d.type, kind).length && isEffective(d, kind)).length;
    const counts = (Object.keys(DOC_TYPES) as DocType[]).map((t) => [t, docs.filter((d) => d.type === t).length] as const).filter(([, n]) => n > 0);
    return (
      <section className="glass rounded-2xl p-5">
        <h2 className="font-display text-base font-bold text-slate-900">Belgeler</h2>
        <p className="mt-0.5 text-sm text-slate-500">Belge içerikleri yalnızca proje taraflarınca (firma, çözüm sağlayıcı, TTO) görülür.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 font-semibold text-slate-800 ring-1 ring-slate-200">
            <Lock className="h-4 w-4 text-slate-400" /> {docs.length} belge
          </span>
          {eff > 0 && <span className="rounded-xl bg-emerald-50 px-3 py-2 font-semibold text-emerald-700 ring-1 ring-emerald-200">{eff} yürürlükte</span>}
          {counts.map(([t, n]) => (
            <span key={t} className="rounded-xl bg-white px-3 py-2 text-slate-600 ring-1 ring-slate-200">
              {DOC_TYPES[t]}: {n}
            </span>
          ))}
        </div>
      </section>
    );
  }

  const gate = stageGate(p, data.docs);
  const view = viewId ? docs.find((d) => d.id === viewId) : undefined;

  const add = (d: CollabDoc, what: string) => {
    update((s) => ({ ...s, docs: [...s.docs, d] }));
    k.notify(otherInboxes(k, need, p.solverId), `${d.byName} ${what}: ${d.title}`, `projeler/${p.id}`, 'document');
  };

  const approve = (d: CollabDoc, by: Party) => {
    const a = { party: by, name: partyName(k, by, need, p.solverId), at: Date.now() };
    const next = { ...d, approvals: [...d.approvals.filter((x) => x.party !== by), a] };
    update((s) => ({ ...s, docs: s.docs.map((x) => (x.id === d.id ? next : x)) }));
    const done = isEffective(next, kind) && !isEffective(d, kind);
    k.notify(otherInboxes(k, need, p.solverId), done ? `${d.title} tüm tarafların onayıyla yürürlüğe girdi` : `${a.name} belgeyi onayladı: ${d.title}`, `projeler/${p.id}`, 'document');
    toast({ title: done ? 'Belge yürürlüğe girdi' : 'Onayınız kaydedildi', body: done ? 'Tüm zorunlu onaylar tamamlandı.' : `${fmtStamp(a.at)} · ${a.name}` });
  };

  return (
    <section className="glass rounded-2xl p-5" aria-labelledby={`pd-${projectId}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`pd-${projectId}`} className="font-display text-base font-bold text-slate-900">Belgeler</h2>
          <p className="mt-0.5 text-sm text-slate-500">Gizlilik sözleşmesi, teklif, sözleşme ve raporlar; taraflar e-onay verir.</p>
        </div>
        {party && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setTpl(true)}>
              <FileSignature className="h-4 w-4" /> Şablondan oluştur
            </Button>
            <Button size="sm" onClick={() => setUpload(true)}>
              <Upload className="h-4 w-4" /> Dosya yükle
            </Button>
          </div>
        )}
      </div>

      {!gate.ok && gate.reason && p.stage !== 'tamamlandi' && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{gate.reason}</span>
        </div>
      )}

      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          <FileText className="mx-auto mb-2 h-6 w-6 text-slate-400" />
          Henüz belge yok.{party ? ' Gizlilik sözleşmesini şablondan oluşturarak başlayabilirsiniz.' : ''}
        </div>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => {
            const st = docStatus(d, kind);
            const canApprove = !!party && shownParties(d.type, kind).includes(party) && !d.approvals.some((a) => a.party === party);
            return (
              <li key={d.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-start gap-3">
                  <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', d.type === 'nda' || d.type === 'sozlesme' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500')} aria-hidden>
                    {d.type === 'nda' || d.type === 'sozlesme' ? <FileSignature className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="break-words font-semibold text-slate-900">{d.title}</span>
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1', TONE[st.tone])}>{st.label}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {DOC_TYPES[d.type]} · {d.byName} · {timeAgo(d.at)}
                      {d.size != null && <> · {fileSize(d.size)}</>}
                    </div>
                    {shownParties(d.type, kind).length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {shownParties(d.type, kind).map((pt) => {
                          const a = d.approvals.find((x) => x.party === pt);
                          const opt = !requiredParties(d.type, kind).includes(pt);
                          return (
                            <span key={pt} className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium', a ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                              {a ? <CheckCircle2 className="h-3 w-3" /> : null}
                              {partyLabel(pt, solver?.kind ?? kind)}
                              {opt && ' (isteğe bağlı)'}
                              {a ? ' onayladı' : ' bekleniyor'}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setViewId(d.id)} aria-label={`Görüntüle: ${d.title}`}>
                    <Eye className="h-4 w-4" /> Görüntüle
                  </Button>
                  {d.dataUrl && (
                    <a href={d.dataUrl} download={d.fileName} className="inline-flex h-9 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900" aria-label={`İndir: ${d.title}`}>
                      <Download className="h-4 w-4" /> İndir
                    </a>
                  )}
                  {canApprove && (
                    <Button size="sm" onClick={() => approve(d, party!)} aria-label={`Onayla: ${d.title}`}>
                      <CheckCircle2 className="h-4 w-4" /> Onayla
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={upload} onClose={() => setUpload(false)} title="Dosya yükle">
        {upload && party && (
          <UploadForm
            stage={p.stage}
            onCancel={() => setUpload(false)}
            onSubmit={(f) => {
              const by = partyName(k, party, need, p.solverId);
              add({ id: uid('doc'), projectId: p.id, ...f, source: 'upload', by: party, byName: by, at: Date.now(), approvals: [] }, 'belge yükledi');
              setUpload(false);
              toast({ title: 'Belge yüklendi', body: f.dataUrl ? `${f.fileName} · indirilebilir` : `${f.fileName} · demo: içerik saklanmadı (700 KB üzeri)`, tone: f.dataUrl ? 'success' : 'info' });
            }}
          />
        )}
      </Modal>

      <Modal open={tpl} onClose={() => setTpl(false)} title="Şablondan oluştur" className="sm:max-w-2xl">
        {tpl && party && (
          <TemplateForm
            project={p}
            existing={docs}
            onCancel={() => setTpl(false)}
            onSubmit={(type, body, title) => {
              const by = partyName(k, party, need, p.solverId);
              const now = Date.now();
              // Oluşturan taraf, metni hazırlarken onayını da verir
              const approvals = shownParties(type, kind).includes(party) ? [{ party, name: by, at: now }] : [];
              add({ id: uid('doc'), projectId: p.id, type, title, body, source: 'template', by: party, byName: by, at: now, approvals }, 'onaya sundu');
              setTpl(false);
              toast({ title: 'Belge oluşturuldu', body: 'Onayınız kaydedildi; diğer taraflar bilgilendirildi.' });
            }}
          />
        )}
      </Modal>

      <Modal open={!!view} onClose={() => setViewId(null)} title={view?.title} className="sm:max-w-2xl">
        {view && (
          <DocViewer
            d={view}
            kind={kind}
            solverKind={solver?.kind ?? kind}
            canApprove={!!party && shownParties(view.type, kind).includes(party) && !view.approvals.some((a) => a.party === party)}
            onApprove={() => approve(view, party!)}
          />
        )}
      </Modal>
    </section>
  );
}

/* ---------------------------------- Yükleme ---------------------------------- */

interface UploadResult {
  type: DocType;
  title: string;
  fileName: string;
  size: number;
  mime: string;
  dataUrl?: string;
}

function UploadForm({ stage, onCancel, onSubmit }: { stage: Project['stage']; onCancel: () => void; onSubmit: (r: UploadResult) => void }) {
  const initial: DocType = stage === 'gorusme' || stage === 'nda' ? 'nda' : stage === 'teklif' ? 'teklif' : stage === 'sozlesme' ? 'sozlesme' : stage === 'yurutme' ? 'sonuc' : 'ara';
  const [type, setType] = useState<DocType>(initial);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!file) return setError('Bir dosya seçin.');
    if (!EXT_OK.test(file.name)) return setError('Desteklenen türler: PDF, Word, Excel, PNG, JPG.');
    setBusy(true);
    let dataUrl: string | undefined;
    if (file.size <= MAX_STORE) {
      dataUrl = await new Promise<string | undefined>((res) => {
        const r = new FileReader();
        r.onload = () => res(typeof r.result === 'string' ? r.result : undefined);
        r.onerror = () => res(undefined);
        r.readAsDataURL(file);
      });
    }
    setBusy(false);
    onSubmit({ type, title: title.trim() || file.name.replace(/\.[^.]+$/, ''), fileName: file.name, size: file.size, mime: file.type || 'application/octet-stream', dataUrl });
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div>
        <label className="label" htmlFor="up-type">Belge türü</label>
        <select id="up-type" className="input" value={type} onChange={(e) => setType(e.target.value as DocType)}>
          {(Object.keys(DOC_TYPES) as DocType[]).map((t) => (
            <option key={t} value={t}>{DOC_TYPES[t]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="up-file">Dosya</label>
        <input
          id="up-file"
          type="file"
          accept={ACCEPT}
          className="block w-full min-w-0 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            setError('');
            if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ''));
          }}
        />
        <p className="mt-1.5 text-xs text-slate-500">PDF, Word, Excel, PNG veya JPG. 700 KB’a kadar dosyalar indirilebilir saklanır; daha büyüklerinde demo yalnızca ad ve boyutu kaydeder.</p>
        {file && (
          <p className="mt-1.5 text-xs font-medium text-slate-700">
            {file.name} · {fileSize(file.size)}
            {file.size > MAX_STORE && <span className="text-amber-700"> · demo: içerik saklanmayacak</span>}
          </p>
        )}
      </div>
      <div>
        <label className="label" htmlFor="up-title">Belge adı</label>
        <input id="up-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ör. Teklif · faz 1" />
      </div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Vazgeç</Button>
        <Button type="submit" disabled={busy || !file}>
          <Upload className="h-4 w-4" /> {busy ? 'Yükleniyor…' : 'Yükle'}
        </Button>
      </div>
    </form>
  );
}

/* ---------------------------------- Şablon ---------------------------------- */

function TemplateForm({ project, existing, onCancel, onSubmit }: { project: Project; existing: CollabDoc[]; onCancel: () => void; onSubmit: (type: DocType, body: string, title: string) => void }) {
  const k = useKopru();
  const [type, setType] = useState<'nda' | 'sozlesme'>(project.stage === 'gorusme' || project.stage === 'nda' ? 'nda' : 'sozlesme');
  const [months, setMonths] = useState(12);
  const ctx = templateCtx(k, project);
  if (!ctx) return null;
  const body = type === 'nda' ? ndaText(ctx) : contractText({ ...ctx, months });
  const title = type === 'nda' ? 'Karşılıklı gizlilik sözleşmesi' : project.kind === 'academic' ? 'Üniversite–sanayi iş birliği sözleşmesi' : 'Ar-Ge hizmet sözleşmesi';
  const dup = existing.some((d) => d.type === type);

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="label">Belge</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ['nda', 'Gizlilik sözleşmesi (NDA)'],
              ['sozlesme', 'Sözleşme'],
            ] as const
          ).map(([v, l]) => (
            <label key={v} className={cn('flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium', type === v ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-700')}>
              <input type="radio" name="tpl-type" className="accent-primary-500" checked={type === v} onChange={() => setType(v)} /> {l}
            </label>
          ))}
        </div>
      </fieldset>
      {type === 'sozlesme' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="tpl-months">Süre (ay)</label>
            <input id="tpl-months" type="number" min={1} max={48} className="input" value={months} onChange={(e) => setMonths(Math.max(1, Math.min(48, Number(e.target.value) || 1)))} />
          </div>
          <div className="text-sm">
            <span className="label">Bedel</span>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold text-slate-900">{ctx.value != null ? `${ctx.value.toLocaleString('tr-TR')} ₺` : 'Teklif aşamasında belirlenecek'}</div>
          </div>
        </div>
      )}
      {dup && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">Bu türde bir belge zaten var; yeni metin ayrı bir sürüm olarak eklenir ve yeniden onaya sunulur.</p>}
      <div>
        <div className="label">Önizleme</div>
        <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
          <DocBody body={body} />
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Vazgeç</Button>
        <Button onClick={() => onSubmit(type, body, title)}>
          <FilePlus2 className="h-4 w-4" /> Oluştur ve onaya sun
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------- Görüntüleme -------------------------------- */

function DocBody({ body }: { body: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-700">
      {body.split(/\n{2,}/).map((b, i) => {
        const t = b.trim();
        if (t.startsWith('# ')) return <h3 key={i} className="text-center font-display text-base font-bold text-slate-900">{t.slice(2)}</h3>;
        if (t.startsWith('## ')) return <h4 key={i} className="pt-2 text-xs font-bold uppercase tracking-wide text-slate-900">{t.slice(3)}</h4>;
        return <p key={i} className={cn('whitespace-pre-line', t.startsWith('Not:') && 'rounded-lg bg-slate-50 p-2 text-xs text-slate-500')}>{t}</p>;
      })}
    </div>
  );
}

function DocViewer({ d, kind, solverKind, canApprove, onApprove }: { d: CollabDoc; kind: Project['kind']; solverKind: 'academic' | 'firm'; canApprove: boolean; onApprove: () => void }) {
  const st = docStatus(d, kind);
  const parties = shownParties(d.type, kind);
  const isImage = !!d.dataUrl && d.mime?.startsWith('image/');

  const print = () => {
    const rows = parties
      .map((pt) => {
        const a = d.approvals.find((x) => x.party === pt);
        return `<tr><td>${partyLabel(pt, solverKind)}</td><td>${a ? a.name.replace(/</g, '&lt;') : '—'}</td><td>${a ? fmtStamp(a.at) : 'Bekleniyor'}</td></tr>`;
      })
      .join('');
    const footer = parties.length
      ? `<table><thead><tr><th>Taraf</th><th>E-onay veren</th><th>Tarih / saat</th></tr></thead><tbody>${rows}</tbody></table><p class="muted">Durum: ${st.label} · TeknoOrtak e-onay kaydı</p>`
      : `<p class="muted">${DOC_TYPES[d.type]} · ${d.byName.replace(/</g, '&lt;')} · ${fmtStamp(d.at)}</p>`;
    if (!printDocument(d.title, bodyToHtml(d.body ?? `# ${d.title}`), footer)) window.alert('Yazdırma penceresi açılamadı. Tarayıcınızın açılır pencere engelini kaldırın.');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className={cn('rounded-full px-2.5 py-0.5 font-semibold ring-1', TONE[st.tone])}>{st.label}</span>
        <span>{DOC_TYPES[d.type]}</span>·<span>{d.byName}</span>·<span>{fmtStamp(d.at)}</span>
        {d.fileName && <span className="break-all">· {d.fileName}{d.size != null && ` (${fileSize(d.size)})`}</span>}
      </div>

      {d.body ? (
        <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
          <DocBody body={d.body} />
        </div>
      ) : isImage ? (
        <img src={d.dataUrl} alt={d.title} className="max-h-[50vh] w-full rounded-xl border border-slate-200 object-contain" />
      ) : d.dataUrl ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Dosya platformda saklanıyor. İçeriği görmek için indirin.</div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          Demo: içerik saklanmadı. Yalnızca dosya adı ve boyutu kaydedildi{d.size != null && d.size > MAX_STORE ? ' (1,5 MB üzeri)' : ''}.
        </div>
      )}

      {parties.length > 0 && (
        <div>
          <div className="label">E-onaylar</div>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {parties.map((pt) => {
              const a = d.approvals.find((x) => x.party === pt);
              const opt = !requiredParties(d.type, kind).includes(pt);
              return (
                <li key={pt} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-900">
                    {partyLabel(pt, solverKind)}
                    {opt && <span className="text-xs font-normal text-slate-500"> (isteğe bağlı)</span>}
                  </span>
                  {a ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {a.name} · {fmtStamp(a.at)}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-700">Onay bekleniyor</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {d.dataUrl && (
          <a href={d.dataUrl} download={d.fileName} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Download className="h-4 w-4" /> İndir
          </a>
        )}
        {(d.body || !d.dataUrl) && (
          <Button variant="secondary" onClick={print}>
            <Printer className="h-4 w-4" /> Yazdır / PDF
          </Button>
        )}
        {canApprove && (
          <Button onClick={onApprove}>
            <CheckCircle2 className="h-4 w-4" /> Onayla
          </Button>
        )}
      </div>
    </div>
  );
}

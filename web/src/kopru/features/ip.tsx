/**
 * Fikri mülkiyet: buluş bildirimi → ön değerlendirme → araştırma → başvuru → tescil/lisans.
 * SÖZLEŞME:
 *  - IpPage(): rota "fikri-mulkiyet"
 *  - ProjectIp({ projectId }): proje sayfasında "Bu projeden buluş bildirimi"
 */
import { Award, Building2, Check, FileSearch, Gavel, Handshake, Info, Lightbulb, Plus, Scale, Send, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, Chip, Drawer, EmptyState, Modal, Toggle } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { cn, timeAgo, uid } from '@/lib/utils';
import { FIRMS, PERSONAS, firmOf, orgOf, orgsOfType, ttoName, type KopruState, type Role } from '../data';
import { firmInbox, solverInbox, useKopru } from '../store';
import { Avatar, Card, Stat, Timeline } from '../ui';
import { IP_COLUMNS, IP_SEED, IP_STAGES, IP_STATUS, IP_TONE, IP_TYPE, ipSummary, type Invention, type IpState, type IpStatus, type IpType } from './ip-data';

const KEY = 'ip';
const ME = PERSONAS.akademisyen.academicId;
const LINK = (id: string) => `fikri-mulkiyet?b=${id}`;

/* --------------------------------- Yardımcılar -------------------------------- */

function useIp() {
  const k = useKopru();
  const data = k.ext<IpState>(KEY, IP_SEED);
  const update = (id: string, fn: (i: Invention) => Invention) =>
    k.setExt<IpState>(KEY, IP_SEED, (prev) => ({ ...prev, items: prev.items.map((x) => (x.id === id ? fn(x) : x)) }));
  const add = (inv: Invention) => k.setExt<IpState>(KEY, IP_SEED, (prev) => ({ ...prev, items: [inv, ...prev.items] }));
  return { k, items: data.items, update, add };
}

const academicName = (state: KopruState, id: string) => state.academics.find((a) => a.id === id)?.name ?? id;

function inventorNames(state: KopruState, inv: Invention) {
  return [...inv.inventors.academics.map((id) => academicName(state, id)), ...inv.inventors.external];
}

/** Projeye bağlı firma (ihtiyaç sahibi) */
function projectFirm(state: KopruState, projectId?: string) {
  if (!projectId) return undefined;
  const p = state.projects.find((x) => x.id === projectId);
  const n = p && state.needs.find((x) => x.id === p.needId);
  return n?.firmId;
}

/** Firma rolü için buluşla ilişki türü */
function firmRelation(state: KopruState, inv: Invention, firmId: string): string | null {
  const rel: string[] = [];
  if (inv.firmId === firmId) rel.push(`Ortak hak sahibi${inv.share ? ` · ${inv.share}` : ''}`);
  if (inv.licenseeId === firmId) rel.push('Lisans alan firma');
  const p = inv.projectId ? state.projects.find((x) => x.id === inv.projectId) : undefined;
  if (p && (projectFirm(state, p.id) === firmId || p.solverId === firmId)) rel.push('Projenizden doğdu');
  return rel.length ? rel.join(' · ') : null;
}

/** Rolün görebileceği buluşlar */
function visibleFor(state: KopruState, role: Role, items: Invention[]): Invention[] {
  switch (role) {
    case 'akademisyen':
      return items.filter((i) => i.inventors.academics.includes(ME));
    case 'firma':
    case 'tfirma': {
      const fid = PERSONAS[role].firmId;
      return items.filter((i) => firmRelation(state, i, fid) !== null);
    }
    case 'tto':
      return items.filter((i) => i.universityId === state.orgSel.tto);
    case 'platform':
      return items;
    default:
      return [];
  }
}

export function IpStatusChip({ status }: { status: IpStatus }) {
  return <span className={cn('inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1', IP_TONE[status])}>{IP_STATUS[status]}</span>;
}

function TypeBadge({ type }: { type: IpType }) {
  return <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{IP_TYPE[type]}</span>;
}

function LegalNote() {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
      <Scale className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      6769 sayılı Sınai Mülkiyet Kanunu kapsamında üniversite buluşları için TTO süreç yürütür (bilgilendirme amaçlı). Başvuru numaraları ve tarihler örnektir.
    </p>
  );
}

/** Küçük aşama göstergesi */
function IpProgress({ inv }: { inv: Invention }) {
  if (inv.status === 'reddedildi')
    return <div className="text-xs text-slate-500">Süreç durduruldu{inv.rejectReason ? ` · ${inv.rejectReason}` : ''}</div>;
  const idx = IP_STAGES.findIndex((s) => s.key === inv.status);
  return (
    <div className="flex gap-1" aria-label={`Aşama ${idx + 1} / ${IP_STAGES.length}: ${IP_STAGES[idx]?.label ?? ''}`}>
      {IP_STAGES.map((s, i) => (
        <span key={s.key} title={s.label} className={cn('h-1.5 flex-1 rounded-full', i < idx ? 'bg-emerald-400' : i === idx ? 'bg-primary-500' : 'bg-slate-200')} />
      ))}
    </div>
  );
}

function InventionCard({ inv, onOpen, extra }: { inv: Invention; onOpen: () => void; extra?: ReactNode }) {
  const k = useKopru();
  const names = inventorNames(k.state, inv);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={inv.title}
      className="block w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-glass transition hover:border-primary-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/20"
    >
      <div className="flex flex-wrap items-center gap-2">
        <TypeBadge type={inv.type} />
        <IpStatusChip status={inv.status} />
      </div>
      <div className="mt-2 font-semibold leading-snug text-slate-900">{inv.title}</div>
      <div className="mt-1 text-xs text-slate-500">
        {names.slice(0, 2).join(', ')}
        {names.length > 2 ? ` +${names.length - 2}` : ''} · {orgOf(inv.universityId).short}
        {inv.firmId ? ` · ortak: ${firmOf(inv.firmId).name}` : ''}
      </div>
      {extra}
      <div className="mt-3">
        <IpProgress inv={inv} />
      </div>
      <div className="mt-2 text-[11px] text-slate-400">Son işlem {timeAgo(inv.events[inv.events.length - 1]?.at ?? inv.createdAt)}</div>
    </button>
  );
}

/* ------------------------------- Bildirim formu ------------------------------- */

export function InventionForm({ defaultProjectId, onDone }: { defaultProjectId?: string; onDone?: (id: string) => void }) {
  const { k, add } = useIp();
  const toast = useToast();
  const me = k.state.academics.find((a) => a.id === ME)!;
  const myProjects = k.state.projects.filter((p) => p.solverId === ME);
  const [f, setF] = useState({
    title: '',
    type: 'patent' as IpType,
    summary: '',
    novelty: '',
    usage: '',
    projectId: defaultProjectId ?? '',
    coAcademics: [] as string[],
    external: '',
    hasFirm: !!projectFirm(k.state, defaultProjectId),
    firmId: projectFirm(k.state, defaultProjectId) ?? '',
    share: '%60 üniversite · %40 firma',
  });
  const [touched, setTouched] = useState(false);
  const others = k.state.academics.filter((a) => a.approved && a.id !== ME && !f.coAcademics.includes(a.id));
  const titleOk = f.title.trim().length >= 5;
  const summaryOk = f.summary.trim().length >= 10;
  const firmOk = !f.hasFirm || !!f.firmId;
  const ok = titleOk && summaryOk && firmOk;

  const submit = () => {
    setTouched(true);
    if (!ok) return;
    const id = uid('ip');
    const external = f.external.split(',').map((s) => s.trim()).filter(Boolean);
    const inv: Invention = {
      id,
      title: f.title.trim(),
      type: f.type,
      summary: f.summary.trim(),
      novelty: f.novelty.trim() || undefined,
      usage: f.usage.trim() || undefined,
      inventors: { academics: [ME, ...f.coAcademics], external },
      universityId: me.orgId,
      projectId: f.projectId || undefined,
      firmId: f.hasFirm ? f.firmId : undefined,
      share: f.hasFirm ? f.share.trim() || undefined : '%100 üniversite',
      status: 'bildirim',
      events: [{ at: Date.now(), actor: me.name, text: `Buluş bildirimi yapıldı${f.projectId ? ` (${f.projectId} projesinden)` : ''}` }],
      createdAt: Date.now(),
    };
    add(inv);
    k.notify(`tto:${me.orgId}`, `Yeni buluş bildirimi: ${inv.title} (${me.name})`, LINK(id), 'ip');
    if (f.coAcademics.length) k.notify(f.coAcademics.map(solverInbox), `${me.name} sizi ortak buluşçu olarak bildirdi: ${inv.title}`, LINK(id), 'ip');
    toast({ title: 'Buluş bildirimi gönderildi', body: `${ttoName(me.orgId)} ön değerlendirme için sizinle iletişime geçecek.` });
    onDone?.(id);
  };

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div>
        <label className="label" htmlFor="ip-title">Buluşun başlığı</label>
        <input id="ip-title" className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="ör. Döküm kalıbı için hızlı soğutma kanalı" aria-invalid={touched && !titleOk} />
        {touched && !titleOk && <p className="mt-1 text-xs text-rose-600">En az 5 karakterlik bir başlık yazın.</p>}
      </div>
      <div>
        <label className="label" htmlFor="ip-type">Koruma türü</label>
        <select id="ip-type" className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as IpType })}>
          {(Object.keys(IP_TYPE) as IpType[]).map((t) => <option key={t} value={t}>{IP_TYPE[t]}</option>)}
        </select>
        <p className="mt-1 text-xs text-slate-500">Emin değilseniz “Patent” seçin; TTO ön değerlendirmede uygun türü önerir.</p>
      </div>
      <div>
        <label className="label" htmlFor="ip-sum">Kısa özet</label>
        <textarea id="ip-sum" className="input" rows={3} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} placeholder="Buluş hangi sorunu, nasıl çözüyor?" aria-invalid={touched && !summaryOk} />
        {touched && !summaryOk && <p className="mt-1 text-xs text-rose-600">Kısa bir özet yazın (en az 10 karakter).</p>}
      </div>
      <div>
        <label className="label" htmlFor="ip-new">Yeni olan nedir?</label>
        <textarea id="ip-new" className="input" rows={2} value={f.novelty} onChange={(e) => setF({ ...f, novelty: e.target.value })} placeholder="Bilinen çözümlerden farkı" />
      </div>
      <div>
        <label className="label" htmlFor="ip-use">Olası kullanım alanı</label>
        <input id="ip-use" className="input" value={f.usage} onChange={(e) => setF({ ...f, usage: e.target.value })} placeholder="ör. Otomotiv yan sanayi döküm hatları" />
      </div>
      <div>
        <label className="label" htmlFor="ip-proj">İlgili proje</label>
        <select
          id="ip-proj"
          className="input"
          value={f.projectId}
          onChange={(e) => {
            const pf = projectFirm(k.state, e.target.value);
            setF({ ...f, projectId: e.target.value, ...(pf ? { hasFirm: true, firmId: pf } : {}) });
          }}
        >
          <option value="">Projeye bağlı değil</option>
          {myProjects.map((p) => {
            const n = k.state.needs.find((x) => x.id === p.needId);
            return <option key={p.id} value={p.id}>{n?.title ?? p.id} · {n ? firmOf(n.firmId).name : ''}</option>;
          })}
        </select>
        {myProjects.length === 0 && <p className="mt-1 text-xs text-slate-500">Yürüttüğünüz bir sanayi projesi olduğunda buradan seçebilirsiniz.</p>}
      </div>
      <div>
        <label className="label" htmlFor="ip-co">Ortak buluşçular</label>
        {f.coAcademics.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-1.5">
            {f.coAcademics.map((id) => (
              <li key={id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-1 pl-3 pr-1 text-xs font-medium text-blue-700">
                {academicName(k.state, id)}
                <button type="button" className="rounded-full p-0.5 hover:bg-blue-100" aria-label={`Ortak buluşçuyu çıkar: ${academicName(k.state, id)}`} onClick={() => setF({ ...f, coAcademics: f.coAcademics.filter((x) => x !== id) })}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <select id="ip-co" className="input" value="" onChange={(e) => e.target.value && setF({ ...f, coAcademics: [...f.coAcademics, e.target.value] })}>
          <option value="">Akademisyen ekleyin…</option>
          {others.map((a) => <option key={a.id} value={a.id}>{a.name} · {orgOf(a.orgId).short}</option>)}
        </select>
        <input className="input mt-2" aria-label="Dış buluşçular" value={f.external} onChange={(e) => setF({ ...f, external: e.target.value })} placeholder="Üniversite dışı buluşçular (virgülle ayırın)" />
      </div>
      <div className="rounded-xl border border-slate-200 p-3">
        <Toggle checked={f.hasFirm} onChange={(v) => setF({ ...f, hasFirm: v })} label="Firma ortaklığı var" description="Buluş bir firma ile birlikte geliştirildiyse ortak hak sahibi olabilir." />
        {f.hasFirm && (
          <div className="grid gap-3 pb-1 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="ip-firm">Ortak hak sahibi firma</label>
              <select id="ip-firm" className="input" value={f.firmId} onChange={(e) => setF({ ...f, firmId: e.target.value })} aria-invalid={touched && !firmOk}>
                <option value="">Firma seçin…</option>
                {FIRMS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ip-share">Önerilen pay</label>
              <input id="ip-share" className="input" value={f.share} onChange={(e) => setF({ ...f, share: e.target.value })} />
            </div>
            {touched && !firmOk && <p className="text-xs text-rose-600 sm:col-span-2">Ortak hak sahibi firmayı seçin.</p>}
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500">Bildirim gizli tutulur; yalnızca {ttoName(me.orgId)} ve buluşçular görür. Yayın veya sunum öncesi bildirmeniz yenilik şartı için önemlidir.</p>
      <div className="flex justify-end">
        <Button type="submit">
          <Send className="h-4 w-4" /> Bildirimi gönder
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------ Ayrıntı çekmecesi ----------------------------- */

function InventionDrawer({ inv, onClose, canManage, firmView }: { inv: Invention | null; onClose: () => void; canManage: boolean; firmView?: string }) {
  const { k, update } = useIp();
  const toast = useToast();
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [appNo, setAppNo] = useState('');
  const [licensee, setLicensee] = useState('');
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    setNote(inv?.priorArt ?? '');
    setReason('');
    setAppNo('');
    setLicensee(inv?.firmId ?? '');
    setRejecting(false);
    // Yalnızca farklı bir kayıt açıldığında sıfırla
  }, [inv?.id]);

  const open = !!inv;
  const actor = inv ? ttoName(inv.universityId) : '';

  /** Aşama değişikliği: olay kaydı + buluşçulara (ve gerekiyorsa firmaya) bildirim */
  const step = (patch: Partial<Invention>, eventText: string, msg: string, opts?: { firm?: boolean; extra?: string[] }) => {
    if (!inv) return;
    update(inv.id, (x) => ({ ...x, ...patch, events: [...x.events, { at: Date.now(), actor, text: eventText }] }));
    const to = [...inv.inventors.academics.map(solverInbox), ...(opts?.firm && inv.firmId ? [firmInbox(inv.firmId)] : []), ...(opts?.extra ?? [])];
    k.notify(to, `${actor}: ${msg} · ${inv.title}`, LINK(inv.id), 'ip');
    toast({ title: eventText, body: 'Buluşçular bilgilendirildi.' });
  };

  const names = inv ? inventorNames(k.state, inv) : [];
  const relation = inv && firmView ? firmRelation(k.state, inv, firmView) : null;
  const project = inv?.projectId ? k.state.projects.find((p) => p.id === inv.projectId) : undefined;
  const projectNeed = project ? k.state.needs.find((n) => n.id === project.needId) : undefined;
  const role = k.role;

  let actions: ReactNode = null;
  if (inv && canManage) {
    switch (inv.status) {
      case 'bildirim':
        actions = (
          <Button className="w-full" onClick={() => step({ status: 'on_degerlendirme' }, 'Ön değerlendirmeye alındı', 'bildiriminiz ön değerlendirmeye alındı')}>
            <Check className="h-4 w-4" /> Ön değerlendirmeye al
          </Button>
        );
        break;
      case 'on_degerlendirme':
        actions = (
          <Button className="w-full" onClick={() => step({ status: 'arastirma' }, 'Patent araştırması başlatıldı', 'ön değerlendirme olumlu, patent araştırması başladı')}>
            <FileSearch className="h-4 w-4" /> Patent araştırmasını başlat
          </Button>
        );
        break;
      case 'arastirma':
        actions = (
          <div className="space-y-2">
            <label className="label" htmlFor="ip-note">Araştırma notu</label>
            <textarea id="ip-note" className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tekniğin bilinen durumu, benzer başvurular, yenilik değerlendirmesi" />
            <Button className="w-full" disabled={note.trim().length < 5} onClick={() => step({ status: 'karar', priorArt: note.trim() }, 'Patent araştırması tamamlandı', 'patent araştırması tamamlandı, başvuru kararı aşamasında')}>
              <FileSearch className="h-4 w-4" /> Patent araştırması tamamlandı
            </Button>
          </div>
        );
        break;
      case 'karar':
        actions = !inv.decision ? (
          <div className="space-y-2">
            {!rejecting ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Button onClick={() => step({ decision: 'basvur' }, `Başvuru kararı verildi · ${IP_TYPE[inv.type].toLocaleLowerCase('tr')}`, 'başvuru kararı verildi', { firm: true })}>
                  <Gavel className="h-4 w-4" /> Başvuru kararı: başvur
                </Button>
                <Button variant="secondary" onClick={() => setRejecting(true)}>
                  Başvuru kararı: reddet
                </Button>
              </div>
            ) : (
              <>
                <label className="label" htmlFor="ip-reason">Ret gerekçesi</label>
                <textarea id="ip-reason" className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ör. Yenilik şartı karşılanmıyor; makale olarak yayımlanması önerilir." />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button variant="secondary" onClick={() => setRejecting(false)}>Vazgeç</Button>
                  <Button variant="danger" disabled={reason.trim().length < 5} onClick={() => step({ status: 'reddedildi', rejectReason: reason.trim() }, 'Başvuru yapılmamasına karar verildi', `başvuru yapılmamasına karar verildi (${reason.trim()})`, { firm: true })}>
                    Reddi onayla
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : inv.type === 'yazilim' ? (
          <Button className="w-full" onClick={() => step({ status: 'tescil', granted: true }, 'Eser kaydı yapıldı', 'yazılım için eser kaydı yapıldı', { firm: true })}>
            <Award className="h-4 w-4" /> Eser kaydı yapıldı
          </Button>
        ) : (
          <div className="space-y-2">
            <label className="label" htmlFor="ip-appno">Başvuru numarası</label>
            <input id="ip-appno" className="input" value={appNo} onChange={(e) => setAppNo(e.target.value)} placeholder="ör. 2026/0XXXXX (örnek)" />
            <Button className="w-full" disabled={appNo.trim().length < 4} onClick={() => step({ status: 'basvuru', applicationNo: appNo.trim() }, `TÜRKPATENT başvurusu yapıldı · ${appNo.trim()}`, `TÜRKPATENT başvurusu yapıldı (${appNo.trim()})`, { firm: true })}>
              <Send className="h-4 w-4" /> TÜRKPATENT başvurusu yapıldı
            </Button>
          </div>
        );
        break;
      case 'basvuru':
      case 'tescil':
        actions = (
          <div className="space-y-3">
            {inv.status === 'basvuru' && (
              <Button className="w-full" onClick={() => step({ status: 'tescil', granted: true }, 'Tescil edildi', 'buluş tescil edildi', { firm: true })}>
                <Award className="h-4 w-4" /> Tescil edildi
              </Button>
            )}
            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              <label className="label" htmlFor="ip-lic">Lisans alan firma</label>
              <select id="ip-lic" className="input" value={licensee} onChange={(e) => setLicensee(e.target.value)}>
                <option value="">Firma seçin…</option>
                {FIRMS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
              <Button
                variant="secondary"
                className="w-full"
                disabled={!licensee}
                onClick={() => step({ status: 'lisans', licenseeId: licensee }, `Lisanslandı · ${firmOf(licensee).name}`, `buluş ${firmOf(licensee).name} firmasına lisanslandı`, { firm: true, extra: [firmInbox(licensee)] })}
              >
                <Handshake className="h-4 w-4" /> Lisanslandı
              </Button>
            </div>
          </div>
        );
        break;
      default:
        actions = null;
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Buluş ayrıntısı" footer={actions ?? undefined}>
      {inv && (
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={inv.type} />
              <IpStatusChip status={inv.status} />
            </div>
            <h3 className="mt-2 font-display text-lg font-bold leading-snug text-slate-900">{inv.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{inv.summary}</p>
          </div>

          <ol className="grid grid-cols-2 gap-1.5 text-xs" aria-label="Süreç aşamaları">
            {IP_STAGES.map((s, i) => {
              const idx = IP_STAGES.findIndex((x) => x.key === inv.status);
              const done = inv.status !== 'reddedildi' && i < idx;
              const cur = s.key === inv.status;
              return (
                <li key={s.key} className={cn('flex items-center gap-1.5 rounded-lg border px-2 py-1.5', cur ? 'border-primary-300 bg-primary-50 font-semibold text-slate-900' : done ? 'border-emerald-200 bg-emerald-50/60 text-slate-700' : 'border-slate-200 text-slate-400')}>
                  <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold', done ? 'bg-emerald-500 text-white' : cur ? 'bg-primary-500 text-white' : 'bg-slate-200 text-slate-500')}>{done ? <Check className="h-2.5 w-2.5" /> : i + 1}</span>
                  {s.label}
                </li>
              );
            })}
          </ol>
          {inv.status === 'reddedildi' && <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600">Başvuru yapılmadı{inv.rejectReason ? `: ${inv.rejectReason}` : '.'}</p>}

          {relation && (
            <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-700">Hak sahipliği</div>
              <div className="mt-1">{relation}</div>
              <p className="mt-1 text-xs text-blue-800/80">Başvuru, tescil ve lisans adımları {ttoName(inv.universityId)} tarafından yürütülür; bu görünüm salt okunurdur.</p>
            </div>
          )}

          <dl className="space-y-3 text-sm">
            <Row label="Buluşçular">{names.join(', ')}</Row>
            <Row label="Kurum">{orgOf(inv.universityId).name} · {ttoName(inv.universityId)}</Row>
            {inv.novelty && <Row label="Yeni olan">{inv.novelty}</Row>}
            {inv.usage && <Row label="Kullanım alanı">{inv.usage}</Row>}
            {inv.firmId && <Row label="Ortak hak sahibi">{firmOf(inv.firmId).name}</Row>}
            {inv.share && <Row label="Pay">{inv.share}</Row>}
            {projectNeed && project && (
              <Row label="İlgili proje">
                {role === 'osb' || role === 'teknokent' ? projectNeed.title : <Link className="font-semibold text-primary-600 hover:underline" to={`/kopru/${role}/projeler/${project.id}`}>{projectNeed.title}</Link>}
              </Row>
            )}
            {inv.priorArt && <Row label="Araştırma notu">{inv.priorArt}</Row>}
            {inv.applicationNo && <Row label="Başvuru no">{inv.applicationNo}</Row>}
            {inv.licenseeId && <Row label="Lisans alan">{firmOf(inv.licenseeId).name}</Row>}
          </dl>

          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Olay kaydı</div>
            <Timeline events={inv.events} />
          </div>
        </div>
      )}
    </Drawer>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="min-w-0 text-slate-800">{children}</dd>
    </div>
  );
}

/* ---------------------------------- Sayfa ---------------------------------- */

function Pipeline({ items, onOpen }: { items: Invention[]; onOpen: (id: string) => void }) {
  const [filter, setFilter] = useState<IpStatus | 'all'>('all');
  const stages: (IpStatus | 'all')[] = ['all', ...IP_STAGES.map((s) => s.key), 'reddedildi'];
  const count = (s: IpStatus | 'all') => (s === 'all' ? items.length : items.filter((i) => i.status === s).length);
  const rejected = items.filter((i) => i.status === 'reddedildi');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Aşamaya göre filtrele">
        {stages.map((s) => (
          <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>
            {s === 'all' ? 'Tümü' : s === 'reddedildi' ? 'Reddedildi' : IP_STAGES.find((x) => x.key === s)!.label}
            <span className="tabular-nums text-slate-400">{count(s)}</span>
          </Chip>
        ))}
      </div>
      {filter === 'all' ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {IP_COLUMNS.map((c) => {
              const list = items.filter((i) => c.statuses.includes(i.status));
              return (
                <section key={c.key} className="min-w-0 rounded-2xl bg-slate-100/70 p-3" aria-label={c.label}>
                  <div className="mb-3 flex items-center justify-between px-1">
                    <h3 className="text-sm font-semibold text-slate-700">{c.label}</h3>
                    <span className="text-xs font-semibold text-slate-500">{list.length}</span>
                  </div>
                  <div className="space-y-2">
                    {list.map((inv) => <InventionCard key={inv.id} inv={inv} onOpen={() => onOpen(inv.id)} />)}
                    {list.length === 0 && <p className="px-1 py-4 text-center text-xs text-slate-400">Bu aşamada kayıt yok</p>}
                  </div>
                </section>
              );
            })}
          </div>
          {rejected.length > 0 && (
            <details className="rounded-2xl border border-slate-200 bg-white/60 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-600">Başvuru yapılmayan bildirimler ({rejected.length})</summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">{rejected.map((inv) => <InventionCard key={inv.id} inv={inv} onOpen={() => onOpen(inv.id)} />)}</div>
            </details>
          )}
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.filter((i) => i.status === filter).map((inv) => <InventionCard key={inv.id} inv={inv} onOpen={() => onOpen(inv.id)} />)}
          {count(filter) === 0 && <p className="col-span-full rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">Bu aşamada kayıt yok.</p>}
        </div>
      )}
    </div>
  );
}

function SummaryStats({ items }: { items: Invention[] }) {
  const s = ipSummary(items);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Toplam" value={s.total} hint={`${s.active} değerlendirmede`} />
      <Stat label="Başvuruda" value={s.basvuru} />
      <Stat label="Tescilli" value={s.tescil} />
      <Stat label="Lisanslı" value={s.lisans} />
    </div>
  );
}

export function IpPage() {
  const { role } = useParams() as { role: Role };
  const { k, items } = useIp();
  const [params, setParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [uni, setUni] = useState<string>('all');
  const openId = params.get('b');
  const visible = useMemo(() => visibleFor(k.state, role, items), [k.state, role, items]);
  const current = openId ? visible.find((i) => i.id === openId) ?? null : null;
  const open = (id: string) => setParams((p) => { p.set('b', id); return p; }, { replace: true });
  const close = () => setParams((p) => { p.delete('b'); return p; }, { replace: true });

  const wrap = (header: ReactNode, body: ReactNode) => (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      {header}
      {body}
      <LegalNote />
    </div>
  );

  /* OSB / teknokent: yalnızca özet sayılar */
  if (role === 'osb' || role === 'teknokent') {
    const orgId = k.state.orgSel[role];
    const org = orgOf(orgId);
    const firmIds = FIRMS.filter((f) => f.orgId === orgId).map((f) => f.id);
    const firmLinked = items.filter((i) => (i.firmId && firmIds.includes(i.firmId)) || (i.licenseeId && firmIds.includes(i.licenseeId)));
    const uniItems = org.universityId ? items.filter((i) => i.universityId === org.universityId) : [];
    return wrap(
      <PageHeader title="Fikri mülkiyet özeti" description={`${org.short} firmalarının taraf olduğu buluşlar. Ayrıntılar gizlilik gereği yalnızca TTO ve hak sahiplerince görülür.`} />,
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Firma ortaklı buluş" value={firmLinked.filter((i) => i.firmId && firmIds.includes(i.firmId)).length} hint={role === 'osb' ? 'Bölge firmaları ortak hak sahibi' : 'Teknokent firmaları ortak hak sahibi'} />
        <Stat label="Lisans alan firma" value={firmLinked.filter((i) => i.licenseeId && firmIds.includes(i.licenseeId)).length} hint="Üniversiteden lisans" />
        <Stat label="Başvuru / tescil" value={firmLinked.filter((i) => ['basvuru', 'tescil', 'lisans'].includes(i.status)).length} />
        {org.universityId ? <Stat label={`${orgOf(org.universityId).short} portföyü`} value={uniItems.length} hint={`${ipSummary(uniItems).lisans} lisanslı`} /> : <Stat label="Değerlendirmede" value={firmLinked.filter((i) => ['bildirim', 'on_degerlendirme', 'arastirma', 'karar'].includes(i.status)).length} />}
      </div>,
    );
  }

  /* Akademisyen: kendi bildirimleri + yeni bildirim */
  if (role === 'akademisyen') {
    const me = k.state.academics.find((a) => a.id === ME)!;
    return wrap(
      <PageHeader
        title="Buluş bildirimlerim"
        description={`Araştırmanızdan doğan buluşları ${ttoName(me.orgId)}’ye bildirin; ön değerlendirme, patent araştırması ve başvuru süreci TTO tarafından yürütülür.`}
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> Buluş bildirimi yap
          </Button>
        }
      />,
      <>
        {visible.length === 0 ? (
          <EmptyState icon={<Lightbulb className="h-6 w-6" />} title="Henüz buluş bildiriminiz yok" description="Yayın veya sunum öncesinde bildirmeniz, yenilik şartını korumak için önemlidir." action={<Button onClick={() => setFormOpen(true)}>Buluş bildirimi yap</Button>} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((inv) => <InventionCard key={inv.id} inv={inv} onOpen={() => open(inv.id)} />)}
          </div>
        )}
        <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Buluş bildirimi" className="sm:!max-w-2xl">
          <InventionForm
            onDone={(id) => {
              setFormOpen(false);
              open(id);
            }}
          />
        </Modal>
        <InventionDrawer inv={current} onClose={close} canManage={false} />
      </>,
    );
  }

  /* Firma / teknokent firması: salt okunur hak sahipliği görünümü */
  if (role === 'firma' || role === 'tfirma') {
    const fid = PERSONAS[role].firmId;
    return wrap(
      <PageHeader title="Fikri mülkiyet" description="Projelerinizden doğan, ortak hak sahibi olduğunuz veya lisans aldığınız buluşlar." />,
      <>
        {visible.length === 0 ? (
          <EmptyState icon={<Lightbulb className="h-6 w-6" />} title="Henüz taraf olduğunuz bir buluş yok" description="Üniversite ile yürüttüğünüz projelerden buluş doğarsa ve hak sahipliğiniz olursa burada görünür." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((inv) => (
              <InventionCard
                key={inv.id}
                inv={inv}
                onOpen={() => open(inv.id)}
                extra={<div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"><Building2 className="h-3.5 w-3.5" /> {firmRelation(k.state, inv, fid)}</div>}
              />
            ))}
          </div>
        )}
        <InventionDrawer inv={current} onClose={close} canManage={false} firmView={fid} />
      </>,
    );
  }

  /* TTO: seçili üniversitenin portföyü · Platform: tüm üniversiteler */
  const isPlatform = role === 'platform';
  const shown = isPlatform && uni !== 'all' ? visible.filter((i) => i.universityId === uni) : visible;
  const fresh = shown.filter((i) => i.status === 'bildirim').length;
  return wrap(
    <PageHeader
      title={isPlatform ? 'Fikri mülkiyet · tüm ağ' : `Fikri mülkiyet portföyü · ${ttoName(k.state.orgSel.tto)}`}
      description={isPlatform ? 'Üniversitelerin buluş bildirimleri, başvuruları, tescil ve lisansları.' : `Buluş bildirimlerini aşama aşama yürütün. ${fresh ? `${fresh} yeni bildirim ön değerlendirme bekliyor.` : 'Bekleyen yeni bildirim yok.'}`}
      actions={
        isPlatform ? (
          <select className="input !w-auto !py-2.5" value={uni} onChange={(e) => setUni(e.target.value)} aria-label="Üniversite">
            <option value="all">Tüm üniversiteler</option>
            {orgsOfType('universite').map((o) => <option key={o.id} value={o.id}>{o.short} · {o.city}</option>)}
          </select>
        ) : undefined
      }
    />,
    <>
      <SummaryStats items={shown} />
      {isPlatform && (
        <Card title="Üniversite kırılımı" description="Buluş portföyü ve ticarileşme durumu">
          <ul className="divide-y divide-slate-100">
            {orgsOfType('universite').map((o) => {
              const s = ipSummary(items.filter((i) => i.universityId === o.id));
              return (
                <li key={o.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" className="text-left text-sm font-semibold text-slate-900 hover:text-primary-600" onClick={() => setUni(o.id)} aria-label={`${o.short} portföyünü göster`}>
                    {o.name} <span className="font-normal text-slate-500">· {o.tto}</span>
                  </button>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs text-slate-500 sm:w-80">
                    {[
                      ['Toplam', s.total],
                      ['Başvuru', s.basvuru],
                      ['Tescil', s.tescil],
                      ['Lisans', s.lisans],
                    ].map(([l, v]) => (
                      <div key={l} className="rounded-lg bg-slate-50 py-1.5">
                        <div className="font-display text-base font-bold text-slate-900">{v}</div>
                        {l}
                      </div>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      {shown.length === 0 ? (
        <EmptyState icon={<Lightbulb className="h-6 w-6" />} title="Portföyde kayıt yok" description="Akademisyenler buluş bildirdiğinde burada aşama aşama izlenir." />
      ) : (
        <Pipeline items={shown} onOpen={open} />
      )}
      {!isPlatform && (
        <p className="flex items-start gap-2 text-xs text-slate-500">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> Her adım olay kaydına işlenir ve buluşçulara bildirim gider; başvuru, tescil ve lisans adımlarında ortak hak sahibi firma da bilgilendirilir.
        </p>
      )}
      <InventionDrawer inv={current} onClose={close} canManage={role === 'tto'} />
    </>,
  );
}

/* ------------------------------ Proje sayfası kartı ----------------------------- */

export function ProjectIp({ projectId }: { projectId: string }) {
  const { role } = useParams() as { role: Role };
  const { k, items } = useIp();
  const [formOpen, setFormOpen] = useState(false);
  const p = k.state.projects.find((x) => x.id === projectId);
  if (!p) return null;
  const list = items.filter((i) => i.projectId === projectId);
  const isSolverMe = role === 'akademisyen' && p.solverId === ME;
  const firmId = role === 'firma' || role === 'tfirma' ? PERSONAS[role].firmId : null;
  const hasPage = role !== 'osb' && role !== 'teknokent';
  if (!list.length && !isSolverMe) return null;

  return (
    <Card title="Fikri mülkiyet" description={list.length ? 'Bu projeden doğan buluşlar' : undefined}>
      {list.length === 0 ? (
        <p className="text-sm text-slate-500">Bu projede patentlenebilir bir çözüm, yöntem veya yazılım ortaya çıktıysa yayımlamadan önce TTO’ya bildirin.</p>
      ) : (
        <ul className="space-y-3">
          {list.map((inv) => {
            const rel = firmId ? firmRelation(k.state, inv, firmId) : null;
            return (
              <li key={inv.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <TypeBadge type={inv.type} />
                  <IpStatusChip status={inv.status} />
                </div>
                <div className="mt-1.5 text-sm font-semibold leading-snug text-slate-900">
                  {hasPage ? <Link to={`/kopru/${role}/${LINK(inv.id)}`} className="hover:text-primary-600">{inv.title}</Link> : inv.title}
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <Users className="h-3 w-3" aria-hidden /> {inventorNames(k.state, inv).join(', ')}
                </div>
                {firmId && (
                  <div className="mt-2 rounded-lg bg-blue-50 px-2 py-1.5 text-xs text-blue-800">
                    <span className="font-semibold">Hak sahipliği:</span> {rel ?? (inv.share ? inv.share : 'Üniversite')}
                  </div>
                )}
                {!firmId && inv.share && <div className="mt-1 text-xs text-slate-500">Pay: {inv.share}</div>}
                {inv.firmId && !firmId && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <Avatar name={firmOf(inv.firmId).name} brand={firmOf(inv.firmId).brand} size={16} square /> Ortak hak sahibi: {firmOf(inv.firmId).name}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {isSolverMe && (
        <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => setFormOpen(true)}>
          <Lightbulb className="h-4 w-4" /> Bu projeden buluş bildirimi
        </Button>
      )}
      {isSolverMe && (
        <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Buluş bildirimi" className="sm:!max-w-2xl">
          <InventionForm defaultProjectId={projectId} onDone={() => setFormOpen(false)} />
        </Modal>
      )}
    </Card>
  );
}

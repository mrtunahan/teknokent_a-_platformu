/**
 * Laboratuvar hizmetleri: fiyat listesi, analiz talebi, randevu, numune ve sonuç raporu.
 * SÖZLEŞME:
 *  - LabsPage(): rota "laboratuvar" (firma/tfirma: talep; akademisyen: kendi laboratuvarına gelen talepler; tto/platform: tümü)
 *  - LabRequestButton({ labId }): rehberdeki laboratuvar kartında "Analiz talep et"
 */
import { Building2, CalendarClock, Check, ChevronDown, Coins, Download, FileUp, FlaskConical, Gauge, Inbox, MapPin, Search, Send, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, EmptyState, Modal } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { cn, fileSize, timeAgo } from '@/lib/utils';
import { CITIES, LABS, PERSONAS, firmOf, labOf, orgOf, orgsOfType, ttoName, type Role } from '../data';
import { useKopru } from '../store';
import { Avatar, Card, Stat, Timeline, fmtTL } from '../ui';
import {
  ACTIVE,
  LAB_CAPACITY,
  LAB_FLOW,
  LAB_STATUS,
  UNIT_LABEL,
  amountOf,
  canFirmAct,
  canLabAct,
  downloadReport,
  fmtDate,
  fromDateInput,
  labOwners,
  labReqInScope,
  qtyLabel,
  requesterFirmOf,
  serviceOf,
  servicesOf,
  toDateInput,
  useLab,
  type LabReqStatus,
  type LabRequest,
} from './lab-data';

// Tarayıcı depolama kotası (~5 MB) dolmasın diye küçük tutulur
const MAX_REPORT = 700 * 1024;

function useRole(): Role {
  const k = useKopru();
  const { role } = useParams() as { role?: Role };
  return role ?? k.role;
}

function StatusBadge({ status }: { status: LabReqStatus }) {
  return <span className={cn('inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1', LAB_STATUS[status].tone)}>{LAB_STATUS[status].label}</span>;
}

/* ------------------------------ Talep formu -------------------------------- */

function LabRequestModal({ open, onClose, labId, serviceId }: { open: boolean; onClose: () => void; labId: string; serviceId?: string }) {
  const lab = useLab();
  const role = useRole();
  const toast = useToast();
  const navigate = useNavigate();
  const services = servicesOf(labId);
  const [sid, setSid] = useState(serviceId ?? services[0]?.id ?? '');
  const [qty, setQty] = useState('1');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const s = serviceOf(sid);
  const n = Math.max(0, Math.floor(Number(qty) || 0));
  const total = s ? lab.priceOf(s) * n : 0;
  const l = labOf(labId);

  return (
    <Modal open={open} onClose={onClose} title={`Analiz talebi · ${l.name}`}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!s || n < 1) return;
          const id = lab.create({ labId, serviceId: s.id, qty: n, note: note.trim(), preferredAt: fromDateInput(date) });
          if (!id) return;
          onClose();
          setQty('1');
          setNote('');
          setDate('');
          toast({
            title: 'Analiz talebiniz iletildi',
            body: `${l.name} sorumlusu teklif hazırlayacak; teklif geldiğinde bildirim alacaksınız.`,
            action: { label: 'Taleplerime git', onClick: () => navigate(`/kopru/${role}/laboratuvar`) },
          });
        }}
      >
        <p className="text-sm text-slate-500">
          {orgOf(l.universityId).short} · {l.department} · {orgOf(l.universityId).city}
        </p>
        <div>
          <label className="label" htmlFor="lr-svc">Hizmet</label>
          <select id="lr-svc" className="input" value={sid} onChange={(e) => setSid(e.target.value)}>
            {services.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name} · {fmtTL(lab.priceOf(x))} / {UNIT_LABEL[x.unit]}
              </option>
            ))}
          </select>
          {s && <p className="mt-1.5 text-xs text-slate-500">Numune koşulu: {s.condition}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="lr-qty">{qtyLabel(s)}</label>
            <input id="lr-qty" type="number" min={1} max={500} inputMode="numeric" className="input" value={qty} onChange={(e) => setQty(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="lr-date">Tercih edilen tarih</label>
            <input id="lr-date" type="date" className="input" min={toDateInput(Date.now())} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="lr-note">Açıklama</label>
          <textarea id="lr-note" rows={3} className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Numunenin ne olduğu, neyi öğrenmek istediğiniz, varsa standart veya müşteri şartı" />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-primary-50 px-4 py-3" aria-live="polite">
          <div className="text-xs text-primary-800">
            Tahmini tutar
            <div className="text-[11px] text-primary-700/80">{s ? `${fmtTL(lab.priceOf(s))} × ${n} ${UNIT_LABEL[s.unit]} · KDV hariç, örnek fiyat` : ''}</div>
          </div>
          <div className="font-display text-xl font-extrabold tabular-nums text-primary-700" data-testid="lab-estimate">{fmtTL(total)}</div>
        </div>
        {s && <p className="text-xs text-slate-500">Tipik süre: {s.days} iş günü. Kesin tutar ve süre laboratuvar sorumlusunun teklifinde belirtilir.</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Vazgeç</Button>
          <Button type="submit" disabled={!s || n < 1}>
            <Send className="h-4 w-4" /> Talebi gönder
          </Button>
        </div>
      </form>
    </Modal>
  );
}


export function LabRequestButton({ labId }: { labId: string }) {
  const role = useRole();
  const [open, setOpen] = useState(false);
  if (!requesterFirmOf(role)) return null;
  return (
    <>
      <Button size="sm" className="mt-3" onClick={() => setOpen(true)}>
        <FlaskConical className="h-4 w-4" /> Analiz talep et
      </Button>
      {open && <LabRequestModal open={open} onClose={() => setOpen(false)} labId={labId} />}
    </>
  );
}

/* ------------------------------- Talep kartı ------------------------------- */

function Progress({ status }: { status: LabReqStatus }) {
  if (status === 'iptal') return null;
  const idx = LAB_FLOW.indexOf(status);
  return (
    <div className="mt-4">
      <ol className="flex gap-1" aria-label={`Durum: ${LAB_STATUS[status].label} (${idx + 1}/${LAB_FLOW.length})`}>
        {LAB_FLOW.map((s, i) => (
          <li key={s} className="min-w-0 flex-1">
            <div className={cn('h-1.5 rounded-full', i < idx || status === 'tamamlandi' ? 'bg-emerald-500' : i === idx ? 'bg-primary-500' : 'bg-slate-200')} />
            <div className={cn('mt-1 hidden truncate text-[10px] font-semibold sm:block', i === idx ? 'text-primary-700' : i < idx ? 'text-emerald-700' : 'text-slate-400')}>{LAB_STATUS[s].step}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm text-slate-900">{children}</div>
    </div>
  );
}

function RequestCard({ r }: { r: LabRequest }) {
  const k = useKopru();
  const role = useRole();
  const lab = useLab();
  const toast = useToast();
  const s = serviceOf(r.serviceId);
  const l = labOf(r.labId);
  const firm = firmOf(r.firmId);
  const labSide = canLabAct(k.state, role, r);
  const firmSide = canFirmAct(role, r);
  const [showHistory, setShowHistory] = useState(false);
  const [offering, setOffering] = useState(false);
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [appt, setAppt] = useState(toDateInput(r.appointmentAt ?? r.preferredAt));
  const [uploading, setUploading] = useState(false);
  const unit = s ? UNIT_LABEL[s.unit] : 'numune';
  const defaultAmount = s ? lab.priceOf(s) * r.qty : 0;

  return (
    <article className="glass rounded-2xl p-4 sm:p-5" aria-label={`${s?.name ?? 'Analiz'} · ${firm.name}`}>
      <div className="flex items-start gap-3">
        <Avatar name={firm.name} brand={firm.brand} size={40} square />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="min-w-0 font-semibold text-slate-900">{s?.name ?? 'Analiz'}</h3>
            <StatusBadge status={r.status} />
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {firm.name} → {l.name} · {orgOf(l.universityId).short} · {timeAgo(r.createdAt)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Info label="Miktar">{r.qty} {unit}</Info>
        <Info label="Tercih tarihi">{fmtDate(r.preferredAt)}</Info>
        <Info label="Teklif">{r.offer ? `${fmtTL(r.offer.amount)} · ${r.offer.days} iş günü` : <span className="text-slate-400">Bekleniyor</span>}</Info>
        <Info label="Randevu">{r.appointmentAt ? fmtDate(r.appointmentAt) : <span className="text-slate-400">—</span>}</Info>
      </div>
      {r.note && <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">{r.note}</p>}
      {r.offer?.note && <p className="mt-2 text-xs text-slate-500">Teklif notu: {r.offer.note}</p>}

      <Progress status={r.status} />

      {/* Rapor */}
      {r.report && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
          <FileUp className="h-5 w-5 text-emerald-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-900">{r.report.name}</div>
            <div className="text-xs text-slate-500">{fmtDate(r.report.at, true)}{r.report.summary ? ` · ${r.report.summary.slice(0, 90)}${r.report.summary.length > 90 ? '…' : ''}` : ''}</div>
          </div>
          {(firmSide || labSide || role === 'platform') && (
            <Button size="sm" variant="secondary" onClick={() => downloadReport(r)}>
              <Download className="h-4 w-4" /> Raporu indir
            </Button>
          )}
        </div>
      )}

      {/* Firma işlemleri */}
      {firmSide && r.status === 'teklif' && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-blue-50 p-3">
          <p className="flex-1 text-sm text-blue-900">
            Teklif: <strong>{fmtTL(r.offer?.amount)}</strong> · {r.offer?.days} iş günü (KDV hariç)
          </p>
          <Button size="sm" variant="secondary" onClick={() => { lab.reject(r.id); toast({ title: 'Teklif reddedildi', tone: 'info' }); }}>
            <X className="h-4 w-4" /> Teklifi reddet
          </Button>
          <Button size="sm" onClick={() => { lab.accept(r.id); toast({ title: 'Teklif onaylandı', body: 'Laboratuvar numune kabul randevusunu bildirecek.' }); }}>
            <Check className="h-4 w-4" /> Teklifi onayla
          </Button>
        </div>
      )}
      {firmSide && r.status === 'talep' && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">Laboratuvar sorumlusunun teklifi bekleniyor.</p>
          <Button size="sm" variant="ghost" onClick={() => { lab.cancel(r.id); toast({ title: 'Talep iptal edildi', tone: 'info' }); }}>
            Talebi iptal et
          </Button>
        </div>
      )}
      {firmSide && r.status === 'onaylandi' && (
        <p className="mt-4 text-xs text-slate-500">
          {r.appointmentAt ? `Numunelerinizi ${fmtDate(r.appointmentAt)} tarihinde ${l.name}’na teslim edin.` : 'Laboratuvar numune kabul randevusunu bildirecek.'}
        </p>
      )}

      {/* Laboratuvar işlemleri */}
      {labSide && r.status === 'talep' && !offering && (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => { lab.decline(r.id); toast({ title: 'Talep reddedildi', tone: 'info' }); }}>
            Talebi reddet
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setAmount(String(defaultAmount));
              setDays(String(s?.days ?? 5));
              setOffering(true);
            }}
          >
            <Coins className="h-4 w-4" /> Teklif ver
          </Button>
        </div>
      )}
      {labSide && r.status === 'talep' && offering && (
        <form
          className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_2fr]"
          onSubmit={(e) => {
            e.preventDefault();
            const a = Number(amount);
            const d = Number(days);
            if (!(a > 0) || !(d > 0)) return;
            lab.offer(r.id, { amount: Math.round(a), days: Math.round(d), note: offerNote.trim() || undefined });
            setOffering(false);
            toast({ title: 'Teklif gönderildi', body: `${firm.name} bilgilendirildi.` });
          }}
        >
          <div>
            <label className="label" htmlFor={`of-amt-${r.id}`}>Teklif tutarı (₺)</label>
            <input id={`of-amt-${r.id}`} type="number" min={1} className="input !py-2.5" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <p className="mt-1 text-[11px] text-slate-500">Katalog: {fmtTL(s ? lab.priceOf(s) : 0)} × {r.qty}</p>
          </div>
          <div>
            <label className="label" htmlFor={`of-days-${r.id}`}>Süre (iş günü)</label>
            <input id={`of-days-${r.id}`} type="number" min={1} className="input !py-2.5" value={days} onChange={(e) => setDays(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor={`of-note-${r.id}`}>Not</label>
            <input id={`of-note-${r.id}`} className="input !py-2.5" value={offerNote} onChange={(e) => setOfferNote(e.target.value)} placeholder="ör. Numune hazırlama dahil" />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-3">
            <Button type="button" size="sm" variant="secondary" onClick={() => setOffering(false)}>Vazgeç</Button>
            <Button type="submit" size="sm">
              <Send className="h-4 w-4" /> Teklifi gönder
            </Button>
          </div>
        </form>
      )}
      {labSide && r.status === 'teklif' && <p className="mt-4 text-xs text-slate-500">Teklifiniz firmanın onayında.</p>}
      {labSide && r.status === 'onaylandi' && (
        <div className="mt-4 flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3">
          <div className="min-w-[180px] flex-1">
            <label className="label" htmlFor={`ap-${r.id}`}>Randevu / numune kabul tarihi</label>
            <input id={`ap-${r.id}`} type="date" className="input !py-2.5" value={appt} onChange={(e) => setAppt(e.target.value)} />
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={!appt}
            onClick={() => {
              const t = fromDateInput(appt);
              if (!t) return;
              lab.schedule(r.id, t);
              toast({ title: 'Randevu kaydedildi', body: `${firm.name} bilgilendirildi.` });
            }}
          >
            <CalendarClock className="h-4 w-4" /> Randevu tarihini kaydet
          </Button>
          <Button size="sm" disabled={!r.appointmentAt} title={r.appointmentAt ? undefined : 'Önce randevu tarihini kaydedin'} onClick={() => { lab.receive(r.id); toast({ title: 'Numune teslim alındı' }); }}>
            <Check className="h-4 w-4" /> Numune teslim alındı
          </Button>
        </div>
      )}
      {labSide && r.status === 'numune' && (
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => { lab.startAnalysis(r.id); toast({ title: 'Analize başlandı' }); }}>
            <Gauge className="h-4 w-4" /> Analize başlandı
          </Button>
        </div>
      )}
      {labSide && (r.status === 'analiz' || r.status === 'rapor') && (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {r.status === 'analiz' && (
            <Button size="sm" variant="secondary" onClick={() => { lab.finishAnalysis(r.id); toast({ title: 'Analiz tamamlandı', body: 'Rapor hazırlanıyor olarak işaretlendi.' }); }}>
              Analiz tamamlandı
            </Button>
          )}
          <Button size="sm" onClick={() => setUploading(true)}>
            <FileUp className="h-4 w-4" /> Raporu yükle
          </Button>
        </div>
      )}

      <button type="button" onClick={() => setShowHistory((v) => !v)} aria-expanded={showHistory} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900">
        <ChevronDown className={cn('h-3.5 w-3.5 transition', showHistory && 'rotate-180')} /> {showHistory ? 'Geçmişi gizle' : 'Geçmişi göster'} ({r.events.length})
      </button>
      {showHistory && (
        <div className="mt-3">
          <Timeline events={r.events} />
        </div>
      )}
      {uploading && <ReportUpload r={r} onClose={() => setUploading(false)} />}
    </article>
  );
}

function ReportUpload({ r, onClose }: { r: LabRequest; onClose: () => void }) {
  const lab = useLab();
  const toast = useToast();
  const [file, setFile] = useState<{ name: string; dataUrl: string; size: number } | null>(null);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const s = serviceOf(r.serviceId);
  return (
    <Modal open onClose={onClose} title="Analiz raporunu yükle">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!file && !summary.trim()) {
            setError('Bir rapor dosyası seçin veya sonuç özetini yazın.');
            return;
          }
          const base = `${firmOf(r.firmId).name.split(' ')[0]}-${(s?.name ?? 'analiz').split(' ')[0]}-raporu`.replace(/\s+/g, '-');
          lab.uploadReport(r.id, file ? { name: file.name, dataUrl: file.dataUrl, summary: summary.trim() || undefined } : { name: `${base}.txt`, summary: summary.trim() });
          onClose();
          toast({ title: 'Rapor yüklendi', body: 'Talep tamamlandı; firma ve TTO bilgilendirildi.' });
        }}
      >
        <p className="text-sm text-slate-500">
          {s?.name} · {firmOf(r.firmId).name} · {r.qty} {s ? UNIT_LABEL[s.unit] : ''}
        </p>
        <div>
          <label className="label" htmlFor={`rp-file-${r.id}`}>Rapor dosyası (en fazla 700 KB)</label>
          <input
            id={`rp-file-${r.id}`}
            type="file"
            accept=".pdf,.doc,.docx,.xlsx,.txt,.png,.jpg,.jpeg"
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100"
            onChange={(e) => {
              setError('');
              const f = e.target.files?.[0];
              if (!f) return setFile(null);
              if (f.size > MAX_REPORT) {
                setFile(null);
                e.target.value = '';
                setError(`Dosya ${fileSize(f.size)}; en fazla 700 KB yükleyebilirsiniz. Daha küçük bir dosya seçin veya sonuç özetini yazın.`);
                return;
              }
              const reader = new FileReader();
              reader.onload = () => setFile({ name: f.name, dataUrl: String(reader.result), size: f.size });
              reader.onerror = () => setError('Dosya okunamadı.');
              reader.readAsDataURL(f);
            }}
          />
          {file && <p className="mt-1.5 text-xs text-emerald-700">{file.name} · {fileSize(file.size)} hazır</p>}
        </div>
        <div>
          <label className="label" htmlFor={`rp-sum-${r.id}`}>Sonuç özeti</label>
          <textarea id={`rp-sum-${r.id}`} rows={4} className="input" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Dosya yüklemiyorsanız ölçüm sonuçlarını ve yorumunuzu yazın" />
        </div>
        {error && <p role="alert" className="text-sm font-medium text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Vazgeç</Button>
          <Button type="submit">
            <FileUp className="h-4 w-4" /> Raporu gönder
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------ Talep listesi ------------------------------ */

const FILTERS: (LabReqStatus | 'all' | 'aktif')[] = ['all', 'talep', 'teklif', 'aktif', 'tamamlandi', 'iptal'];
const filterLabel = (f: (typeof FILTERS)[number]) => (f === 'all' ? 'Tümü' : f === 'aktif' ? 'Süren işler' : LAB_STATUS[f].label);
const matchFilter = (f: (typeof FILTERS)[number], r: LabRequest) => f === 'all' || (f === 'aktif' ? ACTIVE.includes(r.status) : r.status === f);

function RequestList({ list, empty }: { list: LabRequest[]; empty: ReactNode }) {
  const [f, setF] = useState<(typeof FILTERS)[number]>('all');
  const shown = list.filter((r) => matchFilter(f, r)).sort((a, b) => (b.events.at(-1)?.at ?? b.createdAt) - (a.events.at(-1)?.at ?? a.createdAt));
  if (!list.length) return <>{empty}</>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Durum filtresi">
        {FILTERS.map((x) => {
          const c = list.filter((r) => matchFilter(x, r)).length;
          return (
            <button key={x} type="button" onClick={() => setF(x)} aria-pressed={f === x} className={cn('rounded-full border px-3 py-1 text-xs font-semibold transition', f === x ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
              {filterLabel(x)} ({c})
            </button>
          );
        })}
      </div>
      {shown.length === 0 ? (
        <p className="glass rounded-2xl p-6 text-center text-sm text-slate-500">Bu filtrede talep yok.</p>
      ) : (
        <div className="space-y-3">{shown.map((r) => <RequestCard key={r.id} r={r} />)}</div>
      )}
    </div>
  );
}

/* ------------------------------ Hizmet kataloğu ---------------------------- */

function Catalog({ editableLabIds = [] }: { editableLabIds?: string[] }) {
  const k = useKopru();
  const role = useRole();
  const lab = useLab();
  const toast = useToast();
  const canRequest = !!requesterFirmOf(role);
  const [q, setQ] = useState('');
  const [labF, setLabF] = useState('');
  const [uni, setUni] = useState('');
  const [city, setCity] = useState('');
  const [req, setReq] = useState<{ labId: string; serviceId: string } | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const ql = q.toLocaleLowerCase('tr');
  const labs = LABS.filter((l) => (!labF || l.id === labF) && (!uni || l.universityId === uni) && (!city || orgOf(l.universityId).city === city))
    .map((l) => ({ l, svcs: servicesOf(l.id).filter((s) => !ql || `${s.name} ${s.condition} ${l.name} ${l.equipment.join(' ')}`.toLocaleLowerCase('tr').includes(ql)) }))
    .filter((x) => x.svcs.length > 0)
    // Düzenlenebilir laboratuvarlar en üstte
    .sort((a, b) => Number(editableLabIds.includes(b.l.id)) - Number(editableLabIds.includes(a.l.id)));

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input className="input !py-2.5 !pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hizmet veya cihaz ara (ör. SEM, raf ömrü, radyografi)" aria-label="Hizmet ara" />
        </div>
        <select className="input !py-2.5" value={labF} onChange={(e) => setLabF(e.target.value)} aria-label="Laboratuvar">
          <option value="">Tüm laboratuvarlar</option>
          {LABS.map((l) => <option key={l.id} value={l.id}>{l.name} · {orgOf(l.universityId).short}</option>)}
        </select>
        <select className="input !py-2.5" value={uni} onChange={(e) => setUni(e.target.value)} aria-label="Üniversite">
          <option value="">Tüm üniversiteler</option>
          {orgsOfType('universite').map((o) => <option key={o.id} value={o.id}>{o.short}</option>)}
        </select>
        <select className="input !py-2.5" value={city} onChange={(e) => setCity(e.target.value)} aria-label="İl">
          <option value="">Tüm iller</option>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <p className="text-xs text-slate-500">Fiyatlar örnektir, KDV hariçtir; kesin tutar laboratuvar sorumlusunun teklifinde belirtilir.</p>

      {labs.length === 0 ? (
        <EmptyState icon={<Search className="h-6 w-6" />} title="Eşleşen hizmet bulunamadı" description="Aramayı veya filtreleri değiştirerek tekrar deneyin." />
      ) : (
        <div className="space-y-4">
          {labs.map(({ l, svcs }) => {
            const editable = editableLabIds.includes(l.id);
            const owners = labOwners(k.state, l.id);
            return (
              <section key={l.id} className="glass rounded-2xl p-4 sm:p-5" aria-label={l.name}>
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                    <FlaskConical className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-bold text-slate-900">{l.name}</h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                      <span>{orgOf(l.universityId).short} · {l.department}</span>
                      <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" aria-hidden /> {orgOf(l.universityId).city}</span>
                      {owners.length > 0 && <span>Sorumlu: {owners.map((o) => o.name).join(', ')}</span>}
                    </div>
                  </div>
                  {editable && <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700 ring-1 ring-primary-200">Laboratuvarınız</span>}
                </div>
                <ul className="mt-4 divide-y divide-slate-100">
                  {svcs.map((s) => (
                    <li key={s.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900">{s.name}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{s.condition}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                        {editable ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              className="input !w-28 !py-2 text-right tabular-nums"
                              aria-label={`Birim fiyat (₺): ${s.name}`}
                              value={draft[s.id] ?? String(lab.priceOf(s))}
                              onChange={(e) => setDraft((d) => ({ ...d, [s.id]: e.target.value }))}
                            />
                            <span className="text-xs text-slate-500">₺ / {UNIT_LABEL[s.unit]}</span>
                          </div>
                        ) : (
                          <div className="text-right">
                            <div className="font-display font-bold tabular-nums text-slate-900">{fmtTL(lab.priceOf(s))}</div>
                            <div className="text-[11px] text-slate-500">/ {UNIT_LABEL[s.unit]} · örnek fiyat</div>
                          </div>
                        )}
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{s.days} iş günü</span>
                        {canRequest && (
                          <Button size="sm" variant="secondary" aria-label={`Talep et: ${s.name}`} onClick={() => setReq({ labId: l.id, serviceId: s.id })}>
                            Talep et
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                {editable && (
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        const changes: Record<string, number> = {};
                        for (const s of servicesOf(l.id)) {
                          const v = draft[s.id];
                          if (v != null && Number(v) >= 0 && v !== '') changes[s.id] = Math.round(Number(v));
                        }
                        lab.setPrices(changes);
                        setDraft({});
                        toast({ title: 'Fiyatlar güncellendi', body: 'Yeni talepler güncel fiyatla hesaplanır.' });
                      }}
                    >
                      <Check className="h-4 w-4" /> Fiyatları kaydet
                    </Button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
      {req && <LabRequestModal open onClose={() => setReq(null)} labId={req.labId} serviceId={req.serviceId} />}
    </div>
  );
}


/* --------------------------------- Özetler --------------------------------- */

function Occupancy({ list, labIds }: { list: LabRequest[]; labIds: string[] }) {
  return (
    <Card title="Laboratuvar doluluğu" description={`Süren işler / örnek kapasite (${LAB_CAPACITY} eşzamanlı iş)`}>
      <ul className="space-y-3">
        {labIds.map((id) => {
          const l = labOf(id);
          const active = list.filter((r) => r.labId === id && ACTIVE.includes(r.status)).length;
          const waiting = list.filter((r) => r.labId === id && (r.status === 'talep' || r.status === 'teklif')).length;
          const pct = Math.min(100, Math.round((active / LAB_CAPACITY) * 100));
          return (
            <li key={id}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-slate-900">{l.name}</span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-600">%{pct}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${l.name} doluluk`}>
                <div className={cn('h-full rounded-full', pct >= 75 ? 'bg-rose-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">{active} süren iş · {waiting} bekleyen talep · {orgOf(l.universityId).short}</div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function revenue(list: LabRequest[]) {
  const done = list.filter((r) => r.status === 'tamamlandi').reduce((a, r) => a + amountOf(r), 0);
  const approved = list.filter((r) => ACTIVE.includes(r.status)).reduce((a, r) => a + amountOf(r), 0);
  return { done, approved, total: done + approved };
}

function Stats({ list }: { list: LabRequest[] }) {
  const rev = revenue(list);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Toplam talep" value={list.length} icon={<Inbox className="h-4 w-4 text-slate-400" />} />
      <Stat label="Teklif bekleyen" value={list.filter((r) => r.status === 'talep').length} />
      <Stat label="Süren iş" value={list.filter((r) => ACTIVE.includes(r.status)).length} />
      <Stat label="Döner sermaye geliri" value={fmtTL(rev.total)} hint={`Tamamlanan ${fmtTL(rev.done)} · onaylı ${fmtTL(rev.approved)}`} icon={<Coins className="h-4 w-4 text-slate-400" />} />
    </div>
  );
}

function Breakdown({ list }: { list: LabRequest[] }) {
  const rows = orgsOfType('universite').map((u) => {
    const l = list.filter((r) => labOf(r.labId).universityId === u.id);
    return { u, n: l.length, active: l.filter((r) => ACTIVE.includes(r.status)).length, done: l.filter((r) => r.status === 'tamamlandi').length, rev: revenue(l).total };
  });
  return (
    <Card title="İl / üniversite kırılımı" description="Döner sermaye geliri: tamamlanan + onaylı teklifler">
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="py-2 font-semibold">Üniversite</th>
              <th className="py-2 font-semibold">İl</th>
              <th className="py-2 text-right font-semibold">Talep</th>
              <th className="py-2 text-right font-semibold">Süren</th>
              <th className="py-2 text-right font-semibold">Tamamlanan</th>
              <th className="py-2 text-right font-semibold">Gelir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((x) => (
              <tr key={x.u.id}>
                <td className="py-2.5 font-medium text-slate-900">{x.u.name}</td>
                <td className="py-2.5 text-slate-600">{x.u.city}</td>
                <td className="py-2.5 text-right tabular-nums">{x.n}</td>
                <td className="py-2.5 text-right tabular-nums">{x.active}</td>
                <td className="py-2.5 text-right tabular-nums">{x.done}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums">{fmtTL(x.rev)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {rows.map((x) => (
          <li key={x.u.id} className="rounded-xl border border-slate-200 p-3">
            <div className="font-semibold text-slate-900">{x.u.short} <span className="font-normal text-slate-500">· {x.u.city}</span></div>
            <div className="mt-1 text-xs text-slate-500">{x.n} talep · {x.active} süren · {x.done} tamamlanan · <strong className="text-slate-900">{fmtTL(x.rev)}</strong></div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ----------------------------------- Sayfa --------------------------------- */

type Tab = 'talepler' | 'katalog';

export function LabsPage() {
  const k = useKopru();
  const role = useRole();
  const lab = useLab();
  const [tab, setTab] = useState<Tab>('talepler');
  const list = useMemo(() => lab.data.requests.filter((r) => labReqInScope(k.state, role, r)), [lab.data.requests, k.state, role]);
  const sel = k.state.orgSel;
  const me = k.state.academics.find((a) => a.id === PERSONAS.akademisyen.academicId);
  const myLabs = role === 'akademisyen' ? me?.labIds ?? [] : [];

  const header = (() => {
    switch (role) {
      case 'firma':
      case 'tfirma':
        return { title: 'Analiz talepleri', description: 'Üniversite laboratuvarlarından analiz ve test hizmeti alın; teklif, randevu ve raporu tek yerden izleyin.' };
      case 'akademisyen':
        return { title: 'Laboratuvarım', description: `${myLabs.map((id) => labOf(id).name).join(', ')} · gelen talepler, teklifler ve hizmet fiyatları` };
      case 'tto':
        return { title: `${ttoName(sel.tto)} · laboratuvar talepleri`, description: `${orgOf(sel.tto).name} laboratuvarlarına gelen sanayi talepleri ve döner sermaye özeti. Laboratuvar adına teklif ve randevu işlemleri yapabilirsiniz.` };
      case 'osb':
        return { title: `${orgOf(sel.osb).short} · firmaların analiz talepleri`, description: 'Bölge firmalarınızın üniversite laboratuvarlarından aldığı hizmetler (salt okunur).' };
      case 'teknokent':
        return { title: `${orgOf(sel.teknokent).short} · firmaların analiz talepleri`, description: 'Teknokent firmalarınızın laboratuvar kullanımları (salt okunur).' };
      default:
        return { title: 'Laboratuvar talepleri', description: 'Ağdaki tüm üniversite laboratuvarlarına gelen sanayi talepleri.' };
    }
  })();

  const tabs: { key: Tab; label: string }[] = [
    { key: 'talepler', label: role === 'firma' || role === 'tfirma' ? `Taleplerim (${list.length})` : role === 'akademisyen' ? `Gelen talepler (${list.length})` : `Talepler (${list.length})` },
    { key: 'katalog', label: 'Hizmet kataloğu' },
  ];

  const isFirm = !!requesterFirmOf(role);
  const scopeLabIds = role === 'tto' ? LABS.filter((l) => l.universityId === sel.tto).map((l) => l.id) : role === 'platform' ? LABS.map((l) => l.id) : [];

  const empty = isFirm ? (
    <EmptyState
      icon={<FlaskConical className="h-6 w-6" />}
      title="Henüz analiz talebiniz yok"
      description="Hizmet kataloğundan ihtiyacınız olan analizi seçin; laboratuvar sorumlusu tutar ve süre teklifi gönderir."
      action={<Button onClick={() => setTab('katalog')}>Hizmet kataloğunu aç</Button>}
    />
  ) : (
    <EmptyState
      icon={role === 'osb' || role === 'teknokent' ? <Building2 className="h-6 w-6" /> : <Inbox className="h-6 w-6" />}
      title="Henüz talep yok"
      description={role === 'akademisyen' ? 'Firmalar laboratuvarınızdan analiz talep ettiğinde burada görünür; teklifinizi buradan verirsiniz.' : role === 'osb' || role === 'teknokent' ? 'Firmalarınız bir laboratuvardan analiz talep ettiğinde burada görünür.' : 'Laboratuvarlara gelen talepler burada görünür.'}
    />
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader title={header.title} description={header.description} />

      {(role === 'tto' || role === 'platform' || role === 'akademisyen') && <Stats list={list} />}

      <div className="flex w-full rounded-xl bg-slate-100 p-1 sm:w-fit" role="tablist" aria-label="Laboratuvar bölümleri">
        {tabs.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={cn('flex-1 rounded-lg px-4 py-1.5 text-sm font-semibold transition sm:flex-none', tab === t.key ? 'bg-white text-slate-900 shadow-glass' : 'text-slate-500 hover:text-slate-900')}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'katalog' ? (
        <Catalog editableLabIds={myLabs} />
      ) : scopeLabIds.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            <RequestList list={list} empty={empty} />
          </div>
          <div className="min-w-0 space-y-6">
            <Occupancy list={list} labIds={scopeLabIds} />
          </div>
        </div>
      ) : (
        <RequestList list={list} empty={empty} />
      )}

      {role === 'platform' && tab === 'talepler' && <Breakdown list={list} />}
    </div>
  );
}

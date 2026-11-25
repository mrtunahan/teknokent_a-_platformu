/**
 * Toplantılar: öneri formu, toplantı kartı (kabul / ret / iptal / gerçekleşti / odaya katıl / .ics),
 * proje toplantıları kartı ve rolün tüm toplantıları sayfası.
 */
import { CalendarCheck2, CalendarDays, CalendarPlus, Check, Copy, Download, MapPin, Plus, Trash2, Video, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, EmptyState, Modal } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { cn, timeAgo, uid } from '@/lib/utils';
import { newRoomId, roomUrl } from '@/rtc/useRoom';
import { firmOf, orgOf } from '../data';
import { useKopru } from '../store';
import {
  defaultSlots,
  downloadIcs,
  fmtSlot,
  meetingParty,
  meetingVisible,
  otherInboxes,
  partyName,
  projectParty,
  toLocalInput,
  useCollab,
  type Meeting,
  type MeetingStatus,
  type Party,
} from './collab-core';

type K = ReturnType<typeof useKopru>;

const STATUS: Record<MeetingStatus, { label: string; cls: string }> = {
  onerildi: { label: 'Öneri · yanıt bekliyor', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  onaylandi: { label: 'Onaylandı', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  reddedildi: { label: 'Reddedildi', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  iptal: { label: 'İptal edildi', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
  tamamlandi: { label: 'Gerçekleşti', cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
};

/** Toplantının bitişi (onaylıysa gerçek zaman, öneriyse son dilim) */
const meetingEnd = (m: Meeting) => (m.startsAt ?? Math.max(...m.slots, m.createdAt)) + m.durationMin * 60_000;
export const isUpcoming = (m: Meeting, now = Date.now()) => (m.status === 'onerildi' || m.status === 'onaylandi') && meetingEnd(m) > now;
const sortKey = (m: Meeting) => m.startsAt ?? Math.min(...(m.slots.length ? m.slots : [m.createdAt]));

/** Bağlam: ihtiyaç / proje başlığı ve taraflar */
function contextOf(k: K, m: Meeting) {
  const need = k.state.needs.find((n) => n.id === m.needId);
  const solver = m.solverId ? k.findSolver(m.solverId) : null;
  const firm = need ? firmOf(need.firmId) : null;
  return {
    need,
    title: need?.title ?? '—',
    parties: [firm?.name, solver?.data.name].filter(Boolean).join(' ↔ '),
    link: m.projectId ? `projeler/${m.projectId}` : `ihtiyaclar/${m.needId}`,
  };
}

export function openRoom(roomId: string, title: string, name: string) {
  window.open(`/oda/${roomId}?baslik=${encodeURIComponent(title)}&ad=${encodeURIComponent(name)}`, '_blank');
}

/* ------------------------------ Öneri formu ------------------------------- */

export interface MeetingDraft {
  title: string;
  mode: 'video' | 'yuzyuze';
  location: string;
  slots: number[];
  durationMin: number;
  note: string;
}

export function MeetingFormModal({ open, onClose, defaultTitle, defaultLocation, onSubmit }: { open: boolean; onClose: () => void; defaultTitle: string; defaultLocation: string; onSubmit: (d: MeetingDraft) => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Toplantı öner">
      {open && <MeetingForm defaultTitle={defaultTitle} defaultLocation={defaultLocation} onCancel={onClose} onSubmit={onSubmit} />}
    </Modal>
  );
}

function MeetingForm({ defaultTitle, defaultLocation, onCancel, onSubmit }: { defaultTitle: string; defaultLocation: string; onCancel: () => void; onSubmit: (d: MeetingDraft) => void }) {
  const [title, setTitle] = useState(defaultTitle);
  const [mode, setMode] = useState<'video' | 'yuzyuze'>('video');
  const [location, setLocation] = useState(defaultLocation);
  const [slots, setSlots] = useState<string[]>(() => defaultSlots().slice(0, 2).map(toLocalInput));
  const [durationMin, setDuration] = useState(45);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const minVal = toLocalInput(Date.now());

  const submit = () => {
    const times = slots.map((s) => new Date(s).getTime());
    if (!title.trim()) return setError('Toplantı başlığını yazın.');
    if (!times.length || times.some((t) => Number.isNaN(t))) return setError('Her zaman dilimi için tarih ve saat seçin.');
    if (times.some((t) => t < Date.now())) return setError('Zaman dilimleri ileri bir tarih olmalı.');
    if (new Set(times).size !== times.length) return setError('Aynı zaman dilimini iki kez seçtiniz.');
    if (mode === 'yuzyuze' && !location.trim()) return setError('Yüz yüze toplantı için yer bilgisini yazın.');
    onSubmit({ title: title.trim(), mode, location: location.trim(), slots: times.sort((a, b) => a - b), durationMin, note: note.trim() });
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div>
        <label className="label" htmlFor="mt-title">Başlık</label>
        <input id="mt-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <fieldset>
        <legend className="label">Toplantı türü</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['video', 'Görüntülü görüşme', Video],
              ['yuzyuze', 'Yüz yüze', MapPin],
            ] as const
          ).map(([v, l, I]) => (
            <label key={v} className={cn('flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium', mode === v ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-700')}>
              <input type="radio" name="mt-mode" className="accent-primary-500" checked={mode === v} onChange={() => setMode(v)} />
              <I className="h-4 w-4 shrink-0" /> {l}
            </label>
          ))}
        </div>
        {mode === 'video' && <p className="mt-2 text-xs text-slate-500">Onaylanınca taraflar platformdaki görüntülü görüşme odasına tek tıkla katılır; oda bağlantısı takvim dosyasına da eklenir.</p>}
      </fieldset>
      {mode === 'yuzyuze' && (
        <div>
          <label className="label" htmlFor="mt-loc">Yer</label>
          <input id="mt-loc" className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="ör. Firma toplantı salonu, OSB" />
        </div>
      )}
      <fieldset>
        <legend className="label">Önerilen zaman dilimleri (1–3)</legend>
        <div className="space-y-2">
          {slots.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="datetime-local"
                className="input min-w-0 flex-1"
                aria-label={`Zaman dilimi ${i + 1}`}
                min={minVal}
                value={s}
                onChange={(e) => setSlots(slots.map((x, j) => (j === i ? e.target.value : x)))}
              />
              {slots.length > 1 && (
                <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600" aria-label={`Zaman dilimi ${i + 1} kaldır`} onClick={() => setSlots(slots.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {slots.length < 3 && (
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:underline"
            onClick={() => {
              const used = new Set(slots);
              const next = defaultSlots().map(toLocalInput).find((x) => !used.has(x)) ?? toLocalInput(Date.now() + 4 * 86_400_000);
              setSlots([...slots, next]);
            }}
          >
            <Plus className="h-4 w-4" /> Zaman dilimi ekle
          </button>
        )}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="mt-dur">Süre</label>
          <select id="mt-dur" className="input" value={durationMin} onChange={(e) => setDuration(Number(e.target.value))}>
            {[30, 45, 60, 90, 120].map((d) => (
              <option key={d} value={d}>{d} dakika</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="mt-note">Gündem / not (isteğe bağlı)</label>
          <input id="mt-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ör. numune planı" />
        </div>
      </div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Vazgeç</Button>
        <Button type="submit">
          <CalendarPlus className="h-4 w-4" /> Öneriyi gönder
        </Button>
      </div>
    </form>
  );
}

/* --------------------------- Eylemler (kayıt + bildirim) --------------------------- */

export function useMeetingActions() {
  const { k, update } = useCollab();
  const toast = useToast();

  const ctx = (m: Pick<Meeting, 'needId' | 'solverId'>) => {
    const need = k.state.needs.find((n) => n.id === m.needId);
    return need && m.solverId ? { need, solverId: m.solverId } : null;
  };

  const propose = (base: { needId: string; solverId: string; projectId?: string }, party: Party, d: MeetingDraft) => {
    const c = ctx(base);
    if (!c) return;
    const m: Meeting = {
      id: uid('mt'),
      ...base,
      title: d.title,
      mode: d.mode,
      location: d.mode === 'yuzyuze' ? d.location : undefined,
      roomId: d.mode === 'video' ? newRoomId('toplanti') : undefined,
      slots: d.slots,
      durationMin: d.durationMin,
      status: 'onerildi',
      proposedBy: party,
      proposerName: partyName(k, party, c.need, c.solverId),
      createdAt: Date.now(),
      note: d.note || undefined,
    };
    update((s) => ({ ...s, meetings: [...s.meetings, m] }));
    k.notify(otherInboxes(k, c.need, c.solverId), `${m.proposerName} toplantı önerdi: ${m.title} (${m.slots.length} zaman seçeneği)`, contextLink(m), 'meeting');
    toast({ title: 'Toplantı önerildi', body: 'Karşı taraf bir zaman dilimini onayladığında bildirim alacaksınız.' });
  };

  const patch = (m: Meeting, p: Partial<Meeting>) => update((s) => ({ ...s, meetings: s.meetings.map((x) => (x.id === m.id ? { ...x, ...p } : x)) }));

  const act = (m: Meeting, party: Party, kind: 'accept' | 'reject' | 'cancel' | 'done', slot?: number) => {
    const c = ctx(m);
    if (!c) return;
    const who = partyName(k, party, c.need, c.solverId);
    const to = otherInboxes(k, c.need, c.solverId);
    if (kind === 'accept' && slot) {
      patch(m, { status: 'onaylandi', startsAt: slot, answeredBy: who });
      k.notify(to, `${who} toplantıyı onayladı: ${m.title} · ${fmtSlot(slot)}`, contextLink(m), 'meeting');
      toast({ title: 'Toplantı onaylandı', body: `${fmtSlot(slot)} · takviminize eklemek için .ics indirebilirsiniz.` });
    } else if (kind === 'reject') {
      patch(m, { status: 'reddedildi', answeredBy: who });
      k.notify(to, `${who} toplantı önerisini reddetti: ${m.title}`, contextLink(m), 'meeting');
      toast({ title: 'Öneri reddedildi', tone: 'info', body: 'Uygun bir zaman için yeni öneri gönderebilirsiniz.' });
    } else if (kind === 'cancel') {
      patch(m, { status: 'iptal', answeredBy: who });
      k.notify(to, `${who} toplantıyı iptal etti: ${m.title}`, contextLink(m), 'meeting');
      toast({ title: 'Toplantı iptal edildi', tone: 'info' });
    } else if (kind === 'done') {
      patch(m, { status: 'tamamlandi' });
      toast({ title: 'Toplantı gerçekleşti olarak işaretlendi' });
    }
  };

  return { propose, act };
}

const contextLink = (m: Pick<Meeting, 'projectId' | 'needId'>) => (m.projectId ? `projeler/${m.projectId}` : `ihtiyaclar/${m.needId}`);

/* ------------------------------- Toplantı kartı ------------------------------- */

export function MeetingItem({ m, showContext }: { m: Meeting; showContext?: boolean }) {
  const k = useKopru();
  const toast = useToast();
  const { act } = useMeetingActions();
  const party = meetingParty(k, m);
  const c = contextOf(k, m);
  const now = Date.now();
  const st = STATUS[m.status];
  const started = m.startsAt != null && m.startsAt <= now;
  const expired = m.status === 'onerildi' && m.slots.every((t) => t < now);
  const canAnswer = !!party && m.status === 'onerildi' && party !== m.proposedBy && !expired;
  const canCancel = !!party && party === m.proposedBy && (m.status === 'onerildi' || (m.status === 'onaylandi' && !started));
  const canDone = !!party && m.status === 'onaylandi' && started;
  const canJoin = !!party && m.mode === 'video' && !!m.roomId && m.status === 'onaylandi' && meetingEnd(m) + 3600_000 > now;
  const icsContext = `${c.title}${c.parties ? ` · ${c.parties}` : ''}`;

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start gap-3">
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', m.mode === 'video' ? 'bg-blue-50 text-blue-600' : 'bg-primary-50 text-primary-600')} aria-hidden>
          {m.mode === 'video' ? <Video className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{m.title}</span>
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1', expired ? 'bg-slate-100 text-slate-600 ring-slate-200' : st.cls)}>{expired ? 'Yanıtlanmadı · süresi geçti' : st.label}</span>
          </div>
          <div className="mt-1 text-sm text-slate-600">
            {m.startsAt ? (
              <span className="font-medium text-slate-900">{fmtSlot(m.startsAt)}</span>
            ) : (
              <span>{m.slots.length} zaman seçeneği</span>
            )}{' '}
            · {m.durationMin} dk · {m.mode === 'video' ? 'Görüntülü görüşme' : m.location || 'Yüz yüze'}
          </div>
          {showContext && (
            <div className="mt-1 text-xs text-slate-500">
              <Link to={`/kopru/${k.role}/${c.link}`} className="font-semibold text-primary-600 hover:underline">{c.title}</Link>
              {c.parties && <> · {c.parties}</>}
            </div>
          )}
          <div className="mt-1 text-xs text-slate-500">
            Öneren: {m.proposerName} · {timeAgo(m.createdAt)}
            {m.answeredBy && m.status !== 'onerildi' && <> · {m.status === 'onaylandi' || m.status === 'tamamlandi' ? 'Onaylayan' : m.status === 'iptal' ? 'İptal eden' : 'Reddeden'}: {m.answeredBy}</>}
          </div>
          {m.note && <div className="mt-1.5 text-xs italic text-slate-600">“{m.note}”</div>}
        </div>
      </div>

      {m.status === 'onerildi' && !expired && (
        <div className="mt-3 space-y-1.5">
          {canAnswer && <div className="text-xs font-semibold text-slate-600">Size uyan zamanı onaylayın:</div>}
          <div className="flex flex-wrap gap-2">
            {m.slots.map((t) =>
              canAnswer ? (
                <Button key={t} size="sm" variant="secondary" onClick={() => act(m, party!, 'accept', t)}>
                  <Check className="h-4 w-4" /> Kabul et · {fmtSlot(t)}
                </Button>
              ) : (
                <span key={t} className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">{fmtSlot(t)}</span>
              ),
            )}
          </div>
          {!canAnswer && party === m.proposedBy && <p className="text-xs text-slate-500">Karşı tarafın bir zaman dilimini onaylaması bekleniyor.</p>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        {canJoin && (
          <Button size="sm" onClick={() => openRoom(m.roomId!, m.title, k.me.name)}>
            <Video className="h-4 w-4" /> Odaya katıl
          </Button>
        )}
        {canJoin && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              void navigator.clipboard?.writeText(roomUrl(m.roomId!)).then(
                () => toast({ title: 'Oda bağlantısı kopyalandı' }),
                () => toast({ title: 'Kopyalanamadı', body: roomUrl(m.roomId!), tone: 'warning' }),
              );
            }}
          >
            <Copy className="h-4 w-4" /> Bağlantıyı kopyala
          </Button>
        )}
        {canDone && (
          <Button size="sm" variant="secondary" onClick={() => act(m, party!, 'done')}>
            <CalendarCheck2 className="h-4 w-4" /> Gerçekleşti
          </Button>
        )}
        {canAnswer && (
          <Button size="sm" variant="ghost" onClick={() => act(m, party!, 'reject')}>
            <X className="h-4 w-4" /> Reddet
          </Button>
        )}
        {canCancel && (
          <Button size="sm" variant="ghost" onClick={() => act(m, party!, 'cancel')}>
            <X className="h-4 w-4" /> İptal et
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => downloadIcs(m, icsContext)}>
          <Download className="h-4 w-4" /> .ics indir
        </Button>
      </div>
    </li>
  );
}

/* --------------------------- Proje toplantıları kartı --------------------------- */

export function ProjectMeetings({ projectId }: { projectId: string }) {
  const { k, data } = useCollab();
  const { propose } = useMeetingActions();
  const [open, setOpen] = useState(false);
  const p = k.state.projects.find((x) => x.id === projectId);
  if (!p) return null;
  const need = k.state.needs.find((n) => n.id === p.needId);
  if (!need) return null;
  const party = projectParty(k, p);
  const list = data.meetings.filter((m) => m.projectId === projectId).sort((a, b) => sortKey(a) - sortKey(b));
  const upcoming = list.filter((m) => isUpcoming(m));
  const past = list.filter((m) => !isUpcoming(m)).reverse();
  const firm = firmOf(need.firmId);

  return (
    <section className="glass rounded-2xl p-5" aria-labelledby={`pm-${projectId}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`pm-${projectId}`} className="font-display text-base font-bold text-slate-900">Toplantılar</h2>
          <p className="mt-0.5 text-sm text-slate-500">Görüntülü görüşme odası veya yüz yüze; takvime .ics ile ekleyin.</p>
        </div>
        {party && p.stage !== 'tamamlandi' && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <CalendarPlus className="h-4 w-4" /> Toplantı öner
          </Button>
        )}
      </div>
      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          <CalendarDays className="mx-auto mb-2 h-6 w-6 text-slate-400" />
          Henüz toplantı yok.{party && p.stage !== 'tamamlandi' ? ' “Toplantı öner” ile 1–3 zaman seçeneği gönderin.' : ''}
        </div>
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Yaklaşan</h3>
              <ul className="space-y-2">{upcoming.map((m) => <MeetingItem key={m.id} m={m} />)}</ul>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Geçmiş</h3>
              <ul className="space-y-2">{past.map((m) => <MeetingItem key={m.id} m={m} />)}</ul>
            </div>
          )}
        </div>
      )}
      <MeetingFormModal
        open={open}
        onClose={() => setOpen(false)}
        defaultTitle={`Proje toplantısı: ${need.title}`.slice(0, 90)}
        defaultLocation={`${firm.name} · ${orgOf(firm.orgId).short}`}
        onSubmit={(d) => {
          propose({ needId: need.id, solverId: p.solverId, projectId: p.id }, party!, d);
          setOpen(false);
        }}
      />
    </section>
  );
}

/* ------------------------------ Toplantılar sayfası ------------------------------ */

export function MeetingsPage() {
  const { k, data } = useCollab();
  const [tab, setTab] = useState<'yaklasan' | 'gecmis'>('yaklasan');
  const [room, setRoom] = useState<string | null>(null);
  const toast = useToast();
  const mine = data.meetings.filter((m) => meetingVisible(k, m));
  const upcoming = mine.filter((m) => isUpcoming(m)).sort((a, b) => sortKey(a) - sortKey(b));
  const past = mine.filter((m) => !isUpcoming(m)).sort((a, b) => sortKey(b) - sortKey(a));
  const list = tab === 'yaklasan' ? upcoming : past;
  const readOnly = k.role === 'osb' || k.role === 'teknokent' || k.role === 'platform';
  const waiting = upcoming.filter((m) => m.status === 'onerildi' && meetingParty(k, m) && meetingParty(k, m) !== m.proposedBy).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        title="Toplantılar"
        description={readOnly ? 'Kapsamınızdaki iş birliklerinde planlanan toplantılar (salt okunur).' : 'İhtiyaç ön görüşmeleri ve proje toplantıları: görüntülü görüşme odası, yüz yüze, takvim dosyası.'}
        actions={
          <Button onClick={() => setRoom(newRoomId('gorusme'))}>
            <Video className="h-4 w-4" /> Hızlı görüşme odası aç
          </Button>
        }
      />

      {waiting > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>{waiting}</strong> toplantı önerisi yanıtınızı bekliyor. Uygun zaman dilimini “Kabul et” ile onaylayın.
        </div>
      )}

      <div role="tablist" aria-label="Toplantı listesi" className="inline-flex rounded-xl bg-slate-100 p-1">
        {(
          [
            ['yaklasan', 'Yaklaşan', upcoming.length],
            ['gecmis', 'Geçmiş', past.length],
          ] as const
        ).map(([v, l, n]) => (
          <button
            key={v}
            role="tab"
            aria-selected={tab === v}
            onClick={() => setTab(v)}
            className={cn('rounded-lg px-4 py-1.5 text-sm font-semibold transition', tab === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
          >
            {l} <span className="ml-1 text-xs text-slate-400">{n}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title={tab === 'yaklasan' ? 'Yaklaşan toplantı yok' : 'Geçmiş toplantı yok'}
          description={
            readOnly
              ? 'Kapsamınızdaki firmalar ve uzmanlar toplantı planladığında burada görünür.'
              : 'İhtiyaç sayfasındaki ön yazışmadan veya proje sayfasından “Toplantı öner” ile başlayabilirsiniz.'
          }
        />
      ) : (
        <ul className="space-y-3">{list.map((m) => <MeetingItem key={m.id} m={m} showContext />)}</ul>
      )}

      <Modal open={!!room} onClose={() => setRoom(null)} title="Hızlı görüşme odası">
        {room && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Yeni bir görüntülü görüşme odası oluşturuldu. Bağlantıyı bilen herkes katılabilir; katılımcıları davet etmek için bağlantıyı paylaşın.</p>
            <div>
              <label className="label" htmlFor="qr-link">Oda bağlantısı</label>
              <input id="qr-link" className="input font-mono text-xs" readOnly value={roomUrl(room)} onFocus={(e) => e.currentTarget.select()} />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard?.writeText(roomUrl(room)).then(
                    () => toast({ title: 'Bağlantı kopyalandı' }),
                    () => toast({ title: 'Kopyalanamadı', body: 'Bağlantıyı alandan elle kopyalayın.', tone: 'warning' }),
                  );
                }}
              >
                <Copy className="h-4 w-4" /> Bağlantıyı kopyala
              </Button>
              <Button
                onClick={() => {
                  openRoom(room, 'Hızlı görüşme', k.me.name);
                  setRoom(null);
                }}
              >
                <Video className="h-4 w-4" /> Odaya katıl
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

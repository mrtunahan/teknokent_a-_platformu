/**
 * Belgeler, toplantılar ve ön yazışma.
 * SÖZLEŞME (diğer dosyalar bu imzaları kullanır; değiştirmeyin):
 *  - InviteThread({ needId, solverId }): davet aşamasında firma–uzman(–TTO) yazışması ve toplantı önerisi
 *  - ProjectDocuments({ projectId }): proje belgeleri, gizlilik sözleşmesi oluşturma ve iki taraflı e-onay
 *  - ProjectMeetings({ projectId }): proje toplantıları (video odası / yüz yüze), .ics
 *  - useStageGate(projectId): aşama ilerletme koşulu ({ ok, reason })
 *  - MeetingsPage(): rolün tüm toplantıları (rota: "toplantilar")
 *
 * Uygulama: collab-core (model, örnek veri, kurallar), collab-meetings, collab-docs.
 */
import { AlertTriangle, CalendarPlus, ChevronDown, MessagesSquare, Send } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui';
import { cn, timeAgo, uid } from '@/lib/utils';
import { firmOf, orgOf } from '../data';
import { SolverAvatar, Avatar } from '../ui';
import { needParty, otherInboxes, partyLabel, partyName, useCollab, type ThreadMsg } from './collab-core';
import { MeetingFormModal, MeetingItem, isUpcoming, useMeetingActions } from './collab-meetings';

export { ProjectDocuments, useStageGate } from './collab-docs';
export { MeetingsPage, ProjectMeetings } from './collab-meetings';
export { COLLAB_SEED, stageGate, type CollabState, type Meeting, type CollabDoc } from './collab-core';

/** Davet aşamasında firma ile davetli uzman arasında (TTO katılabilir) ön yazışma ve toplantı önerisi */
export function InviteThread({ needId, solverId }: { needId: string; solverId: string }) {
  const { k, data, update } = useCollab();
  const { propose } = useMeetingActions();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [proposing, setProposing] = useState(false);
  const bodyId = useId();

  const need = k.state.needs.find((n) => n.id === needId);
  const solver = k.findSolver(solverId);
  if (!need || !solver) return null;
  const party = needParty(k, need, solverId);
  // Yazamayanlar: platform salt okunur görür; OSB/teknokent yönetimi ve ilgisiz roller hiç görmez
  if (!party && k.role !== 'platform') return null;

  const firm = firmOf(need.firmId);
  const invite = need.invites.find((i) => i.solverId === solverId);
  const counterpart = party === 'cozucu' ? firm.name : solver.data.name;
  const msgs = data.messages.filter((m) => m.needId === needId && m.solverId === solverId).sort((a, b) => a.at - b.at);
  const meetings = data.meetings.filter((m) => m.needId === needId && m.solverId === solverId && !m.projectId).sort((a, b) => b.createdAt - a.createdAt);
  const pendingMeeting = meetings.some((m) => m.status === 'onerildi' && isUpcoming(m));
  const confidentialWarn = need.confidential && !invite?.ndaAt;
  const closed = need.status === 'kapandi' || invite?.status === 'ret';

  const send = () => {
    const t = text.trim();
    if (!t || !party) return;
    const msg: ThreadMsg = { id: uid('cm'), needId, solverId, from: party, name: partyName(k, party, need, solverId), text: t, at: Date.now() };
    update((s) => ({ ...s, messages: [...s.messages, msg] }));
    k.notify(otherInboxes(k, need, solverId), `Ön yazışma · ${msg.name}: ${t.slice(0, 80)}`, `ihtiyaclar/${needId}`, 'message');
    setText('');
  };

  return (
    <section className="glass overflow-hidden rounded-2xl">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-slate-50 sm:p-5"
      >
        {party === 'cozucu' ? <Avatar name={firm.name} brand={firm.brand} size={36} square /> : <SolverAvatar solver={solver} size={36} />}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-base font-bold text-slate-900">Ön yazışma · {counterpart}</span>
          <span className="block truncate text-xs text-slate-500">
            {party ? 'Firma, uzman ve TTO aynı yazışmada' : 'Salt okunur'}
            {msgs.length > 0 && ` · son mesaj ${timeAgo(msgs[msgs.length - 1]!.at)}`}
          </span>
        </span>
        {pendingMeeting && <span className="hidden rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 sm:inline">Toplantı önerisi</span>}
        <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700 ring-1 ring-primary-200" aria-label={`${msgs.length} mesaj`}>
          {msgs.length}
        </span>
        <ChevronDown className={cn('h-5 w-5 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open && (
        <div id={bodyId} className="space-y-4 border-t border-slate-100 p-4 sm:p-5">
          {confidentialWarn && (
            <div role="note" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Gizli ihtiyaç: {solver.data.name} henüz gizlilik taahhüdü vermedi. Taahhüt verilene kadar teknik ayrıntı, reçete veya ölçüm verisi paylaşmayın.</span>
            </div>
          )}

          {msgs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
              <MessagesSquare className="mx-auto mb-2 h-6 w-6 text-slate-400" />
              Henüz mesaj yok. {party ? 'Soru sorarak veya ön görüşme önererek başlayın.' : ''}
            </div>
          ) : (
            <ul className="space-y-3" aria-label="Ön yazışma mesajları">
              {msgs.map((m) => {
                const mine = m.from === party;
                return (
                  <li key={m.id} className={cn('max-w-[88%] rounded-2xl px-4 py-3 text-sm', mine ? 'ml-auto bg-primary-500 text-white' : m.from === 'tto' ? 'bg-blue-50 text-blue-950' : 'bg-slate-100 text-slate-800')}>
                    <div className={cn('mb-0.5 text-xs font-semibold', mine ? 'text-white/80' : 'text-slate-500')}>
                      {m.name} · {partyLabel(m.from, solver.kind)} · {timeAgo(m.at)}
                    </div>
                    <span className="whitespace-pre-line break-words">{m.text}</span>
                  </li>
                );
              })}
            </ul>
          )}

          {meetings.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Toplantılar</h3>
              <ul className="space-y-2">{meetings.map((m) => <MeetingItem key={m.id} m={m} />)}</ul>
            </div>
          )}

          {party && !closed && (
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <div className="flex gap-2">
                <input className="input min-w-0" value={text} onChange={(e) => setText(e.target.value)} placeholder={`${counterpart} ile yazışın…`} aria-label="Ön yazışma mesajı" />
                <Button type="submit" disabled={!text.trim()}>
                  <Send className="h-4 w-4" /> <span className="hidden sm:inline">Gönder</span>
                  <span className="sr-only sm:hidden">Gönder</span>
                </Button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-500">Mesajlar karşı tarafa ve ilgili TTO’ya bildirim olarak gider.</p>
                <Button type="button" size="sm" variant="secondary" onClick={() => setProposing(true)}>
                  <CalendarPlus className="h-4 w-4" /> Toplantı öner
                </Button>
              </div>
            </form>
          )}
          {party && closed && <p className="text-xs text-slate-500">Bu yazışma kapandı.</p>}
        </div>
      )}

      {party && (
        <MeetingFormModal
          open={proposing}
          onClose={() => setProposing(false)}
          defaultTitle={`Ön görüşme: ${need.title}`.slice(0, 90)}
          defaultLocation={`${firm.name} · ${orgOf(firm.orgId).short}`}
          onSubmit={(d) => {
            propose({ needId, solverId }, party, d);
            setProposing(false);
            setOpen(true);
          }}
        />
      )}
    </section>
  );
}

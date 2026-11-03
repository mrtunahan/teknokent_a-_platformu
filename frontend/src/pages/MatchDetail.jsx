import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { getSocket, useSocketEvent } from '../socket';
import { useAuth } from '../auth';
import {
  Alert, Chip, Field, Logo, Modal, Spinner, useAction, useLoad,
} from '../components/ui';
import {
  MEETING_STATUS, MEETING_TYPES, OUTCOMES, fmtDateTime, fmtMoney,
} from '../labels';

function toLocalInput(d) {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
}

export default function MatchDetail() {
  const { id } = useParams();
  const auth = useAuth();
  const match = useLoad(() => api.get(`/matches/${id}`), [id]);
  const msgs = useLoad(() => api.get(`/matches/${id}/messages`), [id]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const send = useAction();
  const act = useAction();
  const bottom = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    getSocket()?.emit('match:join', { matchId: id });
  }, [id]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [msgs.data]);

  useSocketEvent('message:new', (m) => {
    if (String(m.matchId) !== String(id)) return;
    const mine = String(m.senderCompany) === String(auth.company?._id);
    msgs.setData((d) => (!d || d.messages.some((x) => String(x.id) === String(m.id)) ? d
      : { messages: [...d.messages, { ...m, mine }] }));
  });
  useSocketEvent('meeting:proposed', (p) => String(p.matchId) === String(id) && match.reload());
  useSocketEvent('meeting:updated', (p) => String(p.matchId) === String(id) && match.reload());
  useSocketEvent('match:typing', (p) => {
    if (String(p.matchId) !== String(id)) return;
    setTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), 2500);
  });

  if (match.loading) return <Spinner />;
  if (match.error) return <Alert error={match.error} />;
  const m = match.data.match;
  const closed = m.status !== 'active';

  const submit = (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    send.run(async () => {
      const r = await api.post(`/matches/${id}/messages`, { content });
      setText('');
      msgs.setData((d) => ({ messages: [...d.messages.filter((x) => String(x.id) !== String(r.message.id)), r.message] }));
    });
  };
  const meetingAction = (meetingId, action, slot) => act.run(async () => {
    await api.patch(`/matches/${id}/meetings/${meetingId}`, { action, slot });
    match.reload();
  });

  return (
    <div className="chat-layout">
      <section className="chat">
        <div className="chat-head">
          <Link to="/matches" className="btn btn-ghost btn-sm">←</Link>
          <Logo company={m.company} size={40} />
          <div>
            <Link to={`/companies/${m.company?.id}`}><strong>{m.company?.name}</strong></Link>
            <div className="muted small">%{m.matchPercent} uyum · {m.reasons.slice(0, 3).join(' · ')}</div>
          </div>
        </div>
        <div className="messages">
          {msgs.loading && <Spinner />}
          {msgs.data?.messages.length === 0 && (
            <p className="muted center">İlk mesajı siz gönderin. İpucu: kendinizi ve neden ilgilendiğinizi kısaca anlatın; ilk mesajda bağlantı paylaşılamaz.</p>
          )}
          {msgs.data?.messages.map((x) => (
            <div key={x.id} className={`msg ${x.mine ? 'mine' : ''}`}>
              <div className="msg-bubble">{x.content}</div>
              <div className="msg-meta">{x.mine ? 'Siz' : x.senderName} · {fmtDateTime(x.createdAt)}</div>
            </div>
          ))}
          {typing && <div className="muted small">Yazıyor…</div>}
          <div ref={bottom} />
        </div>
        <Alert error={send.error} />
        {closed ? <p className="muted center">Bu eşleşme kapatılmış.</p> : (
          <form className="composer" onSubmit={submit}>
            <textarea
              rows={2}
              value={text}
              maxLength={4000}
              placeholder="Mesajınızı yazın…"
              onChange={(e) => { setText(e.target.value); getSocket()?.emit('match:typing', { matchId: id }); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e); }}
            />
            <button className="btn btn-primary" disabled={send.busy || !text.trim()}>Gönder</button>
          </form>
        )}
      </section>

      <aside className="side">
        <Alert error={act.error} />
        <div className="panel">
          <div className="panel-head">
            <h3>Toplantılar</h3>
            {!closed && <button type="button" className="btn btn-sm" onClick={() => setMeetingOpen(true)}>Toplantı öner</button>}
          </div>
          {!m.meetings.length && <p className="muted">Henüz toplantı yok.</p>}
          {m.meetings.map((mt) => {
            const mine = String(mt.proposedBy) !== String(m.company?.id);
            return (
              <div key={mt._id} className="meeting">
                <div className="row">
                  <Chip tone={mt.status === 'accepted' ? 'green' : mt.status === 'proposed' ? 'blue' : undefined}>{MEETING_STATUS[mt.status]}</Chip>
                  <span className="muted small">{MEETING_TYPES[mt.type]} · {mt.durationMinutes} dk {mine ? '· sizin öneriniz' : ''}</span>
                </div>
                {mt.startsAt ? <div><strong>{fmtDateTime(mt.startsAt)}</strong></div> : (
                  <ul className="slots">
                    {mt.proposedSlots.map((s) => (
                      <li key={s}>
                        {fmtDateTime(s)}
                        {!mine && mt.status === 'proposed' && (
                          <button type="button" className="btn btn-sm btn-yes" disabled={act.busy} onClick={() => meetingAction(mt._id, 'accept', s)}>Kabul</button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {mt.location && <div className="muted small">{mt.location}</div>}
                {mt.note && <div className="small">{mt.note}</div>}
                <div className="row">
                  {!mine && mt.status === 'proposed' && <button type="button" className="btn btn-sm btn-ghost" onClick={() => meetingAction(mt._id, 'decline')}>Reddet</button>}
                  {['proposed', 'accepted'].includes(mt.status) && <button type="button" className="btn btn-sm btn-ghost" onClick={() => meetingAction(mt._id, 'cancel')}>İptal</button>}
                  {mt.status === 'accepted' && new Date(mt.startsAt) < new Date() && (
                    <button type="button" className="btn btn-sm" onClick={() => meetingAction(mt._id, 'complete')}>Gerçekleşti</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>İş sonucu</h3>
            <button type="button" className="btn btn-sm" onClick={() => setOutcomeOpen(true)}>{m.myOutcome ? 'Güncelle' : 'Bildir'}</button>
          </div>
          {m.myOutcome ? (
            <p><Chip tone="green">{OUTCOMES[m.myOutcome.result]}</Chip> {m.myOutcome.estimatedValue ? fmtMoney(m.myOutcome.estimatedValue) : ''}</p>
          ) : <p className="muted">Bu eşleşme bir görüşmeye, teklife veya sözleşmeye dönüştü mü?</p>}
        </div>
      </aside>

      <MeetingModal open={meetingOpen} onClose={() => setMeetingOpen(false)} matchId={id} onDone={() => { setMeetingOpen(false); match.reload(); }} />
      <OutcomeModal open={outcomeOpen} onClose={() => setOutcomeOpen(false)} matchId={id} current={m.myOutcome} onDone={() => { setOutcomeOpen(false); match.reload(); }} />
    </div>
  );
}

function MeetingModal({ open, onClose, matchId, onDone }) {
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
  tomorrow.setHours(10, 0, 0, 0);
  const [slots, setSlots] = useState([toLocalInput(tomorrow)]);
  const [form, setForm] = useState({ type: 'online', durationMinutes: 30, location: '', note: '' });
  const { run, busy, error } = useAction();
  const submit = () => run(async () => {
    await api.post(`/matches/${matchId}/meetings`, {
      slots: slots.filter(Boolean).map((s) => new Date(s).toISOString()),
      type: form.type,
      durationMinutes: Number(form.durationMinutes),
      location: form.location || undefined,
      note: form.note || undefined,
    });
    onDone();
  });
  return (
    <Modal open={open} onClose={onClose} title="Toplantı öner">
      <div className="stack">
        <Alert error={error} />
        <Field label="Önerilen saatler" hint="Karşı taraf bunlardan birini seçer (en fazla 5).">
          <div className="stack-sm">
            {slots.map((s, i) => (
              <div className="row" key={i}>
                <input type="datetime-local" value={s} onChange={(e) => setSlots(slots.map((x, j) => (j === i ? e.target.value : x)))} />
                {slots.length > 1 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSlots(slots.filter((_, j) => j !== i))}>Kaldır</button>}
              </div>
            ))}
            {slots.length < 5 && <button type="button" className="btn btn-sm" onClick={() => setSlots([...slots, ''])}>+ Saat ekle</button>}
          </div>
        </Field>
        <div className="grid2">
          <Field label="Tür">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(MEETING_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Süre (dk)"><input type="number" min={10} max={480} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} /></Field>
        </div>
        <Field label={form.type === 'online' ? 'Bağlantı / platform' : 'Yer'}><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
        <Field label="Not"><textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={submit}>Öneriyi gönder</button>
      </div>
    </Modal>
  );
}

function OutcomeModal({ open, onClose, matchId, current, onDone }) {
  const [form, setForm] = useState({ result: 'met', estimatedValue: '', rating: '', feedback: '' });
  useEffect(() => {
    if (current) {
      setForm({
        result: current.result, estimatedValue: current.estimatedValue ?? '', rating: current.rating ?? '', feedback: current.feedback ?? '',
      });
    }
  }, [current]);
  const { run, busy, error } = useAction();
  const submit = () => run(async () => {
    await api.put(`/matches/${matchId}/outcome`, {
      result: form.result,
      estimatedValue: form.estimatedValue === '' ? undefined : Number(form.estimatedValue),
      rating: form.rating === '' ? undefined : Number(form.rating),
      feedback: form.feedback || undefined,
    });
    onDone();
  });
  return (
    <Modal open={open} onClose={onClose} title="İş sonucu">
      <div className="stack">
        <Alert error={error} />
        <Field label="Sonuç">
          <div className="radio-row">
            {Object.entries(OUTCOMES).map(([k, v]) => (
              <label key={k} className={`radio ${form.result === k ? 'on' : ''}`}>
                <input type="radio" name="result" value={k} checked={form.result === k} onChange={() => setForm({ ...form, result: k })} />{v}
              </label>
            ))}
          </div>
        </Field>
        <div className="grid2">
          <Field label="Tahmini değer (TRY, isteğe bağlı)"><input type="number" min={0} value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })} /></Field>
          <Field label="Memnuniyet (1–5)">
            <select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
              <option value="">—</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Geri bildirim (yalnızca platform görür)"><textarea rows={2} value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} /></Field>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={submit}>Kaydet</button>
      </div>
    </Modal>
  );
}

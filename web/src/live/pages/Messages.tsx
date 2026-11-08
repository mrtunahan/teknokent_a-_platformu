import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Ban, CalendarClock, CalendarPlus, Check, ClipboardCheck, Flag, Info, MessagesSquare, MoreVertical, PanelRightOpen, Plus, Search, SendHorizontal, Trash2, Video, X } from 'lucide-react';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { clock, cn, dayLabel, timeAgo } from '@/lib/utils';
import { Button, ButtonLink, Chip, Drawer, EmptyState, Modal, VerifiedBadge } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { ScoreRing } from '@/components/discover/ScoreRing';
import { api } from '../api';
import { useAuth } from '../auth';
import { useAction, useLoad } from '../hooks';
import { MEETING_STATUS, MEETING_TYPES, OUTCOMES, fmtDateTime, fmtMoney, toLocalInput } from '../labels';
import { useLive } from '../LiveShell';
import { CompanySheet, LiveReportModal } from '../CompanySheet';
import { getSocket, useSocketEvent } from '../socket';
import type { ChatMessage, MatchDetail, Meeting, OutcomeResult } from '../types';
import { Alert, Field, Logo, Select, Spinner } from '../ui';

export default function LiveMessages() {
  const { matchId } = useParams();
  const { matches, matchesError } = useLive();
  const [q, setQ] = useState('');
  const threads = useMemo(
    () =>
      (matches ?? [])
        .filter((m) => (m.company?.name ?? '').toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')))
        .sort((a, b) => +new Date(b.lastMessageAt ?? b.createdAt) - +new Date(a.lastMessageAt ?? a.createdAt)),
    [matches, q],
  );

  return (
    <div className={cn('flex', matchId ? 'h-[100svh] lg:h-[calc(100svh-65px)]' : 'h-[calc(100svh-65px)]')}>
      <section className={cn('flex w-full flex-col border-r border-slate-200 lg:w-[360px] lg:shrink-0', matchId && 'hidden lg:flex')} aria-label="Sohbetler">
        <div className="px-4 pb-3 pt-5 sm:px-5 lg:pt-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">Mesajlar</h1>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input className="input !py-2.5 !pl-10" placeholder="Firma ara" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Sohbetlerde ara" />
          </div>
        </div>
        <Alert error={matchesError} className="mx-4" />
        {!matches && !matchesError ? (
          <Spinner />
        ) : (
          <ul className="flex-1 space-y-1 overflow-y-auto px-2 pb-32 sm:px-3 lg:pb-6">
            {threads.map((m) => (
              <li key={m.id}>
                <Link to={`/app/messages/${m.id}`} className={cn('relative flex items-center gap-3 rounded-2xl px-3 py-3 transition', String(m.id) === matchId ? 'bg-slate-100' : 'hover:bg-slate-50')}>
                  <Logo company={m.company} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 truncate text-sm font-semibold text-slate-900">
                        {m.company?.name ?? 'Silinmiş firma'} {m.company?.verified && <VerifiedBadge />}
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-500">{timeAgo(+new Date(m.lastMessageAt ?? m.createdAt))}</span>
                    </div>
                    <p className={cn('truncate text-sm', m.unreadCount ? 'font-medium text-slate-900' : 'text-slate-500')}>
                      {m.status !== 'active' ? 'Eşleşme kapatıldı' : m.lastMessageAt ? `%${m.matchPercent} uyum · ${m.reasons[0] ?? ''}` : 'Yeni eşleşme — ilk mesajı gönderin'}
                    </p>
                  </div>
                  {m.unreadCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary-500 px-1.5 text-[10px] font-bold text-white">{m.unreadCount}</span>}
                  {m.pendingMeetings > 0 && <CalendarClock className="h-4 w-4 shrink-0 text-blue-600" aria-label="Bekleyen toplantı" />}
                </Link>
              </li>
            ))}
            {threads.length === 0 && <li className="px-3 py-10 text-center text-sm text-slate-500">{q ? 'Sonuç bulunamadı.' : 'Henüz eşleşmeniz yok. Keşfet ekranından firmalarla ilgilenin.'}</li>}
          </ul>
        )}
      </section>
      <section className={cn('min-w-0 flex-1', !matchId && 'hidden lg:flex')}>
        {matchId ? (
          <Chat key={matchId} id={matchId} />
        ) : (
          <div className="grid h-full w-full place-items-center p-8">
            <EmptyState icon={<MessagesSquare className="h-6 w-6" />} title="Bir sohbet seçin" description="Karşılıklı eşleştiğiniz firmalarla mesajlaşabilir, toplantı planlayabilir ve iş sonucunu bildirebilirsiniz." action={<ButtonLink to="/app/discover">Yeni firmalar keşfet</ButtonLink>} />
          </div>
        )}
      </section>
    </div>
  );
}

function Chat({ id }: { id: string }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { markRead, reloadMatches } = useLive();
  const match = useLoad(() => api.get<{ match: MatchDetail }>(`/matches/${id}`), [id]);
  const msgs = useLoad(() => api.get<{ messages: ChatMessage[] }>(`/matches/${id}/messages`), [id]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [side, setSide] = useState(false);
  const [menu, setMenu] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [outcomeOpen, setOutcomeOpen] = useState(params.get('outcome') === '1');
  const [profileOpen, setProfileOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const send = useAction();
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastTypingEmit = useRef(0);

  useEffect(() => {
    getSocket()?.emit('match:join', { matchId: id });
    markRead(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [msgs.data, typing]);

  useSocketEvent<ChatMessage & { matchId: string }>('message:new', (m) => {
    if (String(m.matchId) !== String(id)) return;
    const mine = String(m.senderCompany) === String(auth.company?._id);
    setTyping(false);
    msgs.setData((d) => (!d || d.messages.some((x) => String(x.id) === String(m.id)) ? d : { messages: [...d.messages, { ...m, mine }] }));
    markRead(id);
  });
  useSocketEvent<{ matchId: string }>('meeting:proposed', (p) => String(p.matchId) === String(id) && match.reload());
  useSocketEvent<{ matchId: string }>('meeting:updated', (p) => String(p.matchId) === String(id) && match.reload());
  useSocketEvent<{ matchId: string }>('match:typing', (p) => {
    if (String(p.matchId) !== String(id)) return;
    setTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), 2500);
  });

  const grouped = useMemo(() => {
    const out: { day: string; items: ChatMessage[] }[] = [];
    (msgs.data?.messages ?? []).forEach((m) => {
      const d = dayLabel(+new Date(m.createdAt));
      const g = out.at(-1);
      if (g && g.day === d) g.items.push(m);
      else out.push({ day: d, items: [m] });
    });
    return out;
  }, [msgs.data]);

  if (match.loading) return <Spinner className="w-full" />;
  if (match.error || !match.data)
    return (
      <div className="w-full p-6">
        <Alert error={match.error} />
      </div>
    );
  const m = match.data.match;
  const closed = m.status !== 'active';
  const company = m.company ?? { id: '', name: 'Silinmiş firma' };

  const submit = () => {
    const content = text.trim();
    if (!content) return;
    void send.run(async () => {
      const r = await api.post<{ message: ChatMessage }>(`/matches/${id}/messages`, { content });
      setText('');
      msgs.setData((d) => ({ messages: [...(d?.messages ?? []).filter((x) => String(x.id) !== String(r.message.id)), r.message] }));
      void reloadMatches();
    });
  };

  const sidePanel = <MatchSide m={m} closed={closed} onPropose={() => setMeetingOpen(true)} onOutcome={() => setOutcomeOpen(true)} reload={match.reload} matchId={id} />;

  return (
    <div className="flex h-full w-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white/85 px-3 py-3 backdrop-blur-xl sm:px-5">
          <button onClick={() => navigate('/app/messages')} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Sohbetlere dön">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button onClick={() => company.id && setProfileOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <Logo company={company} size={42} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate font-semibold text-slate-900">
                {company.name} {m.company?.verified && <VerifiedBadge />}
              </div>
              <div className="truncate text-xs text-slate-500">{typing ? <span className="text-primary-600">yazıyor…</span> : `%${m.matchPercent} uyum · ${m.reasons.slice(0, 2).join(' · ')}`}</div>
            </div>
          </button>
          {!closed && (
            <Button size="sm" variant="secondary" onClick={() => setMeetingOpen(true)} className="!px-3">
              <Video className="h-4 w-4" /> <span className="hidden sm:inline">Toplantı öner</span>
            </Button>
          )}
          <button onClick={() => setSide(true)} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 xl:hidden" aria-label="Toplantılar ve iş sonucu">
            <PanelRightOpen className="h-5 w-5" />
          </button>
          <div className="relative">
            <button onClick={() => setMenu((v) => !v)} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100" aria-label="Diğer seçenekler" aria-expanded={menu}>
              <MoreVertical className="h-5 w-5" />
            </button>
            <AnimatePresence>
              {menu && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-strong absolute right-0 top-full z-30 mt-2 w-52 origin-top-right rounded-2xl p-1.5" onMouseLeave={() => setMenu(false)}>
                  {[
                    { icon: Info, label: 'Firma profilini gör', on: () => setProfileOpen(true) },
                    { icon: ClipboardCheck, label: 'İş sonucu bildir', on: () => setOutcomeOpen(true) },
                    { icon: Flag, label: 'Raporla', on: () => setReportOpen(true) },
                    { icon: Ban, label: 'Engelle', on: () => setProfileOpen(true), danger: true },
                  ].map((i) => (
                    <button
                      key={i.label}
                      disabled={!company.id}
                      onClick={() => {
                        setMenu(false);
                        i.on();
                      }}
                      className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-slate-100 disabled:opacity-40', i.danger ? 'text-rose-600' : 'text-slate-700')}
                    >
                      <i.icon className="h-4 w-4" /> {i.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-5 sm:px-6" role="log" aria-live="polite">
          <div className="mx-auto max-w-3xl">
            {msgs.loading && <Spinner />}
            <Alert error={msgs.error} />
            {msgs.data?.messages.length === 0 && (
              <div className="mx-auto my-10 max-w-md text-center">
                <div className="mx-auto flex w-max items-center gap-2 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-2 text-xs text-primary-600">✨ Eşleştiniz! {m.reasons[0]}</div>
                <p className="mt-4 text-sm text-slate-500">İlk mesajı siz gönderin. İpucu: kendinizi ve neden ilgilendiğinizi kısaca anlatın; ilk mesajda bağlantı paylaşılamaz.</p>
              </div>
            )}
            {grouped.map((g) => (
              <Fragment key={g.day}>
                <div className="my-4 text-center text-[11px] font-medium uppercase tracking-wider text-slate-500">{g.day}</div>
                <div className="space-y-1.5">
                  {g.items.map((x, i) => {
                    const nextSame = g.items[i + 1]?.mine === x.mine;
                    return (
                      <motion.div key={x.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex items-end gap-2', x.mine ? 'justify-end' : 'justify-start', !nextSame && 'mb-3')}>
                        {!x.mine && <div className="w-7 shrink-0">{!nextSame && <Logo company={company} size={28} />}</div>}
                        <div
                          className={cn(
                            'max-w-[82%] rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed sm:max-w-[70%]',
                            x.mine ? 'rounded-br-md bg-gradient-to-br from-primary-500 to-primary-600 text-white' : 'rounded-bl-md border border-slate-200 bg-slate-100 text-slate-800',
                          )}
                        >
                          {!x.mine && !nextSame && <div className="mb-0.5 text-[11px] font-medium text-blue-600">{x.senderName}</div>}
                          <span className="whitespace-pre-wrap break-words">{x.content}</span>
                          <span className={cn('ml-2 inline-flex translate-y-0.5 items-center gap-1 align-bottom text-[10px]', x.mine ? 'text-slate-600' : 'text-slate-500')}>
                            {clock(+new Date(x.createdAt))}
                            {x.mine && <Check className="h-3 w-3" />}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </Fragment>
            ))}
            {typing && (
              <div className="mt-2 flex items-end gap-2">
                <Logo company={company} size={28} />
                <div className="flex gap-1 rounded-3xl rounded-bl-md border border-slate-200 bg-slate-100 px-4 py-3.5" aria-label="yazıyor">
                  {[0, 1, 2].map((i) => (
                    <motion.span key={i} className="h-2 w-2 rounded-full bg-slate-300" animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        <div className="safe-bottom border-t border-slate-200 bg-white/85 px-3 py-3 backdrop-blur-xl sm:px-6">
          <div className="mx-auto max-w-3xl">
            <Alert error={send.error} className="mb-2" />
            {closed ? (
              <p className="py-2 text-center text-sm text-slate-500">Bu eşleşme kapatılmış; mesaj gönderilemez.</p>
            ) : (
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <textarea
                  rows={1}
                  value={text}
                  maxLength={4000}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (Date.now() - lastTypingEmit.current > 1500) {
                      lastTypingEmit.current = Date.now();
                      getSocket()?.emit('match:typing', { matchId: id });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder="Mesaj yazın…"
                  aria-label="Mesaj"
                  className="input max-h-32 min-h-12 flex-1 resize-none !rounded-2xl !py-3"
                />
                <motion.button whileTap={{ scale: 0.9 }} type="submit" disabled={!text.trim() || send.busy} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-primary-400 to-primary-600 text-white shadow-glow disabled:opacity-40 disabled:shadow-none" aria-label="Gönder">
                  <SendHorizontal className="h-5 w-5" />
                </motion.button>
              </form>
            )}
          </div>
        </div>
      </div>

      <aside className="hidden w-[340px] shrink-0 overflow-y-auto border-l border-slate-200 p-5 xl:block">{sidePanel}</aside>
      <Drawer open={side} onClose={() => setSide(false)} title="Toplantılar ve iş sonucu">
        {sidePanel}
      </Drawer>

      <MeetingModal open={meetingOpen} onClose={() => setMeetingOpen(false)} matchId={id} onDone={() => { setMeetingOpen(false); void match.reload(); void reloadMatches(); }} />
      <OutcomeModal
        open={outcomeOpen}
        onClose={() => {
          setOutcomeOpen(false);
          if (params.get('outcome')) setParams({}, { replace: true });
        }}
        matchId={id}
        current={m.myOutcome}
        onDone={() => {
          setOutcomeOpen(false);
          void match.reload();
          void reloadMatches();
        }}
      />
      <CompanySheet companyId={profileOpen ? company.id : null} onClose={() => setProfileOpen(false)} onBlocked={() => { void reloadMatches(); void match.reload(); }} />
      {company.id && <LiveReportModal companyId={company.id} companyName={company.name} open={reportOpen} onClose={() => setReportOpen(false)} />}
    </div>
  );
}

function MatchSide({ m, closed, onPropose, onOutcome, reload, matchId }: { m: MatchDetail; closed: boolean; onPropose: () => void; onOutcome: () => void; reload: () => Promise<void>; matchId: string }) {
  const act = useAction();
  const toast = useToast();
  const meetingAction = (meetingId: string, action: 'accept' | 'decline' | 'cancel' | 'complete', slot?: string) =>
    act.run(async () => {
      await api.patch(`/matches/${matchId}/meetings/${meetingId}`, { action, slot });
      toast({ title: `Toplantı ${MEETING_STATUS[action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : action === 'cancel' ? 'cancelled' : 'completed'].toLocaleLowerCase('tr')}` });
      await reload();
    });

  return (
    <div className="space-y-5">
      <div className="glass flex items-center gap-4 rounded-3xl p-4">
        <ScoreRing value={m.matchPercent} size={56} stroke={5} />
        <div className="min-w-0 text-sm">
          <div className="font-semibold text-slate-900">Uyum skoru</div>
          <div className="text-xs text-slate-500">{new Date(m.createdAt).toLocaleDateString('tr-TR', { dateStyle: 'long' })} tarihinde eşleştiniz</div>
        </div>
      </div>
      <Alert error={act.error} />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Toplantılar</h3>
          {!closed && (
            <button onClick={onPropose} className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline">
              <CalendarPlus className="h-3.5 w-3.5" /> Öner
            </button>
          )}
        </div>
        {!m.meetings.length && <p className="text-sm text-slate-500">Henüz toplantı yok.</p>}
        <ul className="space-y-3">
          {m.meetings.map((mt: Meeting) => {
            const mine = String(mt.proposedBy) !== String(m.company?.id);
            return (
              <li key={mt._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone={mt.status === 'accepted' ? 'aqua' : mt.status === 'proposed' ? 'blue' : mt.status === 'completed' ? 'violet' : 'default'}>{MEETING_STATUS[mt.status]}</Chip>
                  <span className="text-xs text-slate-500">
                    {MEETING_TYPES[mt.type]} · {mt.durationMinutes} dk {mine && '· sizin öneriniz'}
                  </span>
                </div>
                {mt.startsAt ? (
                  <div className="mt-2 text-sm font-semibold text-slate-900">{fmtDateTime(mt.startsAt)}</div>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {mt.proposedSlots.map((s) => (
                      <li key={s} className="flex items-center justify-between gap-2 text-sm text-slate-600">
                        {fmtDateTime(s)}
                        {!mine && mt.status === 'proposed' && (
                          <Button size="sm" className="!h-7 !px-2.5 !text-xs" disabled={act.busy} onClick={() => meetingAction(mt._id, 'accept', s)}>
                            Kabul et
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {mt.location && <div className="mt-1 text-xs text-slate-500">{mt.location}</div>}
                {mt.note && <div className="mt-1 text-xs text-slate-600">{mt.note}</div>}
                <div className="mt-3 flex flex-wrap gap-1">
                  {!mine && mt.status === 'proposed' && (
                    <button className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={() => meetingAction(mt._id, 'decline')}>
                      Reddet
                    </button>
                  )}
                  {['proposed', 'accepted'].includes(mt.status) && (
                    <button className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={() => meetingAction(mt._id, 'cancel')}>
                      İptal et
                    </button>
                  )}
                  {mt.status === 'accepted' && mt.startsAt && new Date(mt.startsAt) < new Date() && (
                    <button className="rounded-lg px-2 py-1 text-xs text-emerald-600 hover:bg-slate-100" onClick={() => meetingAction(mt._id, 'complete')}>
                      Gerçekleşti
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">İş sonucu</h3>
          <button onClick={onOutcome} className="text-xs text-primary-600 hover:underline">
            {m.myOutcome ? 'Güncelle' : 'Bildir'}
          </button>
        </div>
        {m.myOutcome ? (
          <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <Chip tone="aqua">{OUTCOMES[m.myOutcome.result]}</Chip>
            {m.myOutcome.estimatedValue ? fmtMoney(m.myOutcome.estimatedValue) : ''}
          </p>
        ) : (
          <p className="text-sm text-slate-500">Bu eşleşme bir görüşmeye, teklife veya sözleşmeye dönüştü mü?</p>
        )}
      </section>
    </div>
  );
}

function MeetingModal({ open, onClose, matchId, onDone }: { open: boolean; onClose: () => void; matchId: string; onDone: () => void }) {
  const tomorrow = new Date(Date.now() + 86400_000);
  tomorrow.setHours(10, 0, 0, 0);
  const [slots, setSlots] = useState<string[]>([toLocalInput(tomorrow)]);
  const [form, setForm] = useState({ type: 'online' as 'online' | 'in_person', durationMinutes: 30, location: '', note: '' });
  const { run, busy, error } = useAction();
  const toast = useToast();
  return (
    <Modal open={open} onClose={onClose} title="Toplantı öner">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await api.post(`/matches/${matchId}/meetings`, {
              slots: slots.filter(Boolean).map((s) => new Date(s).toISOString()),
              type: form.type,
              durationMinutes: Number(form.durationMinutes),
              location: form.location || undefined,
              note: form.note || undefined,
            });
            toast({ title: 'Toplantı önerisi gönderildi' });
            onDone();
          });
        }}
      >
        <Alert error={error} />
        <Field label="Önerilen saatler" hint="Karşı taraf bunlardan birini seçer (en fazla 5).">
          <div className="space-y-2">
            {slots.map((s, i) => (
              <div key={i} className="flex gap-2">
                <input type="datetime-local" required className="input [color-scheme:light]" value={s} onChange={(e) => setSlots(slots.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Saat ${i + 1}`} />
                {slots.length > 1 && (
                  <button type="button" onClick={() => setSlots(slots.filter((_, j) => j !== i))} className="rounded-xl px-3 text-slate-500 hover:bg-slate-100" aria-label="Saati kaldır">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {slots.length < 5 && (
              <button type="button" onClick={() => setSlots([...slots, ''])} className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline">
                <Plus className="h-4 w-4" /> Saat ekle
              </button>
            )}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tür" htmlFor="mt-type">
            <Select id="mt-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'online' })}>
              {Object.entries(MEETING_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Süre (dk)" htmlFor="mt-dur">
            <input id="mt-dur" type="number" min={10} max={480} className="input" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
          </Field>
        </div>
        <Field label={form.type === 'online' ? 'Bağlantı / platform' : 'Yer'} htmlFor="mt-loc">
          <input id="mt-loc" className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </Field>
        <Field label="Not" htmlFor="mt-note">
          <textarea id="mt-note" rows={2} className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit" disabled={busy}>
            <CalendarClock className="h-4 w-4" /> Öneriyi gönder
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function OutcomeModal({ open, onClose, matchId, current, onDone }: { open: boolean; onClose: () => void; matchId: string; current: MatchDetail['myOutcome']; onDone: () => void }) {
  const [form, setForm] = useState({ result: 'met' as OutcomeResult, estimatedValue: '', rating: '', feedback: '' });
  useEffect(() => {
    if (current) setForm({ result: current.result, estimatedValue: String(current.estimatedValue ?? ''), rating: String(current.rating ?? ''), feedback: current.feedback ?? '' });
  }, [current]);
  const { run, busy, error } = useAction();
  const toast = useToast();
  return (
    <Modal open={open} onClose={onClose} title="İş sonucu">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await api.put(`/matches/${matchId}/outcome`, {
              result: form.result,
              estimatedValue: form.estimatedValue === '' ? undefined : Number(form.estimatedValue),
              rating: form.rating === '' ? undefined : Number(form.rating),
              feedback: form.feedback || undefined,
            });
            toast({ title: 'İş sonucu kaydedildi', body: 'Teşekkürler — sonraki önerileriniz buna göre iyileşir.' });
            onDone();
          });
        }}
      >
        <Alert error={error} />
        <fieldset>
          <legend className="label">Sonuç</legend>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(OUTCOMES) as [OutcomeResult, string][]).map(([k, v]) => (
              <button type="button" key={k} onClick={() => setForm({ ...form, result: k })} aria-pressed={form.result === k} className={cn('rounded-xl border px-3 py-3 text-sm transition', form.result === k ? 'border-primary-400 bg-primary-50 text-slate-900' : 'border-slate-200 text-slate-500 hover:border-slate-300')}>
                {v}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tahmini değer (TRY)" htmlFor="oc-val">
            <input id="oc-val" type="number" min={0} className="input" value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })} />
          </Field>
          <Field label="Memnuniyet (1–5)" htmlFor="oc-rate">
            <Select id="oc-rate" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
              <option value="">—</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Geri bildirim (yalnızca platform görür)" htmlFor="oc-fb">
          <textarea id="oc-fb" rows={2} className="input" value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" /> Vazgeç
          </Button>
          <Button type="submit" disabled={busy}>
            Kaydet
          </Button>
        </div>
      </form>
    </Modal>
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Ban,
  CalendarClock,
  Check,
  CheckCheck,
  Clock,
  FileText,
  Flag,
  History,
  Info,
  Lock,
  MessagesSquare,
  MoreVertical,
  Paperclip,
  Search,
  SendHorizontal,
  Video,
  X,
} from 'lucide-react';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '@/store/AppStore';
import { clock, cn, dayLabel, fileSize, timeAgo } from '@/lib/utils';
import { Button, ButtonLink, CompanyLogo, Drawer, EmptyState, Modal, VerifiedBadge } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { CompanyDetailSheet, ReportModal } from '@/components/discover/CompanyDetail';
import { ScoreRing } from '@/components/discover/ScoreRing';
import type { ChatAttachment, Company, Match, Message } from '@/types';

export default function Messages() {
  const { matchId } = useParams();
  const { state, companyById } = useStore();
  const [q, setQ] = useState('');

  const threads = useMemo(
    () =>
      state.matches
        .map((m) => {
          const msgs = state.messages[m.id] ?? [];
          return { m, c: companyById(m.companyId)!, last: msgs.at(-1), unread: state.unread[m.id] ?? 0 };
        })
        .filter((t) => t.c && t.c.name.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')))
        .sort((a, b) => (b.last?.createdAt ?? b.m.createdAt) - (a.last?.createdAt ?? a.m.createdAt)),
    [state.matches, state.messages, state.unread, companyById, q],
  );

  const active = matchId ? state.matches.find((m) => m.id === matchId) : undefined;

  return (
    <div className={cn('flex', active ? 'h-[100svh] lg:h-[calc(100svh-65px)]' : 'h-[calc(100svh-65px)]')}>
      {/* Sohbet listesi */}
      <section className={cn('flex w-full flex-col border-r border-slate-200 lg:w-[360px] lg:shrink-0', active && 'hidden lg:flex')} aria-label="Sohbetler">
        <div className="px-4 pb-3 pt-5 sm:px-5 lg:pt-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">Mesajlar</h1>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input className="input !py-2.5 !pl-10" placeholder="Firma ara" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Sohbetlerde ara" />
          </div>
        </div>
        <ul className="flex-1 space-y-1 overflow-y-auto px-2 pb-32 sm:px-3 lg:pb-6">
          {threads.map(({ m, c, last, unread }) => (
            <li key={m.id}>
              <Link to={`/demo/messages/${m.id}`} className={cn('relative flex items-center gap-3 rounded-2xl px-3 py-3 transition', m.id === matchId ? 'bg-slate-100' : 'hover:bg-slate-50')}>
                <div className="relative">
                  <CompanyLogo company={c} size={48} />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 truncate text-sm font-semibold text-slate-900">
                      {c.name} {c.verified && <VerifiedBadge />}
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-500">{last ? timeAgo(last.createdAt) : ''}</span>
                  </div>
                  <p className={cn('truncate text-sm', unread ? 'font-medium text-slate-900' : 'text-slate-500')}>
                    {state.typing[m.id] ? <span className="text-primary-600">yazıyor…</span> : last ? preview(last) : 'Yeni eşleşme — ilk mesajı gönderin'}
                  </p>
                </div>
                {unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary-500 px-1.5 text-[10px] font-bold text-white">{unread}</span>}
              </Link>
            </li>
          ))}
          {threads.length === 0 && (
            <li className="px-3 py-10 text-center text-sm text-slate-500">
              {q ? 'Sonuç bulunamadı.' : 'Henüz eşleşmeniz yok. Keşfet ekranından firmaları beğenin.'}
            </li>
          )}
        </ul>
      </section>

      {/* Sohbet penceresi */}
      <section className={cn('min-w-0 flex-1', !active && 'hidden lg:flex')}>
        {active ? (
          <ChatWindow key={active.id} match={active} company={companyById(active.companyId)!} />
        ) : (
          <div className="grid h-full w-full place-items-center p-8">
            <EmptyState
              icon={<MessagesSquare className="h-6 w-6" />}
              title="Bir sohbet seçin"
              description="Karşılıklı eşleştiğiniz firmalarla güvenli şekilde mesajlaşabilir, dosya paylaşabilir ve görüşme planlayabilirsiniz."
              action={<ButtonLink to="/demo/discover">Yeni firmalar keşfet</ButtonLink>}
            />
          </div>
        )}
      </section>
    </div>
  );
}

const preview = (m: Message) => (m.from === 'me' ? 'Siz: ' : '') + (m.meeting ? '📅 Görüşme daveti' : m.attachment ? `📎 ${m.attachment.name}` : m.text);

function Receipt({ status }: { status: Message['status'] }) {
  if (status === 'sending') return <Clock className="h-3.5 w-3.5 text-slate-400" aria-label="Gönderiliyor" />;
  if (status === 'sent') return <Check className="h-3.5 w-3.5 text-slate-500" aria-label="Gönderildi" />;
  if (status === 'delivered') return <CheckCheck className="h-3.5 w-3.5 text-slate-500" aria-label="İletildi" />;
  return <CheckCheck className="h-3.5 w-3.5 text-emerald-600" aria-label="Okundu" />;
}

function ChatWindow({ match, company }: { match: Match; company: Company }) {
  const { state, dispatch, sendMessage } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [text, setText] = useState('');
  const [file, setFile] = useState<ChatAttachment | null>(null);
  const [menu, setMenu] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const messages = state.messages[match.id] ?? [];
  const typing = state.typing[match.id];

  useEffect(() => {
    dispatch({ type: 'readChat', matchId: match.id });
  }, [match.id, messages.length, dispatch]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, typing]);

  const send = () => {
    const t = text.trim();
    if (!t && !file) return;
    void sendMessage(match.id, t || (file ? 'Dosya paylaştı' : ''), file ? { attachment: file } : undefined);
    setText('');
    setFile(null);
  };

  const grouped = useMemo(() => {
    const out: { day: string; items: Message[] }[] = [];
    messages.forEach((m) => {
      const d = dayLabel(m.createdAt);
      const g = out.at(-1);
      if (g && g.day === d) g.items.push(m);
      else out.push({ day: d, items: [m] });
    });
    return out;
  }, [messages]);

  const files = messages.filter((m) => m.attachment);
  const meetings = messages.filter((m) => m.meeting);

  return (
    <div className="flex h-full w-full flex-col">
      {/* Başlık */}
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white/85 px-3 py-3 backdrop-blur-xl sm:px-5">
        <button onClick={() => navigate('/demo/messages')} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Sohbetlere dön">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button onClick={() => setProfileOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <CompanyLogo company={company} size={42} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate font-semibold text-slate-900">
              {company.name} {company.verified && <VerifiedBadge />}
            </div>
            <div className="text-xs text-slate-500">{typing ? <span className="text-primary-600">yazıyor…</span> : <span className="text-emerald-600">● Çevrim içi</span>}</div>
          </div>
        </button>
        <Button size="sm" variant="secondary" onClick={() => setMeetingOpen(true)} className="!px-3">
          <Video className="h-4 w-4" /> <span className="hidden sm:inline">Görüşme başlat</span>
        </Button>
        <button onClick={() => setHistoryOpen(true)} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100" aria-label="Eşleşme geçmişi" title="Eşleşme geçmişi">
          <History className="h-5 w-5" />
        </button>
        <div className="relative">
          <button onClick={() => setMenu((v) => !v)} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100" aria-label="Diğer seçenekler" aria-expanded={menu}>
            <MoreVertical className="h-5 w-5" />
          </button>
          <AnimatePresence>
            {menu && (
              <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-strong absolute right-0 top-full z-30 mt-2 w-52 origin-top-right rounded-2xl p-1.5" onMouseLeave={() => setMenu(false)}>
                {[
                  { icon: Info, label: 'Firma profilini gör', on: () => setProfileOpen(true) },
                  { icon: History, label: 'Eşleşme geçmişi', on: () => setHistoryOpen(true) },
                  { icon: Flag, label: 'Raporla', on: () => setReportOpen(true) },
                  { icon: Ban, label: 'Engelle', on: () => setProfileOpen(true), danger: true },
                ].map((i) => (
                  <button
                    key={i.label}
                    onClick={() => {
                      setMenu(false);
                      i.on();
                    }}
                    className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-slate-100', i.danger ? 'text-rose-600' : 'text-slate-700')}
                  >
                    <i.icon className="h-4 w-4" /> {i.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Mesajlar */}
      <div className="flex-1 overflow-y-auto px-3 py-5 sm:px-6" role="log" aria-live="polite">
        <div className="mx-auto max-w-3xl">
          <div className="mx-auto mb-6 flex w-max max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500">
            <Lock className="h-3 w-3" /> Mesajlar şifreli iletilir; içerikler KVKK kapsamında yalnızca taraflarca görülebilir.
          </div>
          {grouped.map((g) => (
            <Fragment key={g.day}>
              <div className="my-4 text-center text-[11px] font-medium uppercase tracking-wider text-slate-500">{g.day}</div>
              <div className="space-y-1.5">
                {g.items.map((m, i) => {
                  if (m.from === 'system')
                    return (
                      <div key={m.id} className="my-4 flex justify-center">
                        <div className="flex items-center gap-2 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-2 text-xs text-primary-600">
                          <span>✨</span> {m.text}
                        </div>
                      </div>
                    );
                  const mine = m.from === 'me';
                  const nextSame = g.items[i + 1]?.from === m.from;
                  return (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 34 }} className={cn('flex items-end gap-2', mine ? 'justify-end' : 'justify-start', !nextSame && 'mb-3')}>
                      {!mine && <div className="w-7 shrink-0">{!nextSame && <CompanyLogo company={company} size={28} />}</div>}
                      <div
                        className={cn(
                          'max-w-[82%] rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed sm:max-w-[70%]',
                          mine ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-[0_8px_24px_-12px_rgba(255,94,0,0.8)]' : 'border border-slate-200 bg-slate-100 text-slate-800',
                          mine ? (nextSame ? 'rounded-br-lg' : 'rounded-br-md') : nextSame ? 'rounded-bl-lg' : 'rounded-bl-md',
                        )}
                      >
                        {m.meeting && (
                          <div className={cn('mb-2 rounded-2xl p-3', mine ? 'bg-slate-200' : 'bg-slate-100')}>
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              <CalendarClock className="h-4 w-4" /> Görüşme daveti
                            </div>
                            <div className="mt-1 text-sm opacity-90">{m.meeting.topic}</div>
                            <div className="mt-1 text-xs opacity-80">
                              {new Date(m.meeting.when).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })} · {m.meeting.mode === 'online' ? 'Çevrim içi' : 'Yüz yüze'}
                            </div>
                          </div>
                        )}
                        {m.attachment && (
                          <div className={cn('mb-1.5 flex items-center gap-3 rounded-2xl p-2.5', mine ? 'bg-slate-200' : 'bg-slate-100')}>
                            <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-200">
                              <FileText className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{m.attachment.name}</div>
                              <div className="text-xs opacity-70">{fileSize(m.attachment.size)}</div>
                            </div>
                          </div>
                        )}
                        {!(m.attachment && m.text === 'Dosya paylaştı') && !(m.meeting && !m.text) && <span className="whitespace-pre-wrap break-words">{m.text}</span>}
                        <span className={cn('ml-2 inline-flex translate-y-0.5 items-center gap-1 align-bottom text-[10px]', mine ? 'text-slate-600' : 'text-slate-500')}>
                          {clock(m.createdAt)}
                          {mine && state.privacy.readReceipts && <Receipt status={m.status} />}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </Fragment>
          ))}
          <AnimatePresence>
            {typing && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 flex items-end gap-2">
                <CompanyLogo company={company} size={28} />
                <div className="flex gap-1 rounded-3xl rounded-bl-md border border-slate-200 bg-slate-100 px-4 py-3.5" aria-label="yazıyor">
                  {[0, 1, 2].map((i) => (
                    <motion.span key={i} className="h-2 w-2 rounded-full bg-slate-300" animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={endRef} />
        </div>
      </div>

      {/* Yazma alanı */}
      <div className="safe-bottom border-t border-slate-200 bg-white/85 px-3 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto max-w-3xl">
          <AnimatePresence>
            {file && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-2 overflow-hidden">
                <div className="glass flex items-center gap-3 rounded-2xl p-2.5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary-600">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-slate-900">{file.name}</div>
                    <div className="text-xs text-slate-500">{fileSize(file.size)} · gönderilmeye hazır</div>
                  </div>
                  <button onClick={() => setFile(null)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Dosyayı kaldır">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 25 * 1024 * 1024) {
                  toast({ title: 'Dosya çok büyük', body: 'En fazla 25 MB yükleyebilirsiniz.', tone: 'warning' });
                } else setFile({ name: f.name, size: f.size, type: f.type });
                e.target.value = '';
              }}
            />
            <button type="button" onClick={() => fileRef.current?.click()} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Dosya ekle">
              <Paperclip className="h-5 w-5" />
            </button>
            <textarea
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Mesaj yazın…"
              aria-label="Mesaj"
              className="input max-h-32 min-h-12 flex-1 resize-none !rounded-2xl !py-3"
            />
            <motion.button whileTap={{ scale: 0.9 }} type="submit" disabled={!text.trim() && !file} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-primary-400 to-primary-600 text-white shadow-glow transition disabled:opacity-40 disabled:shadow-none" aria-label="Gönder">
              <SendHorizontal className="h-5 w-5" />
            </motion.button>
          </form>
        </div>
      </div>

      <MeetingModal
        open={meetingOpen}
        onClose={() => setMeetingOpen(false)}
        onSubmit={(meeting) => {
          void sendMessage(match.id, '', { meeting });
          toast({ title: 'Görüşme daveti gönderildi', body: `${company.name} takvim davetini aldı.` });
        }}
      />
      <Drawer open={historyOpen} onClose={() => setHistoryOpen(false)} title="Eşleşme geçmişi">
        <div className="flex items-center gap-4">
          <ScoreRing value={match.score} size={64} stroke={5} />
          <div>
            <div className="font-semibold text-slate-900">{company.name}</div>
            <div className="text-sm text-slate-500">{new Date(match.createdAt).toLocaleDateString('tr-TR', { dateStyle: 'long' })} tarihinde eşleştiniz</div>
          </div>
        </div>
        <ol className="relative mt-8 space-y-6 border-l border-slate-200 pl-6">
          {[
            { t: match.createdAt - 3600_000 * 30, title: 'Siz ilgilendiniz', body: 'Keşfet ekranında “İlgileniyorum” dediniz.' },
            { t: match.createdAt, title: 'Karşılıklı eşleşme', body: match.reasons.join(' · ') },
            ...meetings.map((m) => ({ t: m.createdAt, title: 'Görüşme planlandı', body: m.meeting!.topic })),
            ...files.map((m) => ({ t: m.createdAt, title: 'Dosya paylaşıldı', body: m.attachment!.name })),
          ]
            .sort((a, b) => a.t - b.t)
            .map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-white bg-primary-500" />
                <div className="text-xs text-slate-500">{new Date(e.t).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                <div className="mt-0.5 text-sm font-medium text-slate-900">{e.title}</div>
                <div className="text-sm text-slate-500">{e.body}</div>
              </li>
            ))}
        </ol>
        <h3 className="label mt-10">Paylaşılan dosyalar ({files.length})</h3>
        <ul className="space-y-2">
          {files.map((m) => (
            <li key={m.id} className="glass flex items-center gap-3 rounded-2xl p-3 text-sm">
              <FileText className="h-4 w-4 text-primary-600" />
              <span className="min-w-0 flex-1 truncate text-slate-700">{m.attachment!.name}</span>
              <span className="text-xs text-slate-500">{fileSize(m.attachment!.size)}</span>
            </li>
          ))}
          {!files.length && <li className="text-sm text-slate-500">Henüz dosya paylaşılmadı.</li>}
        </ul>
      </Drawer>
      <CompanyDetailSheet company={profileOpen ? company : null} open={profileOpen} onClose={() => setProfileOpen(false)} score={match.score} reasons={match.reasons} />
      <ReportModal company={company} open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}

function MeetingModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (m: NonNullable<Message['meeting']>) => void }) {
  const defaultWhen = () => {
    const d = new Date(Date.now() + 2 * 86400_000);
    d.setHours(14, 0, 0, 0);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  };
  const [when, setWhen] = useState(defaultWhen);
  const [mode, setMode] = useState<'online' | 'in_person'>('online');
  const [topic, setTopic] = useState('Tanışma ve iş birliği fırsatları');
  return (
    <Modal open={open} onClose={onClose} title="Görüşme planla">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ when, mode, topic });
          onClose();
        }}
      >
        <div>
          <label className="label" htmlFor="m-topic">
            Konu
          </label>
          <input id="m-topic" className="input" value={topic} onChange={(e) => setTopic(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="m-when">
            Tarih ve saat
          </label>
          <input id="m-when" type="datetime-local" className="input [color-scheme:light]" value={when} onChange={(e) => setWhen(e.target.value)} required />
        </div>
        <div>
          <span className="label">Görüşme türü</span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['online', 'Çevrim içi', Video],
                ['in_person', 'Yüz yüze', CalendarClock],
              ] as const
            ).map(([v, l, Icon]) => (
              <button type="button" key={v} onClick={() => setMode(v)} className={cn('flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm transition', mode === v ? 'border-primary-400 bg-primary-50 text-slate-900' : 'border-slate-200 text-slate-500 hover:border-slate-300')}>
                <Icon className="h-4 w-4" /> {l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit">
            <CalendarClock className="h-4 w-4" /> Davet gönder
          </Button>
        </div>
      </form>
    </Modal>
  );
}

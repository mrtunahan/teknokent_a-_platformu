import { Check, Copy, MessageSquare, Mic, MicOff, MonitorUp, PhoneOff, Send, ShieldAlert, Users, Video, VideoOff, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { BrandMark, Button } from '@/components/ui';
import { cn, initials, storage } from '@/lib/utils';
import { roomUrl, useRoom, type MediaState, type RemotePeer } from './useRoom';

const NAME_KEY = 'teknoortak.rtc.name';

function VideoTile({ stream, name, muted, mirrored, state, local, connection }: { stream: MediaStream | null; name: string; muted?: boolean; mirrored?: boolean; state: MediaState; local?: boolean; connection?: RemotePeer['connection'] }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  const showVideo = !!stream && stream.getVideoTracks().length > 0 && (state.video || state.screen);
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-800 ring-1 ring-white/10" data-testid={local ? 'local-tile' : 'remote-tile'}>
      <video ref={ref} autoPlay playsInline muted={muted} className={cn('h-full w-full object-cover', !showVideo && 'invisible', mirrored && !state.screen && '-scale-x-100', state.screen && 'object-contain')} />
      {!showVideo && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-slate-700 font-display text-2xl font-bold text-white">{initials(name) || '?'}</span>
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg bg-black/55 px-2 py-1 text-xs font-medium text-white backdrop-blur">
        {!state.audio && <MicOff className="h-3.5 w-3.5 text-rose-400" />}
        {state.screen && <MonitorUp className="h-3.5 w-3.5 text-emerald-400" />}
        {name}
        {local && ' (siz)'}
      </div>
      {connection && connection !== 'connected' && (
        <div className="absolute right-2 top-2 rounded-lg bg-black/55 px-2 py-1 text-[11px] text-amber-300">{connection === 'failed' ? 'Bağlantı kurulamadı' : 'Bağlanıyor…'}</div>
      )}
    </div>
  );
}

export default function VideoRoom() {
  const { roomId = '' } = useParams();
  const [params] = useSearchParams();
  const title = params.get('baslik') ?? '';
  const room = useRoom(roomId);
  const [name, setName] = useState(() => params.get('ad') ?? storage.get<string>(NAME_KEY) ?? '');
  const [cam, setCam] = useState<MediaStream | null>(null);
  const [screen, setScreen] = useState<MediaStream | null>(null);
  const [state, setState] = useState<MediaState>({ audio: true, video: true, screen: false });
  const [mediaError, setMediaError] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const [seen, setSeen] = useState(0);
  const secure = window.isSecureContext;
  const supported = typeof RTCPeerConnection !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  // Ön izleme: kamera + mikrofon (izin verilmezse yalnızca izleyici olarak katılınabilir)
  useEffect(() => {
    if (!secure || !supported) return;
    let stopped = false;
    let acquired: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then((s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop());
        acquired = s;
        setCam(s);
      })
      .catch(() => setMediaError('Kamera veya mikrofona erişilemedi. İzin vermeden de odaya katılabilir, diğerlerini görüp duyabilirsiniz.'));
    return () => {
      stopped = true;
      acquired?.getTracks().forEach((t) => t.stop());
    };
  }, [secure, supported]);

  useEffect(() => () => screen?.getTracks().forEach((t) => t.stop()), [screen]);

  const toggle = (kind: 'audio' | 'video') => {
    const next = { ...state, [kind]: !state[kind] };
    cam?.getTracks().filter((t) => t.kind === kind).forEach((t) => (t.enabled = next[kind]));
    setState(next);
    room.setMediaState(next);
  };

  const stopShare = async () => {
    screen?.getTracks().forEach((t) => t.stop());
    setScreen(null);
    await room.replaceTrack('video', cam?.getVideoTracks()[0] ?? null);
    const next = { ...state, screen: false };
    setState(next);
    room.setMediaState(next);
  };

  const share = async () => {
    if (state.screen) return stopShare();
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const track = s.getVideoTracks()[0]!;
      track.onended = () => void stopShare();
      setScreen(s);
      await room.replaceTrack('video', track);
      const next = { ...state, screen: true };
      setState(next);
      room.setMediaState(next);
    } catch {
      /* kullanıcı vazgeçti */
    }
  };

  const leave = () => {
    room.leave();
    cam?.getTracks().forEach((t) => t.stop());
    screen?.getTracks().forEach((t) => t.stop());
  };

  const localView = useMemo(() => (state.screen && screen ? screen : cam), [state.screen, screen, cam]);
  const unread = room.messages.length - seen;
  useEffect(() => {
    if (chatOpen) setSeen(room.messages.length);
  }, [chatOpen, room.messages.length]);

  const link = roomUrl(roomId);
  const copy = () => {
    void navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  /* ---------------------------- Desteklenmiyor ---------------------------- */
  if (!secure || !supported) {
    return (
      <div className="grid min-h-[100svh] place-items-center bg-slate-950 px-4 text-white">
        <div className="max-w-lg text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-amber-400" />
          <h1 className="mt-4 font-display text-2xl font-bold">Görüntülü görüşme bu adreste açılamıyor</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            {!secure
              ? 'Tarayıcılar kamera ve mikrofonu yalnızca güvenli (HTTPS) bağlantıda açar. Platform bir alan adı ve SSL sertifikasıyla yayınlandığında toplantı odaları çalışır.'
              : 'Bu tarayıcı görüntülü görüşmeyi desteklemiyor. Güncel Chrome, Edge, Firefox veya Safari kullanın.'}
          </p>
          <p className="mt-4 break-all rounded-xl bg-white/5 p-3 font-mono text-xs text-slate-400">{link}</p>
          <Link to="/" className="mt-6 inline-block text-sm font-semibold text-primary-400 hover:underline">
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    );
  }

  /* ------------------------------ Ayrıldı ------------------------------- */
  if (room.status === 'left') {
    return (
      <div className="grid min-h-[100svh] place-items-center bg-slate-950 px-4 text-center text-white">
        <div>
          <h1 className="font-display text-2xl font-bold">Görüşmeden ayrıldınız</h1>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => window.location.reload()}>Tekrar katıl</Button>
            <Button variant="secondary" onClick={() => window.history.back()}>
              Geri dön
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ----------------------------- Ön izleme ------------------------------ */
  if (room.status !== 'joined') {
    return (
      <div className="min-h-[100svh] bg-slate-950 text-white">
        <header className="flex h-16 items-center justify-between px-4 sm:px-8">
          <Link to="/" aria-label="Ana sayfa" className="[&_span]:text-white">
            <BrandMark />
          </Link>
        </header>
        <main className="mx-auto grid max-w-5xl gap-8 px-4 py-6 sm:px-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <VideoTile stream={cam} name={name || 'Siz'} muted mirrored state={state} local />
            <div className="mt-3 flex justify-center gap-2">
              <button onClick={() => toggle('audio')} className={cn('grid h-12 w-12 place-items-center rounded-full', state.audio ? 'bg-white/10 hover:bg-white/20' : 'bg-rose-600')} aria-label={state.audio ? 'Mikrofonu kapat' : 'Mikrofonu aç'}>
                {state.audio ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </button>
              <button onClick={() => toggle('video')} className={cn('grid h-12 w-12 place-items-center rounded-full', state.video ? 'bg-white/10 hover:bg-white/20' : 'bg-rose-600')} aria-label={state.video ? 'Kamerayı kapat' : 'Kamerayı aç'}>
                {state.video ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </button>
            </div>
            {mediaError && <p className="mt-3 text-center text-sm text-amber-300">{mediaError}</p>}
          </div>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              storage.set(NAME_KEY, name.trim());
              const audio = cam?.getAudioTracks()[0] ?? null;
              const video = cam?.getVideoTracks()[0] ?? null;
              const initial = { audio: !!audio && state.audio, video: !!video && state.video, screen: false };
              setState(initial);
              void room.join(name.trim(), { audio, video }, initial);
            }}
          >
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Toplantı odası</div>
              <h1 className="mt-1 font-display text-2xl font-bold">{title || 'Görüntülü görüşme'}</h1>
              <p className="mt-1 break-all font-mono text-xs text-slate-400">{roomId}</p>
            </div>
            <div>
              <label htmlFor="rtc-name" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Adınız
              </label>
              <input id="rtc-name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-primary-400" placeholder="ör. Mehmet Kurt · Kuzey Döküm" />
            </div>
            {room.error && <p className="text-sm text-rose-300">{room.error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={!name.trim() || room.status === 'joining'}>
              {room.status === 'joining' ? 'Katılınıyor…' : 'Görüşmeye katıl'}
            </Button>
            <button type="button" onClick={copy} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm text-slate-300 hover:bg-white/5">
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />} {copied ? 'Bağlantı kopyalandı' : 'Davet bağlantısını kopyala'}
            </button>
            <p className="text-xs leading-relaxed text-slate-500">Görüntü ve ses katılımcılar arasında doğrudan iletilir; sunucuda kaydedilmez. En fazla 6 kişi.</p>
          </form>
        </main>
      </div>
    );
  }

  /* ------------------------------- Oda ---------------------------------- */
  const count = room.peers.length + 1;
  const grid = count <= 1 ? 'grid-cols-1 max-w-4xl' : count <= 2 ? 'sm:grid-cols-2' : count <= 4 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3';
  return (
    <div className="flex h-[100svh] flex-col bg-slate-950 text-white">
      <header className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{title || 'Görüntülü görüşme'}</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Users className="h-3.5 w-3.5" /> {count} katılımcı
          </div>
        </div>
        <button onClick={copy} className="hidden items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 sm:inline-flex">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Kopyalandı' : 'Bağlantıyı kopyala'}
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 items-center justify-center overflow-y-auto p-3 sm:p-6">
          <div className={cn('mx-auto grid w-full gap-3', grid)}>
            <VideoTile stream={localView} name={name} muted mirrored state={state} local />
            {room.peers.map((p) => (
              <VideoTile key={p.id} stream={p.stream} name={p.name} state={p.state} connection={p.connection} />
            ))}
          </div>
          {room.peers.length === 0 && <p className="absolute bottom-28 left-1/2 -translate-x-1/2 rounded-xl bg-white/5 px-4 py-2 text-sm text-slate-300">Diğer katılımcılar bekleniyor. Bağlantıyı paylaşın.</p>}
        </div>

        {chatOpen && (
          <aside className="flex w-full max-w-sm flex-col border-l border-white/10 bg-slate-900 max-sm:fixed max-sm:inset-0 max-sm:z-20 max-sm:max-w-none" aria-label="Sohbet">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="font-semibold">Sohbet</span>
              <button onClick={() => setChatOpen(false)} aria-label="Sohbeti kapat" className="rounded-lg p-1 hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
              {room.messages.length === 0 && <li className="text-slate-500">Mesajlar yalnızca bu görüşme süresince görünür.</li>}
              {room.messages.map((m, i) => (
                <li key={i} className={cn('max-w-[85%] rounded-2xl px-3 py-2', m.mine ? 'ml-auto bg-primary-500' : 'bg-white/10')}>
                  {!m.mine && <div className="text-xs font-semibold text-slate-300">{m.name}</div>}
                  {m.text}
                </li>
              ))}
            </ul>
            <form
              className="flex gap-2 border-t border-white/10 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim()) return;
                room.sendChat(text.trim());
                setText('');
              }}
            >
              <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary-400" placeholder="Mesaj yazın…" aria-label="Sohbet mesajı" />
              <button type="submit" className="grid h-10 w-10 place-items-center rounded-xl bg-primary-500" aria-label="Gönder">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </aside>
        )}
      </div>

      <footer className="flex items-center justify-center gap-2 px-4 pb-5 pt-2 sm:gap-3">
        <button onClick={() => toggle('audio')} className={cn('grid h-12 w-12 place-items-center rounded-full', state.audio ? 'bg-white/10 hover:bg-white/20' : 'bg-rose-600')} aria-label={state.audio ? 'Mikrofonu kapat' : 'Mikrofonu aç'} disabled={!cam?.getAudioTracks().length}>
          {state.audio ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </button>
        <button onClick={() => toggle('video')} className={cn('grid h-12 w-12 place-items-center rounded-full', state.video ? 'bg-white/10 hover:bg-white/20' : 'bg-rose-600')} aria-label={state.video ? 'Kamerayı kapat' : 'Kamerayı aç'} disabled={!cam?.getVideoTracks().length}>
          {state.video ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </button>
        {'getDisplayMedia' in (navigator.mediaDevices ?? {}) && (
          <button onClick={() => void share()} className={cn('hidden h-12 w-12 place-items-center rounded-full sm:grid', state.screen ? 'bg-emerald-600' : 'bg-white/10 hover:bg-white/20')} aria-label={state.screen ? 'Paylaşımı durdur' : 'Ekranı paylaş'}>
            <MonitorUp className="h-5 w-5" />
          </button>
        )}
        <button onClick={() => setChatOpen((v) => !v)} className={cn('relative grid h-12 w-12 place-items-center rounded-full', chatOpen ? 'bg-white/25' : 'bg-white/10 hover:bg-white/20')} aria-label="Sohbet">
          <MessageSquare className="h-5 w-5" />
          {!chatOpen && unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary-500 px-1 text-[10px] font-bold">{unread}</span>}
        </button>
        <button onClick={leave} className="ml-2 inline-flex h-12 items-center gap-2 rounded-full bg-rose-600 px-5 font-semibold hover:bg-rose-700" aria-label="Görüşmeden ayrıl">
          <PhoneOff className="h-5 w-5" /> <span className="hidden sm:inline">Ayrıl</span>
        </button>
      </footer>
    </div>
  );
}

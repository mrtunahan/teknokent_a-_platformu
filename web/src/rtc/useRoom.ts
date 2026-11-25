import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

/**
 * WebRTC "mesh" oda bağlantısı: her katılımcı diğer herkese doğrudan bağlanır (2–6 kişi için uygun).
 * Sinyal: Socket.IO "/rtc" ad alanı. Medya sunucudan geçmez.
 *
 * Yeniden müzakereye gerek kalmaması için her bağlantıda bir ses + bir görüntü aktarıcısı (transceiver) açılır;
 * kamera/ekran değişimi `replaceTrack` ile yapılır.
 */

export type MediaState = { audio: boolean; video: boolean; screen: boolean };
export interface RemotePeer {
  id: string;
  name: string;
  stream: MediaStream | null;
  state: MediaState;
  connection: RTCPeerConnectionState | 'new';
}
export interface ChatMessage {
  from: string;
  name: string;
  text: string;
  at: number;
  mine: boolean;
}
export type RoomStatus = 'idle' | 'joining' | 'joined' | 'full' | 'error' | 'left';

type Signal = { description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
type PeerEntry = { pc: RTCPeerConnection; pending: RTCIceCandidateInit[]; stream: MediaStream };

const FALLBACK_ICE: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

export function newRoomId(prefix = 'oda') {
  const rnd = Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => (b % 36).toString(36)).join('');
  return `${prefix}-${rnd}`.toLowerCase();
}

export function roomUrl(id: string) {
  return `${window.location.origin}/oda/${id}`;
}

export function useRoom(roomId: string) {
  const [status, setStatus] = useState<RoomStatus>('idle');
  const [peers, setPeers] = useState<RemotePeer[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const meRef = useRef('');
  const iceRef = useRef<RTCIceServer[]>(FALLBACK_ICE);
  const entries = useRef(new Map<string, PeerEntry>());
  /** Şu an gönderilen yerel izler (kamera veya ekran) */
  const tracks = useRef<{ audio: MediaStreamTrack | null; video: MediaStreamTrack | null }>({ audio: null, video: null });
  const stateRef = useRef<MediaState>({ audio: true, video: true, screen: false });

  const patchPeer = useCallback((id: string, patch: Partial<RemotePeer>) => {
    setPeers((list) => (list.some((p) => p.id === id) ? list.map((p) => (p.id === id ? { ...p, ...patch } : p)) : [...list, { id, name: 'Katılımcı', stream: null, state: { audio: true, video: true, screen: false }, connection: 'new', ...patch }]));
  }, []);

  const send = useCallback((to: string, data: Signal) => socketRef.current?.emit('signal', { to, data }), []);

  /** Bağlantıdaki ses/görüntü aktarıcılarını hazırla ve güncel yerel izleri ata */
  const attachLocal = useCallback(async (pc: RTCPeerConnection, create: boolean) => {
    for (const kind of ['audio', 'video'] as const) {
      let t = pc.getTransceivers().find((x) => x.receiver.track?.kind === kind);
      if (!t && create) t = pc.addTransceiver(kind, { direction: 'sendrecv' });
      if (!t) continue;
      t.direction = 'sendrecv';
      await t.sender.replaceTrack(tracks.current[kind]);
    }
  }, []);

  const createPeer = useCallback(
    (id: string, name?: string): PeerEntry => {
      const existing = entries.current.get(id);
      if (existing) return existing;
      const pc = new RTCPeerConnection({ iceServers: iceRef.current });
      const entry: PeerEntry = { pc, pending: [], stream: new MediaStream() };
      entries.current.set(id, entry);
      patchPeer(id, { ...(name ? { name } : {}), stream: entry.stream });
      pc.onicecandidate = (e) => e.candidate && send(id, { candidate: e.candidate.toJSON() });
      pc.ontrack = (e) => {
        entry.stream.getTracks().filter((t) => t.kind === e.track.kind).forEach((t) => entry.stream.removeTrack(t));
        entry.stream.addTrack(e.track);
        // Yeni MediaStream nesnesi: React video öğesini yenilesin
        const s = new MediaStream(entry.stream.getTracks());
        entry.stream = s;
        patchPeer(id, { stream: s });
      };
      pc.onconnectionstatechange = () => patchPeer(id, { connection: pc.connectionState });
      return entry;
    },
    [patchPeer, send],
  );

  const removePeer = useCallback((id: string) => {
    entries.current.get(id)?.pc.close();
    entries.current.delete(id);
    setPeers((list) => list.filter((p) => p.id !== id));
  }, []);

  const handleSignal = useCallback(
    async ({ from, data }: { from: string; data: Signal }) => {
      const entry = createPeer(from);
      const { pc } = entry;
      try {
        if (data.description) {
          await pc.setRemoteDescription(data.description);
          if (data.description.type === 'offer') {
            await attachLocal(pc, true);
            await pc.setLocalDescription(await pc.createAnswer());
            send(from, { description: pc.localDescription!.toJSON() });
          }
          for (const c of entry.pending.splice(0)) await pc.addIceCandidate(c).catch(() => {});
        } else if (data.candidate) {
          if (pc.remoteDescription) await pc.addIceCandidate(data.candidate).catch(() => {});
          else entry.pending.push(data.candidate);
        }
      } catch {
        /* bozuk sinyal: yok say */
      }
    },
    [attachLocal, createPeer, send],
  );

  const join = useCallback(
    async (name: string, local: { audio: MediaStreamTrack | null; video: MediaStreamTrack | null }, initial: MediaState) => {
      tracks.current = local;
      stateRef.current = initial;
      setStatus('joining');
      setError('');
      try {
        const r = await fetch('/api/v1/rtc/config');
        if (r.ok) {
          const cfg = (await r.json()) as { iceServers?: RTCIceServer[] };
          if (cfg.iceServers?.length) iceRef.current = cfg.iceServers;
        }
      } catch {
        /* varsayılan STUN */
      }
      const socket = io('/rtc', { transports: ['websocket', 'polling'], forceNew: true });
      socketRef.current = socket;
      socket.on('peer-joined', ({ id, name: n }: { id: string; name: string }) => {
        createPeer(id, n);
      });
      socket.on('peer-left', ({ id }: { id: string }) => removePeer(id));
      socket.on('peer-state', ({ id, ...s }: { id: string } & MediaState) => patchPeer(id, { state: s }));
      socket.on('signal', handleSignal);
      socket.on('chat', (m: Omit<ChatMessage, 'mine'>) => setMessages((list) => [...list, { ...m, mine: m.from === meRef.current }]));
      socket.on('connect_error', () => {
        setError('Sunucuya bağlanılamadı.');
        setStatus('error');
      });
      socket.emit('join', { room: roomId, name }, async (res: { ok: boolean; id?: string; error?: string; max?: number; peers?: { id: string; name: string; state: MediaState }[] }) => {
        if (!res.ok) {
          setStatus(res.error === 'full' ? 'full' : 'error');
          setError(res.error === 'full' ? `Oda dolu (en fazla ${res.max} kişi).` : 'Odaya katılınamadı.');
          socket.disconnect();
          return;
        }
        meRef.current = res.id!;
        setStatus('joined');
        socket.emit('state', initial);
        // Yeni katılan, odadaki herkese teklif gönderir (çakışma olmaz)
        for (const p of res.peers ?? []) {
          const { pc } = createPeer(p.id, p.name);
          patchPeer(p.id, { state: p.state });
          await attachLocal(pc, true);
          await pc.setLocalDescription(await pc.createOffer());
          send(p.id, { description: pc.localDescription!.toJSON() });
        }
      });
    },
    [attachLocal, createPeer, handleSignal, patchPeer, removePeer, roomId, send],
  );

  /** Gönderilen izi değiştir (kamera ↔ ekran, kamera aç/kapa sonrası yeni iz) */
  const replaceTrack = useCallback(async (kind: 'audio' | 'video', track: MediaStreamTrack | null) => {
    tracks.current[kind] = track;
    for (const { pc } of entries.current.values()) {
      const t = pc.getTransceivers().find((x) => x.receiver.track?.kind === kind);
      await t?.sender.replaceTrack(track).catch(() => {});
    }
  }, []);

  const setMediaState = useCallback((s: MediaState) => {
    stateRef.current = s;
    socketRef.current?.emit('state', s);
  }, []);

  const sendChat = useCallback((text: string) => socketRef.current?.emit('chat', { text }), []);

  const leave = useCallback(() => {
    for (const id of [...entries.current.keys()]) removePeer(id);
    socketRef.current?.disconnect();
    socketRef.current = null;
    setStatus('left');
  }, [removePeer]);

  useEffect(
    () => () => {
      for (const { pc } of entries.current.values()) pc.close();
      entries.current.clear();
      socketRef.current?.disconnect();
    },
    [],
  );

  return { status, error, peers, messages, join, leave, replaceTrack, setMediaState, sendChat };
}

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { tokenStore } from './api';

let socket: Socket | null = null;

/** Oturum açıkken tek paylaşılan Socket.IO bağlantısı. */
export function getSocket(): Socket | null {
  const token = tokenStore.get();
  if (!token) return null;
  if (!socket) socket = io(import.meta.env.VITE_API_URL || undefined, { auth: { token }, transports: ['websocket', 'polling'] });
  return socket;
}

export function closeSocket() {
  socket?.close();
  socket = null;
}

/** Bir olayı dinler; bileşen ayrılınca dinleyiciyi kaldırır. */
export function useSocketEvent<T = any>(event: string, handler: (payload: T) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const s = getSocket();
    if (!s) return undefined;
    const fn = (p: T) => ref.current(p);
    s.on(event, fn);
    return () => {
      s.off(event, fn);
    };
  }, [event]);
}

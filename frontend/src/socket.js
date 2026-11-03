import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { tokenStore } from './api';

let socket = null;

/** Tek paylaşılan Socket.IO bağlantısı (oturum açıkken). */
export function getSocket() {
  const token = tokenStore.get();
  if (!token) return null;
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL || undefined, { auth: { token }, transports: ['websocket', 'polling'] });
  }
  return socket;
}

export function closeSocket() {
  socket?.close();
  socket = null;
}

/** Bir olayı dinler; bileşen ayrılınca dinleyiciyi kaldırır. */
export function useSocketEvent(event, handler) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const s = getSocket();
    if (!s) return undefined;
    const fn = (p) => ref.current(p);
    s.on(event, fn);
    return () => s.off(event, fn);
  }, [event]);
}

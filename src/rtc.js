const config = require('./config');
const logger = require('./utils/logger');

/**
 * Uygulama içi görüntülü görüşme için sinyal kanalı (Socket.IO "/rtc" ad alanı).
 *
 * Medya sunucudan geçmez: tarayıcılar birbirine doğrudan (WebRTC) bağlanır; bu kanal yalnızca bağlantı
 * kurulumu için teklif/yanıt/ICE adaylarını taşır ve oda içi sohbeti iletir.
 * Oda kimliği tahmin edilemez rastgele bir dizgedir; bağlantıyı bilen katılır (toplantı bağlantısı modeli).
 *
 * İstemci → sunucu:  join {room, name} (ack), signal {to, data}, chat {text}, state {audio, video, screen}
 * Sunucu → istemci:  peer-joined {id, name}, peer-left {id}, signal {from, data}, chat {...}, peer-state {...}
 */

const ROOM_RE = /^[a-z0-9][a-z0-9-]{5,63}$/;

function clean(s, max) {
  return String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}

function attachRtc(io) {
  const max = config.rtc.maxParticipants;
  const nsp = io.of('/rtc');

  nsp.on('connection', (socket) => {
    let room = null;
    let lastChat = 0;

    socket.on('join', (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      const r = clean(payload?.room, 64).toLowerCase();
      const name = clean(payload?.name, 60) || 'Katılımcı';
      if (room) return reply({ ok: false, error: 'already_joined' });
      if (!ROOM_RE.test(r)) return reply({ ok: false, error: 'invalid_room' });
      const members = nsp.adapter.rooms.get(r);
      if (members && members.size >= max) return reply({ ok: false, error: 'full', max });

      const peers = [...(members ?? [])].map((id) => ({ id, name: nsp.sockets.get(id)?.data.name ?? 'Katılımcı', state: nsp.sockets.get(id)?.data.state ?? {} }));
      room = r;
      socket.data.name = name;
      socket.data.state = { audio: true, video: true, screen: false };
      socket.join(r);
      socket.to(r).emit('peer-joined', { id: socket.id, name });
      return reply({ ok: true, id: socket.id, peers, max });
    });

    // Teklif/yanıt/ICE adayı yalnızca aynı odadaki bir katılımcıya iletilir
    socket.on('signal', (payload) => {
      const to = payload?.to;
      if (!room || typeof to !== 'string' || !nsp.adapter.rooms.get(room)?.has(to) || to === socket.id) return;
      const data = payload.data;
      if (!data || typeof data !== 'object') return;
      if (JSON.stringify(data).length > 64_000) return;
      nsp.to(to).emit('signal', { from: socket.id, data });
    });

    socket.on('chat', (payload) => {
      const text = clean(payload?.text, 1000);
      const now = Date.now();
      if (!room || !text || now - lastChat < 300) return;
      lastChat = now;
      nsp.to(room).emit('chat', { from: socket.id, name: socket.data.name, text, at: now });
    });

    socket.on('state', (payload) => {
      if (!room) return;
      const state = { audio: !!payload?.audio, video: !!payload?.video, screen: !!payload?.screen };
      socket.data.state = state;
      socket.to(room).emit('peer-state', { id: socket.id, ...state });
    });

    socket.on('disconnect', () => {
      if (room) socket.to(room).emit('peer-left', { id: socket.id });
    });
  });

  logger.info('Görüntülü görüşme sinyal kanalı (/rtc) hazır');
  return nsp;
}

/** İstemcinin kullanacağı ICE sunucuları (STUN; varsa kendi TURN sunucunuz) */
function iceServers() {
  const list = config.rtc.stunUrls.length ? [{ urls: config.rtc.stunUrls }] : [];
  if (config.rtc.turnUrl) list.push({ urls: config.rtc.turnUrl.split(',').map((s) => s.trim()), username: config.rtc.turnUsername, credential: config.rtc.turnCredential });
  return list;
}

module.exports = { attachRtc, iceServers, ROOM_RE };

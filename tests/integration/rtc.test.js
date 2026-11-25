require('../setupEnv');
const http = require('node:http');
const { describe, test, before, after } = require('node:test');
const { expect } = require('expect');
const request = require('supertest');
const { Server } = require('socket.io');
const { io: Client } = require('socket.io-client');
const { attachRtc } = require('../../src/rtc');
const { createApp } = require('../../src/app');

/** Görüntülü görüşme sinyal kanalı: veritabanı gerektirmez */
describe('Görüntülü görüşme sinyal kanalı (/rtc)', () => {
  let srv;
  let io;
  let url;
  const clients = [];
  const mk = () => {
    const c = Client(url, { transports: ['websocket'], forceNew: true });
    clients.push(c);
    return c;
  };
  const emit = (s, ev, p) => new Promise((r) => s.emit(ev, p, r));
  const once = (s, ev) => new Promise((r) => s.once(ev, r));

  before(async () => {
    srv = http.createServer();
    io = new Server(srv);
    attachRtc(io);
    await new Promise((r) => srv.listen(0, r));
    url = `http://127.0.0.1:${srv.address().port}/rtc`;
  });

  after(async () => {
    clients.forEach((c) => c.disconnect());
    io.close();
    await new Promise((r) => srv.close(r));
  });

  test('geçersiz oda adı reddedilir', async () => {
    const r = await emit(mk(), 'join', { room: 'AB', name: 'X' });
    expect(r).toEqual({ ok: false, error: 'invalid_room' });
  });

  test('katılım, eş listesi, sinyal aktarımı, sohbet ve ayrılma', async () => {
    const a = mk();
    const b = mk();
    const ja = await emit(a, 'join', { room: 'proje-gorusmesi-1', name: 'Ayşe' });
    expect(ja.ok).toBe(true);
    expect(ja.peers).toEqual([]);

    const joined = once(a, 'peer-joined');
    const jb = await emit(b, 'join', { room: 'proje-gorusmesi-1', name: 'Bora' });
    expect(jb.peers.map((p) => p.name)).toEqual(['Ayşe']);
    expect((await joined).name).toBe('Bora');

    const sig = once(a, 'signal');
    b.emit('signal', { to: ja.id, data: { description: { type: 'offer', sdp: 'v=0' } } });
    expect(await sig).toEqual({ from: jb.id, data: { description: { type: 'offer', sdp: 'v=0' } } });

    const chat = once(b, 'chat');
    a.emit('chat', { text: '  Merhaba  ' });
    expect((await chat).text).toBe('Merhaba');

    const left = once(a, 'peer-left');
    b.disconnect();
    expect((await left).id).toBe(jb.id);
  });

  test('başka odadaki katılımcıya sinyal gönderilemez', async () => {
    const a = mk();
    const c = mk();
    const ja = await emit(a, 'join', { room: 'oda-a-123456', name: 'A' });
    await emit(c, 'join', { room: 'oda-c-123456', name: 'C' });
    let leaked = false;
    a.on('signal', () => { leaked = true; });
    c.emit('signal', { to: ja.id, data: { x: 1 } });
    await new Promise((r) => setTimeout(r, 150));
    expect(leaked).toBe(false);
  });

  test('oda kapasitesi aşılamaz', async () => {
    const room = 'kalabalik-oda-1';
    for (let i = 0; i < 6; i += 1) expect((await emit(mk(), 'join', { room, name: `K${i}` })).ok).toBe(true);
    expect(await emit(mk(), 'join', { room, name: 'Fazla' })).toMatchObject({ ok: false, error: 'full' });
  });

  test('ICE yapılandırması oturumsuz alınır', async () => {
    const res = await request(createApp()).get('/api/v1/rtc/config').expect(200);
    expect(Array.isArray(res.body.iceServers)).toBe(true);
    expect(res.body.maxParticipants).toBe(6);
  });
});

const { Server } = require('socket.io');
const config = require('./config');
const { Match } = require('./models');
const { userFromToken } = require('./middleware/auth');
const { setIo, companyRoom, matchRoom } = require('./services/realtime');
const logger = require('./utils/logger');

/**
 * Gerçek zamanlı kanal. İstemci `auth: { token }` ile bağlanır; firma odasına otomatik katılır.
 * Olaylar: match:new, message:new, meeting:proposed, meeting:updated, interest:super
 * İstemci → sunucu: match:join {matchId}, match:typing {matchId}
 */
function attachSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.corsOrigins.length ? config.corsOrigins : true, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const user = await userFromToken(socket.handshake.auth?.token);
      socket.data.user = user;
      next();
    } catch (err) {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { user } = socket.data;
    if (user.company) socket.join(companyRoom(user.company));

    socket.on('match:join', async ({ matchId } = {}, ack) => {
      try {
        const m = await Match.findById(matchId);
        if (!m || !user.company || !m.involves(user.company)) return ack?.({ ok: false });
        socket.join(matchRoom(matchId));
        return ack?.({ ok: true });
      } catch {
        return ack?.({ ok: false });
      }
    });

    socket.on('match:typing', ({ matchId } = {}) => {
      if (socket.rooms.has(matchRoom(matchId))) {
        socket.to(matchRoom(matchId)).emit('match:typing', { matchId, company: user.company });
      }
    });
  });

  setIo(io);
  logger.info('Socket.IO hazır');
  return io;
}

module.exports = { attachSocket };

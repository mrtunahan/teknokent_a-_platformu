/** Socket.IO yayın yardımcıları. Sunucu başlatılırken `setIo` ile bağlanır; testlerde no-op çalışır. */
let io = null;

const setIo = (instance) => {
  io = instance;
};

const companyRoom = (id) => `company:${id}`;
const matchRoom = (id) => `match:${id}`;

function emitToCompany(companyId, event, payload) {
  if (io) io.to(companyRoom(companyId)).emit(event, payload);
}

function emitToMatch(matchId, event, payload) {
  if (io) io.to(matchRoom(matchId)).emit(event, payload);
}

module.exports = { setIo, emitToCompany, emitToMatch, companyRoom, matchRoom };

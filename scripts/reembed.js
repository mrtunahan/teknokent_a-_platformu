/** Tüm firmaların embedding'lerini yeniden üretir ve kuyrukları yeniden hesaplar: `npm run reembed` */
const { connectDb, disconnectDb } = require('../src/config/db');
const config = require('../src/config');
const { refreshAllEmbeddings } = require('../src/services/embedding');
const { recomputeAllQueues } = require('../src/services/queue');

(async () => {
  if (!config.matching.embeddingServiceUrl) throw new Error('EMBEDDING_SERVICE_URL tanımlı değil.');
  await connectDb();
  await refreshAllEmbeddings({ all: true });
  await recomputeAllQueues();
  await disconnectDb();
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

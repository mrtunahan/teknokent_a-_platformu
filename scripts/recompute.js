/** Tüm aday kuyruklarını elle yeniden hesaplar: `npm run recompute` */
const { connectDb, disconnectDb } = require('../src/config/db');
const { recomputeAllQueues } = require('../src/services/queue');

connectDb()
  .then(recomputeAllQueues)
  .then(disconnectDb)
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });

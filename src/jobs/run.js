/** Zamanlanmış işleri API'den bağımsız tek bir süreçte çalıştırır: `npm run jobs` */
const { connectDb } = require('../config/db');
const config = require('../config');
const { startJobs } = require('./index');

config.jobs.enabled = true;
connectDb().then(() => startJobs()).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

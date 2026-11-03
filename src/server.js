const http = require('http');
const config = require('./config');
const { connectDb, disconnectDb } = require('./config/db');
const { createApp } = require('./app');
const { attachSocket } = require('./socket');
const { startJobs } = require('./jobs');
const logger = require('./utils/logger');

async function main() {
  await connectDb();
  const app = createApp();
  const server = http.createServer(app);
  const io = attachSocket(server);
  const jobs = startJobs();

  server.listen(config.port, () => logger.info(`TeknoMatch API ${config.port} portunda (${config.env})`));

  const shutdown = async (signal) => {
    logger.info(`${signal} alındı, kapatılıyor...`);
    jobs.forEach((j) => j.stop());
    io.close();
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Sunucu başlatılamadı:', err);
  process.exit(1);
});

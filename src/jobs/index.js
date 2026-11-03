const cron = require('node-cron');
const config = require('../config');
const logger = require('../utils/logger');
const { Match, Company, User } = require('../models');
const { recomputeAllQueues } = require('../services/queue');
const { sendMail, templates } = require('../services/mail');
const { daysAgo } = require('../utils/dates');

/** Eşleşmeden 2 hafta sonra "iş sonucu" sorusu. */
async function sendOutcomePrompts(now = new Date()) {
  const due = await Match.find({
    createdAt: { $lte: daysAgo(config.matching.outcomePromptDays, now) },
    outcomePromptSentAt: null,
  }).limit(500);
  for (const m of due) {
    // eslint-disable-next-line no-await-in-loop
    const [a, b] = await Promise.all([Company.findById(m.companyA, { name: 1 }), Company.findById(m.companyB, { name: 1 })]);
    for (const [me, other] of [[a, b], [b, a]]) {
      if (!me || !other) continue;
      // eslint-disable-next-line no-await-in-loop
      const users = await User.find({ company: me._id, active: true }, { email: 1 }).lean();
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(users.map((u) => sendMail({ to: u.email, ...templates.outcomePrompt(other.name, m._id) })));
    }
    m.outcomePromptSentAt = now;
    // eslint-disable-next-line no-await-in-loop
    await m.save();
  }
  if (due.length) logger.info(`İş sonucu sorusu gönderildi: ${due.length} eşleşme`);
  return due.length;
}

/** Süresi dolan ihtiyaç maddelerini profillerden kaldırır (ilan süresi kapatma). */
async function closeExpiredNeeds(now = new Date()) {
  const r = await Company.updateMany(
    { 'needs.expiresAt': { $lte: now } },
    { $pull: { needs: { expiresAt: { $lte: now } } }, $set: { queueStale: true } },
  );
  return r.modifiedCount;
}

function guard(name, fn) {
  let running = false;
  return async () => {
    if (running) return;
    running = true;
    try {
      await fn();
    } catch (err) {
      logger.error(`İş başarısız (${name}):`, err);
    } finally {
      running = false;
    }
  };
}

/**
 * Not: Birden fazla uygulama örneği (instance) çalıştırılıyorsa işleri yalnızca birinde açın
 * (ENABLE_JOBS=true tek örnekte) ya da `npm run jobs` ile ayrı bir süreç olarak çalıştırın.
 */
function startJobs() {
  if (!config.jobs.enabled) return [];
  const tasks = [
    cron.schedule(config.jobs.nightlyRecomputeCron, guard('nightly', async () => {
      await closeExpiredNeeds();
      await recomputeAllQueues();
    })),
    cron.schedule(config.jobs.outcomePromptCron, guard('outcome', () => sendOutcomePrompts())),
  ];
  logger.info('Zamanlanmış işler başlatıldı');
  return tasks;
}

module.exports = { startJobs, sendOutcomePrompts, closeExpiredNeeds };

const DAY = 24 * 60 * 60 * 1000;

/** Günlük limitler Türkiye saatine göre sıfırlanır (UTC+3, yaz saati uygulaması yok). */
const TZ = process.env.APP_TIMEZONE || 'Europe/Istanbul';
const TZ_OFFSET = process.env.APP_TZ_OFFSET || '+03:00';

const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

/** YYYY-MM-DD (uygulama saat diliminde) */
const dayKey = (d = new Date()) => fmt.format(d);

/** Uygulama saat dilimine göre günün başlangıcı. */
const startOfDay = (d = new Date()) => new Date(`${dayKey(d)}T00:00:00${TZ_OFFSET}`);

const daysAgo = (n, from = new Date()) => new Date(from.getTime() - n * DAY);

module.exports = { DAY, dayKey, startOfDay, daysAgo };

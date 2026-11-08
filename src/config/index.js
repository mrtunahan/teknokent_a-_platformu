require('dotenv').config({ quiet: true });

const int = (v, d) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};
const bool = (v, d) => (v === undefined || v === '' ? d : ['1', 'true', 'yes'].includes(String(v).toLowerCase()));

const env = process.env.NODE_ENV || 'development';

const config = {
  env,
  isProd: env === 'production',
  isTest: env === 'test',
  port: int(process.env.PORT, 4000),
  trustProxy: process.env.TRUST_PROXY === undefined ? 1 : int(process.env.TRUST_PROXY, process.env.TRUST_PROXY),
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  // Derlenmiş web arayüzünü (web/dist) aynı sunucudan servis et
  serveFrontend: bool(process.env.SERVE_FRONTEND, true),
  frontendDir: process.env.FRONTEND_DIR || require('path').resolve(__dirname, '../../web/dist'),

  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/teknoortak',

  jwtSecret: process.env.JWT_SECRET || (env === 'production' ? '' : 'dev-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  requireEmailVerification: bool(process.env.REQUIRE_EMAIL_VERIFICATION, true),

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: int(process.env.SMTP_PORT, 587),
    secure: bool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'TeknoOrtak <no-reply@teknoortak.local>',
  },

  matching: {
    dailyCardLimit: int(process.env.DAILY_CARD_LIMIT, 20),
    dailyRightSwipeLimit: int(process.env.DAILY_RIGHT_SWIPE_LIMIT, 20),
    dailyFirstMessageLimit: int(process.env.DAILY_FIRST_MESSAGE_LIMIT, 10),
    candidateQueueSize: int(process.env.CANDIDATE_QUEUE_SIZE, 200),
    leftSwipeCooldownDays: int(process.env.LEFT_SWIPE_COOLDOWN_DAYS, 90),
    outcomePromptDays: int(process.env.OUTCOME_PROMPT_DAYS, 14),
    explorationRatio: 0.2,
    reportThreshold: 3,
    embeddingServiceUrl: process.env.EMBEDDING_SERVICE_URL || '',
    embeddingApiKey: process.env.EMBEDDING_API_KEY || '',
  },

  storage: {
    // 'local' (sunucu diski) veya 's3' (AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces...)
    driver: process.env.STORAGE_DRIVER || 'local',
    localDir: process.env.UPLOAD_DIR || require('path').resolve(__dirname, '../../uploads'),
    s3: {
      bucket: process.env.S3_BUCKET || '',
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT || undefined,
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      forcePathStyle: bool(process.env.S3_FORCE_PATH_STYLE, false),
    },
    maxLogoBytes: int(process.env.MAX_LOGO_BYTES, 2 * 1024 * 1024),
    maxDocumentBytes: int(process.env.MAX_DOCUMENT_BYTES, 10 * 1024 * 1024),
  },

  features: {
    // MVP dışı özellikler (belgeye göre sonraki fazlarda açılacak)
    superLike: bool(process.env.FEATURE_SUPER_LIKE, false),
  },

  jobs: {
    enabled: bool(process.env.ENABLE_JOBS, env !== 'test'),
    nightlyRecomputeCron: process.env.NIGHTLY_RECOMPUTE_CRON || '0 3 * * *',
    outcomePromptCron: process.env.OUTCOME_PROMPT_CRON || '0 10 * * *',
  },
};

if (config.isProd && (!config.jwtSecret || config.jwtSecret === 'change-me' || config.jwtSecret.length < 32)) {
  throw new Error('JWT_SECRET üretimde en az 32 karakter olmalı.');
}

module.exports = config;

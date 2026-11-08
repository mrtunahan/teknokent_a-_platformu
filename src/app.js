const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const config = require('./config');
const storage = require('./services/storage');
const { errorHandler, notFoundHandler } = require('./middleware/error');

function createApp() {
  const app = express();

  // Bulut sunucuda reverse proxy / load balancer arkasında gerçek istemci IP'si (rate limit için)
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  // HTTPS'e zorlayan başlıklar yalnızca site HTTPS'ten sunuluyorsa açılır. Alan adı/sertifika olmadan
  // http://SUNUCU_IP:PORT üzerinden denerken açık kalırlarsa tarayıcı CSS/JS'yi https:// ile ister ve sayfa boş kalır.
  const secure = config.appUrl.startsWith('https://');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        'img-src': ["'self'", 'data:', 'https:'],
        'connect-src': ["'self'", 'ws:', 'wss:'],
        'upgrade-insecure-requests': secure ? [] : null,
      },
    },
    strictTransportSecurity: secure ? undefined : false,
    crossOriginOpenerPolicy: secure ? undefined : false,
    crossOriginResourcePolicy: { policy: 'same-site' },
  }));
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || !config.corsOrigins.length || config.corsOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '1mb' }));
  if (!config.isTest) app.use(morgan(config.isProd ? 'combined' : 'dev'));

  app.get('/health', (_req, res) => {
    const db = mongoose.connection.readyState === 1 ? 'up' : 'down';
    res.status(db === 'up' ? 200 : 503).json({ status: db === 'up' ? 'ok' : 'degraded', db, time: new Date().toISOString() });
  });

  // Yüklenen logolar (herkese açık). Belgeler yetki kontrollü API uç noktasından servis edilir.
  app.get('/files/logos/:name', async (req, res, next) => {
    try {
      const { name } = req.params;
      if (!/^[a-z0-9-]+\.(png|jpg|webp)$/i.test(name)) return res.status(404).end();
      const file = await storage.get(`logos/${name}`);
      if (!file) return res.status(404).end();
      const ext = name.split('.').pop().toLowerCase();
      res.setHeader('Content-Type', { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[ext]);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return file.stream.pipe(res);
    } catch (err) {
      return next(err);
    }
  });

  const api = express.Router();
  api.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.isTest ? 100000 : 600,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Çok fazla istek. Lütfen biraz sonra tekrar deneyin.' },
  }));

  api.use('/auth', require('./routes/auth'));
  api.use('/technoparks', require('./routes/technoparks'));
  api.use('/tags', require('./routes/tags'));
  api.use('/companies', require('./routes/companies'));
  api.use('/', require('./routes/feed'));
  api.use('/matches', require('./routes/matches'));
  api.use('/reports', require('./routes/reports'));
  api.use('/panel', require('./routes/panel'));
  api.get('/meta', (_req, res) => {
    const c = require('./constants');
    res.json({
      employeeRanges: c.EMPLOYEE_RANGES,
      stages: c.STAGES,
      collaborationTypes: c.COLLABORATION_TYPES,
      urgency: c.URGENCY,
      needVisibility: c.NEED_VISIBILITY,
      regionPreferences: c.REGION_PREFERENCES,
      certificateTypes: c.CERTIFICATE_TYPES,
      outcomeResults: c.OUTCOME_RESULTS,
      meetingTypes: c.MEETING_TYPES,
      kvkkConsentVersion: c.KVKK_CONSENT_VERSION,
      limits: {
        dailyCardLimit: config.matching.dailyCardLimit,
        dailyRightSwipeLimit: config.matching.dailyRightSwipeLimit,
        maxOffers: 5,
        maxNeeds: 5,
      },
      features: config.features,
    });
  });

  app.use('/api/v1', api);

  // Derlenmiş web arayüzü (web/dist) varsa aynı sunucudan servis et; SPA yönlendirmesi için index.html'e düş
  const indexHtml = path.join(config.frontendDir, 'index.html');
  if (config.serveFrontend && fs.existsSync(indexHtml)) {
    app.use(express.static(config.frontendDir, { index: false, maxAge: '1h' }));
    app.get(/^\/(?!api\/|files\/|socket\.io\/|health$).*/, (req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(indexHtml);
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };

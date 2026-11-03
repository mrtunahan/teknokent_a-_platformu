const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const config = require('./config');
const { errorHandler, notFoundHandler } = require('./middleware/error');

function createApp() {
  const app = express();

  // Bulut sunucuda reverse proxy / load balancer arkasında gerçek istemci IP'si (rate limit için)
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  app.use(helmet());
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
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };

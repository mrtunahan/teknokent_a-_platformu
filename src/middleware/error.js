const mongoose = require('mongoose');
const { ApiError } = require('../utils/errors');
const logger = require('../utils/logger');
const config = require('../config');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      error: 'Geçersiz veri.',
      details: Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
    });
  }
  if (err instanceof mongoose.Error.CastError) return res.status(400).json({ error: 'Geçersiz kimlik.' });
  if (err?.code === 11000) return res.status(409).json({ error: 'Bu kayıt zaten mevcut.' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Geçersiz JSON.' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'İstek çok büyük.' });

  logger.error(err);
  return res.status(500).json({ error: 'Sunucu hatası.', ...(config.isProd ? {} : { message: err.message }) });
}

const notFoundHandler = (req, res) => res.status(404).json({ error: 'Uç nokta bulunamadı.' });

module.exports = { errorHandler, notFoundHandler };

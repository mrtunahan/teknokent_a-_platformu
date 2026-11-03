class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const badRequest = (m, d) => new ApiError(400, m, d);
const unauthorized = (m = 'Kimlik doğrulaması gerekli.') => new ApiError(401, m);
const forbidden = (m = 'Bu işlem için yetkiniz yok.') => new ApiError(403, m);
const notFound = (m = 'Kayıt bulunamadı.') => new ApiError(404, m);
const conflict = (m) => new ApiError(409, m);
const tooMany = (m) => new ApiError(429, m);

module.exports = { ApiError, badRequest, unauthorized, forbidden, notFound, conflict, tooMany };

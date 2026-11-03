const jwt = require('jsonwebtoken');
const config = require('../config');
const { User, Company } = require('../models');
const { ROLES } = require('../constants');
const { unauthorized, forbidden } = require('../utils/errors');

const signToken = (user) => jwt.sign({ sub: String(user._id), role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

async function userFromToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw unauthorized('Oturum geçersiz veya süresi dolmuş.');
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.active) throw unauthorized('Kullanıcı bulunamadı.');
  return user;
}

async function authenticate(req, _res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) throw unauthorized();
  req.user = await userFromToken(token);
  next();
}

const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) throw forbidden();
  next();
};

/** Firma kullanıcısı (yönetici veya üye) ister; `req.company` yüklenir. */
async function requireCompany(req, _res, next) {
  if (![ROLES.COMPANY_ADMIN, ROLES.COMPANY_MEMBER].includes(req.user?.role) || !req.user.company) {
    throw forbidden('Bu işlem yalnızca firma kullanıcıları içindir.');
  }
  const company = await Company.findById(req.user.company);
  if (!company || !company.active) throw forbidden('Firma hesabı etkin değil.');
  req.company = company;
  next();
}

/** Teknokent onayı almamış firmalar akışı ve eşleşme özelliklerini kullanamaz. */
function requireApprovedCompany(req, _res, next) {
  if (req.company?.verification?.status !== 'approved') {
    throw forbidden('Firmanız henüz teknokent yönetimi tarafından onaylanmadı.');
  }
  if (req.company.underReview) throw forbidden('Firma profiliniz inceleme altında.');
  next();
}

const requireCompanyAdmin = (req, _res, next) => {
  if (req.user?.role !== ROLES.COMPANY_ADMIN) throw forbidden('Bu işlem için firma yöneticisi olmalısınız.');
  next();
};

module.exports = {
  signToken, userFromToken, authenticate, requireRole, requireCompany, requireApprovedCompany, requireCompanyAdmin,
};

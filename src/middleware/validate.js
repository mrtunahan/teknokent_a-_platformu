const { z } = require('zod');
const mongoose = require('mongoose');
const { badRequest } = require('../utils/errors');

/** Zod şemalarıyla istek doğrulama. Doğrulanmış değerler `req.valid.{body,query,params}` altına yazılır. */
const validate = (schemas) => (req, _res, next) => {
  req.valid = req.valid || {};
  for (const key of ['params', 'query', 'body']) {
    if (!schemas[key]) continue;
    const r = schemas[key].safeParse(req[key] ?? {});
    if (!r.success) {
      throw badRequest('Geçersiz istek.', r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
    }
    req.valid[key] = r.data;
  }
  next();
};

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), { message: 'Geçersiz kimlik.' });
const idParams = z.object({ id: objectId });

module.exports = { validate, objectId, idParams, z };

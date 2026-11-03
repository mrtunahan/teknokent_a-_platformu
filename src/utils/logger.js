const config = require('../config');

const ts = () => new Date().toISOString();
/* eslint-disable no-console */
module.exports = {
  info: (...a) => !config.isTest && console.log(ts(), '[info]', ...a),
  warn: (...a) => !config.isTest && console.warn(ts(), '[warn]', ...a),
  error: (...a) => console.error(ts(), '[error]', ...a),
};

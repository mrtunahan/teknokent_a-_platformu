const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);

async function connectDb(uri = config.mongoUri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  logger.info(`MongoDB bağlandı: ${mongoose.connection.host}/${mongoose.connection.name}`);
  return mongoose.connection;
}

async function disconnectDb() {
  await mongoose.disconnect();
}

module.exports = { connectDb, disconnectDb };

const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

async function connectMongoDB() {
  try {
    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 10000,
    });

    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection failed', {
      message: error.message,
    });
    throw error;
  }
}

module.exports = { connectMongoDB };

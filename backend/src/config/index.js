const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'sehat_awaaz',
    user: process.env.DB_USER || 'sehat_admin',
    password: process.env.DB_PASSWORD || 'sehat_dev_password',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'sehat-awaaz-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'sehat-awaaz-refresh-dev-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  nluServiceUrl: process.env.NLU_SERVICE_URL || 'http://localhost:8001',
  otp: {
    mode: process.env.OTP_MODE || 'mock',
    expirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS, 10) || 300,
  },
};

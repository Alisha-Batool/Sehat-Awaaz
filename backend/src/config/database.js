const { Client } = require('pg');
const config = require('./index');
const logger = require('../utils/logger');

function getConnectionConfig() {
  return {
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
    connectionTimeoutMillis: 10000,
    query_timeout: 15000,
  };
}

function isRetryableError(err) {
  if (!err) return false;
  const message = err.message || '';
  return (
    message.includes('Connection terminated') ||
    message.includes('connection timeout') ||
    message.includes('timeout expired') ||
    message.includes('ECONNRESET') ||
    message.includes('ECONNREFUSED') ||
    message.includes('Client has encountered a connection error')
  );
}

async function query(text, params, retries = 2) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    const client = new Client(getConnectionConfig());
    try {
      logger.info('DB connecting', { attempt: i + 1 });
      await client.connect();
      logger.info('DB connected, running query', { attempt: i + 1 });
      const result = await client.query(text, params);
      logger.info('DB query done', { attempt: i + 1 });
      await client.end();
      return result;
    } catch (err) {
      lastErr = err;
      try { await client.end(); } catch (_) { /* ignore */ }
      logger.error('DB query error', { attempt: i + 1, error: err.message });
      if (i < retries && isRetryableError(err)) {
        logger.warn('Retrying DB query after connection error', {
          attempt: i + 1,
          error: err.message,
        });
        await new Promise((r) => setTimeout(r, 250));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

module.exports = {
  query,
  pool: {
    end: () => Promise.resolve(),
  },
};

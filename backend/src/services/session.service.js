const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Get all sessions for a user, sorted by date descending
 */
async function getUserSessions(userId) {
  const result = await db.query(
    `SELECT s.id, s.language, s.status, s.created_at,
            tr.tier, tr.explanation
     FROM sessions s
     LEFT JOIN triage_results tr ON tr.session_id = s.id
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Get a single session with its triage result
 */
async function getSession(sessionId, userId) {
  const result = await db.query(
    `SELECT s.id, s.language, s.status, s.created_at,
            tr.id as result_id, tr.tier, tr.rationale, tr.confidence,
            tr.explanation, tr.rule_version, tr.model_version
     FROM sessions s
     LEFT JOIN triage_results tr ON tr.session_id = s.id
     WHERE s.id = $1 AND s.user_id = $2`,
    [sessionId, userId]
  );
  return result.rows[0] || null;
}

/**
 * Delete a single session and its associated data
 */
async function deleteSession(sessionId, userId) {
  await db.query(
    'DELETE FROM triage_results WHERE session_id = $1 AND session_id IN (SELECT id FROM sessions WHERE user_id = $2)',
    [sessionId, userId]
  );
  await db.query(
    'DELETE FROM sessions WHERE id = $1 AND user_id = $2',
    [sessionId, userId]
  );
  logger.info(`Session ${sessionId} deleted by user ${userId}`);
}

/**
 * Delete user account and all associated data
 */
async function deleteAccount(userId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM triage_results WHERE session_id IN (SELECT id FROM sessions WHERE user_id = $1)', [userId]);
    await client.query('DELETE FROM audit_logs WHERE session_id IN (SELECT id FROM sessions WHERE user_id = $1)', [userId]);
    await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    await client.query('COMMIT');
    logger.info(`Account deleted: user ${userId}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { getUserSessions, getSession, deleteSession, deleteAccount };

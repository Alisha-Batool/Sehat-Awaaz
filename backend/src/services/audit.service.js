const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Write an immutable audit log entry for a triage decision.
 * This is a safety-critical record used for clinical review and incident investigation.
 */
async function log({ sessionId, action, inputHash, rulePath, outputTier, confidence, ruleVersion, modelVersion }) {
  try {
    await db.query(
      `INSERT INTO audit_logs (session_id, action, input_hash, rule_path, output_tier, confidence, rule_version, model_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [sessionId, action, inputHash, rulePath, outputTier, confidence, ruleVersion, modelVersion]
    );
  } catch (err) {
    logger.error('Failed to write audit log', {
      sessionId,
      action,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Get audit logs for a specific session (restricted access)
 */
async function getLogsBySession(sessionId) {
  const result = await db.query(
    `SELECT id, session_id, action, input_hash, rule_path, output_tier,
            confidence, rule_version, model_version, created_at
     FROM audit_logs
     WHERE session_id = $1
     ORDER BY created_at ASC`,
    [sessionId]
  );
  return result.rows;
}

module.exports = { log, getLogsBySession };

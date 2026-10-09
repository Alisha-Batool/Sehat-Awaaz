const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Write an audit log entry for a triage decision.
 */
async function log({
  sessionId,
  action,
  inputHash,
  rulePath,
  outputTier,
  confidence,
  ruleVersion,
  modelVersion,
}) {
  try {
    await AuditLog.create({
      session_id: sessionId,
      action,
      input_hash: inputHash,
      rule_path: rulePath,
      output_tier: outputTier,
      confidence,
      rule_version: ruleVersion,
      model_version: modelVersion,
    });
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
 * Get audit logs for a specific session (restricted access).
 */
async function getLogsBySession(sessionId) {
  return AuditLog.find({ session_id: sessionId })
    .sort({ created_at: 1 })
    .lean();
}

module.exports = { log, getLogsBySession };

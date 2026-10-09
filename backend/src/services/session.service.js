const Session = require('../models/Session');
const TriageResult = require('../models/TriageResult');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const logger = require('../utils/logger');

async function getUserSessions(userId) {
  const sessions = await Session.find({ user_id: userId })
    .sort({ created_at: -1 })
    .lean();

  const results = await TriageResult.find({
    session_id: { $in: sessions.map((session) => session._id) },
  }).lean();

  const resultsBySession = new Map();
  for (const result of results) {
    const existing = resultsBySession.get(result.session_id) || [];
    existing.push(result);
    resultsBySession.set(result.session_id, existing);
  }

  return sessions.flatMap((session) => {
    const sessionResults = resultsBySession.get(session._id) || [null];

    return sessionResults.map((result) => ({
      id: session._id,
      language: session.language,
      status: session.status,
      created_at: session.created_at,
      tier: result?.tier ?? null,
      explanation: result?.explanation ?? null,
    }));
  });
}

async function getSession(sessionId, userId) {
  const session = await Session.findOne({
    _id: sessionId,
    user_id: userId,
  }).lean();

  if (!session) return null;

  const result = await TriageResult.findOne({
    session_id: sessionId,
  }).lean();

  return {
    id: session._id,
    language: session.language,
    status: session.status,
    created_at: session.created_at,
    result_id: result?._id ?? null,
    tier: result?.tier ?? null,
    rationale: result?.rationale ?? null,
    confidence: result?.confidence ?? null,
    explanation: result?.explanation ?? null,
    rule_version: result?.rule_version ?? null,
    model_version: result?.model_version ?? null,
  };
}

async function deleteSession(sessionId, userId) {
  const session = await Session.findOne({
    _id: sessionId,
    user_id: userId,
  }).select('_id').lean();

  if (!session) return;

  await TriageResult.deleteMany({ session_id: sessionId });
  await Session.deleteOne({ _id: sessionId, user_id: userId });

  logger.info(`Session ${sessionId} deleted by user ${userId}`);
}

async function deleteAccount(userId) {
  const sessions = await Session.find({ user_id: userId })
    .select('_id')
    .lean();

  const sessionIds = sessions.map((session) => session._id);

  await TriageResult.deleteMany({ session_id: { $in: sessionIds } });
  await AuditLog.deleteMany({ session_id: { $in: sessionIds } });
  await Session.deleteMany({ user_id: userId });
  await User.deleteOne({ _id: userId });

  logger.info(`Account deleted: user ${userId}`);
}

module.exports = {
  getUserSessions,
  getSession,
  deleteSession,
  deleteAccount,
};

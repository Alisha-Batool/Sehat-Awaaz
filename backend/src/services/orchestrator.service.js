const { v4: uuidv4, validate: isUuid } = require('uuid');
const db = require('../config/database');
const nluClient = require('./nlu.client');
const auditService = require('./audit.service');
const explanationService = require('./explanation.service');
const emergencyService = require('./emergency.service');
const careNavigation = require('./careNavigation.service');
const { hashInput } = require('../utils/crypto');
const { TRIAGE_TIERS, SESSION_STATUS, MAX_CLARIFICATION_TURNS } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Start a new triage session.
 * Flow: create session -> extract symptoms -> check completeness -> triage or clarify
 */
async function startTriage(text, language, userId, isGuest) {
  const sessionId = uuidv4();

  // Guest JWTs carry a random UUID that has no matching users row, so inserting
  // it as sessions.user_id violates the foreign key constraint. Guests get an
  // anonymous session (NULL user_id); authenticated users keep ownership.
  const sessionUserId = isGuest ? null : userId;

  // 1. Create session record
  await db.query(
    'INSERT INTO sessions (id, user_id, language, status) VALUES ($1, $2, $3, $4)',
    [sessionId, sessionUserId, language, SESSION_STATUS.ACTIVE]
  );

  try {
    // 2. Extract symptoms via NLU service
    const extraction = await nluClient.extractSymptoms(text, language);
    const symptomProfile = extraction.symptom_profile;

    // 3. Check if we need clarification
    const clarification = await nluClient.generateQuestion(symptomProfile, [], language);

    if (clarification.needs_clarification && clarification.turn_count < MAX_CLARIFICATION_TURNS) {
      // Need more info — return clarifying question
      await db.query(
        'UPDATE sessions SET status = $1 WHERE id = $2',
        [SESSION_STATUS.AWAITING_CLARIFICATION, sessionId]
      );

      return {
        sessionId,
        status: 'needs_clarification',
        transcript: text,
        symptom_profile: symptomProfile,
        question: clarification.question,
        question_id: clarification.question_id,
        options: clarification.options || [],
        turn: clarification.turn_count,
        max_turns: MAX_CLARIFICATION_TURNS,
      };
    }

    // 4. Sufficient info — run triage
    const triageResult = await nluClient.evaluateTriage(symptomProfile, language);
    return await composeResult(sessionId, userId, isGuest, text, symptomProfile, triageResult, language);

  } catch (err) {
    logger.error(`Triage orchestration failed for session ${sessionId}: ${err.message}`);
    // Update session to indicate error
    await db.query('UPDATE sessions SET status = $1 WHERE id = $2', ['error', sessionId]);
    throw err;
  }
}

/**
 * Submit an answer to a clarifying question and continue triage
 */
async function submitClarification(sessionId, answer, questionId) {
  // Get session data
  const sessionResult = await db.query(
    'SELECT id, user_id, language, status FROM sessions WHERE id = $1',
    [sessionId]
  );

  if (sessionResult.rows.length === 0) {
    throw new Error('Session not found');
  }

  const session = sessionResult.rows[0];

  // For now, re-run triage with the additional answer context
  // In a full implementation, we'd merge with existing symptom profile
  const clarification = await nluClient.generateQuestion(
    { clarification_answers: [{ questionId, answer }] },
    [{ questionId, answer }],
    session.language
  );

  if (clarification.needs_clarification && clarification.turn_count < MAX_CLARIFICATION_TURNS) {
    return {
      sessionId,
      status: 'needs_clarification',
      question: clarification.question,
      question_id: clarification.question_id,
      options: clarification.options || [],
      turn: clarification.turn_count,
      max_turns: MAX_CLARIFICATION_TURNS,
    };
  }

  // Run final triage
  const triageResult = await nluClient.evaluateTriage(
    { clarification_answers: [{ questionId, answer }] },
    session.language
  );

  return await composeResult(sessionId, session.user_id, false, '', {}, triageResult, session.language);
}

/**
 * Get the result for a completed session
 */
async function getResult(sessionId) {
  const result = await db.query(
    `SELECT tr.*, s.language FROM triage_results tr
     JOIN sessions s ON s.id = tr.session_id
     WHERE tr.session_id = $1`,
    [sessionId]
  );
  return result.rows[0] || null;
}

/**
 * Resolve the NLU rule engine's rule identifier to a value that is safe for
 * the triage_results.rule_id UUID foreign key (red_flag_rules.id).
 *
 * The rule engine returns JSON keys such as "rule_004"; the seeded
 * red_flag_rules rows are keyed by (version, name) and do not store those
 * keys, so no reliable key-to-UUID mapping exists and we persist NULL.
 * Only identifiers that are valid UUIDs of existing rules are preserved.
 */
async function resolveRuleId(ruleKey) {
  if (!ruleKey) return null;
  const key = String(ruleKey);
  if (!isUuid(key)) return null;
  const result = await db.query('SELECT id FROM red_flag_rules WHERE id = $1', [key]);
  return result.rows.length > 0 ? key : null;
}

/**
 * Compose the final triage result: save to DB, generate explanation, attach navigation/emergency data
 */
async function composeResult(sessionId, userId, isGuest, inputText, symptomProfile, triageResult, language) {
  const tier = triageResult.tier;
  const rationale = triageResult.rationale || '';
  const confidence = triageResult.confidence || 0;
  // Rule key as returned by the NLU rule engine (e.g. "rule_004"). It is NOT a
  // red_flag_rules.id UUID — keep it for the response and audit trail, but
  // never insert it into the UUID foreign-key column.
  const ruleKey = triageResult.rule_id || null;
  const ruleId = await resolveRuleId(ruleKey);
  const ruleVersion = triageResult.rule_version || null;
  const modelVersion = triageResult.model_version || 'ollama-local';

  // Generate localized explanation
  const explanation = explanationService.generate(tier, rationale, language);

  // Save triage result
  await db.query(
    `INSERT INTO triage_results (session_id, tier, rule_id, rationale, confidence, explanation, rule_version, model_version)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [sessionId, tier, ruleId, rationale, confidence, explanation, ruleVersion, modelVersion]
  );

  // Mark session as completed
  await db.query('UPDATE sessions SET status = $1 WHERE id = $2', [SESSION_STATUS.COMPLETED, sessionId]);

  // Write audit log (async, don't block response)
  auditService.log({
    sessionId,
    action: 'triage_completed',
    inputHash: hashInput(inputText || ''),
    rulePath: ruleKey ? 'rule' : 'llm',
    outputTier: tier,
    confidence,
    ruleVersion,
    modelVersion,
  }).catch(err => logger.error('Audit log write failed', { error: err.message }));

  // Build response
  const response = {
    sessionId,
    status: 'completed',
    tier,
    explanation,
    confidence,
    source: ruleKey ? 'rule' : 'llm',
    rule_id: ruleKey,
    disclaimer: getDisclaimer(language),
  };

  // Attach tier-specific data
  if (tier === TRIAGE_TIERS.EMERGENCY) {
    response.emergency = await emergencyService.getEmergencyResponse(language);
  } else if (tier === TRIAGE_TIERS.CLINIC) {
    response.care_navigation = {
      message: careNavigation.getClinicFinderMessage(language),
    };
  } else {
    response.home_care = explanationService.getHomeCareGuidance(language);
  }

  return response;
}

function getDisclaimer(language) {
  const disclaimers = {
    en: 'Sehat Awaaz is not a medical diagnosis. Always consult a healthcare professional for medical advice. In an emergency, call 1122.',
    ur: 'صحت آواز طبی تشخیص نہیں ہے۔ طبی مشورے کے لیے ہمیشہ صحت کے پیشہ ور سے مشورہ کریں۔ ہنگامی صورت میں 1122 پر کال کریں۔',
    'ur-roman': 'Sehat Awaaz tibbi tashkhees nahi hai. Tibbi mashwaray ke liye hamesha healthcare professional se mashwara karein. Emergency mein 1122 par call karein.',
    pa: 'صحت آواز طبی تشخیص نہیں ہے۔ ڈاکٹر نال ضرور مشورہ کرو۔',
    ps: 'صحت آواز طبي تشخیص نه دی. د روغتیايي مشورې لپاره تل د روغتیا متخصص سره مشوره وکړئ.',
    sd: 'صحت آواز طبي تشخيص ناهيو. ڊاڪٽر سان ضرور صلاح ڪريو.',
  };
  return disclaimers[language] || disclaimers.en;
}

module.exports = { startTriage, submitClarification, getResult };

const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { triageLimiter } = require('../middleware/rateLimiter');
const { symptomTextValidation, languageValidation, validate } = require('../middleware/validator');
const orchestrator = require('../services/orchestrator.service');

const router = Router();

/**
 * POST /api/triage/start
 * Start a new triage session with symptom text (or confirmed transcript)
 */
router.post(
  '/start',
  triageLimiter,
  optionalAuth,
  symptomTextValidation,
  languageValidation,
  validate,
  asyncHandler(async (req, res) => {
    const { text, language = 'en' } = req.body;
    const userId = req.user?.userId || null;
    const isGuest = !req.user || req.user.isGuest;
    const result = await orchestrator.startTriage(text, language, userId, isGuest);
    res.json(result);
  })
);

/**
 * POST /api/triage/clarify
 * Submit an answer to a clarifying question
 */
router.post(
  '/clarify',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { sessionId, answer, questionId } = req.body;
    if (!sessionId || !answer) {
      return res.status(400).json({ error: 'sessionId and answer are required' });
    }
    const result = await orchestrator.submitClarification(sessionId, answer, questionId);
    res.json(result);
  })
);

/**
 * GET /api/triage/result/:sessionId
 * Get the final triage result for a completed session
 */
router.get(
  '/result/:sessionId',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const result = await orchestrator.getResult(sessionId);
    if (!result) {
      return res.status(404).json({ error: 'Session not found or not yet completed' });
    }
    res.json(result);
  })
);

module.exports = router;

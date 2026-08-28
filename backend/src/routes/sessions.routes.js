const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const sessionService = require('../services/session.service');

const router = Router();

/**
 * GET /api/sessions
 * List all sessions for the authenticated user
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const sessions = await sessionService.getUserSessions(req.user.userId);
    res.json({ sessions });
  })
);

/**
 * GET /api/sessions/:id
 * Get detail for a specific session
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const session = await sessionService.getSession(req.params.id, req.user.userId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  })
);

/**
 * DELETE /api/sessions/:id
 * Delete a specific session (self-serve right-to-delete)
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    await sessionService.deleteSession(req.params.id, req.user.userId);
    res.json({ message: 'Session deleted successfully' });
  })
);

/**
 * DELETE /api/sessions
 * Delete all sessions and the user account
 */
router.delete(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    await sessionService.deleteAccount(req.user.userId);
    res.json({ message: 'Account and all sessions deleted successfully' });
  })
);

module.exports = router;

const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const emergencyService = require('../services/emergency.service');

const router = Router();

/**
 * GET /api/emergency/number?province=...&city=...
 * Get the correct emergency number for the user's region
 */
router.get(
  '/number',
  asyncHandler(async (req, res) => {
    const { province, city } = req.query;
    const result = await emergencyService.getEmergencyNumber(province, city);
    res.json(result);
  })
);

/**
 * GET /api/emergency/guidance/:category
 * Get "what to do while waiting" content for an emergency category
 */
router.get(
  '/guidance/:category',
  asyncHandler(async (req, res) => {
    const { category } = req.params;
    const guidance = await emergencyService.getGuidance(category);
    if (!guidance) {
      return res.status(404).json({ error: 'Guidance not found for this category' });
    }
    res.json(guidance);
  })
);

module.exports = router;

const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { optionalAuth } = require('../middleware/auth');
const careNavigation = require('../services/careNavigation.service');

const router = Router();

/**
 * GET /api/facilities/nearby?lat=...&lng=...&radius=...
 * Find nearby healthcare facilities
 */
router.get(
  '/nearby',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { lat, lng, radius = 10 } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng query parameters are required' });
    }
    const facilities = await careNavigation.findNearby(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius)
    );
    res.json({ facilities });
  })
);

module.exports = router;

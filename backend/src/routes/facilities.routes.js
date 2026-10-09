const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { optionalAuth } = require('../middleware/auth');
const { facilitiesLimiter } = require('../middleware/rateLimiter');
const careNavigation = require('../services/careNavigation.service');

const router = Router();

/**
 * GET /api/facilities/nearby?lat=...&lng=...&radius=...
 * Find nearby healthcare facilities
 */
router.get(
  '/nearby',
  facilitiesLimiter,
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { lat, lng, radius = '5', type = 'all' } = req.query;
    const latitude = Number(lat);
    const longitude = Number(lng);
    const radiusKm = Number(radius);

    if (
      lat == null ||
      String(lat).trim() === '' ||
      lng == null ||
      String(lng).trim() === '' ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({ error: 'Valid lat and lng query parameters are required' });
    }
    if (!Number.isFinite(radiusKm) || radiusKm < 1 || radiusKm > 15) {
      return res.status(400).json({ error: 'radius must be between 1 and 15 kilometers' });
    }
    if (!['all', 'hospital', 'clinic'].includes(type)) {
      return res.status(400).json({ error: 'type must be all, hospital, or clinic' });
    }

    const result = await careNavigation.findNearby(latitude, longitude, radiusKm, type);
    res.json(result);
  })
);

router.get(
  '/geocode',
  facilitiesLimiter,
  optionalAuth,
  asyncHandler(async (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (query.length < 2 || query.length > 200) {
      return res.status(400).json({ error: 'q must contain between 2 and 200 characters' });
    }

    const location = await careNavigation.geocodeLocation(query);
    res.json({ location });
  })
);

module.exports = router;

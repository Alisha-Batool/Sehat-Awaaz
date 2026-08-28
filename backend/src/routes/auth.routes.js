const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { otpLimiter } = require('../middleware/rateLimiter');
const { phoneValidation, otpValidation, validate } = require('../middleware/validator');
const authService = require('../services/auth.service');

const router = Router();

/**
 * POST /api/auth/send-otp
 * Send OTP to a phone number (mock mode: prints to console)
 */
router.post(
  '/send-otp',
  otpLimiter,
  phoneValidation,
  validate,
  asyncHandler(async (req, res) => {
    const { phone } = req.body;
    const result = await authService.sendOTP(phone);
    res.json(result);
  })
);

/**
 * POST /api/auth/verify-otp
 * Verify OTP and issue JWT tokens
 */
router.post(
  '/verify-otp',
  phoneValidation,
  otpValidation,
  validate,
  asyncHandler(async (req, res) => {
    const { phone, otp } = req.body;
    const result = await authService.verifyOTP(phone, otp);
    if (!result) {
      return res.status(401).json({ error: 'Invalid OTP', message: 'The OTP provided is incorrect or expired.' });
    }
    res.json(result);
  })
);

/**
 * POST /api/auth/refresh
 * Refresh an expired access token using a valid refresh token
 */
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }
    const result = await authService.refreshAccessToken(refreshToken);
    if (!result) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    res.json(result);
  })
);

/**
 * POST /api/auth/guest
 * Create a guest session (anonymous, no account needed)
 */
router.post(
  '/guest',
  asyncHandler(async (req, res) => {
    const result = await authService.createGuestSession();
    res.json(result);
  })
);

module.exports = router;

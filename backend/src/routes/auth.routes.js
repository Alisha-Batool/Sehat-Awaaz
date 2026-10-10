const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { otpLimiter, authLimiter } = require('../middleware/rateLimiter');
const {
  phoneValidation,
  otpValidation,
  emailValidation,
  passwordValidation,
  loginPasswordValidation,
  emailActionTokenValidation,
  nameValidation,
  validate,
} = require('../middleware/validator');
const authService = require('../services/auth.service');

const router = Router();

/**
 * POST /api/auth/register
 * Create an email/password account. The user must log in to receive JWTs.
 */
router.post(
  '/register',
  authLimiter,
  nameValidation,
  emailValidation,
  passwordValidation,
  validate,
  asyncHandler(async (req, res) => {
    const result = await authService.registerWithPassword(req.body);
    res.status(201).json(result);
  })
);

/** POST /api/auth/verify-email */
router.post(
  '/verify-email',
  authLimiter,
  emailActionTokenValidation,
  validate,
  asyncHandler(async (req, res) => {
    const verified = await authService.verifyEmail(req.body.token);
    if (!verified) {
      return res.status(400).json({ error: 'Invalid or expired token', message: 'This verification link is invalid or has expired.' });
    }
    res.json({ message: 'Email verified successfully.' });
  })
);

/** POST /api/auth/resend-verification */
router.post(
  '/resend-verification',
  authLimiter,
  emailValidation,
  validate,
  asyncHandler(async (req, res) => {
    res.json(await authService.resendVerificationEmail(req.body.email));
  })
);

/** POST /api/auth/forgot-password */
router.post(
  '/forgot-password',
  authLimiter,
  emailValidation,
  validate,
  asyncHandler(async (req, res) => {
    res.json(await authService.requestPasswordReset(req.body.email));
  })
);

/** POST /api/auth/reset-password */
router.post(
  '/reset-password',
  authLimiter,
  emailActionTokenValidation,
  passwordValidation,
  validate,
  asyncHandler(async (req, res) => {
    const reset = await authService.resetPassword(req.body.token, req.body.password);
    if (!reset) {
      return res.status(400).json({ error: 'Invalid or expired token', message: 'This password reset link is invalid or has expired.' });
    }
    res.json({ message: 'Password has been reset successfully.' });
  })
);

/**
 * POST /api/auth/login
 * Verify email/password and issue the standard JWT pair.
 */
router.post(
  '/login',
  authLimiter,
  emailValidation,
  loginPasswordValidation,
  validate,
  asyncHandler(async (req, res) => {
    const result = await authService.loginWithPassword(req.body.email, req.body.password);
    if (!result) {
      return res.status(401).json({ error: 'Invalid credentials', message: 'Email or password is incorrect.' });
    }
    res.json(result);
  })
);

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

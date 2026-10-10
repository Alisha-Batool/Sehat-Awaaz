const rateLimit = require('express-rate-limit');

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit for OTP endpoints (prevent abuse)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 OTP requests per 15 minutes per IP
  message: { error: 'Too many OTP requests. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Triage endpoint rate limit
const triageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many triage requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const facilitiesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many facility searches. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, otpLimiter, authLimiter, triageLimiter, facilitiesLimiter };

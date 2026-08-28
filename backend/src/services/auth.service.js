const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const db = require('../config/database');
const { generateOTP } = require('../utils/crypto');
const logger = require('../utils/logger');

// In-memory OTP store (Map: phone -> { otp, expiresAt })
// In production, replace with Redis or similar
const otpStore = new Map();

/**
 * Send OTP to phone number.
 * In mock mode, prints OTP to console instead of sending SMS.
 */
async function sendOTP(phone) {
  const otp = generateOTP(6);
  const expiresAt = Date.now() + config.otp.expirySeconds * 1000;

  otpStore.set(phone, { otp, expiresAt });

  if (config.otp.mode === 'mock') {
    logger.info(`[MOCK OTP] Phone: ${phone} | OTP: ${otp}`);
  } else {
    // TODO: Integrate real SMS gateway here
    logger.info(`OTP sent to ${phone}`);
  }

  return {
    message: 'OTP sent successfully',
    // Include OTP in response only in dev/mock mode for testing
    ...(config.otp.mode === 'mock' && { mockOtp: otp }),
  };
}

/**
 * Verify OTP and issue JWT tokens (access + refresh).
 * Creates user account if it doesn't exist.
 */
async function verifyOTP(phone, otp) {
  const stored = otpStore.get(phone);

  if (!stored) {
    return null; // No OTP found
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone);
    return null; // OTP expired
  }

  if (stored.otp !== otp) {
    return null; // OTP mismatch
  }

  // OTP verified — clean up
  otpStore.delete(phone);

  // Find or create user
  let userResult = await db.query('SELECT id FROM users WHERE phone = $1', [phone]);
  let userId;

  if (userResult.rows.length === 0) {
    const insertResult = await db.query(
      'INSERT INTO users (phone) VALUES ($1) RETURNING id',
      [phone]
    );
    userId = insertResult.rows[0].id;
    logger.info(`New user created: ${userId}`);
  } else {
    userId = userResult.rows[0].id;
  }

  // Issue tokens
  const tokens = issueTokens(userId, false);
  return { userId, ...tokens };
}

/**
 * Refresh an expired access token using a valid refresh token.
 */
async function refreshAccessToken(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    const tokens = issueTokens(decoded.userId, decoded.isGuest || false);
    return tokens;
  } catch {
    return null;
  }
}

/**
 * Create a guest session (anonymous, no phone number required).
 */
async function createGuestSession() {
  const guestId = uuidv4();
  const tokens = issueTokens(guestId, true);

  return {
    guestId,
    message: 'Guest session created. Your data will not be saved after this session.',
    ...tokens,
  };
}

/**
 * Issue JWT access and refresh tokens.
 */
function issueTokens(userId, isGuest) {
  const payload = { userId, isGuest };

  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });

  return { accessToken, refreshToken };
}

module.exports = { sendOTP, verifyOTP, refreshAccessToken, createGuestSession };

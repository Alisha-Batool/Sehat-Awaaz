const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const User = require('../models/User');
const { generateOTP, randomToken, hashInput } = require('../utils/crypto');
const logger = require('../utils/logger');
const emailService = require('./email.service');

// In-memory OTP store (Map: phone -> { otp, expiresAt })
// In production, replace with Redis or similar
const otpStore = new Map();
const PASSWORD_HASH_ROUNDS = 12;
const EMAIL_VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000;
const GENERIC_VERIFICATION_MESSAGE = 'If an account with this email needs verification, a link will be sent.';
const GENERIC_RESET_MESSAGE = 'If an account with this email exists, password reset instructions will be sent.';

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function authError(message, statusCode, name) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.name = name;
  return error;
}

function frontendBaseUrl() {
  const configuredUrl = process.env.FRONTEND_URL || process.env.WEB_APP_URL;
  const defaultUrl = process.env.NODE_ENV === 'production'
    ? 'https://sehat-awaaz.app'
    : 'http://localhost:5173';
  return (configuredUrl || defaultUrl).replace(/\/+$/, '');
}

async function sendActionEmail({ to, kind, token }) {
  const verification = kind === 'verification';
  const actionUrl = `${frontendBaseUrl()}/${verification ? 'verify-email' : 'reset-password'}?token=${encodeURIComponent(token)}`;
  const subject = verification ? 'Verify your Sehat Awaaz email' : 'Reset your Sehat Awaaz password';
  const action = verification ? 'verify your email address' : 'reset your password';
  const expiry = verification ? '24 hours' : '1 hour';
  const text = `Use this link to ${action}: ${actionUrl}\n\nThis link expires in ${expiry}. If you did not request this, you can ignore this email.`;
  const html = `<p>Use the link below to ${action}:</p><p><a href="${actionUrl}">${verification ? 'Verify email' : 'Reset password'}</a></p><p>This link expires in ${expiry}. If you did not request this, you can ignore this email.</p>`;

  try {
    await emailService.sendEmail({ to, subject, text, html });
    return true;
  } catch (error) {
    logger.error(`Failed to send ${verification ? 'verification' : 'password reset'} email`, {
      message: error.message,
    });
    return false;
  }
}

function createUserAuthResponse(user) {
  const userId = String(user._id);
  return {
    userId,
    email: user.email,
    name: user.name || '',
    ...issueTokens(userId, false),
  };
}

async function registerWithPassword({ name, email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const password_hash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
  const verificationToken = randomToken(32);

  try {
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password_hash,
      email_verified: false,
      email_verification_token_hash: hashInput(verificationToken),
      email_verification_expires_at: new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS),
    });
    const verificationEmailSent = await sendActionEmail({
      to: user.email,
      kind: 'verification',
      token: verificationToken,
    });
    return {
      userId: String(user._id),
      email: user.email,
      name: user.name || '',
      verificationEmailSent,
    };
  } catch (error) {
    if (error.code === 11000) {
      throw authError(
        'An account with this email already exists. Please log in or use another email.',
        409,
        'EmailAlreadyRegisteredError'
      );
    }
    throw error;
  }
}

async function verifyEmail(token) {
  const user = await User.findOneAndUpdate(
    {
      email_verification_token_hash: hashInput(token),
      email_verification_expires_at: { $gt: new Date() },
    },
    {
      $set: { email_verified: true },
      $unset: {
        email_verification_token_hash: 1,
        email_verification_expires_at: 1,
      },
    },
    { new: true }
  );
  return Boolean(user);
}

async function resendVerificationEmail(email) {
  const user = await User.findOne({ email: normalizeEmail(email) })
    .select('+email_verification_token_hash +email_verification_expires_at');
  if (user && user.email_verified !== true && user.password_hash) {
    const token = randomToken(32);
    user.email_verification_token_hash = hashInput(token);
    user.email_verification_expires_at = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS);
    await user.save();
    await sendActionEmail({ to: user.email, kind: 'verification', token });
  }
  return { message: GENERIC_VERIFICATION_MESSAGE };
}

async function requestPasswordReset(email) {
  const user = await User.findOne({ email: normalizeEmail(email) })
    .select('+password_reset_token_hash +password_reset_expires_at');
  if (user?.password_hash) {
    const token = randomToken(32);
    user.password_reset_token_hash = hashInput(token);
    user.password_reset_expires_at = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);
    await user.save();
    await sendActionEmail({ to: user.email, kind: 'reset', token });
  }
  return { message: GENERIC_RESET_MESSAGE };
}

async function resetPassword(token, password) {
  const resetTokenHash = hashInput(token);
  const user = await User.findOne({ password_reset_token_hash: resetTokenHash })
    .select('+password_hash +password_reset_token_hash +password_reset_expires_at');
  if (!user || !user.password_hash || !user.password_reset_expires_at
    || user.password_reset_expires_at.getTime() <= Date.now()) {
    return false;
  }

  const password_hash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
  const updatedUser = await User.findOneAndUpdate(
    {
      password_reset_token_hash: resetTokenHash,
      password_reset_expires_at: { $gt: new Date() },
    },
    {
      $set: { password_hash },
      $unset: {
        password_reset_token_hash: 1,
        password_reset_expires_at: 1,
      },
    },
    { new: true }
  );
  return Boolean(updatedUser);
}

async function loginWithPassword(email, password) {
  const user = await User.findOne({ email: normalizeEmail(email) }).select('+password_hash');
  if (!user?.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
    return null;
  }
  return createUserAuthResponse(user);
}

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

  // Find or create user in MongoDB
  let user = await User.findOne({ phone }).select('_id');

  if (!user) {
    try {
      user = await User.create({ phone });
      logger.info(`New user created: ${user._id}`);
    } catch (error) {
      // Handle two simultaneous OTP verifications for the same phone.
      if (error.code !== 11000) throw error;
      user = await User.findOne({ phone }).select('_id');
      if (!user) throw error;
    }
  }
  const userId = user._id;

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

module.exports = {
  sendOTP,
  verifyOTP,
  registerWithPassword,
  loginWithPassword,
  verifyEmail,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  refreshAccessToken,
  createGuestSession,
};

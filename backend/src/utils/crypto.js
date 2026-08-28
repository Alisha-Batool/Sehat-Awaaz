const crypto = require('crypto');

/**
 * Hash a string using SHA-256 (for audit log input hashing)
 */
function hashInput(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Generate a random OTP code of specified length
 */
function generateOTP(length = 6) {
  const digits = '0123456789';
  let otp = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    otp += digits[bytes[i] % 10];
  }
  return otp;
}

/**
 * Generate a cryptographically random string (for session IDs, tokens)
 */
function randomToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

module.exports = { hashInput, generateOTP, randomToken };

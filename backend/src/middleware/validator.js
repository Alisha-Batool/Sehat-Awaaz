const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to check validation results from express-validator
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      details: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
}

// Reusable validation rules
const phoneValidation = body('phone')
  .isString()
  .matches(/^(\+92|0)?3\d{9}$/)
  .withMessage('Valid Pakistani phone number required (e.g., +923001234567 or 03001234567)');

const otpValidation = body('otp')
  .isString()
  .isLength({ min: 6, max: 6 })
  .withMessage('OTP must be 6 digits');

const emailValidation = body('email')
  .isString()
  .withMessage('Email is required')
  .bail()
  .trim()
  .customSanitizer((email) => email.toLowerCase())
  .isLength({ max: 254 })
  .isEmail()
  .withMessage('A valid email address is required');

const passwordValidation = body('password')
  .isString()
  .withMessage('Password is required')
  .bail()
  .isLength({ min: 8, max: 128 })
  .withMessage('Password must be between 8 and 128 characters')
  .bail()
  .custom((password) => Buffer.byteLength(password, 'utf8') <= 72)
  .withMessage('Password must not exceed 72 UTF-8 bytes')
  .bail()
  .custom((password) => (
    /\p{Lu}/u.test(password)
    && /\p{Ll}/u.test(password)
    && /\p{N}/u.test(password)
    && /[\p{P}\p{S}]/u.test(password)
  ))
  .withMessage('Password must include uppercase and lowercase letters, a number, and a special character');

// Keep existing email accounts sign-in compatible while enforcing the stronger
// password policy for new registrations.
const loginPasswordValidation = body('password')
  .isString()
  .withMessage('Password is required')
  .bail()
  .isLength({ min: 8, max: 128 })
  .withMessage('Password must be between 8 and 128 characters')
  .bail()
  .custom((password) => Buffer.byteLength(password, 'utf8') <= 72)
  .withMessage('Password must not exceed 72 UTF-8 bytes');

const emailActionTokenValidation = body('token')
  .isString()
  .matches(/^[a-f0-9]{64}$/i)
  .withMessage('A valid token is required');

const nameValidation = body('name')
  .isString()
  .withMessage('Name is required')
  .bail()
  .trim()
  .isLength({ min: 2, max: 80 })
  .withMessage('Name must be between 2 and 80 characters')
  .bail()
  .matches(/^(?:\p{L}\p{M}*)+(?: +(?:\p{L}\p{M}*)+)*$/u)
  .withMessage('Name may contain letters and spaces only');

const languageValidation = body('language')
  .optional()
  .isIn(['en', 'ur', 'ur-roman', 'ps'])
  .withMessage('Language must be one of: en, ur, ur-roman, ps');

const symptomTextValidation = body('text')
  .isString()
  .isLength({ min: 3, max: 2000 })
  .withMessage('Symptom text must be between 3 and 2000 characters');

const sessionIdParam = param('id')
  .isUUID()
  .withMessage('Session ID must be a valid UUID');

module.exports = {
  validate,
  phoneValidation,
  otpValidation,
  emailValidation,
  passwordValidation,
  loginPasswordValidation,
  emailActionTokenValidation,
  nameValidation,
  languageValidation,
  symptomTextValidation,
  sessionIdParam,
};

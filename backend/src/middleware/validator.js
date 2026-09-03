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
  languageValidation,
  symptomTextValidation,
  sessionIdParam,
};

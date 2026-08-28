// Triage tiers
const TRIAGE_TIERS = {
  EMERGENCY: 'emergency',
  CLINIC: 'clinic',
  HOME_CARE: 'home_care',
};

// Session statuses
const SESSION_STATUS = {
  ACTIVE: 'active',
  AWAITING_CLARIFICATION: 'awaiting_clarification',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
};

// Supported languages
const LANGUAGES = {
  EN: 'en',
  UR: 'ur',
  PA: 'pa',
  PS: 'ps',
  SD: 'sd',
  UR_ROMAN: 'ur-roman',
};

// RTL languages
const RTL_LANGUAGES = ['ur', 'ps', 'sd'];

// Maximum clarification turns
const MAX_CLARIFICATION_TURNS = 4;

// Tier priority (higher = more cautious)
const TIER_PRIORITY = {
  [TRIAGE_TIERS.HOME_CARE]: 1,
  [TRIAGE_TIERS.CLINIC]: 2,
  [TRIAGE_TIERS.EMERGENCY]: 3,
};

// Emergency numbers by province (Pakistan)
const DEFAULT_EMERGENCY_NUMBER = '1122';

// Confidence threshold — below this, round up to more cautious tier
const CONFIDENCE_THRESHOLD = 0.6;

module.exports = {
  TRIAGE_TIERS,
  SESSION_STATUS,
  LANGUAGES,
  RTL_LANGUAGES,
  MAX_CLARIFICATION_TURNS,
  TIER_PRIORITY,
  DEFAULT_EMERGENCY_NUMBER,
  CONFIDENCE_THRESHOLD,
};

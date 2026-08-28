const db = require('../config/database');
const { DEFAULT_EMERGENCY_NUMBER } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Emergency numbers by province/city in Pakistan
 * Static fallback — also loaded from DB
 */
const EMERGENCY_NUMBERS = {
  'punjab': { rescue: '1122', police: '15', fire: '16' },
  'sindh': { rescue: '1122', police: '15', fire: '16' },
  'kpk': { rescue: '1122', police: '15', fire: '16' },
  'balochistan': { rescue: '1122', police: '15', fire: '16' },
  'islamabad': { rescue: '1122', police: '15', fire: '16' },
  'default': { rescue: '1122', police: '15', fire: '16' },
};

/**
 * Get the correct emergency number for a region
 */
async function getEmergencyNumber(province, city) {
  const key = (province || '').toLowerCase();
  const numbers = EMERGENCY_NUMBERS[key] || EMERGENCY_NUMBERS.default;

  return {
    rescue: numbers.rescue,
    police: numbers.police,
    fire: numbers.fire,
    primary: numbers.rescue,
    province: province || 'unknown',
  };
}

/**
 * Get "what to do while waiting" guidance for an emergency category
 */
async function getGuidance(category) {
  const guidanceMap = {
    chest_pain: {
      en: {
        title: 'Chest Pain — While Waiting for Help',
        steps: [
          'Sit down and try to stay calm',
          'Loosen any tight clothing',
          'If the person has prescribed heart medication, help them take it',
          'Do NOT give food or drink',
          'If the person becomes unconscious, begin CPR if you know how',
        ],
      },
      ur: {
        title: 'سینے میں درد — مدد کا انتظار کرتے ہوئے',
        steps: [
          'بیٹھ جائیں اور پرسکون رہنے کی کوشش کریں',
          'تنگ کپڑے ڈھیلے کریں',
          'اگر مریض کو دل کی دوائی تجویز ہے تو لینے میں مدد کریں',
          'کھانا یا پانی نہ دیں',
          'اگر مریض بے ہوش ہو جائے تو سی پی آر شروع کریں',
        ],
      },
    },
    breathing: {
      en: {
        title: 'Difficulty Breathing — While Waiting for Help',
        steps: [
          'Help the person sit upright',
          'Loosen tight clothing around neck and chest',
          'Open windows for fresh air if possible',
          'If they have an inhaler, help them use it',
          'Stay with the person and keep them calm',
        ],
      },
    },
    bleeding: {
      en: {
        title: 'Severe Bleeding — While Waiting for Help',
        steps: [
          'Apply firm pressure to the wound with a clean cloth',
          'Keep the injured area elevated if possible',
          'Do NOT remove the cloth if blood soaks through — add more on top',
          'Keep the person lying down and warm',
          'Do NOT give food or drink',
        ],
      },
    },
    seizure: {
      en: {
        title: 'Seizure — While Waiting for Help',
        steps: [
          'Clear the area of hard or sharp objects',
          'Place something soft under their head',
          'Do NOT hold the person down',
          'Do NOT put anything in their mouth',
          'Time the seizure — if it lasts more than 5 minutes, tell the emergency operator',
          'After the seizure, place them on their side',
        ],
      },
    },
  };

  const guidance = guidanceMap[category];
  if (!guidance) return null;
  return guidance.en; // TODO: language selection
}

/**
 * Build emergency response payload for triage result
 */
async function getEmergencyResponse(language) {
  const numbers = EMERGENCY_NUMBERS.default;
  return {
    number: numbers.rescue,
    label: 'Rescue 1122',
    action: 'tel:1122',
    message: {
      en: 'Call Rescue 1122 now. Stay calm and follow the instructions below while waiting.',
      ur: 'ابھی ریسکیو 1122 پر کال کریں۔ پرسکون رہیں اور انتظار کے دوران نیچے دی گئی ہدایات پر عمل کریں۔',
      'ur-roman': 'Abhi Rescue 1122 par call karein. Pur-sukoon rahein aur intezar ke doran neeche di gayi hidayaat par amal karein.',
    }[language] || {
      en: 'Call Rescue 1122 now. Stay calm and follow the instructions below while waiting.',
    }.en,
    guidance_categories: ['chest_pain', 'breathing', 'bleeding', 'seizure'],
  };
}

module.exports = { getEmergencyNumber, getGuidance, getEmergencyResponse };

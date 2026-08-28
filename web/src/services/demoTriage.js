/**
 * Demo triage engine — runs entirely in the browser.
 * Used as fallback when the backend/NLU services are not running.
 * Analyzes symptom text with keyword matching to produce realistic triage results.
 */

// Emergency red-flag keyword patterns
const EMERGENCY_PATTERNS = [
  {
    keywords: ['chest pain', 'chest tight', 'seene mein dard', 'seena dard', 'chaati dard', 'chest pressure'],
    combined: ['breath', 'sweat', 'arm', 'jaw', 'saans', 'paseena'],
    tier: 'emergency',
    explanation: {
      en: 'Your symptoms — chest pain combined with other warning signs — could indicate a serious heart condition. This requires immediate medical attention.',
      ur: 'آپ کی علامات — سینے میں درد کے ساتھ دیگر انتباہی نشانیاں — سنگین دل کی حالت کی نشاندہی کر سکتی ہیں۔ اسے فوری طبی توجہ کی ضرورت ہے۔',
      'ur-roman': 'Aap ki alaamaat — seene mein dard ke saath deegar intibaahi nishaniyan — sanjeen dil ki halat ki nishandahi kar sakti hain. Isay fori tibbi tawajja ki zaroorat hai.',
    },
  },
  {
    keywords: ['stroke', 'face drooping', 'arm weakness', 'speech difficulty', 'falij', 'numbness one side'],
    combined: [],
    tier: 'emergency',
    explanation: {
      en: 'Your symptoms could indicate a stroke. Time is critical — every minute matters. Please seek emergency care immediately.',
      ur: 'آپ کی علامات فالج کی نشاندہی کر سکتی ہیں۔ وقت بہت اہم ہے — ہر منٹ اہمیت رکھتا ہے۔ براہ کرم فوری ہنگامی طبی امداد حاصل کریں۔',
      'ur-roman': 'Aap ki alaamaat falij ki nishandahi kar sakti hain. Waqt bohat ahem hai. Barah-e-karam fori emergency medical aid hasil karein.',
    },
  },
  {
    keywords: ['difficulty breathing', 'shortness of breath', 'can\'t breathe', 'saans nahi', 'dum ghut', 'breathless'],
    combined: [],
    tier: 'emergency',
    explanation: {
      en: 'Severe breathing difficulty can be life-threatening. You need immediate medical evaluation.',
      ur: 'سانس لینے میں شدید مشکل جان لیوا ہو سکتی ہے۔ آپ کو فوری طبی معائنے کی ضرورت ہے۔',
      'ur-roman': 'Saans lene mein shadeed mushkil jaan leva ho sakti hai. Aap ko fori tibbi muainay ki zaroorat hai.',
    },
  },
  {
    keywords: ['severe bleeding', 'blood won\'t stop', 'khoon', 'bleeding heavily', 'haemorrhage'],
    combined: [],
    tier: 'emergency',
    explanation: {
      en: 'Uncontrolled bleeding is a medical emergency. Apply direct pressure to the wound and seek immediate help.',
      ur: 'بے قابو خون بہنا طبی ہنگامی صورت حال ہے۔ زخم پر براہ راست دباؤ ڈالیں اور فوری مدد حاصل کریں۔',
      'ur-roman': 'Be-qaboo khoon behna tibbi emergency hai. Zakhm par barah-e-rast dabao dalein aur fori madad hasil karein.',
    },
  },
  {
    keywords: ['suicidal', 'kill myself', 'end my life', 'self harm', 'jaan dena', 'khudkushi'],
    combined: [],
    tier: 'emergency',
    explanation: {
      en: 'Your life is valuable. If you are thinking about harming yourself, please reach out for help right now. You are not alone.',
      ur: 'آپ کی زندگی قیمتی ہے۔ اگر آپ اپنے آپ کو نقصان پہنچانے کے بارے میں سوچ رہے ہیں تو براہ کرم ابھی مدد حاصل کریں۔',
      'ur-roman': 'Aap ki zindagi qeemti hai. Agar aap apne aap ko nuqsan pohanchane ke baare mein soch rahe hain to barah-e-karam abhi madad hasil karein.',
    },
  },
  {
    keywords: ['seizure', 'fit', 'unconscious', 'convulsion', 'mirgi', 'behosh'],
    combined: [],
    tier: 'emergency',
    explanation: {
      en: 'Seizures or loss of consciousness require urgent medical attention. Keep the person safe and call for help.',
      ur: 'دورے یا بے ہوشی کو فوری طبی توجہ کی ضرورت ہے۔ مریض کو محفوظ رکھیں اور مدد کے لیے کال کریں۔',
      'ur-roman': 'Dauray ya behoshi ko fori tibbi tawajja ki zaroorat hai. Mareez ko mehfooz rakhein aur madad ke liye call karein.',
    },
  },
];

// Clinic-level patterns
const CLINIC_PATTERNS = [
  {
    keywords: ['fever', 'bukhar', 'temperature', 'tap'],
    explanation: {
      en: 'Your fever should be evaluated by a healthcare provider, especially if it persists or is accompanied by other symptoms. A clinic visit within 24 hours is recommended.',
      ur: 'آپ کے بخار کو صحت کی دیکھ بھال فراہم کرنے والے کے ذریعے جانچنا چاہیے، خاص طور پر اگر یہ جاری رہے۔ 24 گھنٹوں کے اندر کلینک جانا تجویز کیا جاتا ہے۔',
      'ur-roman': 'Aap ke bukhar ko sehat ki dekh-bhaal faraham karne wale ke zariye jaanchna chahiye. 24 ghanton ke andar clinic jaana tajveez kiya jaata hai.',
    },
  },
  {
    keywords: ['headache', 'sar dard', 'migraine', 'sir dard'],
    explanation: {
      en: 'Your headache symptoms suggest you should see a doctor for proper evaluation, especially if this is a new or unusually severe headache.',
      ur: 'آپ کے سر درد کی علامات تجویز کرتی ہیں کہ آپ مناسب جانچ کے لیے ڈاکٹر سے ملیں۔',
      'ur-roman': 'Aap ke sar dard ki alaamaat tajveez karti hain ke aap munasib jaanch ke liye doctor se milein.',
    },
  },
  {
    keywords: ['stomach', 'pet dard', 'abdominal', 'vomiting', 'diarrhea', 'ulti', 'dast', 'nausea'],
    explanation: {
      en: 'Your stomach symptoms should be evaluated by a healthcare provider. Dehydration can be a concern, especially with persistent vomiting or diarrhea.',
      ur: 'آپ کے پیٹ کی علامات کو صحت کی دیکھ بھال فراہم کرنے والے کے ذریعے جانچنا چاہیے۔',
      'ur-roman': 'Aap ke pait ki alaamaat ko sehat ki dekh-bhaal faraham karne wale ke zariye jaanchna chahiye.',
    },
  },
  {
    keywords: ['cough', 'khansi', 'cold', 'sore throat', 'gala', 'nazla', 'flu'],
    explanation: {
      en: 'Your respiratory symptoms suggest a clinic visit would be helpful for proper diagnosis and treatment.',
      ur: 'آپ کی سانس کی علامات مناسب تشخیص اور علاج کے لیے کلینک جانے کا مشورہ دیتی ہیں۔',
      'ur-roman': 'Aap ki saans ki alaamaat munasib tashkhees aur ilaaj ke liye clinic jaane ka mashwara deti hain.',
    },
  },
  {
    keywords: ['rash', 'skin', 'itching', 'kharish', 'daana', 'allergy', 'swelling'],
    explanation: {
      en: 'Skin symptoms should be examined by a doctor to determine the cause and appropriate treatment.',
      ur: 'جلد کی علامات کو ڈاکٹر کے ذریعے معائنہ کرانا چاہیے تاکہ وجہ اور مناسب علاج کا تعین ہو سکے۔',
      'ur-roman': 'Jild ki alaamaat ko doctor ke zariye muaina karana chahiye taake wajah aur munasib ilaaj ka taayyun ho sakay.',
    },
  },
  {
    keywords: ['pain', 'dard', 'injury', 'chot', 'swollen', 'sujan', 'sprain', 'twist'],
    explanation: {
      en: 'Your pain or injury should be evaluated by a healthcare provider to rule out fractures or serious damage.',
      ur: 'آپ کے درد یا چوٹ کو صحت کی دیکھ بھال فراہم کرنے والے کے ذریعے جانچنا چاہیے۔',
      'ur-roman': 'Aap ke dard ya chot ko sehat ki dekh-bhaal faraham karne wale ke zariye jaanchna chahiye.',
    },
  },
  {
    keywords: ['ear', 'kaan', 'eye', 'aankh', 'nose', 'naak', 'throat infection'],
    explanation: {
      en: 'Your symptoms suggest a clinic visit for proper examination and treatment.',
      ur: 'آپ کی علامات مناسب معائنے اور علاج کے لیے کلینک جانے کی تجویز دیتی ہیں۔',
      'ur-roman': 'Aap ki alaamaat munasib muainay aur ilaaj ke liye clinic jaane ki tajveez deti hain.',
    },
  },
];

// Home care patterns (default for mild symptoms)
const HOME_CARE_EXPLANATION = {
  en: 'Based on your symptoms, this appears to be a mild condition that can be managed at home. However, if symptoms worsen or don\'t improve within a few days, please visit a clinic.',
  ur: 'آپ کی علامات کے مطابق، یہ ایک ہلکی حالت ہے جسے گھر پر سنبھالا جا سکتا ہے۔ تاہم، اگر علامات خراب ہو جائیں یا چند دنوں میں بہتر نہ ہوں تو کلینک جائیں۔',
  'ur-roman': 'Aap ki alaamaat ke mutabiq, yeh ek halki halat hai jisay ghar par sambhala ja sakta hai. Taham, agar alaamaat kharab ho jayein ya chand dinon mein behtar na hon to clinic jayein.',
};

// Clarification questions for demo mode
const DEMO_QUESTIONS = [
  {
    id: 'q_duration',
    question: {
      en: 'How long have you had these symptoms?',
      ur: 'آپ کو یہ علامات کتنے عرصے سے ہیں؟',
      'ur-roman': 'Aap ko yeh alaamaat kitne arsay se hain?',
    },
    options: [
      { value: 'less_than_1_day', label: { en: 'Less than a day', ur: 'ایک دن سے کم', 'ur-roman': 'Ek din se kam' } },
      { value: '1_to_3_days', label: { en: '1-3 days', ur: '1-3 دن', 'ur-roman': '1-3 din' } },
      { value: 'more_than_3_days', label: { en: 'More than 3 days', ur: '3 دن سے زیادہ', 'ur-roman': '3 din se zyada' } },
      { value: 'more_than_a_week', label: { en: 'More than a week', ur: 'ایک ہفتے سے زیادہ', 'ur-roman': 'Ek haftay se zyada' } },
    ],
  },
  {
    id: 'q_severity',
    question: {
      en: 'How severe are your symptoms?',
      ur: 'آپ کی علامات کتنی شدید ہیں؟',
      'ur-roman': 'Aap ki alaamaat kitni shadeed hain?',
    },
    options: [
      { value: 'mild', label: { en: 'Mild — I can manage', ur: 'ہلکی — میں سنبھال سکتا ہوں', 'ur-roman': 'Halki — main sambhal sakta hoon' } },
      { value: 'moderate', label: { en: 'Moderate — it\'s bothering me', ur: 'درمیانی — یہ مجھے پریشان کر رہی ہے', 'ur-roman': 'Darmiyani — yeh mujhe pareshan kar rahi hai' } },
      { value: 'severe', label: { en: 'Severe — I can\'t function normally', ur: 'شدید — میں معمول کے کام نہیں کر سکتا', 'ur-roman': 'Shadeed — main mamool ke kaam nahi kar sakta' } },
    ],
  },
  {
    id: 'q_worsening',
    question: {
      en: 'Are your symptoms getting worse, staying the same, or improving?',
      ur: 'کیا آپ کی علامات خراب ہو رہی ہیں، ویسی ہی ہیں، یا بہتر ہو رہی ہیں؟',
      'ur-roman': 'Kya aap ki alaamaat kharab ho rahi hain, waise hi hain, ya behtar ho rahi hain?',
    },
    options: [
      { value: 'worsening', label: { en: 'Getting worse', ur: 'خراب ہو رہی ہیں', 'ur-roman': 'Kharab ho rahi hain' } },
      { value: 'same', label: { en: 'About the same', ur: 'تقریباً ویسی ہی', 'ur-roman': 'Taqreeban waise hi' } },
      { value: 'improving', label: { en: 'Getting better', ur: 'بہتر ہو رہی ہیں', 'ur-roman': 'Behtar ho rahi hain' } },
    ],
  },
];

function getLocalized(obj, lang) {
  return obj[lang] || obj['ur-roman'] || obj['en'];
}

/**
 * Analyze symptom text and return a demo triage result.
 */
export function analyzeSymptoms(text, language = 'en') {
  const lower = text.toLowerCase();

  // Check emergency patterns first
  for (const pattern of EMERGENCY_PATTERNS) {
    const matched = pattern.keywords.some((kw) => lower.includes(kw));
    if (matched) {
      if (pattern.combined.length > 0) {
        // Need at least one additional keyword
        const hasCombined = pattern.combined.some((kw) => lower.includes(kw));
        if (hasCombined) {
          return {
            status: 'completed',
            tier: pattern.tier,
            confidence: 0.85,
            explanation: getLocalized(pattern.explanation, language),
            disclaimer: getLocalized({
              en: 'This is an automated assessment, not a medical diagnosis. Please seek professional medical help.',
              ur: 'یہ خودکار تشخیص ہے، طبی تشخیص نہیں۔ براہ کرم پیشہ ورانہ طبی مدد حاصل کریں۔',
              'ur-roman': 'Yeh automatic assessment hai, tibbi tashkhees nahi. Barah-e-karam pesha-warana tibbi madad hasil karein.',
            }, language),
            source: 'demo',
          };
        }
      } else {
        return {
          status: 'completed',
          tier: pattern.tier,
          confidence: 0.85,
          explanation: getLocalized(pattern.explanation, language),
          disclaimer: getLocalized({
            en: 'This is an automated assessment, not a medical diagnosis. Please seek professional medical help.',
            ur: 'یہ خودکار تشخیص ہے، طبی تشخیص نہیں۔ براہ کرم پیشہ ورانہ طبی مدد حاصل کریں۔',
            'ur-roman': 'Yeh automatic assessment hai, tibbi tashkhees nahi. Barah-e-karam pesha-warana tibbi madad hasil karein.',
          }, language),
          source: 'demo',
        };
      }
    }
  }

  // Check clinic patterns
  for (const pattern of CLINIC_PATTERNS) {
    const matched = pattern.keywords.some((kw) => lower.includes(kw));
    if (matched) {
      return {
        status: 'needs_clarification',
        sessionId: `demo-${Date.now()}`,
        question: getLocalized(DEMO_QUESTIONS[0].question, language),
        question_id: DEMO_QUESTIONS[0].id,
        options: DEMO_QUESTIONS[0].options.map((opt) => ({
          value: opt.value,
          label: getLocalized(opt.label, language),
        })),
        turn: 1,
        max_turns: 2,
        _matchedPattern: pattern,
        _language: language,
        _originalText: text,
        source: 'demo',
      };
    }
  }

  // Default: home care
  return {
    status: 'needs_clarification',
    sessionId: `demo-${Date.now()}`,
    question: getLocalized(DEMO_QUESTIONS[1].question, language), // severity question
    question_id: DEMO_QUESTIONS[1].id,
    options: DEMO_QUESTIONS[1].options.map((opt) => ({
      value: opt.value,
      label: getLocalized(opt.label, language),
    })),
    turn: 1,
    max_turns: 2,
    _matchedPattern: null,
    _language: language,
    _originalText: text,
    source: 'demo',
  };
}

/**
 * Process a demo clarification answer and return the next question or final result.
 */
export function processDemoAnswer(sessionData, answer, language) {
  const lang = sessionData._language || language || 'en';
  const turn = sessionData.turn || 1;
  const maxTurns = sessionData.max_turns || 2;

  // Store the answer
  const answers = { ...(sessionData._answers || {}), [sessionData.question_id]: answer };

  // If we still have questions to ask
  if (turn < maxTurns) {
    // Find the next unanswered question
    const nextQ = DEMO_QUESTIONS.find((q) => !answers[q.id]);
    if (nextQ) {
      return {
        status: 'needs_clarification',
        sessionId: sessionData.sessionId,
        question: getLocalized(nextQ.question, lang),
        question_id: nextQ.id,
        options: nextQ.options.map((opt) => ({
          value: opt.value,
          label: getLocalized(opt.label, lang),
        })),
        turn: turn + 1,
        max_turns: maxTurns,
        _matchedPattern: sessionData._matchedPattern,
        _language: lang,
        _originalText: sessionData._originalText,
        _answers: answers,
        source: 'demo',
      };
    }
  }

  // Time to produce the final result
  return produceDemoResult(sessionData, answers, lang);
}

function produceDemoResult(sessionData, answers, lang) {
  const pattern = sessionData._matchedPattern;
  const severity = answers.q_severity;
  const worsening = answers.q_worsening;

  // Escalate based on answers
  let tier = 'home_care';
  let explanation;

  if (pattern) {
    // Had a clinic-level match
    tier = 'clinic';
    explanation = getLocalized(pattern.explanation, lang);

    // Upgrade to emergency if severe + worsening
    if (severity === 'severe' && worsening === 'worsening') {
      tier = 'emergency';
      explanation = getLocalized({
        en: 'Based on your symptoms and answers, your condition appears serious and is getting worse. Please seek emergency care immediately.',
        ur: 'آپ کی علامات اور جوابات کے مطابق، آپ کی حالت سنگین لگتی ہے اور خراب ہو رہی ہے۔ براہ کرم فوری ہنگامی طبی امداد حاصل کریں۔',
        'ur-roman': 'Aap ki alaamaat aur jawabaat ke mutabiq, aap ki halat sanjeen lagti hai aur kharab ho rahi hai. Barah-e-karam fori emergency medical aid hasil karein.',
      }, lang);
    }
    // Downgrade to home care if mild + improving
    if (severity === 'mild' && worsening === 'improving') {
      tier = 'home_care';
      explanation = getLocalized(HOME_CARE_EXPLANATION, lang);
    }
  } else {
    // No pattern matched = home care
    explanation = getLocalized(HOME_CARE_EXPLANATION, lang);

    // But if severe + worsening, upgrade to clinic
    if (severity === 'severe' && worsening === 'worsening') {
      tier = 'clinic';
      explanation = getLocalized({
        en: 'Although your symptoms didn\'t match a specific pattern, you report they are severe and worsening. Please visit a clinic for evaluation.',
        ur: 'اگرچہ آپ کی علامات کسی مخصوص نمونے سے مماثل نہیں ہیں، لیکن آپ بتاتے ہیں کہ وہ شدید اور خراب ہو رہی ہیں۔ براہ کرم جانچ کے لیے کلینک جائیں۔',
        'ur-roman': 'Agarche aap ki alaamaat kisi makhsoos namoone se mumasir nahi hain, lekin aap batate hain ke woh shadeed aur kharab ho rahi hain. Barah-e-karam jaanch ke liye clinic jayein.',
      }, lang);
    }
  }

  const disclaimer = getLocalized({
    en: 'Sehat Awaaz is not a medical diagnosis. Always consult a healthcare professional. In an emergency, call 1122.',
    ur: 'صحت آواز طبی تشخیص نہیں ہے۔ ہمیشہ صحت کے پیشہ ور سے مشورہ کریں۔ ہنگامی صورت میں 1122 پر کال کریں۔',
    'ur-roman': 'Sehat Awaaz tibbi tashkhees nahi hai. Hamesha healthcare professional se mashwara karein. Emergency mein 1122 par call karein.',
  }, lang);

  const result = {
    status: 'completed',
    tier,
    confidence: 0.75,
    explanation,
    disclaimer,
    source: 'demo',
  };

  // Add home care details for home_care tier
  if (tier === 'home_care') {
    result.home_care = {
      tips: getLocalized({
        en: [
          'Rest and stay hydrated — drink plenty of water',
          'Take over-the-counter pain relief if needed (e.g., paracetamol)',
          'Monitor your temperature regularly',
          'Avoid strenuous activity until you feel better',
        ],
        ur: [
          'آرام کریں اور ہائیڈریٹ رہیں — کافی پانی پئیں',
          'ضرورت ہو تو عام درد کی دوا لیں (جیسے پیراسیٹامول)',
          'باقاعدگی سے اپنا درجہ حرارت چیک کریں',
          'بہتر محسوس ہونے تک سخت سرگرمی سے گریز کریں',
        ],
        'ur-roman': [
          'Aaram karein aur hydrated rahein — kaafi paani piyein',
          'Zaroorat ho to aam dard ki dawa lein (jaise paracetamol)',
          'Ba-qaidgi se apna darja hararat check karein',
          'Behtar mehsoos hone tak sakht sargarami se gurez karein',
        ],
      }, lang),
      watchFor: getLocalized({
        en: [
          'Fever above 103°F (39.4°C)',
          'Symptoms lasting more than 3 days',
          'Difficulty breathing',
          'Severe pain that doesn\'t improve',
        ],
        ur: [
          '103°F (39.4°C) سے اوپر بخار',
          'علامات 3 دن سے زیادہ جاری رہیں',
          'سانس لینے میں مشکل',
          'شدید درد جو بہتر نہ ہو',
        ],
        'ur-roman': [
          '103°F (39.4°C) se upar bukhar',
          'Alaamaat 3 din se zyada jaari rahein',
          'Saans lene mein mushkil',
          'Shadeed dard jo behtar na ho',
        ],
      }, lang),
    };
  }

  return result;
}

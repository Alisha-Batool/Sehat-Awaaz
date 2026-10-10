export const SPEECH_LANG_MAP = {
  en: 'en-US',
  ur: 'ur-PK',
  'ur-roman': 'en-US',
  ps: 'ps-AF',
};

export function getSpeechLanguage(language) {
  return SPEECH_LANG_MAP[language] || 'en-US';
}

export function speakText(text, language) {
  if (!text || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = getSpeechLanguage(language);
  window.speechSynthesis.speak(utterance);
}

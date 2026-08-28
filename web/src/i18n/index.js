import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import ur from './locales/ur.json';
import urRoman from './locales/ur-roman.json';
import pa from './locales/pa.json';
import ps from './locales/ps.json';
import sd from './locales/sd.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ur: { translation: ur },
      'ur-roman': { translation: urRoman },
      pa: { translation: pa },
      ps: { translation: ps },
      sd: { translation: sd },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import HeroSection from '../components/hero/HeroSection';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', dir: 'ltr' },
  { code: 'ur', label: 'Urdu', native: 'اردو', dir: 'rtl' },
  { code: 'ur-roman', label: 'Roman Urdu', native: 'Roman Urdu', dir: 'ltr' },
  { code: 'ps', label: 'Pashto', native: 'پښتو', dir: 'rtl' },
];

export default function LanguageSelect() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  const selectLanguage = (lang) => {
    i18n.changeLanguage(lang.code);
    document.documentElement.dir = lang.dir;
    document.documentElement.lang = lang.code;
    localStorage.setItem('language', lang.code);
    localStorage.setItem('dir', lang.dir);
    navigate('/onboarding');
  };

  return (
    <HeroSection>
      <div className="hero-language-panel liquid-glass">
        <p className="hero-kicker">CARE, HEARD CLEARLY</p>
        <p className="hero-subtitle">Select your language / اپنی زبان منتخب کریں</p>
        <div className="hero-languages">
          {LANGUAGES.map((lang) => (
            <button key={lang.code} className="language-option" onClick={() => selectLanguage(lang)}>
              <span className="language-option-native">{lang.native}</span>
              {lang.label !== lang.native && <span className="language-option-label">{lang.label}</span>}
            </button>
          ))}
        </div>
      </div>
    </HeroSection>
  );
}

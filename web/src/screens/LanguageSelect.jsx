import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', dir: 'ltr' },
  { code: 'ur', label: 'Urdu', native: 'اردو', dir: 'rtl' },
  { code: 'ur-roman', label: 'Roman Urdu', native: 'Roman Urdu', dir: 'ltr' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', dir: 'ltr' },
  { code: 'ps', label: 'Pashto', native: 'پښتو', dir: 'rtl' },
  { code: 'sd', label: 'Sindhi', native: 'سنڌي', dir: 'rtl' },
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
    <div className="screen">
      <div className="screen-header">
        <h1>Sehat Awaaz</h1>
        <p style={{ color: '#555' }}>صحت آواز</p>
        <p className="mt-sm">Select your language / اپنی زبان منتخب کریں</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            className="btn btn-secondary btn-block"
            onClick={() => selectLanguage(lang)}
            style={{ fontSize: '1.1rem', padding: '16px 24px' }}
          >
            <span>{lang.native}</span>
            {lang.label !== lang.native && (
              <span style={{ fontSize: '0.85rem', opacity: 0.7 }}> ({lang.label})</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

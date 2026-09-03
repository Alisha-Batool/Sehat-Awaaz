import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { triageApi } from '../services/api';
import { analyzeSymptoms } from '../services/demoTriage';

export default function SymptomInput() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDemo, setIsDemo] = useState(false);

  const handleResult = (data) => {
    if (data.status === 'needs_clarification') {
      sessionStorage.setItem('triageSession', JSON.stringify(data));
      navigate('/clarify');
    } else if (data.status === 'completed') {
      sessionStorage.setItem('triageResult', JSON.stringify(data));
      navigate('/result');
    } else {
      console.error('Unexpected triage result status', data);
      setError(t('error_generic'));
    }
  };

  const handleSubmit = async () => {
    if (text.trim().length < 3) return;
    setLoading(true);
    setError('');
    setIsDemo(false);

    // Normalize language to a supported backend code
    const supportedLangs = ['en', 'ur', 'ur-roman', 'ps'];
    const language = supportedLangs.includes(i18n.language)
      ? i18n.language
      : supportedLangs.find((l) => i18n.language?.startsWith(l)) || 'en';

    try {
      const { data } = await triageApi.start(text.trim(), language);
      handleResult(data);
    } catch (err) {
      console.warn('Backend unavailable, using demo triage mode', err);
      setIsDemo(true);
      try {
        const demoResult = analyzeSymptoms(text.trim(), language);
        handleResult(demoResult);
      } catch (demoErr) {
        console.error('Demo triage failed', demoErr);
        setError(t('error_generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <h1>{t('home.title')}</h1>
        <p>{t('home.subtitle')}</p>
      </div>

      <textarea
        className="textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('home.placeholder')}
        rows={6}
        autoFocus
        aria-label={t('home.type_symptoms')}
        style={{ fontSize: '1.1rem', lineHeight: 1.8 }}
      />

      {error && (
        <p style={{ color: 'var(--color-error)', marginTop: '8px', fontSize: '0.9rem' }}>
          {error}
        </p>
      )}

      <button
        className="btn btn-primary btn-block mt-lg"
        onClick={handleSubmit}
        disabled={loading || text.trim().length < 3}
      >
        {loading ? t('loading') : t('continue')}
      </button>

      {loading && <div className="spinner" />}
    </div>
  );
}

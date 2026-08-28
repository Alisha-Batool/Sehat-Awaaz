import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { triageApi } from '../services/api';
import { processDemoAnswer } from '../services/demoTriage';

export default function ClarifyingQuestion() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sessionData = JSON.parse(sessionStorage.getItem('triageSession') || '{}');
  const { sessionId, question, question_id, options, turn, max_turns, source } = sessionData;

  if (!question) {
    navigate('/home');
    return null;
  }

  const handleResult = (data) => {
    if (data.status === 'needs_clarification') {
      sessionStorage.setItem('triageSession', JSON.stringify(data));
      // Force re-render with new question
      window.location.reload();
    } else if (data.status === 'completed') {
      sessionStorage.setItem('triageResult', JSON.stringify(data));
      sessionStorage.removeItem('triageSession');
      navigate('/result');
    }
  };

  const handleAnswer = async (answer) => {
    setLoading(true);
    setError('');

    if (source === 'demo') {
      // Demo mode: process locally
      const result = processDemoAnswer(sessionData, answer, i18n.language);
      handleResult(result);
      setLoading(false);
      return;
    }

    // Real backend
    try {
      const { data } = await triageApi.clarify(sessionId, answer, question_id);
      handleResult(data);
    } catch {
      setError(t('error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <h1>{t('clarify.title')}</h1>
        <p>{t('clarify.subtitle')}</p>
        <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '4px' }}>
          {t('clarify.progress', { current: turn, max: max_turns })}
        </p>
      </div>

      <div className="card mb-md">
        <p style={{ fontSize: '1.2rem', fontWeight: 600, lineHeight: 1.5 }}>{question}</p>
      </div>

      {options && options.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {options.map((opt) => (
            <button
              key={opt.value}
              className="option-btn"
              onClick={() => handleAnswer(opt.value)}
              disabled={loading}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : (
        <input
          className="input"
          placeholder={t('transcript.placeholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value) handleAnswer(e.target.value);
          }}
          disabled={loading}
        />
      )}

      <button
        className="btn btn-ghost btn-block mt-md"
        onClick={() => handleAnswer('not_sure')}
        disabled={loading}
      >
        {t('clarify.not_sure')}
      </button>

      {error && <p style={{ color: 'var(--color-error)', marginTop: '8px' }}>{error}</p>}
      {loading && <div className="spinner" />}
    </div>
  );
}

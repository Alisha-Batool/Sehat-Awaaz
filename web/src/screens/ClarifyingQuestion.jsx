import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { triageApi } from '../services/api';
import { speakText } from '../services/browserSpeech';

export default function ClarifyingQuestion() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryAnswer, setRetryAnswer] = useState(null);

  const sessionData = JSON.parse(sessionStorage.getItem('triageSession') || '{}');
  const { sessionId, question, question_id, options, turn, max_turns } = sessionData;

  useEffect(() => {
    if (sessionStorage.getItem('voiceConversation') === 'true') {
      speakText(question, i18n.language);
    }
    return () => window.speechSynthesis?.cancel();
  }, [question, i18n.language]);

  if (!question) {
    navigate('/home');
    return null;
  }

  const handleResult = (data) => {
    if (data.status === 'needs_clarification') {
      sessionStorage.removeItem('triageResult');
      sessionStorage.setItem('triageSession', JSON.stringify(data));
      // Force re-render with new question
      window.location.reload();
    } else if (data.status === 'completed') {
      sessionStorage.setItem('triageResult', JSON.stringify(data));
      sessionStorage.removeItem('triageSession');
      navigate('/result');
    } else {
      setError(t('assessment_failed'));
    }
  };

  const handleAnswer = async (answer) => {
    setLoading(true);
    setError('');
    setRetryAnswer(null);

    // Real backend
    const requestStartedAt = performance.now();
    try {
      const { data } = await triageApi.clarify(sessionId, answer, question_id);
      if (!['needs_clarification', 'completed'].includes(data?.status)) {
        throw new Error('Unexpected triage response');
      }
      handleResult(data);
    } catch {
      setError(t('assessment_failed'));
      setRetryAnswer(answer);
    } finally {
      console.info(`[triage] clarification request completed in ${(performance.now() - requestStartedAt).toFixed(0)} ms`);
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <h1>{t('clarify.title')}</h1>
        <p>{t('clarify.subtitle')}</p>
        <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
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

      {!options?.some((opt) => opt.value === 'not_sure') && (
        <button
          className="btn btn-ghost btn-block mt-md"
          onClick={() => handleAnswer('not_sure')}
          disabled={loading}
        >
          {t('clarify.not_sure')}
        </button>
      )}

      {error && <p style={{ color: 'var(--color-error)', marginTop: '8px' }}>{error}</p>}
      {retryAnswer !== null && (
        <button
          className="btn btn-primary btn-block mt-md"
          onClick={() => handleAnswer(retryAnswer)}
          disabled={loading}
        >
          {t('try_again')}
        </button>
      )}
      {loading && <div className="spinner" />}
    </div>
  );
}

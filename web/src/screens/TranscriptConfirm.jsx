import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { triageApi } from '../services/api';

export default function TranscriptConfirm() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const transcript = sessionStorage.getItem('voiceTranscript');
    if (transcript) {
      setText(transcript);
    } else {
      navigate('/voice');
    }
  }, [navigate]);

  const handleResult = (data) => {
    if (data.status === 'needs_clarification') {
      sessionStorage.removeItem('triageResult');
      sessionStorage.setItem('triageSession', JSON.stringify(data));
      navigate('/clarify');
    } else if (data.status === 'completed') {
      sessionStorage.removeItem('triageSession');
      sessionStorage.setItem('triageResult', JSON.stringify(data));
      navigate('/result');
    } else {
      setError(t('assessment_failed'));
    }
  };

  const handleConfirm = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    sessionStorage.removeItem('triageSession');
    sessionStorage.removeItem('triageResult');

    const requestStartedAt = performance.now();
    try {
      const { data } = await triageApi.start(text.trim(), i18n.language);
      handleResult(data);
    } catch (requestError) {
      console.error('Triage assessment request failed', requestError.response?.status ?? 'network error');
      setError(t('assessment_failed'));
    } finally {
      console.info(`[triage] transcript request completed in ${(performance.now() - requestStartedAt).toFixed(0)} ms`);
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <h1>{t('transcript.title')}</h1>
        <p>{t('transcript.subtitle')}</p>
      </div>

      <textarea
        className="textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('transcript.placeholder')}
        rows={6}
        style={{ fontSize: '1.1rem', lineHeight: 1.8 }}
      />

      {error && <p role="alert" style={{ color: 'var(--color-error)', marginTop: '8px' }}>{error}</p>}

      <button
        className="btn btn-primary btn-block mt-lg"
        onClick={handleConfirm}
        disabled={loading || !text.trim()}
      >
        {loading ? t('loading') : t('transcript.confirm')}
      </button>

      <button className="btn btn-ghost btn-block mt-md" onClick={() => navigate('/voice')}>
        {t('transcript.retake')}
      </button>

      {loading && <div className="spinner" />}
    </div>
  );
}

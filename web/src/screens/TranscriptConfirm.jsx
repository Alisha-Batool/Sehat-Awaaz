import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { triageApi } from '../services/api';
import { analyzeSymptoms } from '../services/demoTriage';

export default function TranscriptConfirm() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

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
      sessionStorage.setItem('triageSession', JSON.stringify(data));
      navigate('/clarify');
    } else if (data.status === 'completed') {
      sessionStorage.setItem('triageResult', JSON.stringify(data));
      navigate('/result');
    }
  };

  const handleConfirm = async () => {
    if (!text.trim()) return;
    setLoading(true);

    try {
      const { data } = await triageApi.start(text.trim(), i18n.language);
      handleResult(data);
    } catch {
      // Backend unavailable — use demo mode
      console.warn('Backend unavailable, using demo triage mode');
      const demoResult = analyzeSymptoms(text.trim(), i18n.language);
      handleResult(demoResult);
    } finally {
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

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { triageApi } from '../services/api';
import { getSpeechLanguage } from '../services/browserSpeech';

export default function SymptomInput() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    sessionStorage.removeItem('voiceConversation');
    return () => recognitionRef.current?.abort();
  }, []);

  const toggleRecording = () => {
    setError('');
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError(t('voice.not_supported'));
      return;
    }

    const supportedLanguages = ['en', 'ur', 'ur-roman', 'ps'];
    const language = supportedLanguages.includes(i18n.language)
      ? i18n.language
      : [...supportedLanguages].sort((a, b) => b.length - a.length).find(
        (code) => i18n.language?.startsWith(`${code}-`)
      ) || 'en';
    const recognition = new SpeechRecognition();
    recognition.lang = getSpeechLanguage(language);
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const recognizedText = Array.from(event.results)
        .slice(event.resultIndex)
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript?.trim())
        .filter(Boolean)
        .join(' ');
      if (recognizedText) {
        setText((current) => `${current.trim()} ${recognizedText}`.trim());
      }
    };
    recognition.onerror = (event) => {
      const messages = {
        'not-allowed': t('voice.mic_denied'),
        'service-not-allowed': t('voice.mic_denied'),
        'audio-capture': t('voice.no_mic'),
        'no-speech': t('voice.no_speech'),
        'language-not-supported': t('voice.not_supported'),
      };
      if (event.error !== 'aborted') setError(messages[event.error] || t('error_generic'));
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try {
      sessionStorage.setItem('voiceConversation', 'true');
      recognition.start();
      setListening(true);
    } catch {
      setError(t('error_generic'));
      setListening(false);
    }
  };

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
      console.error('Unexpected triage result status', data);
      setError(t('assessment_failed'));
    }
  };

  const handleSubmit = async () => {
    if (text.trim().length < 3) return;
    setLoading(true);
    setError('');
    sessionStorage.removeItem('triageSession');
    sessionStorage.removeItem('triageResult');

    // Normalize language to a supported backend code
    const supportedLangs = ['en', 'ur', 'ur-roman', 'ps'];
    const language = supportedLangs.includes(i18n.language)
      ? i18n.language
      : supportedLangs.find((l) => i18n.language?.startsWith(l)) || 'en';

    const requestStartedAt = performance.now();
    try {
      const { data } = await triageApi.start(text.trim(), language);
      handleResult(data);
    } catch (err) {
      console.error('Triage assessment request failed', err.response?.status ?? 'network error');
      setError(t('assessment_failed'));
    } finally {
      console.info(`[triage] start request completed in ${(performance.now() - requestStartedAt).toFixed(0)} ms`);
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

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button className="btn btn-secondary" type="button" onClick={toggleRecording} disabled={loading}>
          {listening ? `⏹ ${t('voice.stop')}` : `🎙 ${t('voice.tap_to_speak')}`}
        </button>
      </div>
      <p className="text-muted mt-sm">{t('voice.privacy_notice')}</p>
      <p className="text-muted">{t('voice.files_unavailable')}</p>

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

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Map app language codes to Web Speech API BCP-47 tags
const SPEECH_LANG_MAP = {
  en: 'en-US',
  ur: 'ur-PK',
  'ur-roman': 'en-US', // Roman Urdu uses Latin script; English STT handles it
  pa: 'pa-IN',
  ps: 'ps-AF',
  sd: 'sd-PK',
};

export default function VoiceInput() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const appLang = i18n.language || localStorage.getItem('language') || 'en';
    const speechLang = SPEECH_LANG_MAP[appLang] || 'en-US';

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = speechLang;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript((prev) => {
        // Only prepend finalized text once; show interim in real-time
        const base = final ? prev + final : prev;
        return base;
      });
      // Store interim separately for display
      if (interim) {
        setInterimText(interim);
      } else {
        setInterimText('');
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      const errorMessages = {
        'no-speech': t('voice.no_speech') || 'No speech detected. Please try again.',
        'audio-capture': t('voice.no_mic') || 'No microphone found. Please check your mic.',
        'not-allowed': t('voice.mic_denied') || 'Microphone access denied. Please allow mic in browser settings.',
        'network': t('voice.network_error') || 'Network error. Please check your connection.',
        'aborted': '', // User stopped, not an error
      };
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setError(errorMessages[event.error] || t('error_generic'));
      }
      setListening(false);
      shouldListenRef.current = false;
    };

    recognition.onend = () => {
      // Auto-restart if user hasn't manually stopped
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch {
          setListening(false);
          shouldListenRef.current = false;
        }
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      try {
        recognition.abort();
      } catch {
        // ignore
      }
    };
  }, [i18n.language, t]);

  const [interimText, setInterimText] = useState('');

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setError('');

    if (listening) {
      shouldListenRef.current = false;
      recognitionRef.current.stop();
      setListening(false);
    } else {
      setTranscript('');
      setInterimText('');
      try {
        recognitionRef.current.start();
        shouldListenRef.current = true;
        setListening(true);
      } catch (err) {
        console.error('Failed to start recognition:', err);
        setError(t('error_generic'));
      }
    }
  }, [listening, t]);

  const handleContinue = () => {
    if (transcript.trim()) {
      sessionStorage.setItem('voiceTranscript', transcript.trim());
      navigate('/transcript');
    }
  };

  if (!supported) {
    return (
      <div className="screen">
        <div className="screen-header">
          <h1>{t('voice.tap_to_speak')}</h1>
        </div>
        <div className="card">
          <p>{t('voice.not_supported')}</p>
        </div>
        <button
          className="btn btn-secondary btn-block mt-lg"
          onClick={() => navigate('/symptoms')}
        >
          {t('home.type_symptoms')}
        </button>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h1>{listening ? t('voice.listening') : t('voice.tap_to_speak')}</h1>
      </div>

      <div
        className="flex-center"
        style={{ flexDirection: 'column', gap: '24px', margin: '32px 0' }}
      >
        <button
          onClick={toggleListening}
          className={listening ? 'pulse' : ''}
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            border: 'none',
            background: listening
              ? 'var(--color-emergency)'
              : 'var(--color-primary)',
            color: 'white',
            fontSize: '2.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.3s',
          }}
          aria-label={listening ? t('voice.stop') : t('voice.tap_to_speak')}
        >
          {listening ? '⏹' : '🎙️'}
        </button>

        {error && (
          <div
            className="card"
            style={{
              width: '100%',
              borderStart: '4px solid var(--color-emergency)',
              padding: '12px 16px',
            }}
          >
            <p style={{ color: 'var(--color-emergency)', margin: 0 }}>
              {error}
            </p>
          </div>
        )}

        {(transcript || interimText) && (
          <div className="card" style={{ width: '100%' }}>
            <p style={{ fontSize: '1.1rem', lineHeight: 1.6 }}>
              {transcript}
              {interimText && (
                <span style={{ opacity: 0.5, fontStyle: 'italic' }}>
                  {interimText}
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {!listening && transcript.trim() && (
        <button className="btn btn-primary btn-block" onClick={handleContinue}>
          {t('continue')}
        </button>
      )}

      <button className="btn btn-ghost btn-block mt-md" onClick={() => navigate('/home')}>
        {t('back')}
      </button>
    </div>
  );
}

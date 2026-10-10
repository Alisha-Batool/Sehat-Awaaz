import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  AudioLines,
  HeartPulse,
  Languages,
  MapPinned,
  Mic,
  MicOff,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/auth/AuthModal';

const WAVEFORM_BARS = 36;

function VoiceConsole() {
  const { t } = useTranslation();
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [levels, setLevels] = useState(() => Array(WAVEFORM_BARS).fill(0.12));
  const cleanupRef = useRef(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  const stopPreview = () => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setListening(false);
    setLevels(Array(WAVEFORM_BARS).fill(0.12));
  };

  const startPreview = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t('landing.mic_unsupported'));
      return;
    }

    let stream;
    let audioContext;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error(t('landing.mic_unsupported'));
      audioContext = new AudioContextClass();
      await audioContext.resume();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      const values = new Uint8Array(analyser.frequencyBinCount);
      let frameId;
      let lastUpdate = 0;

      const animate = (timestamp) => {
        analyser.getByteFrequencyData(values);
        if (timestamp - lastUpdate > 70) {
          setLevels(
            Array.from({ length: WAVEFORM_BARS }, (_, index) => {
              const bucket = Math.floor((index / WAVEFORM_BARS) * values.length);
              const level = values[bucket] / 255;
              return Math.min(1, Math.max(0.1, level * 2.8));
            })
          );
          lastUpdate = timestamp;
        }
        frameId = window.requestAnimationFrame(animate);
      };

      frameId = window.requestAnimationFrame(animate);
      cleanupRef.current = () => {
        window.cancelAnimationFrame(frameId);
        stream.getTracks().forEach((track) => track.stop());
        void audioContext.close();
      };
      setListening(true);
    } catch (micError) {
      stream?.getTracks().forEach((track) => track.stop());
      if (audioContext && audioContext.state !== 'closed') {
        void audioContext.close();
      }
      console.warn('Local microphone visualizer could not start', micError);
      setError(
        micError.name === 'NotAllowedError'
          ? t('landing.mic_denied')
          : micError.message || t('landing.mic_failed')
      );
    }
  };

  const togglePreview = () => {
    if (listening) {
      stopPreview();
    } else {
      void startPreview();
    }
  };

  return (
    <section className="voice-console" aria-labelledby="voice-console-title">
      <div className="voice-console-top">
        <div className="voice-console-brand">
          <span className="console-icon"><AudioLines size={18} /></span>
          <div>
            <h2 id="voice-console-title">{t('landing.console_title')}</h2>
            <p>{t('landing.console_subtitle')}</p>
          </div>
        </div>
        <span className="console-status">
          <span className={listening ? 'console-status-dot is-listening' : 'console-status-dot'} />
          {listening ? t('landing.listening') : t('landing.ready')}
        </span>
      </div>

      <div className={`voice-waveform${listening ? ' is-live' : ''}`} aria-hidden="true">
        {levels.map((level, index) => (
          <span
            key={index}
            style={{
              '--bar-level': `${Math.round(8 + level * 46)}px`,
              '--bar-delay': `${(index % 9) * 85}ms`,
            }}
          />
        ))}
      </div>

      <div className="voice-console-bottom">
        <div className="voice-console-prompt">
          <span className="console-prompt-dot" />
          <span>{listening ? t('landing.speak_prompt') : t('landing.try_prompt')}</span>
        </div>
        <button
          className={`mic-toggle${listening ? ' is-listening' : ''}`}
          type="button"
          onClick={togglePreview}
          aria-pressed={listening}
        >
          {listening ? <MicOff size={17} /> : <Mic size={17} />}
          {listening ? t('landing.stop_mic') : t('landing.try_mic')}
        </button>
      </div>
      {error && <p className="mic-error" role="alert">{error}</p>}
      <p className="voice-privacy-note">{t('landing.mic_privacy')}</p>
    </section>
  );
}

const CAPABILITIES = [
  { key: 'language', icon: Languages },
  { key: 'safety', icon: ShieldCheck },
  { key: 'care', icon: MapPinned },
];

export default function Home() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const isAuthenticated = Boolean(user && !user.isGuest);

  useEffect(() => {
    if (!location.state?.requireLogin) return;
    setAuthOpen(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const startTriage = () => {
    if (isAuthenticated) {
      navigate('/symptoms');
      return;
    }
    setAuthOpen(true);
  };

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-orb landing-orb-one" aria-hidden="true" />
        <div className="landing-orb landing-orb-two" aria-hidden="true" />
        <div className="landing-hero-grid" aria-hidden="true" />

        <div className="landing-content">
          <div className="landing-copy">
            <div className="landing-eyebrow">
              <span className="landing-eyebrow-icon"><Sparkles size={14} /></span>
              {t('landing.eyebrow')}
            </div>
            <h1>
              {t('landing.headline')}
              <span>{t('landing.headline_accent')}</span>
            </h1>
            <p className="landing-lede">{t('landing.description')}</p>

            <div className="landing-language-pills" aria-label={t('landing.languages_label')}>
              <span>English</span>
              <span>اردو</span>
              <span>Roman Urdu</span>
              <span>پښتو</span>
            </div>

            <div className="landing-actions">
              <button
                className="landing-primary-cta"
                type="button"
                onClick={startTriage}
              >
                {t('landing.start_triage')}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <Link className="landing-secondary-cta" to="/clinic-finder">
                {t('landing.find_care')}
                <MapPinned size={16} aria-hidden="true" />
              </Link>
            </div>
            <p className="landing-safety-note">
              <ShieldCheck size={15} aria-hidden="true" />
              {t('landing.not_diagnosis')}
            </p>
          </div>

          <div className="landing-console-wrap">
            <div className="console-glow" aria-hidden="true" />
            <VoiceConsole />
            <div className="console-footnote">
              <span className="console-footnote-icon"><HeartPulse size={15} /></span>
              <span>{t('landing.console_footer')}</span>
              <span className="console-metric">{t('landing.metric_label')}</span>
            </div>
          </div>
        </div>

        <a className="landing-scroll-hint" href="#capabilities">
          <ArrowDown size={14} aria-hidden="true" />
          {t('landing.explore')}
        </a>
      </section>

      <section id="capabilities" className="capabilities-section">
        <div className="capabilities-heading">
          <p className="section-kicker">{t('landing.capabilities_kicker')}</p>
          <h2>{t('landing.capabilities_title')}</h2>
          <p>{t('landing.capabilities_description')}</p>
        </div>
        <div className="capability-grid">
          {CAPABILITIES.map(({ key, icon: Icon }, index) => (
            <article className="capability-card" key={key}>
              <div className="capability-card-top">
                <span className="capability-icon"><Icon size={20} strokeWidth={1.8} /></span>
                <span className="capability-index">0{index + 1}</span>
              </div>
              <h3>{t(`landing.features.${key}.title`)}</h3>
              <p>{t(`landing.features.${key}.description`)}</p>
            </article>
          ))}
        </div>
      </section>
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => navigate('/symptoms')}
      />
    </div>
  );
}

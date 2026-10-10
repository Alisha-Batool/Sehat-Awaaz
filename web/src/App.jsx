import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import LanguageSelect from './screens/LanguageSelect';
import Onboarding from './screens/Onboarding';
import Home from './screens/Home';
import SymptomInput from './screens/SymptomInput';
import VoiceInput from './screens/VoiceInput';
import TranscriptConfirm from './screens/TranscriptConfirm';
import ClarifyingQuestion from './screens/ClarifyingQuestion';
import TriageResult from './screens/TriageResult';
import HomeCareGuidance from './screens/HomeCareGuidance';
import ClinicFinder from './screens/ClinicFinder';
import EmergencyAction from './screens/EmergencyAction';
import SessionHistory from './screens/SessionHistory';
import Disclaimer from './components/common/Disclaimer';
import SiteNav from './components/layout/SiteNav';

const RTL_LANGUAGES = new Set(['ur', 'ps']);

function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user || user.isGuest) {
    return <Navigate to="/" replace state={{ requireLogin: true, from: location }} />;
  }
  return <Outlet />;
}

function readSessionValue(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

function hasClarificationSession() {
  const session = readSessionValue('triageSession');
  return session?.status === 'needs_clarification'
    && session.source !== 'demo'
    && Boolean(session.sessionId && session.question && session.question_id);
}

function hasCompletedResult() {
  const result = readSessionValue('triageResult');
  return result?.status === 'completed'
    && result.source !== 'demo'
    && ['emergency', 'clinic', 'home_care'].includes(result.tier);
}

function RequireTriageStep({ step }) {
  const location = useLocation();
  const transcript = sessionStorage.getItem('voiceTranscript')?.trim();
  const hasTranscript = Boolean(transcript);
  const hasClarification = hasClarificationSession();
  const hasResult = hasCompletedResult();

  if (step === 'transcript' && !hasTranscript) {
    return <Navigate to="/voice" replace state={{ from: location }} />;
  }
  if (step === 'clarify' && !hasClarification) {
    return <Navigate to={hasResult ? '/result' : '/symptoms'} replace />;
  }
  if (step === 'result' && (!hasResult || hasClarification)) {
    return <Navigate to={hasClarification ? '/clarify' : '/symptoms'} replace />;
  }
  if (step === 'home-care') {
    const result = readSessionValue('triageResult');
    if (!hasResult || result.tier !== 'home_care' || !result.home_care) {
      return <Navigate to={hasResult ? '/result' : hasClarification ? '/clarify' : '/symptoms'} replace />;
    }
  }
  if (step === 'emergency') {
    const result = readSessionValue('triageResult');
    if (!hasResult || result.tier !== 'emergency') {
      return <Navigate to={hasResult ? '/result' : hasClarification ? '/clarify' : '/symptoms'} replace />;
    }
  }
  return <Outlet />;
}

export default function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const language = i18n.resolvedLanguage || i18n.language || 'en';
    const direction = RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr';

    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    localStorage.setItem('dir', direction);
  }, [i18n.language, i18n.resolvedLanguage]);

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-shell">
          <SiteNav />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/language" element={<LanguageSelect />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/home" element={<Home />} />
              <Route path="/clinic-finder" element={<ClinicFinder />} />
              <Route element={<RequireAuth />}>
                <Route path="/symptoms" element={<SymptomInput />} />
                <Route path="/voice" element={<VoiceInput />} />
                <Route path="/history" element={<SessionHistory />} />
                <Route element={<RequireTriageStep step="transcript" />}>
                  <Route path="/transcript" element={<TranscriptConfirm />} />
                </Route>
                <Route element={<RequireTriageStep step="clarify" />}>
                  <Route path="/clarify" element={<ClarifyingQuestion />} />
                </Route>
                <Route element={<RequireTriageStep step="result" />}>
                  <Route path="/result" element={<TriageResult />} />
                </Route>
                <Route element={<RequireTriageStep step="home-care" />}>
                  <Route path="/home-care" element={<HomeCareGuidance />} />
                </Route>
                <Route element={<RequireTriageStep step="emergency" />}>
                  <Route path="/emergency" element={<EmergencyAction />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Disclaimer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

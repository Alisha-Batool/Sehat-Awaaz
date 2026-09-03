import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from './contexts/AuthContext';
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
              <Route path="/" element={<LanguageSelect />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/home" element={<Home />} />
              <Route path="/symptoms" element={<SymptomInput />} />
              <Route path="/voice" element={<VoiceInput />} />
              <Route path="/transcript" element={<TranscriptConfirm />} />
              <Route path="/clarify" element={<ClarifyingQuestion />} />
              <Route path="/result" element={<TriageResult />} />
              <Route path="/home-care" element={<HomeCareGuidance />} />
              <Route path="/clinic-finder" element={<ClinicFinder />} />
              <Route path="/emergency" element={<EmergencyAction />} />
              <Route path="/history" element={<SessionHistory />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Disclaimer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

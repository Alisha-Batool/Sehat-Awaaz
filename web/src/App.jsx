import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <main style={{ flex: 1 }}>
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

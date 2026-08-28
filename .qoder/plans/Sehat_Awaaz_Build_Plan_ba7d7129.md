# Sehat Awaaz -- Full Build Plan (All Free Technologies)

## All-Free Technology Stack

| Layer | Technology | Cost | Rationale |
|---|---|---|---|
| Frontend | React + Vite + i18next | Free/OSS | Standard PWA stack, excellent i18n |
| Backend BFF | Node.js + Express | Free/OSS | Lightweight, huge ecosystem |
| NLU/Triage | Python + FastAPI | Free/OSS | Best NLP ecosystem, async support |
| LLM | Ollama (local) with Llama 3 / Mistral | Free/OSS | Runs locally, no API costs, good multilingual |
| Speech-to-Text | Web Speech API (browser) + Whisper fallback | Free | Browser-native for MVP; Whisper for server-side |
| Database | PostgreSQL | Free/OSS | Relational integrity, JSONB support |
| Maps | Leaflet + OpenStreetMap + Nominatim | Free/OSS | No API key needed, global coverage |
| Geocoding | Nominatim (OpenStreetMap) | Free | Reverse geocoding, no API key |
| Auth/OTP | Mock OTP (console log) for dev | Free | No SMS gateway cost; swap in production |
| OTP Storage | In-memory Map (dev) | Free | No Redis needed for development |
| Containerization | Docker + Docker Compose | Free/OSS | Consistent local dev environment |
| Version Control | Git + GitHub | Free | Standard |

## Project Structure (Monorepo)

```
HealthCare/
  backend/                          # Node.js BFF + Orchestrator
    package.json
    src/
      server.js                     # Express entry point
      config/
        index.js                    # Environment config
        database.js                 # PostgreSQL pool setup
      middleware/
        auth.js                     # JWT validation middleware
        rateLimiter.js              # Rate limiting
        errorHandler.js             # Global error handler
        validator.js                # Request validation
      routes/
        auth.routes.js              # POST /auth/send-otp, /auth/verify-otp
        triage.routes.js            # POST /triage/start, /triage/clarify, /triage/result
        sessions.routes.js          # GET /sessions, GET /sessions/:id, DELETE /sessions/:id
        facilities.routes.js        # GET /facilities/nearby
        emergency.routes.js         # GET /emergency/number, GET /emergency/guidance
      services/
        auth.service.js             # OTP generation, verification, JWT issuance
        session.service.js          # Session lifecycle management
        orchestrator.service.js     # Triage session orchestrator (calls Python NLU)
        nlu.client.js               # HTTP client to Python NLU service
        triage.service.js           # Rule engine + LLM reasoning coordination
        explanation.service.js      # Template-based explanation generation
        careNavigation.service.js   # Clinic/hospital directory queries
        emergency.service.js        # Emergency number lookup, escalation
        audit.service.js            # Immutable audit log writes
      models/
        user.model.js
        session.model.js
        triage.model.js
        rule.model.js
        auditLog.model.js
        facility.model.js
      db/
        migrations/
          001_initial_schema.sql
        seeds/
          red_flag_rules.sql
          emergency_numbers.sql
          facilities.sql
          question_bank.sql
          explanation_templates.sql
      utils/
        logger.js
        crypto.js
        constants.js
    .env.example

  nlu-service/                      # Python NLU + Triage Engine
    requirements.txt
    app/
      main.py                       # FastAPI entry point
      config.py                     # Settings
      routers/
        extraction.py               # POST /extract-symptoms
        triage.py                   # POST /triage-evaluate
        clarification.py            # POST /generate-question
      services/
        llm_client.py               # LLM wrapper (Ollama - local, free)
        symptom_extractor.py        # Structured extraction logic
        rule_engine.py              # Deterministic red-flag rule evaluator
        triage_engine.py            # Combined rule + LLM reasoning
        confidence.py               # Confidence estimation + default-to-caution
        clarification.py            # Question generation from template bank
      models/
        schemas.py                  # Pydantic schemas (symptom profile, triage result)
      data/
        red_flag_rules.json
        question_bank.json
        explanation_templates.json
        medical_glossary.json
    tests/
      test_rule_engine.py
      test_triage_engine.py
      test_extraction.py

  web/                              # React PWA
    package.json
    vite.config.js
    index.html
    public/
      manifest.json
      sw.js
      icons/
    src/
      main.jsx
      App.jsx
      i18n/
        index.js
        locales/
          en.json / ur.json / pa.json / ps.json / sd.json / ur-roman.json
      contexts/
        AuthContext.jsx
        LanguageContext.jsx
        SessionContext.jsx
      hooks/
        useAuth.js / useTriage.js / useGeolocation.js / useVoiceRecording.js
      components/
        common/
          Button.jsx / TierBadge.jsx / Disclaimer.jsx / LanguageSelector.jsx
          LoadingSpinner.jsx / ErrorBoundary.jsx / VoiceRecorder.jsx
        layout/
          AppLayout.jsx / RTLProvider.jsx
      screens/
        LanguageSelect.jsx / Onboarding.jsx / Home.jsx
        SymptomInput.jsx / VoiceInput.jsx / TranscriptConfirm.jsx
        ClarifyingQuestion.jsx / TriageResult.jsx
        HomeCareGuidance.jsx / ClinicFinder.jsx / EmergencyAction.jsx
        SessionHistory.jsx / SessionDetail.jsx / Settings.jsx / Account.jsx
      services/
        api.js / auth.api.js / triage.api.js / sessions.api.js
        facilities.api.js / emergency.api.js
      utils/
        emergencyFallback.js / rtl.js
      styles/
        globals.css / variables.css
    .env.example

  docker-compose.yml
  README.md
```

## Database Schema (PostgreSQL)

Key tables: `users` (id, phone, created_at), `sessions` (id, user_id nullable for guests, language, status, created_at), `triage_results` (id, session_id, tier, rule_id nullable, rationale, confidence, explanation, rule_version, model_version), `red_flag_rules` (id, version, conditions JSONB, tier, description, is_active, created_by, reviewed_by, created_at), `audit_logs` (id, session_id, action, input_hash, rule_path, output_tier, confidence, rule_version, model_version, created_at), `facilities` (id, name, type, province, district, lat, lng, phone, emergency_capable, last_verified), `emergency_numbers` (id, province, city, number, service_type), `question_bank` (id, symptom_category, question_text JSONB per language, options JSONB), `explanation_templates` (id, tier, template_key, text JSONB per language).

## Implementation Phases

### Phase 1: Project Scaffolding + Database
- Initialize monorepo with `backend/`, `nlu-service/`, `web/` directories
- Set up Node.js Express backend with middleware (CORS, helmet, rate limiter, error handler)
- Set up Python FastAPI NLU service with basic health check
- Initialize React + Vite PWA with i18n, RTL support, CSS variables
- Write PostgreSQL migration `001_initial_schema.sql` with all tables
- Create `docker-compose.yml` for local PostgreSQL (no cloud dependency)
- Seed initial data: red-flag rules, emergency numbers, sample facilities, question bank, explanation templates
- Wire up `.env.example` files for all services

### Phase 2: Authentication (SA-601, SA-104)
- **Backend:** `auth.service.js` -- OTP generation (6-digit, 5-min expiry), in-memory Map storage (no Redis needed), JWT issuance (access + refresh tokens)
- **Backend:** `auth.routes.js` -- `POST /api/auth/send-otp` (rate-limited, logs OTP to console), `POST /api/auth/verify-otp`, `POST /api/auth/refresh`
- **Backend:** `auth.middleware.js` -- JWT validation, guest session token support
- **Frontend:** `AuthContext`, `useAuth` hook, phone input + OTP verification screens
- **Frontend:** Guest mode entry (SA-104) -- anonymous token generation, clear messaging about non-persistence

### Phase 3: Core Triage Engine (SA-401, SA-301, SA-403, SA-404)
- **Python:** `schemas.py` -- Pydantic models for `SymptomProfile`, `TriageResult`
- **Python:** `llm_client.py` -- Ollama API client (localhost:11434), supports Llama 3 / Mistral models
- **Python:** `rule_engine.py` -- Deterministic red-flag rule evaluator, loads from DB/JSON
- **Python:** `symptom_extractor.py` -- Call local Ollama with structured extraction prompt, validate against Pydantic schema
- **Python:** `triage_engine.py` -- Rule engine first, then LLM reasoning layer if no rule fires, default-to-caution logic
- **Python:** `confidence.py` -- Confidence estimation, threshold-based rounding up
- **Python:** `test_rule_engine.py` -- Clinical red-flag test suite (SA-406)
- **Backend:** `nlu.client.js` -- HTTP client to Python NLU endpoints
- **Backend:** `orchestrator.service.js` -- Full session orchestration

### Phase 4: Frontend Core Flow (SA-101, SA-201, SA-202, SA-204, SA-303, SA-501)
- **Frontend:** `LanguageSelect` -- Language list in native scripts, persist selection, RTL detection
- **Frontend:** `Onboarding` -- "How this works" explainer with disclaimer
- **Frontend:** `Home` -- Entry screen with voice + text input options
- **Frontend:** `SymptomInput` -- Chat-style text input, RTL support, localized placeholders
- **Frontend:** `VoiceRecorder` + `VoiceInput` -- Uses Web Speech API (free, browser-native), tap-to-talk with recording state
- **Frontend:** `TranscriptConfirm` -- Editable transcript review before submission
- **Frontend:** `ClarifyingQuestion` -- Multiple-choice + "not sure" option, progress indicator, max 4 turns
- **Frontend:** `TriageResult` -- Tier badge (color + icon), plain-language explanation, persistent disclaimer
- Wire up the full flow: Language -> Home -> Input -> Confirm -> Clarify (loop) -> Result

### Phase 5: Triage Result Screens (SA-502, SA-503, SA-505, SA-506, SA-507)
- **Frontend:** `HomeCareGuidance` -- Green tier self-care + red-flag watch list
- **Frontend:** `ClinicFinder` -- Yellow tier, Leaflet + OpenStreetMap for map/list of nearby facilities with distance sort
- **Frontend:** `EmergencyAction` -- Red tier, one-tap dial button, "what to do while waiting" content, calm design
- **Backend:** `emergency.service.js` -- Regional emergency number lookup from DB
- **Backend:** `careNavigation.service.js` -- Facility queries with Nominatim geocoding, distance sorting
- **Frontend:** `emergencyFallback.js` -- Client-side offline emergency dialer (SA-507)

### Phase 6: Session History + Account (SA-602, SA-603)
- **Backend:** `session.routes.js` -- List sessions, get detail, delete session, delete account
- **Frontend:** `SessionHistory` -- Sorted list of past triage sessions
- **Frontend:** `SessionDetail` -- Full result view for past sessions
- **Frontend:** `Account` -- Self-serve account + history deletion (SA-603)

### Phase 7: Clarification + Explanation + Audit (SA-302, SA-405, SA-702)
- **Python:** `clarification.py` -- Question generation from template bank, completeness checking
- **Backend:** `explanation.service.js` -- Template-based explanation per language/tier
- **Backend:** `audit.service.js` -- Immutable audit log writes for every triage decision

### Phase 8: i18n + RTL + Accessibility (SA-102, SA-803, SA-804, SA-701)
- **Frontend:** Complete locale files (en, ur, pa, ps, sd, ur-roman)
- **Frontend:** `RTLProvider` -- CSS logical properties, RTL layout mirroring
- **Frontend:** Screen reader labels, ARIA attributes, 44x44px touch targets, scalable fonts
- **Frontend:** `Disclaimer` component on every triage output (SA-701)

### Phase 9: PWA + Offline + Performance (SA-801, SA-802)
- **Frontend:** Service worker for offline caching
- **Frontend:** PWA manifest with install prompt
- **Frontend:** Asset optimization -- code splitting, lazy loading
- **Frontend:** Graceful degradation on 3G

### Phase 10: Rule Governance + Safety (SA-402, SA-703, SA-704)
- **Backend:** Rule set versioning endpoints, rollback capability
- **Backend:** Clinical review/approval workflow stubs for rule changes
- **Backend:** Mental health crisis language detection + redirect (SA-704)
- **Backend:** Incident response workflow stubs (SA-703)

## Key Technical Decisions
- **Ollama (local LLM)** running Llama 3 or Mistral -- 100% free, runs on your machine, no API keys needed; abstracted behind `llm_client.py` for easy provider swap later
- **Web Speech API** for browser-native voice-to-text (free, built into Chrome/Edge); no paid ASR vendor needed for MVP
- **Leaflet + OpenStreetMap** for maps and clinic finder -- no API key, no cost, works globally
- **Nominatim (OpenStreetMap)** for geocoding -- free reverse geocoding, no API key
- **Mock OTP** -- OTP printed to server console during development (no SMS gateway cost); architecture supports plugging in a real provider later
- **In-memory Map** for OTP storage during development (no Redis dependency)
- **PostgreSQL** as the only database (free, powerful, JSONB for flexible rule/template storage)
- **Docker Compose** for one-command local development setup (PostgreSQL + backend + NLU service)
- **JWT auth** with short-lived access tokens (15 min) + refresh tokens (7 days); guest tokens for anonymous sessions
- **All triage safety logic server-side** -- client is thin, no safety-critical decisions on the client
- **Zero monthly cost** -- everything runs locally or uses free/open-source tools with no paid API dependencies
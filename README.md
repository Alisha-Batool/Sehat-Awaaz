# Sehat Awaaz

A voice-first healthcare triage platform designed for Pakistan. Helps users understand symptom urgency through guided conversations in local languages (Urdu, Punjabi, Pashto, Sindhi, English, Roman Urdu).

## Architecture

- **web/** — React PWA (frontend)
- **backend/** — Node.js/Express BFF (API gateway + orchestrator)
- **nlu-service/** — Python/FastAPI (NLU + triage engine + Ollama LLM)
- **PostgreSQL** — Primary database

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- Ollama (https://ollama.ai) — free local LLM

### 1. Start the database
```bash
docker-compose up -d
```

### 2. Start the backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### 3. Start the NLU service
```bash
cd nlu-service
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn app.main:app --reload --port 8001
```

### 4. Start the web app
```bash
cd web
npm install
cp .env.example .env
npm run dev
```

### 5. Pull an Ollama model
```bash
ollama pull llama3.1
```

## Tech Stack (All Free/Open Source)

| Layer | Technology |
|---|---|
| Frontend | React + Vite + i18next |
| Backend | Node.js + Express |
| NLU/Triage | Python + FastAPI + Ollama |
| Database | PostgreSQL |
| Maps | Leaflet + OpenStreetMap |
| Speech | Web Speech API |
| Auth | Mock OTP (dev) + JWT |

## License

Private — For educational purposes.

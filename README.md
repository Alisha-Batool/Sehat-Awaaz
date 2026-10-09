# Sehat Awaaz

A voice-first healthcare triage platform designed for Pakistan. Helps users understand symptom urgency through guided conversations in local languages (Urdu, Punjabi, Pashto, Sindhi, English, Roman Urdu).

## Architecture

- **web/** — React PWA (frontend)
- **backend/** — Node.js/Express BFF (API gateway + orchestrator)
- **nlu-service/** — Python/FastAPI (NLU + triage engine + Ollama LLM)
- **MongoDB** — Application database (local MongoDB service)

### Nearby healthcare facilities
After receiving a triage result, users can optionally search for nearby hospitals and clinics. Location permission is requested only when the user chooses to use their current location; city/address search is also available. Google Maps JavaScript API displays the map and Google Places API (New) finds facilities; facility search is separate from triage and does not change the recommended level of care.

To enable maps, create a Google Cloud project, enable billing, and enable **Maps JavaScript API**, **Places API (New)**, and **Geocoding API**. Create an API key restricted to those APIs and to the app's HTTP referrers (for local development, `http://localhost:5173/*`; add your deployed domain before production). Add the key to `web/.env.local` as `VITE_GOOGLE_MAPS_API_KEY=...`, then restart Vite. Vite exposes this key to the browser, so the HTTP-referrer and API restrictions are required; do not commit the key. The map uses Google's demo Map ID by default; set `VITE_GOOGLE_MAP_ID` if you create a production Map ID.

Google setup references: [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript), [Nearby Search (New)](https://developers.google.com/maps/documentation/javascript/nearby-search), [Geocoding](https://developers.google.com/maps/documentation/javascript/geocoding), and [pricing](https://mapsplatform.google.com/pricing/).

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+ (a project virtual environment is used by the one-command launcher)
- MongoDB (running locally, or configured with `MONGODB_URI`)
- Ollama (https://ollama.ai) — free local LLM
- Docker & Docker Compose (optional; only needed for the retained PostgreSQL legacy database)

### First-time setup (Windows PowerShell)
Install the dependencies once:
```powershell
npm install
npm --prefix backend install
npm --prefix web install
.\nlu-service\.venv\Scripts\python.exe -m pip install -r nlu-service\requirements.txt
```

If this is a fresh checkout, create the Python environment first with `py -m venv nlu-service\.venv`. Copy each `.env.example` to `.env` only when that service does not already have its own `.env`; do not overwrite existing local settings. Google Maps is optional and needs a restricted key in `web\.env.local`.

### Start everything
From the repository root, run:
```powershell
npm run dev
```

This starts the backend, NLU service, and frontend together in the same terminal. The backend connects to MongoDB before listening; ensure the MongoDB service is running and configure `MONGODB_URI` in `backend/.env` if the default `mongodb://127.0.0.1:27017/sehat_awaaz` is not appropriate. Press **Ctrl+C** to stop the app services. PostgreSQL remains available as an optional legacy service through `npm run db:up` and `npm run db:down`; it is not required by the application launcher.

The web app is at http://localhost:5173, the backend health endpoint is http://localhost:5000/api/health, and the NLU API docs are at http://localhost:8001/docs.

To download the local Ollama model once, run `ollama pull llama3.1`.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + i18next |
| Backend | Node.js + Express |
| NLU/Triage | Python + FastAPI + Ollama |
| Database | MongoDB |
| Maps and facilities | Google Maps JavaScript API + Places API (New) |
| Speech | Web Speech API |
| Auth | Mock OTP (dev) + JWT |

## License

Private — For educational purposes.

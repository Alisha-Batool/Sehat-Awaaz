from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import extraction, triage, clarification
from app.config import ENV

app = FastAPI(
    title="Sehat Awaaz NLU Service",
    description="NLU, Triage, and Clarification engine powered by Ollama",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if ENV == "development" else ["http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(extraction.router, prefix="/api")
app.include_router(triage.router, prefix="/api")
app.include_router(clarification.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "sehat-awaaz-nlu"}

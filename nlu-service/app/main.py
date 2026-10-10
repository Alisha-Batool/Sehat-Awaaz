from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
import logging
import time
from app.routers import extraction, triage, clarification
from app.config import ENV
from app.services.llm_client import close_client

app = FastAPI(
    title="Sehat Awaaz NLU Service",
    description="NLU, Triage, and Clarification engine powered by Ollama",
    version="0.1.0",
)
request_logger = logging.getLogger("uvicorn.error")


@app.middleware("http")
async def log_request_timing(request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        request_logger.info(
            "NLU request path=%s status=%s elapsed_ms=%.1f",
            request.url.path,
            response.status_code,
            (time.perf_counter() - started) * 1000,
        )
    return response

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


@app.on_event("shutdown")
async def shutdown_http_client():
    await close_client()


@app.get("/")
async def root():
    return {"service": "Sehat Awaaz NLU", "docs": "/docs"}


@app.get("/favicon.ico")
async def favicon():
    return JSONResponse(content={}, status_code=204)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "sehat-awaaz-nlu"}

"""
LLM client for Ollama (local, free, open-source).
Handles all communication with the locally-running Ollama instance.
"""

import httpx
import logging
import time

from app.config import OLLAMA_BASE_URL, OLLAMA_MODEL

logger = logging.getLogger("uvicorn.error")
OLLAMA_REQUEST_TIMEOUT_SECONDS = 300.0
_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=OLLAMA_REQUEST_TIMEOUT_SECONDS)
    return _client


async def close_client() -> None:
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
    _client = None


async def chat(
    prompt: str,
    system: str = "",
    response_format: str = "json",
) -> str:
    """
    Send a chat completion request to Ollama.

    Args:
        prompt: The user prompt.
        system: System prompt for context.
        response_format: 'json' to request JSON output.

    Returns:
        The model's response text.
    """

    messages = []

    if system:
        messages.append({
            "role": "system",
            "content": system,
        })

    messages.append({
        "role": "user",
        "content": prompt,
    })

    payload = {
        "model": OLLAMA_MODEL,
        # Keep the 8B model resident across ordinary idle periods. Reloading it
        # on a CPU-only host costs most of the request's 120-second budget.
        "keep_alive": "1h",
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": 0.1,
            "num_predict": 160,
        },
    }

    if response_format == "json":
        payload["format"] = "json"

    started = time.perf_counter()
    try:
        response = await _get_client().post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json=payload,
        )
    except httpx.TimeoutException:
        logger.error(
            "Ollama request timed out model=%s elapsed_ms=%.1f timeout_seconds=%.0f",
            OLLAMA_MODEL,
            (time.perf_counter() - started) * 1000,
            OLLAMA_REQUEST_TIMEOUT_SECONDS,
        )
        raise

    response.raise_for_status()

    result = response.json()
    logger.info(
        "Ollama request complete model=%s elapsed_ms=%.1f load_ms=%.1f prompt_eval_ms=%.1f eval_ms=%.1f prompt_tokens=%s cached_prompt_tokens=%s generated_tokens=%s",
        OLLAMA_MODEL,
        (time.perf_counter() - started) * 1000,
        result.get("load_duration", 0) / 1e6,
        result.get("prompt_eval_duration", 0) / 1e6,
        result.get("eval_duration", 0) / 1e6,
        result.get("prompt_eval_count", 0),
        result.get("prompt_eval_cached_count", 0),
        result.get("eval_count", 0),
    )

    return result["message"]["content"]


async def is_available() -> bool:
    """Check if Ollama is running and accessible."""

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{OLLAMA_BASE_URL}/api/tags"
            )

            return response.status_code == 200

    except Exception:
        return False

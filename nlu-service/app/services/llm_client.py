"""
LLM client for Ollama (local, free, open-source).
Handles all communication with the locally-running Ollama instance.
"""

import httpx
import json
from app.config import OLLAMA_BASE_URL, OLLAMA_MODEL


async def chat(prompt: str, system: str = "", response_format: str = "json") -> str:
    """
    Send a chat completion request to Ollama.

    Args:
        prompt: The user prompt
        system: System prompt for context
        response_format: 'json' to request JSON output

    Returns:
        The model's response text
    """
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": 0.1,  # Low temperature for medical triage consistency
            "num_predict": 2000,
        },
    }

    if response_format == "json":
        payload["format"] = "json"

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json=payload,
        )
        response.raise_for_status()
        result = response.json()
        return result["message"]["content"]


async def is_available() -> bool:
    """Check if Ollama is running and accessible."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            return response.status_code == 200
    except Exception:
        return False

"""One-off helper: prime Ollama's prompt cache with the exact extraction
system prompt used by the NLU service, so subsequent NLU extraction calls
only need to evaluate the short user text (this CPU runs llama3.1 at ~1 tok/s).
"""
import asyncio
import sys
import time

sys.path.insert(0, r"c:\Users\MIAN ZAIN\OneDrive\Desktop\HealthCare\nlu-service")

from app.services.symptom_extractor import EXTRACTION_SYSTEM_PROMPT

import httpx


async def main():
    payload = {
        "model": "llama3.1",
        "messages": [
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": "ok"},
        ],
        "stream": False,
        "options": {"num_predict": 1},
    }
    t0 = time.time()
    async with httpx.AsyncClient(timeout=900.0) as client:
        r = await client.post("http://localhost:11434/api/chat", json=payload)
        r.raise_for_status()
        d = r.json()
    print(f"prime wall time: {time.time() - t0:.1f}s")
    print(f"prompt_eval: {d.get('prompt_eval_count')} tokens in {d.get('prompt_eval_duration', 0) / 1e9:.1f}s "
          f"({d.get('prompt_eval_count', 0) / max(d.get('prompt_eval_duration', 1) / 1e9, 0.001):.2f} tok/s)")


asyncio.run(main())

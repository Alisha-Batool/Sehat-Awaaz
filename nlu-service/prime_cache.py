"""One-off helper: prime Ollama's prompt cache with the exact system prompts
used by the NLU service (symptom extraction + triage evaluation), so subsequent
NLU calls only need to evaluate the short user text. This CPU (2-core i5)
runs llama3.1 at ~1-2.5 tok/s, so cold prompt evaluation can exceed the NLU's
120s httpx timeout. keep_alive keeps the model (and KV cache) resident for 1h.
"""
import asyncio
import sys
import time

sys.path.insert(0, r"c:\Users\MIAN ZAIN\OneDrive\Desktop\HealthCare\nlu-service")

from app.services.symptom_extractor import EXTRACTION_SYSTEM_PROMPT
from app.services.triage_engine import TRIAGE_SYSTEM_PROMPT

import httpx

OLLAMA_URL = "http://localhost:11434/api/chat"


async def prime(client, name, system):
    payload = {
        "model": "llama3.1",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": "ok"},
        ],
        "stream": False,
        "keep_alive": "1h",
        "options": {"num_predict": 1},
    }
    t0 = time.time()
    r = await client.post(OLLAMA_URL, json=payload)
    r.raise_for_status()
    d = r.json()
    print(f"[{name}] wall {time.time() - t0:.1f}s | prompt_eval {d.get('prompt_eval_count')} tokens "
          f"in {d.get('prompt_eval_duration', 0) / 1e9:.1f}s", flush=True)


async def main():
    async with httpx.AsyncClient(timeout=1800.0) as client:
        await prime(client, "extraction", EXTRACTION_SYSTEM_PROMPT)
        await prime(client, "triage", TRIAGE_SYSTEM_PROMPT)
    print("PRIME DONE", flush=True)


asyncio.run(main())

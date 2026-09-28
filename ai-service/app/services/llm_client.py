"""Thin wrapper around the Groq API (via openai-compatible client).
Isolated here so callers never touch API-key handling directly,
and so the provider can be swapped via environment variables."""

import re
import threading
import time

from app.config import LLM_API_KEY, LLM_MODEL, HAS_LLM, LLM_BASE_URL, LLM_MAX_TOKENS, LLM_MAX_ATTEMPTS, LLM_MAX_RETRY_WAIT

_client = None

# Fail fast on 429s for the prototype profile: a throttled page falls back to
# rule-based extraction (still yields name/location/website PARTIALs) instead
# of sleeping ~40s per attempt. Full wait chain ≈ 12s, not ~80s+.

# At most this many LLM calls in flight at once. complete_json runs in worker
# threads (see extractor's asyncio.to_thread), so this must be a *threading*
# semaphore, not an asyncio one. Groq's free tier is 8000 TPM and a
# full-window extract costs ~3-5k tokens, so unbounded parallel extracts
# (backend runs 4-way) collide into 429 storms; 2 cuts the storm while
# retries absorb the rest.
_LLM_SEMAPHORE = threading.Semaphore(2)


def _rate_limit_wait(exc) -> float:
    """Seconds to wait after a 429, honoring server hints when present."""
    try:
        header = exc.response.headers.get("retry-after")
        if header:
            return min(float(header), LLM_MAX_RETRY_WAIT)
    except Exception:  # noqa: BLE001
        pass
    # Groq errors embed e.g. "Please try again in 27.7575s."
    match = re.search(r"try again in ([\d.]+)s", str(exc))
    if match:
        return min(float(match.group(1)), LLM_MAX_RETRY_WAIT)
    return LLM_MAX_RETRY_WAIT


def get_client():
    global _client
    if not HAS_LLM:
        return None
    if _client is None:
        from openai import OpenAI
        _client = OpenAI(
            api_key=LLM_API_KEY,
            base_url=LLM_BASE_URL,
        )
    return _client


def complete_json(system_prompt: str, user_content: str) -> str:
    """Returns the raw text of the model's response. Caller is responsible
    for JSON-parsing and validating it - the AI service never assumes the
    LLM's output is safe to use as-is."""
    client = get_client()
    if client is None:
        raise RuntimeError("LLM not configured")

    from openai import RateLimitError

    # Rate limits (429) are transient: retry with a capped backoff instead of
    # immediately degrading to rule-based extraction. Runs under a threading
    # semaphore (this function executes in worker threads) to limit how many
    # LLM calls are in flight at once.
    with _LLM_SEMAPHORE:
        for attempt in range(max(1, LLM_MAX_ATTEMPTS)):
            try:
                response = client.chat.completions.create(
                    model=LLM_MODEL,
                    # Prototype default 1500: company name/location/website live
                    # early in listicles; 4000-token outputs cost 2x TPM.
                    max_tokens=LLM_MAX_TOKENS,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content},
                    ],
                    temperature=0.1,
                )
                return response.choices[0].message.content or ""
            except RateLimitError as exc:
                if attempt == max(1, LLM_MAX_ATTEMPTS) - 1:
                    raise
                time.sleep(_rate_limit_wait(exc))

    raise RuntimeError("unreachable")

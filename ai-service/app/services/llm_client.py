"""Thin wrapper around the Groq API (via openai-compatible client).
Isolated here so callers never touch API-key handling directly,
and so the provider can be swapped via environment variables."""

from app.config import LLM_API_KEY, LLM_MODEL, HAS_LLM, LLM_BASE_URL

_client = None


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
    for JSON-parsing and validating it — the AI service never assumes the
    LLM's output is safe to use as-is."""
    client = get_client()
    if client is None:
        raise RuntimeError("LLM not configured")

    response = client.chat.completions.create(
        model=LLM_MODEL,
        max_tokens=1000,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        temperature=0.1,
    )
    return response.choices[0].message.content or ""

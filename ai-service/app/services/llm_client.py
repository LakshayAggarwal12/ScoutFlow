"""Thin wrapper around the Anthropic API. Isolated here so callers never
touch API-key handling directly, and so the provider can be swapped later."""

from app.config import LLM_API_KEY, LLM_MODEL, HAS_LLM

_client = None


def get_client():
    global _client
    if not HAS_LLM:
        return None
    if _client is None:
        from anthropic import Anthropic
        _client = Anthropic(api_key=LLM_API_KEY)
    return _client


def complete_json(system_prompt: str, user_content: str) -> str:
    """Returns the raw text of the model's response. Caller is responsible
    for JSON-parsing and validating it — the AI service never assumes the
    LLM's output is safe to use as-is."""
    client = get_client()
    if client is None:
        raise RuntimeError("LLM not configured")

    response = client.messages.create(
        model=LLM_MODEL,
        max_tokens=1000,
        system=system_prompt,
        messages=[{"role": "user", "content": user_content}],
    )
    parts = [b.text for b in response.content if getattr(b, "type", None) == "text"]
    return "".join(parts)

import asyncio
import os

# Load ai-service/.env manually (no dotenv here).
_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(_env_path):
    for _line in open(_env_path, encoding="utf-8"):
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

os.environ.setdefault("LLM_MODEL", "qwen/qwen3.8-27b")

from openai import AsyncOpenAI  # noqa: E402

client = AsyncOpenAI(
    api_key=os.environ["LLM_API_KEY"],
    base_url=os.environ.get("LLM_BASE_URL", "https://api.groq.com/openai/v1"),
)

# ~3000-token prompt to probe TPM limits per model.
PROMPT = (
    "Extract entities as JSON. Context: "
    + ("Indian AI startup list with founders, locations, websites and funding rounds. " * 200)
    + '\nReturn {"records":[]} as JSON only.'
)


async def one(model: str):
    try:
        r = await client.chat.completions.create(
            model=model, max_tokens=600, messages=[{"role": "user", "content": PROMPT}]
        )
        return f"{model}: OK (usage={r.usage.total_tokens})"
    except Exception as e:
        return f"{model}: {str(e)[:260]}"


async def main():
    models = ["qwen/qwen3.8-27b", "openai/gpt-oss-20b", "openai/gpt-oss-120b"]
    # Bigger burst with bigger payloads to reveal TPM ceilings per model.
    big = PROMPT + ("Extra context paragraph about funding rounds and team growth. " * 150)
    for m in models:
        jobs = [one_big(m, big) for _ in range(7)]
        res = await asyncio.gather(*jobs)
        print(f"--- {m} ---")
        for line in res:
            print(line)


async def one_big(model: str, prompt: str):
    try:
        r = await client.chat.completions.create(
            model=model, max_tokens=800, messages=[{"role": "user", "content": prompt}]
        )
        return f"OK (usage={r.usage.total_tokens})"
    except Exception as e:
        return f"FAIL: {str(e)[:260]}"


if __name__ == "__main__":
    asyncio.run(main())

import os
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("PORT", "8000"))
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "openai/gpt-oss-120b")
# Groq's OpenAI-compatible base URL. Override with any OpenAI-compatible provider.
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1")
HAS_LLM = bool(LLM_API_KEY)
# FAST prototype profile: smaller windows/tokens trade a little depth
# (founders/funding detail) for ~2x throughput on the 8000 TPM free tier.
# Raise for deeper production runs.
LLM_EXTRACT_WINDOW = int(os.getenv("LLM_EXTRACT_WINDOW", "6000"))
LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "1500"))
LLM_MAX_ATTEMPTS = int(os.getenv("LLM_MAX_ATTEMPTS", "2"))
LLM_MAX_RETRY_WAIT = float(os.getenv("LLM_MAX_RETRY_WAIT", "12"))

import asyncio
import json
import logging
import re

from app.config import HAS_LLM
from app.prompts.requirement_prompt import REQUIREMENT_SYSTEM_PROMPT
from app.services.llm_client import complete_json
from app.models.task import StructuredRequirement

logger = logging.getLogger("scoutflow.requirement")

FIELD_ALIASES = {
    "company": "company_name",
    "company name": "company_name",
    "role": "role",
    "position": "role",
    "title": "role",
    "location": "location",
    "salary": "salary",
    "stipend": "salary",
    "pay": "salary",
    "posting date": "posting_date",
    "date posted": "posting_date",
    "posted date": "posting_date",
    "date": "posting_date",
    "application url": "application_url",
    "url": "application_url",
    "apply link": "application_url",
    "link": "application_url",
}

KNOWN_LOCATIONS = [
    "india", "bangalore", "bengaluru", "hyderabad", "pune", "mumbai",
    "delhi", "gurugram", "gurgaon", "noida", "chennai", "remote",
]


def _rule_based_parse(prompt: str) -> dict:
    """Deterministic fallback used when no LLM API key is configured, so the
    prototype always produces a usable structured requirement."""
    text = prompt.lower()

    limit_match = re.search(r"\b(\d{1,3})\b", text)
    limit = int(limit_match.group(1)) if limit_match else 50
    limit = min(max(limit, 1), 200)

    days_match = re.search(r"last\s+(\d{1,2})\s+days?", text)
    if days_match:
        date_range = {"type": "relative", "days": int(days_match.group(1))}
    else:
        date_range = {"type": "any"}

    location = None
    for loc in KNOWN_LOCATIONS:
        if loc in text:
            location = loc.title() if loc != "india" else "India"
            break

    fields = []
    for alias, canonical in FIELD_ALIASES.items():
        if alias in text and canonical not in fields:
            fields.append(canonical)
    if not fields:
        fields = ["company_name", "role", "location", "application_url"]

    entity = "job" if any(w in text for w in ["job", "internship", "intern", "role", "position"]) else "record"

    keyword_candidates = re.findall(
        r"\b(ai|ml|machine learning|backend|frontend|full[- ]stack|data science|genai|generative ai|devops|cloud|security)\b",
        text,
    )
    keywords = sorted(set(k.strip() for k in keyword_candidates)) or ["internship"]
    if entity == "job" and "internship" not in " ".join(keywords):
        if "intern" in text:
            keywords.append("internship")

    return {
        "entity": entity,
        "keywords": keywords,
        "location": location,
        "date_range": date_range,
        "limit": limit,
        "fields": fields,
    }


# Identifier field per entity kind. A record without its identifier is
# unnameable (cannot be deduped or presented), so it is enforced
# deterministically here regardless of what the LLM chose.
_IDENTIFIER_BY_ENTITY = {
    "company": "company_name",
    "startup": "company_name",
    "business": "company_name",
    "job": "role",
    "person": "name",
    "lead": "name",
}


def ensure_identifier_field(requirement: dict) -> dict:
    """Guarantee fields starts with the entity's identifier field."""
    entity = str(requirement.get("entity") or "").lower()
    fields = list(requirement.get("fields") or [])
    identifier = None
    for key, field in _IDENTIFIER_BY_ENTITY.items():
        if key in entity:
            identifier = field
            break
    if identifier and identifier not in fields:
        fields.insert(0, identifier)
    if not fields:
        fields = ["company_name"]
    requirement["fields"] = fields
    return requirement


async def parse_requirement(prompt: str) -> dict:
    if HAS_LLM:
        try:
            # Blocking Groq call runs in a thread so the event loop stays free
            # for concurrent /ai/extract requests.
            raw = await asyncio.to_thread(complete_json, REQUIREMENT_SYSTEM_PROMPT, prompt)
            data = json.loads(raw)
            # Re-validate against the Pydantic model before returning.
            validated = StructuredRequirement(**data)
            return ensure_identifier_field(validated.model_dump())
        except Exception as exc:  # noqa: BLE001
            # Any LLM/parsing failure falls back to the deterministic parser
            # rather than failing the whole task - but it is logged, so a
            # silent fallback never masquerades as a good AI parse.
            logger.warning("LLM requirement parsing failed (%s); using rule-based parser", exc)

    data = _rule_based_parse(prompt)
    validated = StructuredRequirement(**data)
    return ensure_identifier_field(validated.model_dump())

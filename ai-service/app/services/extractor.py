import asyncio
import json
import logging
import re

from app.config import HAS_LLM, LLM_EXTRACT_WINDOW
from app.prompts.extraction_prompt import EXTRACTION_SYSTEM_PROMPT
from app.services.llm_client import complete_json

logger = logging.getLogger("scoutflow.extractor")

# Simple line-based fallback: our demo/HTTP collector content is formatted as
# one value per line ("Role\nCompany\nLocation\nSalary\nPosted ...\nApply: url"),
# which is common for job listing snippets. This keeps the service usable
# with zero external LLM calls, matching "do not call the LLM unnecessarily".
LINE_HINTS = {
    "role": 0,
    "company_name": 1,
    "location": 2,
    "salary": 3,
}

_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


def _strip_fences(text: str) -> str:
    return _FENCE_RE.sub("", text).strip()


def _coerce_records(data, fields: list) -> list:
    """Accept the LLM's JSON array (or a legacy single object) and keep only
    the requested fields. Non-dict elements are discarded instead of crashing
    the whole extraction."""
    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list):
        return []
    records = []
    for item in data:
        if not isinstance(item, dict):
            continue
        records.append({f: item.get(f) for f in fields})
    return records


def _rule_based_extract(raw_content: str, fields: list) -> list:
    lines = [l.strip() for l in raw_content.split("\n") if l.strip()]
    result = {f: None for f in fields}

    for field, idx in LINE_HINTS.items():
        if field in fields and idx < len(lines):
            result[field] = lines[idx]

    posted_match = re.search(r"posted\s+(.+)", raw_content, re.IGNORECASE)
    if "posting_date" in fields and posted_match:
        result["posting_date"] = posted_match.group(1).strip()

    url_match = re.search(r"(https?://\S+)", raw_content)
    if "application_url" in fields and url_match:
        result["application_url"] = url_match.group(1).strip()

    # A record built from a single guessed line is noise, not data: only
    # return it when at least two fields were actually filled.
    filled = sum(1 for v in result.values() if v not in (None, ""))
    if filled < 2:
        return []
    return [result]


async def extract(raw_content: str, fields: list) -> list:
    """Returns a LIST of records - one per entity found on the page.
    The event loop is never blocked: the blocking Groq call runs in a thread."""
    if HAS_LLM:
        try:
            # Prototype default 6000 chars ≈ 2k tokens/req (vs ~4k at 12000),
            # doubling throughput on the 8000 TPM free tier.
            # Keep the search-context header AND the tail: the header names the
            # entities (often enough to fill a record on its own) while the
            # body holds the per-entity details. A single head-slice used to
            # keep only boilerplate and truncate the entities away.
            window = LLM_EXTRACT_WINDOW
            text = raw_content or ""
            head, sep, tail = text.partition("--- Page content below ---")
            if sep:
                header = head.strip()[:1500]
                body = tail.strip()
                # Header always survives; body gets whatever budget is left.
                # If the body still overflows, keep its head AND tail (lead
                # listings + trailing details) instead of head-only.
                body_budget = max(1000, window - len(header) - 100)
                if len(body) > body_budget:
                    half = body_budget // 2
                    body = body[:half] + "\n...\n" + body[-half:]
                content = f"{header}\n{sep}\n{body}"[:window]
            else:
                content = text[:window]
            user_content = json.dumps({"fields": fields, "content": content})
            raw = await asyncio.to_thread(complete_json, EXTRACTION_SYSTEM_PROMPT, user_content)
            data = json.loads(_strip_fences(raw))
            records = _coerce_records(data, fields)
            # Drop entities where the model could not fill a single field -
            # they carry no information and would only pollute the dataset.
            records = [r for r in records if any(v not in (None, "") for v in r.values())]
            if records:
                return records
            logger.warning("LLM returned no usable records; falling back to rule-based extraction")
        except Exception as exc:  # noqa: BLE001 - any failure degrades gracefully
            logger.warning("LLM extraction failed (%s); falling back to rule-based extraction", exc)

    return _rule_based_extract(raw_content, fields)

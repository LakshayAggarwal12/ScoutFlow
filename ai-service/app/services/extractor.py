import json
import re
from app.config import HAS_LLM
from app.prompts.extraction_prompt import EXTRACTION_SYSTEM_PROMPT
from app.services.llm_client import complete_json
from app.models.task import ExtractedRecord

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


def _rule_based_extract(raw_content: str, fields: list) -> dict:
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

    return result


async def extract(raw_content: str, fields: list) -> dict:
    if HAS_LLM:
        try:
            user_content = json.dumps({"fields": fields, "content": raw_content[:6000]})
            raw = complete_json(EXTRACTION_SYSTEM_PROMPT, user_content)
            data = json.loads(raw)
            validated = ExtractedRecord(**{k: data.get(k) for k in fields if k in ExtractedRecord.model_fields})
            merged = {f: data.get(f) for f in fields}
            return merged
        except Exception:
            pass

    return _rule_based_extract(raw_content, fields)

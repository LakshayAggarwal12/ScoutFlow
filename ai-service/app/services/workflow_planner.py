import asyncio
import json
import logging

from app.config import HAS_LLM
from app.prompts.workflow_prompt import WORKFLOW_SYSTEM_PROMPT
from app.services.llm_client import complete_json
from app.models.workflow import WorkflowPlan

logger = logging.getLogger("scoutflow.workflow")


def _default_plan(structured_requirement: dict) -> dict:
    fields = structured_requirement.get("fields", [])
    return {
        "steps": [
            {"type": "search", "purpose": "Find relevant source pages"},
            {"type": "collect", "purpose": "Retrieve permitted public source content"},
            {"type": "extract", "fields": fields},
            {"type": "normalize"},
            {"type": "deduplicate"},
            {"type": "validate"},
            {"type": "store"},
        ]
    }


async def plan_workflow(structured_requirement: dict) -> dict:
    if HAS_LLM:
        try:
            raw = await asyncio.to_thread(complete_json, WORKFLOW_SYSTEM_PROMPT, json.dumps(structured_requirement))
            data = json.loads(raw)
            validated = WorkflowPlan(**data)
            return validated.model_dump()
        except Exception as exc:  # noqa: BLE001
            logger.warning("LLM workflow planning failed (%s); using default plan", exc)

    data = _default_plan(structured_requirement)
    validated = WorkflowPlan(**data)
    return validated.model_dump()

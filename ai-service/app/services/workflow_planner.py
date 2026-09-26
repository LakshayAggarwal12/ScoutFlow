import json
from app.config import HAS_LLM
from app.prompts.workflow_prompt import WORKFLOW_SYSTEM_PROMPT
from app.services.llm_client import complete_json
from app.models.workflow import WorkflowPlan


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
            raw = complete_json(WORKFLOW_SYSTEM_PROMPT, json.dumps(structured_requirement))
            data = json.loads(raw)
            validated = WorkflowPlan(**data)
            return validated.model_dump()
        except Exception:
            pass

    data = _default_plan(structured_requirement)
    validated = WorkflowPlan(**data)
    return validated.model_dump()

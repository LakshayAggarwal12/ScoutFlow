from typing import List, Optional, Literal
from pydantic import BaseModel

STEP_TYPES = Literal["search", "collect", "extract", "normalize", "filter", "validate", "deduplicate", "store"]


class WorkflowStep(BaseModel):
    type: STEP_TYPES
    purpose: Optional[str] = None
    fields: Optional[List[str]] = None


class WorkflowPlan(BaseModel):
    steps: List[WorkflowStep]


class PlanWorkflowRequest(BaseModel):
    structured_requirement: dict

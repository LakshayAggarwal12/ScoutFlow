from fastapi import FastAPI
from app.models.task import ParseRequirementRequest, ExtractRequest
from app.models.workflow import PlanWorkflowRequest
from app.services.requirement_parser import parse_requirement
from app.services.workflow_planner import plan_workflow
from app.services.extractor import extract
from app.config import HAS_LLM

app = FastAPI(title="AI Data Intelligence - AI Service", version="0.1.0")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-service", "llm_configured": HAS_LLM}


@app.post("/ai/parse-requirement")
async def ai_parse_requirement(req: ParseRequirementRequest):
    return await parse_requirement(req.prompt)


@app.post("/ai/plan-workflow")
async def ai_plan_workflow(req: PlanWorkflowRequest):
    return await plan_workflow(req.structured_requirement)


@app.post("/ai/extract")
async def ai_extract(req: ExtractRequest):
    return await extract(req.raw_content, req.fields)

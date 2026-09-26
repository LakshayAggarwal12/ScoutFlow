from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class ParseRequirementRequest(BaseModel):
    prompt: str = Field(..., min_length=1)


class DateRange(BaseModel):
    type: Literal["relative", "absolute", "any"] = "any"
    days: Optional[int] = None


class StructuredRequirement(BaseModel):
    entity: str
    keywords: List[str] = []
    location: Optional[str] = None
    date_range: Optional[DateRange] = None
    limit: int = Field(default=50, gt=0, le=200)
    fields: List[str] = Field(..., min_length=1)


class ExtractRequest(BaseModel):
    raw_content: str
    fields: List[str]


class ExtractedRecord(BaseModel):
    company_name: Optional[str] = None
    role: Optional[str] = None
    location: Optional[str] = None
    salary: Optional[str] = None
    posting_date: Optional[str] = None
    application_url: Optional[str] = None

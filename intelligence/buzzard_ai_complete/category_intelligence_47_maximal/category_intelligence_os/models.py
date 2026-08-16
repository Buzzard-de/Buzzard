from pydantic import BaseModel, Field


class Category(BaseModel):
    code: str
    name: str
    parent_id: int | None = None
    level: int = 1
    source: str = "master_taxonomy"


class Competitor(BaseModel):
    category_id: int
    rank: int = Field(ge=1, le=20)
    name: str
    domain: str = ""
    type: str = "SPECIALIST"
    country: str = "DE"
    evidence_url: str = ""
    revenue_eur: float | None = None
    gmv_eur: float | None = None
    verified: bool = False
    notes: str = ""


class Node(BaseModel):
    competitor_id: int
    path: str
    evidence_url: str = ""
    confidence: float = 0
    verified: bool = False


class BuzzNode(BaseModel):
    category_id: int
    path: str
    status: str = "ACTIVE"


class Feature(BaseModel):
    competitor_id: int
    feature: str
    present: bool
    evidence_url: str = ""
    confidence: float = 0


class Finding(BaseModel):
    category_id: int
    kind: str
    path: str = ""
    title: str
    score: float = 0
    confidence: float = 0
    rationale: str = ""

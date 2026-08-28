"""
FastAPI service wrapper for buzzard_ai_guardian_max.py
Run: uvicorn buzzard_guardian_api:app --host 0.0.0.0 --port 8001
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from buzzard_ai_guardian_max import (
    APP_NAME,
    BuzzardAIGuardian,
    CostEvent,
    self_test,
)

app = FastAPI(title=APP_NAME, version="1.0.0")
_guardian: Optional[BuzzardAIGuardian] = None


def guardian() -> BuzzardAIGuardian:
    global _guardian
    if _guardian is None:
        _guardian = BuzzardAIGuardian()
        _guardian.register_default_agents()
    return _guardian


class TaskGateRequest(BaseModel):
    task_id: str
    agent_id: str
    action_type: str
    description: str
    estimated_cost_eur: float = 0
    amount_eur: float = 0
    affects_records: int = 1
    external_side_effect: bool = False


class ApprovalDecision(BaseModel):
    approved: bool
    decided_by: str
    reason: str = ""


class MemoryUpsert(BaseModel):
    namespace: str
    key: str
    content: str
    source: str
    confidence: float = 1.0
    tags: List[str] = Field(default_factory=list)
    agent_id: Optional[str] = None


class CostRecord(BaseModel):
    agent_id: str
    model: str
    provider: str
    input_tokens: int
    output_tokens: int
    input_cost_eur: float
    output_cost_eur: float
    task_id: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


@app.get("/health")
def health():
    g = guardian()
    return {"ok": True, "service": APP_NAME, **g.status()}


@app.get("/status")
def status():
    return guardian().status()


@app.post("/init")
def init_agents():
    guardian().register_default_agents()
    return {"ok": True, "status": guardian().status()}


@app.get("/approvals/pending")
def pending_approvals(limit: int = 50):
    return {"items": guardian().approvals.pending(limit)}


@app.get("/approvals/{approval_id}")
def get_approval(approval_id: str):
    item = guardian().approvals.get(approval_id)
    if not item:
        raise HTTPException(404, "approval_not_found")
    return item


@app.post("/approvals/{approval_id}/decide")
def decide_approval(approval_id: str, body: ApprovalDecision):
    try:
        guardian().approvals.decide(
            approval_id, body.approved, body.decided_by, body.reason
        )
    except (KeyError, ValueError) as exc:
        raise HTTPException(400, str(exc)) from exc
    return {"ok": True, "approval_id": approval_id, "approved": body.approved}


@app.get("/incidents/open")
def open_incidents(limit: int = 50):
    return {"items": guardian().incidents.open_incidents(limit)}


@app.post("/incidents/{incident_id}/resolve")
def resolve_incident(incident_id: str, actor: str = "admin", reason: str = ""):
    guardian().incidents.resolve(incident_id, actor, reason)
    return {"ok": True, "incident_id": incident_id}


@app.get("/costs/dashboard")
def costs_dashboard():
    return guardian().costs.dashboard()


@app.post("/costs/record")
def record_cost(body: CostRecord):
    try:
        event_id = guardian().costs.record(CostEvent(**body.model_dump()))
    except PermissionError as exc:
        raise HTTPException(403, str(exc)) from exc
    return {"ok": True, "event_id": event_id}


@app.post("/task-gate")
def create_task_gate(body: TaskGateRequest):
    try:
        return guardian().create_task_gate(**body.model_dump())
    except PermissionError as exc:
        raise HTTPException(403, str(exc)) from exc


@app.post("/memory")
def memory_upsert(body: MemoryUpsert):
    memory_id = guardian().memory.upsert(**body.model_dump())
    return {"ok": True, "memory_id": memory_id}


@app.get("/memory/search")
def memory_search(q: str, namespace: Optional[str] = None, limit: int = 20):
    return {"items": guardian().memory.search(q, namespace, limit)}


@app.post("/backup")
def backup(label: str = "manual"):
    return guardian().dr.backup(label)


@app.get("/self-test")
def run_self_test():
    return self_test()

from __future__ import annotations

from datetime import datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: list[dict[str, Any]] | None = None
    request_id: str


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    has_more: bool


class TaskCreateRequest(BaseModel):
    type: str = Field(min_length=1, max_length=100)
    payload: dict[str, Any] = Field(default_factory=dict)
    priority: str = "NORMAL"
    requires_approval: bool = False
    worker_id: str | None = None
    idempotency_key: str | None = None
    parent_id: str | None = None
    dependency_ids: list[str] | None = None
    max_attempts: int = Field(default=3, ge=1, le=10)
    timeout_seconds: int = Field(default=60, ge=5, le=3600)
    auto_start: bool = True


class TaskTransitionRequest(BaseModel):
    action: str = Field(description="approve, reject, cancel, or explicit status")
    note: str | None = None
    to_status: str | None = None


class TaskResponse(BaseModel):
    id: str
    type: str
    payload: dict[str, Any]
    priority: str
    status: str
    worker_id: str | None
    result: dict[str, Any] | None
    error: str | None
    attempts: int
    max_attempts: int
    requires_approval: bool
    approved_by: str | None
    idempotency_key: str | None
    parent_id: str | None
    created_by: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MemoryWriteRequest(BaseModel):
    source: str
    entity: str
    category: str
    type: str
    content: dict[str, Any] = Field(default_factory=dict)
    namespace: str
    key: str
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    impact: str = "LOW"
    related_task: str | None = None


class MemoryResponse(BaseModel):
    id: str
    source: str
    entity: str
    category: str
    type: str
    content: dict[str, Any]
    confidence: float
    impact: str
    namespace: str
    key: str
    version: int
    created_by: str
    related_task: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ExceptionCreateRequest(BaseModel):
    severity: str
    type: str
    message: str
    entity: str | None = None
    owner: str | None = None
    worker_id: str | None = None
    task_id: str | None = None
    extra_metadata: dict[str, Any] | None = None


class ExceptionTransitionRequest(BaseModel):
    to_status: str
    note: str | None = None
    resolution: str | None = None
    assigned_to: str | None = None


class ExceptionResponse(BaseModel):
    id: str
    severity: str
    type: str
    message: str
    entity: str | None
    status: str
    owner: str | None
    assigned_to: str | None
    worker_id: str | None
    task_id: str | None
    resolution: str | None
    contained: bool
    worker_halted: bool
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None

    model_config = {"from_attributes": True}


class AuditResponse(BaseModel):
    id: str
    actor: str
    worker_id: str | None
    action: str
    entity_type: str | None
    entity_id: str | None
    before_state: dict[str, Any] | None
    after_state: dict[str, Any] | None
    request_id: str
    task_id: str | None
    risk: str
    result: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ApprovalResponse(BaseModel):
    id: str
    task_id: str
    actor: str
    actor_role: str
    decision: str
    note: str | None
    extra_metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = {"from_attributes": True}

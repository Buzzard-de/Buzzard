from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from buzzard_ai_complete.ai_core.api.deps import (
  authorize,
  get_actor,
  get_audit_service,
  get_exception_service,
  get_memory_service,
  get_orchestrator,
  get_request_id,
)
from buzzard_ai_complete.ai_core.enums import TaskStatus
from buzzard_ai_complete.ai_core.schemas.api import (
  AuditResponse,
  ExceptionCreateRequest,
  ExceptionResponse,
  ExceptionTransitionRequest,
  MemoryResponse,
  MemoryWriteRequest,
  PaginatedResponse,
  TaskCreateRequest,
  TaskResponse,
  TaskTransitionRequest,
)
from buzzard_ai_complete.ai_core.services.audit_service import AuditService
from buzzard_ai_complete.ai_core.services.exception_service import ExceptionService
from buzzard_ai_complete.ai_core.services.memory_service import CentralMemoryService
from buzzard_ai_complete.ai_core.services.orchestrator import UnifiedOrchestrator

router = APIRouter(prefix="/api/v1", tags=["ai-core-v1"])


def _paginate(items: list, page: int, page_size: int) -> PaginatedResponse:
  total = len(items)
  start = (page - 1) * page_size
  end = start + page_size
  chunk = items[start:end]
  return PaginatedResponse(
    items=chunk,
    total=total,
    page=page,
    page_size=page_size,
    has_more=end < total,
  )


@router.post("/tasks", response_model=TaskResponse, status_code=201, dependencies=[Depends(authorize)])
def create_task(
  body: TaskCreateRequest,
  orchestrator: UnifiedOrchestrator = Depends(get_orchestrator),
  actor: str = Depends(get_actor),
  request_id: str = Depends(get_request_id),
  response: Response = None,
):
  try:
    task = orchestrator.create_task(
      type=body.type,
      payload=body.payload,
      priority=body.priority,
      created_by=actor,
      requires_approval=body.requires_approval,
      worker_id=body.worker_id,
      idempotency_key=body.idempotency_key,
      parent_id=body.parent_id,
      dependency_ids=body.dependency_ids,
      max_attempts=body.max_attempts,
      timeout_seconds=body.timeout_seconds,
      auto_start=body.auto_start,
    )
  except ValueError as exc:
    raise HTTPException(status_code=400, detail={"code": "VALIDATION_ERROR", "message": str(exc), "request_id": request_id})
  if response is not None:
    response.headers["X-Request-Id"] = request_id
  return task


@router.get("/tasks", response_model=PaginatedResponse[TaskResponse], dependencies=[Depends(authorize)])
def list_tasks(
  status: str | None = None,
  type: str | None = None,
  page: int = Query(default=1, ge=1),
  page_size: int = Query(default=50, ge=1, le=200),
  orchestrator: UnifiedOrchestrator = Depends(get_orchestrator),
):
  items = orchestrator.list_tasks(status=status, type=type, limit=page_size, offset=(page - 1) * page_size)
  return PaginatedResponse(
    items=items,
    total=len(items),
    page=page,
    page_size=page_size,
    has_more=len(items) == page_size,
  )


@router.get("/tasks/{task_id}", response_model=TaskResponse, dependencies=[Depends(authorize)])
def get_task(task_id: str, orchestrator: UnifiedOrchestrator = Depends(get_orchestrator), request_id: str = Depends(get_request_id)):
  task = orchestrator.get(task_id)
  if not task:
    raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Task not found", "request_id": request_id})
  return task


@router.post("/tasks/{task_id}/transition", response_model=TaskResponse, dependencies=[Depends(authorize)])
def transition_task(
  task_id: str,
  body: TaskTransitionRequest,
  orchestrator: UnifiedOrchestrator = Depends(get_orchestrator),
  actor: str = Depends(get_actor),
  request_id: str = Depends(get_request_id),
):
  try:
    if body.action == "approve":
      return orchestrator.approve(task_id, actor=actor, note=body.note)
    if body.action == "reject":
      return orchestrator.reject(task_id, actor=actor, note=body.note)
    if body.action == "cancel":
      return orchestrator.cancel(task_id, actor=actor, note=body.note)
    if body.action == "advance":
      return orchestrator.advance(task_id, actor=actor, note=body.note)
    if body.to_status:
      return orchestrator.transition(task_id, body.to_status, actor=actor, note=body.note)
    raise ValueError("action or to_status required")
  except KeyError:
    raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Task not found", "request_id": request_id})
  except ValueError as exc:
    raise HTTPException(status_code=422, detail={"code": "POLICY_VIOLATION", "message": str(exc), "request_id": request_id})


@router.post("/tasks/run-cycle", response_model=TaskResponse | None, dependencies=[Depends(authorize)])
def run_task_cycle(orchestrator: UnifiedOrchestrator = Depends(get_orchestrator), actor: str = Depends(get_actor)):
  return orchestrator.run_cycle(actor=actor)


@router.post("/memory", response_model=MemoryResponse, status_code=201, dependencies=[Depends(authorize)])
def write_memory(
  body: MemoryWriteRequest,
  memory: CentralMemoryService = Depends(get_memory_service),
  actor: str = Depends(get_actor),
  request_id: str = Depends(get_request_id),
):
  try:
    return memory.write(
      source=body.source,
      entity=body.entity,
      category=body.category,
      type=body.type,
      content=body.content,
      created_by=actor,
      namespace=body.namespace,
      key=body.key,
      confidence=body.confidence,
      impact=body.impact,
      related_task=body.related_task,
    )
  except ValueError as exc:
    raise HTTPException(status_code=400, detail={"code": "VALIDATION_ERROR", "message": str(exc), "request_id": request_id})


@router.get("/memory", response_model=PaginatedResponse[MemoryResponse], dependencies=[Depends(authorize)])
def search_memory(
  q: str | None = None,
  type: str | None = None,
  category: str | None = None,
  impact: str | None = None,
  page: int = Query(default=1, ge=1),
  page_size: int = Query(default=50, ge=1, le=200),
  memory: CentralMemoryService = Depends(get_memory_service),
):
  items = memory.search(q=q, type=type, category=category, impact=impact, limit=page_size, offset=(page - 1) * page_size)
  return PaginatedResponse(items=items, total=len(items), page=page, page_size=page_size, has_more=len(items) == page_size)


@router.get("/memory/{memory_id}", response_model=MemoryResponse, dependencies=[Depends(authorize)])
def get_memory(memory_id: str, memory: CentralMemoryService = Depends(get_memory_service), request_id: str = Depends(get_request_id)):
  entry = memory.get(memory_id)
  if not entry:
    raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Memory not found", "request_id": request_id})
  return entry


@router.post("/exceptions", response_model=ExceptionResponse, status_code=201, dependencies=[Depends(authorize)])
def create_exception(
  body: ExceptionCreateRequest,
  exceptions: ExceptionService = Depends(get_exception_service),
  actor: str = Depends(get_actor),
):
  return exceptions.create(
    severity=body.severity,
    type=body.type,
    message=body.message,
    actor=actor,
    entity=body.entity,
    owner=body.owner,
    worker_id=body.worker_id,
    task_id=body.task_id,
    extra_metadata=body.extra_metadata,
  )


@router.get("/exceptions", response_model=PaginatedResponse[ExceptionResponse], dependencies=[Depends(authorize)])
def list_exceptions(
  status: str | None = None,
  severity: str | None = None,
  page: int = Query(default=1, ge=1),
  page_size: int = Query(default=50, ge=1, le=200),
  exceptions: ExceptionService = Depends(get_exception_service),
):
  items = exceptions.list_records(status=status, severity=severity, limit=page_size, offset=(page - 1) * page_size)
  return PaginatedResponse(items=items, total=len(items), page=page, page_size=page_size, has_more=len(items) == page_size)


@router.get("/exceptions/{exception_id}", response_model=ExceptionResponse, dependencies=[Depends(authorize)])
def get_exception(
  exception_id: str,
  exceptions: ExceptionService = Depends(get_exception_service),
  request_id: str = Depends(get_request_id),
):
  record = exceptions.get(exception_id)
  if not record:
    raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Exception not found", "request_id": request_id})
  return record


@router.post(
  "/exceptions/{exception_id}/transition",
  response_model=ExceptionResponse,
  dependencies=[Depends(authorize)],
)
def transition_exception(
  exception_id: str,
  body: ExceptionTransitionRequest,
  exceptions: ExceptionService = Depends(get_exception_service),
  actor: str = Depends(get_actor),
  request_id: str = Depends(get_request_id),
):
  try:
    return exceptions.transition(
      exception_id,
      body.to_status,
      actor=actor,
      note=body.note,
      resolution=body.resolution,
      assigned_to=body.assigned_to,
    )
  except KeyError:
    raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Exception not found", "request_id": request_id})
  except ValueError as exc:
    raise HTTPException(status_code=422, detail={"code": "POLICY_VIOLATION", "message": str(exc), "request_id": request_id})


@router.get("/audit", response_model=PaginatedResponse[AuditResponse], dependencies=[Depends(authorize)])
def list_audit(
  actor: str | None = None,
  action: str | None = None,
  entity_type: str | None = None,
  page: int = Query(default=1, ge=1),
  page_size: int = Query(default=100, ge=1, le=500),
  audit: AuditService = Depends(get_audit_service),
):
  items = audit.list_entries(actor=actor, action=action, entity_type=entity_type, limit=page_size, offset=(page - 1) * page_size)
  return PaginatedResponse(items=items, total=len(items), page=page, page_size=page_size, has_more=len(items) == page_size)


@router.get("/audit/{audit_id}", response_model=AuditResponse, dependencies=[Depends(authorize)])
def get_audit(audit_id: str, audit: AuditService = Depends(get_audit_service), request_id: str = Depends(get_request_id)):
  entry = audit.get(audit_id)
  if not entry:
    raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Audit entry not found", "request_id": request_id})
  return entry


@router.get("/health")
def ai_core_health():
  from buzzard_ai_complete.ai_core.database.base import get_engine
  from buzzard_ai_complete.config.settings import APP_VERSION, DATABASE_URL

  engine = get_engine()
  with engine.connect() as conn:
    conn.exec_driver_sql("SELECT 1")
  return {
    "status": "ok",
    "version": APP_VERSION,
    "database": "connected",
    "database_url_scheme": DATABASE_URL.split(":", 1)[0],
  }

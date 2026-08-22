from __future__ import annotations

from typing import TypeVar

from fastapi import APIRouter, Depends, HTTPException, Query

from buzzard_ai_complete.ai_core.api.deps import (
  enforce_api_permission,
  get_actor,
  get_actor_role,
  get_audit_service,
  get_exception_service,
  get_idempotency_key,
  get_memory_service,
  get_orchestrator,
  get_request_id,
)
from buzzard_ai_complete.ai_core.api.v1.agents import router as agents_router
from buzzard_ai_complete.ai_core.api.v1.approvals import router as approvals_router
from buzzard_ai_complete.ai_core.api.v1.categories import router as categories_router
from buzzard_ai_complete.ai_core.api.v1.commerce import router as commerce_router
from buzzard_ai_complete.ai_core.api.v1.events import router as events_router
from buzzard_ai_complete.ai_core.api.v1.integrations import router as integrations_router
from buzzard_ai_complete.ai_core.api.v1.orders import router as orders_router
from buzzard_ai_complete.ai_core.api.v1.pricing import router as pricing_router
from buzzard_ai_complete.ai_core.api.v1.products import router as products_router
from buzzard_ai_complete.ai_core.api.v1.reports import router as reports_router
from buzzard_ai_complete.ai_core.api.v1.stock import router as stock_router
from buzzard_ai_complete.ai_core.api.v1.suppliers import router as suppliers_router
from buzzard_ai_complete.ai_core.integrations.factory import get_integration_registry
from buzzard_ai_complete.ai_core.workers.registry import get_registry
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

T = TypeVar("T")


def _build_paginated(items: list[T], total: int, page: int, page_size: int) -> PaginatedResponse[T]:
  offset = (page - 1) * page_size
  return PaginatedResponse(
    items=items,
    total=total,
    page=page,
    page_size=page_size,
    has_more=offset + len(items) < total,
  )


@router.post("/tasks", response_model=TaskResponse, status_code=201, dependencies=[Depends(enforce_api_permission)])
def create_task(
  body: TaskCreateRequest,
  orchestrator: UnifiedOrchestrator = Depends(get_orchestrator),
  actor: str = Depends(get_actor),
  request_id: str = Depends(get_request_id),
  idempotency_key: str | None = Depends(get_idempotency_key),
):
  try:
    task = orchestrator.create_task(
      type=body.type,
      payload=body.payload,
      priority=body.priority,
      created_by=actor,
      requires_approval=body.requires_approval,
      worker_id=body.worker_id,
      idempotency_key=idempotency_key,
      parent_id=body.parent_id,
      dependency_ids=body.dependency_ids,
      max_attempts=body.max_attempts,
      timeout_seconds=body.timeout_seconds,
      auto_start=body.auto_start,
    )
  except ValueError as exc:
    raise HTTPException(status_code=400, detail={"code": "VALIDATION_ERROR", "message": str(exc), "request_id": request_id})
  return task


@router.get("/tasks", response_model=PaginatedResponse[TaskResponse], dependencies=[Depends(enforce_api_permission)])
def list_tasks(
  status: str | None = None,
  type: str | None = None,
  page: int = Query(default=1, ge=1),
  page_size: int = Query(default=50, ge=1, le=200),
  orchestrator: UnifiedOrchestrator = Depends(get_orchestrator),
):
  offset = (page - 1) * page_size
  items = orchestrator.list_tasks(status=status, type=type, limit=page_size, offset=offset)
  total = orchestrator.count_tasks(status=status, type=type)
  return _build_paginated(items, total, page, page_size)


@router.get("/tasks/{task_id}", response_model=TaskResponse, dependencies=[Depends(enforce_api_permission)])
def get_task(task_id: str, orchestrator: UnifiedOrchestrator = Depends(get_orchestrator), request_id: str = Depends(get_request_id)):
  task = orchestrator.get(task_id)
  if not task:
    raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Task not found", "request_id": request_id})
  return task


@router.post("/tasks/{task_id}/transition", response_model=TaskResponse, dependencies=[Depends(enforce_api_permission)])
def transition_task(
  task_id: str,
  body: TaskTransitionRequest,
  orchestrator: UnifiedOrchestrator = Depends(get_orchestrator),
  actor: str = Depends(get_actor),
  actor_role: str = Depends(get_actor_role),
  request_id: str = Depends(get_request_id),
):
  try:
    if body.action == "approve":
      return orchestrator.approve(task_id, actor=actor, actor_role=actor_role, note=body.note)
    if body.action == "reject":
      return orchestrator.reject(task_id, actor=actor, actor_role=actor_role, note=body.note)
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


@router.post("/tasks/run-cycle", response_model=TaskResponse | None, dependencies=[Depends(enforce_api_permission)])
def run_task_cycle(orchestrator: UnifiedOrchestrator = Depends(get_orchestrator), actor: str = Depends(get_actor)):
  return orchestrator.run_cycle(actor=actor)


@router.post("/memory", response_model=MemoryResponse, status_code=201, dependencies=[Depends(enforce_api_permission)])
def write_memory(
  body: MemoryWriteRequest,
  memory: CentralMemoryService = Depends(get_memory_service),
  actor: str = Depends(get_actor),
  actor_role: str = Depends(get_actor_role),
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
      actor_role=actor_role,
    )
  except ValueError as exc:
    raise HTTPException(status_code=400, detail={"code": "VALIDATION_ERROR", "message": str(exc), "request_id": request_id})


@router.get("/memory", response_model=PaginatedResponse[MemoryResponse], dependencies=[Depends(enforce_api_permission)])
def search_memory(
  q: str | None = None,
  type: str | None = None,
  category: str | None = None,
  impact: str | None = None,
  page: int = Query(default=1, ge=1),
  page_size: int = Query(default=50, ge=1, le=200),
  memory: CentralMemoryService = Depends(get_memory_service),
):
  offset = (page - 1) * page_size
  items = memory.search(q=q, type=type, category=category, impact=impact, limit=page_size, offset=offset)
  total = memory.count_search(q=q, type=type, category=category, impact=impact)
  return _build_paginated(items, total, page, page_size)


@router.get("/memory/{memory_id}", response_model=MemoryResponse, dependencies=[Depends(enforce_api_permission)])
def get_memory(memory_id: str, memory: CentralMemoryService = Depends(get_memory_service), request_id: str = Depends(get_request_id)):
  entry = memory.get(memory_id)
  if not entry:
    raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Memory not found", "request_id": request_id})
  return entry


@router.post("/exceptions", response_model=ExceptionResponse, status_code=201, dependencies=[Depends(enforce_api_permission)])
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


@router.get("/exceptions", response_model=PaginatedResponse[ExceptionResponse], dependencies=[Depends(enforce_api_permission)])
def list_exceptions(
  status: str | None = None,
  severity: str | None = None,
  page: int = Query(default=1, ge=1),
  page_size: int = Query(default=50, ge=1, le=200),
  exceptions: ExceptionService = Depends(get_exception_service),
):
  offset = (page - 1) * page_size
  items = exceptions.list_records(status=status, severity=severity, limit=page_size, offset=offset)
  total = exceptions.count_records(status=status, severity=severity)
  return _build_paginated(items, total, page, page_size)


@router.get("/exceptions/{exception_id}", response_model=ExceptionResponse, dependencies=[Depends(enforce_api_permission)])
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
  dependencies=[Depends(enforce_api_permission)],
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


@router.get("/audit", response_model=PaginatedResponse[AuditResponse], dependencies=[Depends(enforce_api_permission)])
def list_audit(
  actor: str | None = None,
  action: str | None = None,
  entity_type: str | None = None,
  page: int = Query(default=1, ge=1),
  page_size: int = Query(default=100, ge=1, le=500),
  audit: AuditService = Depends(get_audit_service),
):
  offset = (page - 1) * page_size
  items = audit.list_entries(actor=actor, action=action, entity_type=entity_type, limit=page_size, offset=offset)
  total = audit.count_entries(actor=actor, action=action, entity_type=entity_type)
  return _build_paginated(items, total, page, page_size)


@router.get("/audit/{audit_id}", response_model=AuditResponse, dependencies=[Depends(enforce_api_permission)])
def get_audit(audit_id: str, audit: AuditService = Depends(get_audit_service), request_id: str = Depends(get_request_id)):
  entry = audit.get(audit_id)
  if not entry:
    raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Audit entry not found", "request_id": request_id})
  return entry


@router.get("/health")
def ai_core_health():
  from buzzard_ai_complete.ai_core.database.base import get_engine
  from buzzard_ai_complete.config import settings

  engine = get_engine()
  with engine.connect() as conn:
    conn.exec_driver_sql("SELECT 1")
  return {
    "status": "ok",
    "version": settings.APP_VERSION,
    "database": "connected",
    "database_url_scheme": settings.DATABASE_URL.split(":", 1)[0],
  }


@router.get("/health/ready")
def ai_core_ready():
  from buzzard_ai_complete.ai_core.database.base import get_engine
  from buzzard_ai_complete.ai_core.integrations.commerce_config import validate_commerce_configuration
  from buzzard_ai_complete.ai_core.integrations.integration_config import (
    validate_crm_configuration,
    validate_wms_configuration,
  )
  from buzzard_ai_complete.config import settings

  engine = get_engine()
  with engine.connect() as conn:
    conn.exec_driver_sql("SELECT 1")
  worker_registry = get_registry()
  integrations = get_integration_registry()
  worker_count = len(worker_registry.list_workers())
  commerce_config = validate_commerce_configuration()
  wms_config = validate_wms_configuration()
  crm_config = validate_crm_configuration()
  return {
    "status": "ready",
    "version": settings.APP_VERSION,
    "ai_core_v2": settings.BUZZARD_AI_CORE_V2,
    "ai_core_v3": settings.BUZZARD_AI_CORE_V3,
    "database": "connected",
    "workers_registered": worker_count,
    "integrations": integrations.list_status(),
    "commerce_config": commerce_config.to_dict(),
    "wms_config": wms_config.to_dict(),
    "crm_config": crm_config.to_dict(),
  }


router.include_router(agents_router)
router.include_router(approvals_router)
router.include_router(categories_router)
router.include_router(commerce_router)
router.include_router(integrations_router)
router.include_router(orders_router)
router.include_router(pricing_router)
router.include_router(events_router)
router.include_router(products_router)
router.include_router(reports_router)
router.include_router(stock_router)
router.include_router(suppliers_router)

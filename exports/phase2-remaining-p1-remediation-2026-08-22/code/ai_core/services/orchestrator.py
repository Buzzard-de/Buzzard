from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.enums import (
    TASK_TRANSITIONS,
    AuditResult,
    ExceptionSeverity,
    ExceptionStatus,
    MemoryImpact,
    MemoryType,
    RiskLevel,
    TaskPriority,
    TaskStatus,
)
from buzzard_ai_complete.ai_core.kurmay.service import KurmayService
from buzzard_ai_complete.ai_core.models.approval_record import ApprovalRecord
from buzzard_ai_complete.ai_core.models.task import Task, TaskDependency, TaskTransition
from buzzard_ai_complete.ai_core.security.policies import PolicyEngine
from buzzard_ai_complete.ai_core.security.service import SecurityService
from buzzard_ai_complete.ai_core.services.audit_service import AuditService
from buzzard_ai_complete.ai_core.services.exception_service import ExceptionService
from buzzard_ai_complete.ai_core.services.memory_service import CentralMemoryService
from buzzard_ai_complete.ai_core.taxonomy.legacy_bridge import resolve_legacy_category_id
from buzzard_ai_complete.ai_core.taxonomy.registry import TaxonomyRegistry
from buzzard_ai_complete.ai_core.workers.base import WorkerExecutionError, WorkerResult, WorkerTimeoutError
from buzzard_ai_complete.ai_core.workers.executor import WorkerExecutor
from buzzard_ai_complete.ai_core.security.task_permissions import required_permission_for_task
from buzzard_ai_complete.ai_core.services.integration_status_service import IntegrationStatusService
from buzzard_ai_complete.ai_core.services.worker_registry_service import WorkerRegistryService
from buzzard_ai_complete.ai_core.schemas.workers.validation import validate_worker_output
from buzzard_ai_complete.ai_core.exception.coordinator import ExceptionCoordinator
from buzzard_ai_complete.ai_core.integrations.registry import IntegrationStatusRegistry
from buzzard_ai_complete.ai_core.workers.registry import build_phase2_registry, get_registry
from buzzard_ai_complete.config import settings

WORKER_ROUTING: dict[str, str] = {
    "category_scan": "category-worker",
    "supplier_sync": "supplier-hub",
    "price_recheck": "price-engine",
    "stock_sync": "stock-engine",
    "product_enrich": "product-intelligence",
    "order_check": "order-engine",
    "customer_service": "customer-service-ai",
    "customs_classify": "customs-classifier",
    "system_health": "aslan-bey-orchestrator",
    "kurmay_synthesis": "kurmay",
    "security_scan": "security-ai",
    "security_inspect": "security-ai",
    "exception_route": "exception-coordinator",
}


def resolve_worker_id(task_type: str, payload: dict[str, Any] | None, worker_id: str | None = None) -> str:
    if worker_id:
        return worker_id
    if task_type == "category_scan":
        category_id = (payload or {}).get("category_id")
        if category_id:
            resolved = str(category_id)
            if not resolved.startswith("bz."):
                legacy = resolve_legacy_category_id(resolved)
                if legacy:
                    resolved = legacy
            registry = TaxonomyRegistry()
            if registry.get_node(resolved):
                return f"category-{resolved}"
    return WORKER_ROUTING.get(task_type, "central-orchestrator")


class UnifiedOrchestrator:
  def __init__(
    self,
    session: Session,
    audit: AuditService,
    memory: CentralMemoryService,
    exceptions: ExceptionService,
    request_id: str = "system",
    security: SecurityService | None = None,
    policy: PolicyEngine | None = None,
    taxonomy: TaxonomyRegistry | None = None,
  ):
    self.session = session
    self.audit = audit
    self.memory = memory
    self.exceptions = exceptions
    self.request_id = request_id
    self.security = security or SecurityService()
    self.policy = policy or PolicyEngine()
    self.taxonomy = taxonomy or TaxonomyRegistry()
    self.kurmay = KurmayService(session)
    self._registry_synced = False

  def _execution_registry(self):
    if settings.BUZZARD_AI_CORE_V2:
      coordinator = ExceptionCoordinator(self.session, self.exceptions)
      return build_phase2_registry(coordinator=coordinator)
    return get_registry()

  def _sync_phase2_metadata(self) -> None:
    if not settings.BUZZARD_AI_CORE_V2 or self._registry_synced:
      return
    registry = self._execution_registry()
    WorkerRegistryService(self.session).sync_registry(registry)
    integration_svc = IntegrationStatusService(self.session)
    integration_svc.ensure_defaults()
    integration_svc.sync_from_registry(IntegrationStatusRegistry())
    self._registry_synced = True

  def create_task(
    self,
    *,
    type: str,
    payload: dict[str, Any] | None = None,
    priority: TaskPriority | str = TaskPriority.NORMAL,
    created_by: str = "api",
    requires_approval: bool = False,
    worker_id: str | None = None,
    idempotency_key: str | None = None,
    parent_id: str | None = None,
    dependency_ids: list[str] | None = None,
    max_attempts: int = 3,
    timeout_seconds: int = 60,
    auto_start: bool = True,
  ) -> Task:
    self._sync_phase2_metadata()
    if idempotency_key:
      existing = (
        self.session.query(Task).filter(Task.idempotency_key == idempotency_key).one_or_none()
      )
      if existing:
        return existing

    priority_val = priority.value if isinstance(priority, TaskPriority) else priority
    if priority_val not in {p.value for p in TaskPriority}:
      raise ValueError(f"invalid priority: {priority_val}")

    if dependency_ids:
      for dep_id in dependency_ids:
        dep = self.session.get(Task, dep_id)
        if not dep:
          raise ValueError(f"dependency task not found: {dep_id}")
        if dep.status != TaskStatus.SUCCESS.value:
          raise ValueError(f"dependency task not successful: {dep_id}")

    resolved_worker = resolve_worker_id(type, payload, worker_id)
    task = Task(
      type=type,
      payload=payload or {},
      priority=priority_val,
      status=TaskStatus.QUEUED.value,
      worker_id=resolved_worker,
      requires_approval=requires_approval,
      idempotency_key=idempotency_key,
      parent_id=parent_id,
      max_attempts=max_attempts,
      timeout_seconds=timeout_seconds,
      created_by=created_by,
    )
    self.session.add(task)
    try:
      self.session.flush()
    except IntegrityError:
      self.session.rollback()
      if idempotency_key:
        existing = (
          self.session.query(Task).filter(Task.idempotency_key == idempotency_key).one_or_none()
        )
        if existing:
          return existing
      raise
    self._record_transition(task, None, TaskStatus.QUEUED, created_by, "task created")

    if dependency_ids:
      for dep_id in dependency_ids:
        self.session.add(TaskDependency(task_id=task.id, depends_on_id=dep_id))

    self.audit.log(
      actor=created_by,
      action="task.create",
      request_id=self.request_id,
      entity_type="task",
      entity_id=task.id,
      after_state={"type": type, "status": task.status, "worker_id": task.worker_id},
      task_id=task.id,
      worker_id=task.worker_id,
    )

    if auto_start:
      self.advance(task.id, actor=created_by)
    return task

  def advance(self, task_id: str, *, actor: str = "orchestrator", note: str | None = None) -> Task:
    task = self.session.get(Task, task_id)
    if not task:
      raise KeyError(f"task not found: {task_id}")
    status = TaskStatus(task.status)

    if status == TaskStatus.QUEUED:
      return self._transition(task, TaskStatus.VALIDATING, actor, note)
    if status == TaskStatus.VALIDATING:
      return self._validate_and_assign(task, actor)
    if status == TaskStatus.ASSIGNED:
      return self._transition(task, TaskStatus.RUNNING, actor, note or "execution started")
    if status == TaskStatus.RUNNING:
      return self._complete_running(task, actor)
    if status == TaskStatus.REVIEW:
      raise ValueError("task in REVIEW requires explicit approve/reject")
    if status == TaskStatus.APPROVED:
      return self._transition(task, TaskStatus.EXECUTED, actor, note or "approved execution")
    if status == TaskStatus.EXECUTED:
      return self._transition(task, TaskStatus.SUCCESS, actor, note or "execution success")
    if status == TaskStatus.RETRY:
      task.attempts += 1
      if task.attempts > task.max_attempts:
        return self._fail_task(task, actor, "max attempts exceeded")
      self._transition(task, TaskStatus.QUEUED, actor, note or "retry queued")
      return self.advance(task.id, actor=actor, note=note)
    raise ValueError(f"task cannot auto-advance from status {status.value}")

  def transition(
    self,
    task_id: str,
    to_status: TaskStatus | str,
    *,
    actor: str,
    note: str | None = None,
    result: dict[str, Any] | None = None,
  ) -> Task:
    task = self.session.get(Task, task_id)
    if not task:
      raise KeyError(f"task not found: {task_id}")
    target = to_status.value if isinstance(to_status, TaskStatus) else to_status
    current = TaskStatus(task.status)
    allowed = TASK_TRANSITIONS.get(current, frozenset())
    if TaskStatus(target) not in allowed:
      raise ValueError(f"invalid task transition {task.status} -> {target}")
    if result is not None:
      task.result = result
    return self._transition(task, TaskStatus(target), actor, note)

  def approve(
    self,
    task_id: str,
    *,
    actor: str,
    actor_role: str | None = None,
    note: str | None = None,
  ) -> Task:
    role = (actor_role or actor).strip().lower()
    if not self.policy.can_approve(role):
      raise ValueError(f"actor role {role!r} is not authorized to approve tasks")
    task = self.session.get(Task, task_id)
    if not task:
      raise KeyError(f"task not found: {task_id}")
    if task.status != TaskStatus.REVIEW.value:
      raise ValueError("only REVIEW tasks can be approved")
    self.session.add(
      ApprovalRecord(
        task_id=task.id,
        actor=actor,
        actor_role=role,
        decision="APPROVED",
        note=note,
      )
    )
    task.approved_by = actor
    task.approved_at = datetime.now(timezone.utc)
    self._transition(task, TaskStatus.APPROVED, actor, note or "human approval")
    return self.advance(task.id, actor=actor)

  def reject(self, task_id: str, *, actor: str, actor_role: str | None = None, note: str | None = None) -> Task:
    role = (actor_role or actor).strip().lower()
    if not self.policy.can_approve(role):
      raise ValueError(f"actor role {role!r} is not authorized to reject tasks")
    task = self.session.get(Task, task_id)
    if not task:
      raise KeyError(f"task not found: {task_id}")
    if task.status != TaskStatus.REVIEW.value:
      raise ValueError("only REVIEW tasks can be rejected")
    self.session.add(
      ApprovalRecord(
        task_id=task.id,
        actor=actor,
        actor_role=role,
        decision="REJECTED",
        note=note,
      )
    )
    return self._fail_task(task, actor, note or "rejected in review")

  def cancel(self, task_id: str, *, actor: str, note: str | None = None) -> Task:
    task = self.session.get(Task, task_id)
    if not task:
      raise KeyError(f"task not found: {task_id}")
    if TaskStatus(task.status) in {TaskStatus.SUCCESS, TaskStatus.CANCELLED}:
      raise ValueError(f"cannot cancel task in status {task.status}")
    return self._transition(task, TaskStatus.CANCELLED, actor, note or "cancelled")

  def get(self, task_id: str) -> Task | None:
    return self.session.get(Task, task_id)

  def list_tasks(
    self,
    *,
    status: str | None = None,
    type: str | None = None,
    limit: int = 50,
    offset: int = 0,
  ) -> list[Task]:
    query = self.session.query(Task).order_by(Task.created_at.desc())
    if status:
      query = query.filter(Task.status == status)
    if type:
      query = query.filter(Task.type == type)
    return query.offset(offset).limit(limit).all()

  def count_tasks(self, *, status: str | None = None, type: str | None = None) -> int:
    query = self.session.query(func.count(Task.id))
    if status:
      query = query.filter(Task.status == status)
    if type:
      query = query.filter(Task.type == type)
    return int(query.scalar() or 0)

  def run_cycle(self, *, actor: str = "orchestrator") -> Task | None:
    task = (
      self.session.query(Task)
      .filter(Task.status.in_([TaskStatus.QUEUED.value, TaskStatus.RETRY.value]))
      .order_by(Task.created_at.asc())
      .first()
    )
    if not task:
      return None
    while task.status not in {
      TaskStatus.SUCCESS.value,
      TaskStatus.FAILED.value,
      TaskStatus.BLOCKED.value,
      TaskStatus.ESCALATED.value,
      TaskStatus.CANCELLED.value,
      TaskStatus.REVIEW.value,
    }:
      task = self.advance(task.id, actor=actor)
    return task

  def _validate_and_assign(self, task: Task, actor: str) -> Task:
    worker_id = task.worker_id or "central-orchestrator"
    if self.exceptions.is_worker_halted(worker_id):
      self.exceptions.create(
        severity=ExceptionSeverity.HIGH,
        type="WORKER_HALTED",
        message=f"Worker {worker_id} is halted",
        worker_id=worker_id,
        task_id=task.id,
        actor=actor,
      )
      return self._transition(task, TaskStatus.BLOCKED, actor, "worker halted")

    security = self.security.inspect_task(task.id, task.type, worker_id)
    if not security.get("allowed"):
      self.exceptions.create(
        severity=ExceptionSeverity.HIGH,
        type="SECURITY_BLOCKED",
        message=f"Security blocked task {task.id}",
        worker_id=worker_id,
        task_id=task.id,
        actor="esat-bey",
      )
      self.audit.log(
        actor="esat-bey",
        action="task.blocked",
        request_id=self.request_id,
        entity_type="task",
        entity_id=task.id,
        task_id=task.id,
        worker_id=worker_id,
        result=AuditResult.BLOCKED,
        risk=RiskLevel.HIGH,
      )
      return self._transition(task, TaskStatus.BLOCKED, "esat-bey", "security policy blocked")

    task.worker_id = worker_id
    task.assigned_at = datetime.now(timezone.utc)
    return self._transition(task, TaskStatus.ASSIGNED, actor, "worker assigned")

  def _complete_running(self, task: Task, actor: str) -> Task:
    task.started_at = task.started_at or datetime.now(timezone.utc)
    executor = WorkerExecutor(
      self.session,
      self.audit,
      self.request_id,
      registry=self._execution_registry(),
    )
    try:
      worker_result = executor.execute(task)
    except WorkerTimeoutError as exc:
      return self._handle_worker_failure(task, actor, str(exc), retryable=True)
    except WorkerExecutionError as exc:
      return self._handle_worker_failure(task, actor, str(exc), retryable=exc.retryable)

    if not worker_result.success:
      task.result = worker_result.to_dict()
      return self._handle_worker_failure(
        task,
        actor,
        worker_result.error or "worker execution failed",
        retryable=worker_result.retryable,
        worker_result=worker_result,
      )

    result = worker_result.to_dict()
    task.result = result
    actor_role = self._actor_role(actor)
    self.memory.write(
      source=task.worker_id or "orchestrator",
      entity=task.id,
      category="task",
      type=MemoryType.TASK_RESULT,
      content=result,
      created_by=actor,
      namespace="tasks",
      key=task.id,
      confidence=worker_result.confidence or 0.95,
      related_task=task.id,
      actor_role=actor_role,
    )

    kurmay_memory_batch: list[dict[str, Any]] = []
    kurmay_exception_batch: list[dict[str, Any]] = []
    for entry in worker_result.memory_entries:
      mem = self.memory.write(
        source=task.worker_id or "orchestrator",
        entity=entry.get("entity", task.id),
        category=entry.get("category", "worker"),
        type=entry.get("type", MemoryType.SIGNAL.value),
        content=entry.get("content", {}),
        created_by=actor,
        namespace=entry.get("namespace", "workers"),
        key=entry.get("key", f"{task.id}/{len(kurmay_memory_batch)}"),
        confidence=float(entry.get("confidence", 0.5)),
        impact=entry.get("impact", MemoryImpact.LOW.value),
        related_task=task.id,
        actor_role=actor_role,
      )
      kurmay_memory_batch.append(
        {
          "namespace": mem.namespace,
          "key": mem.key,
          "type": mem.type,
          "impact": mem.impact,
          "confidence": mem.confidence,
          "content": mem.content,
        }
      )

    for exc_payload in worker_result.exceptions:
      severity = exc_payload.get("severity", ExceptionSeverity.MEDIUM.value)
      exc = self.exceptions.create(
        severity=severity,
        type=str(exc_payload.get("type", "WORKER_EXCEPTION")),
        message=str(exc_payload.get("message", "worker reported exception")),
        worker_id=task.worker_id,
        task_id=task.id,
        actor=actor,
        extra_metadata=exc_payload.get("metadata"),
      )
      kurmay_exception_batch.append(
        {
          "id": exc.id,
          "type": exc.type,
          "severity": exc.severity,
          "message": exc.message,
        }
      )

    risk = worker_result.risk_level or RiskLevel.LOW.value
    if self.policy.requires_review_for_risk(risk):
      return self._transition(task, TaskStatus.REVIEW, actor, f"risk level {risk} requires review")

    if self._should_trigger_kurmay(task, kurmay_memory_batch, kurmay_exception_batch):
      self._trigger_kurmay(task, kurmay_memory_batch, kurmay_exception_batch)

    if task.requires_approval or task.priority == TaskPriority.CRITICAL.value:
      return self._transition(task, TaskStatus.REVIEW, actor, "approval required")
    self._transition(task, TaskStatus.EXECUTED, actor, "worker executed")
    return task

  def _actor_role(self, actor: str) -> str:
    if actor.startswith("api:"):
      return actor.split(":", 1)[1].strip().lower()
    role = actor.strip().lower()
    known_roles = {
      "admin",
      "system",
      "operator",
      "worker",
      "security",
      "guest",
      "approver",
      "api-user",
    }
    if role in known_roles or role in self.policy.approver_roles:
      return role
    return "system"

  def _trigger_kurmay(
    self,
    task: Task,
    memory_entries: list[dict[str, Any]],
    exception_entries: list[dict[str, Any]],
  ) -> None:
    report = self.kurmay.synthesize(memory_entries, exception_entries)
    self.create_task(
      type="kurmay_synthesis",
      payload={
        "memory_entries": memory_entries,
        "exceptions": exception_entries,
        "parent_task_id": task.id,
        "report_id": report.report_id,
      },
      parent_id=task.id,
      created_by="kurmay-trigger",
      auto_start=True,
    )

  def _should_trigger_kurmay(
    self,
    task: Task,
    memory_entries: list[dict[str, Any]],
    exception_entries: list[dict[str, Any]] | None = None,
  ) -> bool:
    if task.type == "kurmay_synthesis":
      return False
    exceptions = exception_entries or []
    high_severities = {ExceptionSeverity.HIGH.value, ExceptionSeverity.CRITICAL.value}
    if any(exc.get("severity") in high_severities for exc in exceptions):
      return True
    thresholds = {
      MemoryImpact.MEDIUM.value,
      MemoryImpact.HIGH.value,
      MemoryImpact.CRITICAL.value,
    }
    return any(
      entry.get("impact") in thresholds
      and not str(entry.get("namespace", "")).startswith("insights/kurmay")
      for entry in memory_entries
    )

  def _failure_exception_severity(
    self,
    worker_result: WorkerResult | None = None,
    *,
    failure_severity: ExceptionSeverity | str | None = None,
  ) -> str:
    if failure_severity is not None:
      return failure_severity.value if isinstance(failure_severity, ExceptionSeverity) else failure_severity
    if worker_result and worker_result.risk_level in {RiskLevel.HIGH.value, RiskLevel.CRITICAL.value}:
      return worker_result.risk_level
    if worker_result:
      for exc_payload in worker_result.exceptions:
        sev = str(exc_payload.get("severity", ""))
        if sev in {ExceptionSeverity.HIGH.value, ExceptionSeverity.CRITICAL.value}:
          return sev
    return ExceptionSeverity.MEDIUM.value

  def _handle_worker_failure(
    self,
    task: Task,
    actor: str,
    message: str,
    *,
    retryable: bool,
    worker_result: WorkerResult | None = None,
    failure_severity: ExceptionSeverity | str | None = None,
  ) -> Task:
    task.error = message
    severity = self._failure_exception_severity(worker_result, failure_severity=failure_severity)
    exc = self.exceptions.create(
      severity=severity,
      type="WORKER_EXECUTION_FAILED",
      message=message,
      worker_id=task.worker_id,
      task_id=task.id,
      actor=actor,
    )
    self.exceptions.transition(exc.id, ExceptionStatus.CLASSIFIED, actor=actor, note=message)
    exception_batch = [
      {
        "id": exc.id,
        "type": exc.type,
        "severity": exc.severity,
        "message": exc.message,
      }
    ]
    if self._should_trigger_kurmay(task, [], exception_batch):
      self._trigger_kurmay(task, [], exception_batch)
    if retryable and task.attempts < task.max_attempts:
      self._transition(task, TaskStatus.RETRY, actor, message)
      return self.advance(task.id, actor=actor, note="retry after failure")
    return self._transition(task, TaskStatus.FAILED, actor, message)

  def _fail_task(self, task: Task, actor: str, message: str) -> Task:
    task.error = message
    exc = self.exceptions.create(
      severity=ExceptionSeverity.MEDIUM,
      type="TASK_FAILED",
      message=message,
      worker_id=task.worker_id,
      task_id=task.id,
      actor=actor,
    )
    self.exceptions.transition(exc.id, ExceptionStatus.CLASSIFIED, actor=actor, note=message)
    return self._transition(task, TaskStatus.FAILED, actor, message)

  def _transition(
    self,
    task: Task,
    to_status: TaskStatus,
    actor: str,
    note: str | None,
  ) -> Task:
    before = task.status
    if TaskStatus(before) != to_status:
      allowed = TASK_TRANSITIONS.get(TaskStatus(before), frozenset())
      if to_status not in allowed:
        raise ValueError(f"invalid task transition {before} -> {to_status.value}")
    task.status = to_status.value
    task.updated_at = datetime.now(timezone.utc)
    if to_status == TaskStatus.RUNNING:
      task.started_at = datetime.now(timezone.utc)
    if to_status == TaskStatus.SUCCESS:
      task.completed_at = datetime.now(timezone.utc)
    self._record_transition(task, TaskStatus(before), to_status, actor, note)
    self.audit.log(
      actor=actor,
      action="task.transition",
      request_id=self.request_id,
      entity_type="task",
      entity_id=task.id,
      before_state={"status": before},
      after_state={"status": to_status.value},
      task_id=task.id,
      worker_id=task.worker_id,
    )
    self.session.flush()
    if to_status in {
      TaskStatus.VALIDATING,
      TaskStatus.ASSIGNED,
      TaskStatus.RUNNING,
      TaskStatus.EXECUTED,
    }:
      return self.advance(task.id, actor=actor)
    return task

  def _record_transition(
    self,
    task: Task,
    from_status: TaskStatus | None,
    to_status: TaskStatus,
    actor: str,
    note: str | None,
  ) -> None:
    self.session.add(
      TaskTransition(
        task_id=task.id,
        from_status=from_status.value if from_status else None,
        to_status=to_status.value,
        actor=actor,
        note=note,
      )
    )

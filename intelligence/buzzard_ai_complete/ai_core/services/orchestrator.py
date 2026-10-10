from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from buzzard_ai_complete.agents.esat_bey.agent import EsatBey, SecurityEvent
from buzzard_ai_complete.ai_core.enums import (
    TASK_TRANSITIONS,
    AuditResult,
    ExceptionSeverity,
    ExceptionStatus,
    MemoryType,
    RiskLevel,
    TaskPriority,
    TaskStatus,
)
from buzzard_ai_complete.ai_core.models.task import Task, TaskDependency, TaskTransition
from buzzard_ai_complete.ai_core.services.audit_service import AuditService
from buzzard_ai_complete.ai_core.services.exception_service import ExceptionService
from buzzard_ai_complete.ai_core.services.memory_service import CentralMemoryService
from buzzard_ai_complete.ai_core.workers.base import WorkerExecutionError, WorkerTimeoutError
from buzzard_ai_complete.ai_core.workers.executor import WorkerExecutor

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
}


class UnifiedOrchestrator:
  def __init__(
    self,
    session: Session,
    audit: AuditService,
    memory: CentralMemoryService,
    exceptions: ExceptionService,
    request_id: str = "system",
  ):
    self.session = session
    self.audit = audit
    self.memory = memory
    self.exceptions = exceptions
    self.request_id = request_id
    self.security = EsatBey()

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

    task = Task(
      type=type,
      payload=payload or {},
      priority=priority_val,
      status=TaskStatus.QUEUED.value,
      worker_id=worker_id or WORKER_ROUTING.get(type, "central-orchestrator"),
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

  def approve(self, task_id: str, *, actor: str, note: str | None = None) -> Task:
    task = self.session.get(Task, task_id)
    if not task:
      raise KeyError(f"task not found: {task_id}")
    if task.status != TaskStatus.REVIEW.value:
      raise ValueError("only REVIEW tasks can be approved")
    task.approved_by = actor
    task.approved_at = datetime.now(timezone.utc)
    self._transition(task, TaskStatus.APPROVED, actor, note or "human approval")
    return self.advance(task.id, actor=actor)

  def reject(self, task_id: str, *, actor: str, note: str | None = None) -> Task:
    task = self.session.get(Task, task_id)
    if not task:
      raise KeyError(f"task not found: {task_id}")
    if task.status != TaskStatus.REVIEW.value:
      raise ValueError("only REVIEW tasks can be rejected")
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

    security = self.security.inspect(
      SecurityEvent("task_execution", "LOW", {"task_id": task.id, "type": task.type})
    )
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
    executor = WorkerExecutor(self.session, self.audit, self.request_id)
    try:
      worker_result = executor.execute(task)
    except WorkerTimeoutError as exc:
      return self._handle_worker_failure(task, actor, str(exc), retryable=True)
    except WorkerExecutionError as exc:
      return self._handle_worker_failure(task, actor, str(exc), retryable=exc.retryable)

    if not worker_result.success:
      return self._handle_worker_failure(
        task,
        actor,
        worker_result.error or "worker execution failed",
        retryable=worker_result.retryable,
      )

    result = worker_result.to_dict()
    task.result = result
    self.memory.write(
      source=task.worker_id or "orchestrator",
      entity=task.id,
      category="task",
      type=MemoryType.TASK_RESULT,
      content=result,
      created_by=actor,
      namespace="tasks",
      key=task.id,
      confidence=0.95,
      related_task=task.id,
    )
    if task.requires_approval or task.priority == TaskPriority.CRITICAL.value:
      return self._transition(task, TaskStatus.REVIEW, actor, "approval required")
    self._transition(task, TaskStatus.EXECUTED, actor, "worker executed")
    return task

  def _handle_worker_failure(
    self,
    task: Task,
    actor: str,
    message: str,
    *,
    retryable: bool,
  ) -> Task:
    task.error = message
    exc = self.exceptions.create(
      severity=ExceptionSeverity.MEDIUM,
      type="WORKER_EXECUTION_FAILED",
      message=message,
      worker_id=task.worker_id,
      task_id=task.id,
      actor=actor,
    )
    self.exceptions.transition(exc.id, ExceptionStatus.CLASSIFIED, actor=actor, note=message)
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

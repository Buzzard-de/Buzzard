from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.enums import (
    EXCEPTION_TRANSITIONS,
    ExceptionSeverity,
    ExceptionStatus,
)
from buzzard_ai_complete.ai_core.models.exception_record import ExceptionRecord, ExceptionTransition
from buzzard_ai_complete.ai_core.services.audit_service import AuditService


class ExceptionService:
  HALTED_WORKERS: set[str] = set()

  def __init__(self, session: Session, audit: AuditService, request_id: str = "system"):
    self.session = session
    self.audit = audit
    self.request_id = request_id

  def create(
    self,
    *,
    severity: ExceptionSeverity | str,
    type: str,
    message: str,
    actor: str = "exception-engine",
    entity: str | None = None,
    owner: str | None = None,
    worker_id: str | None = None,
    task_id: str | None = None,
    extra_metadata: dict[str, Any] | None = None,
  ) -> ExceptionRecord:
    sev = severity.value if isinstance(severity, ExceptionSeverity) else severity
    record = ExceptionRecord(
      severity=sev,
      type=type,
      message=message,
      entity=entity,
      owner=owner or "exception-engine",
      worker_id=worker_id,
      task_id=task_id,
      status=ExceptionStatus.DETECTED.value,
      extra_metadata=extra_metadata,
    )
    self.session.add(record)
    self.session.flush()
    self._add_transition(record, None, ExceptionStatus.DETECTED, actor, "created")
    if sev == ExceptionSeverity.CRITICAL.value and worker_id:
      record.contained = True
      record.worker_halted = True
      self.HALTED_WORKERS.add(worker_id)
      self.transition(
        record.id,
        ExceptionStatus.CONTAINED,
        actor="exception-engine",
        note="CRITICAL: worker halted",
      )
    self.audit.log(
      actor=actor,
      action="exception.create",
      request_id=self.request_id,
      entity_type="exception",
      entity_id=record.id,
      after_state={"severity": sev, "type": type, "status": record.status},
      task_id=task_id,
      worker_id=worker_id,
    )
    return record

  def transition(
    self,
    exception_id: str,
    to_status: ExceptionStatus | str,
    *,
    actor: str,
    note: str | None = None,
    resolution: str | None = None,
    assigned_to: str | None = None,
  ) -> ExceptionRecord:
    record = self.session.get(ExceptionRecord, exception_id)
    if not record:
      raise KeyError(f"exception not found: {exception_id}")
    target = to_status.value if isinstance(to_status, ExceptionStatus) else to_status
    current = ExceptionStatus(record.status)
    allowed = EXCEPTION_TRANSITIONS.get(current, frozenset())
    if ExceptionStatus(target) not in allowed:
      raise ValueError(f"invalid exception transition {record.status} -> {target}")
    before = record.status
    record.status = target
    if assigned_to:
      record.assigned_to = assigned_to
    if resolution:
      record.resolution = resolution
    if target == ExceptionStatus.RESOLVED.value:
      record.resolved_at = datetime.now(timezone.utc)
      if record.worker_id and record.worker_halted:
        self.HALTED_WORKERS.discard(record.worker_id)
        record.worker_halted = False
    self._add_transition(record, before, ExceptionStatus(target), actor, note)
    self.audit.log(
      actor=actor,
      action="exception.transition",
      request_id=self.request_id,
      entity_type="exception",
      entity_id=record.id,
      before_state={"status": before},
      after_state={"status": target},
      task_id=record.task_id,
      worker_id=record.worker_id,
    )
    return record

  def get(self, exception_id: str) -> ExceptionRecord | None:
    return self.session.get(ExceptionRecord, exception_id)

  def list_records(
    self,
    *,
    status: str | None = None,
    severity: str | None = None,
    task_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
  ) -> list[ExceptionRecord]:
    query = self.session.query(ExceptionRecord).order_by(ExceptionRecord.created_at.desc())
    if status:
      query = query.filter(ExceptionRecord.status == status)
    if severity:
      query = query.filter(ExceptionRecord.severity == severity)
    if task_id:
      query = query.filter(ExceptionRecord.task_id == task_id)
    return query.offset(offset).limit(limit).all()

  def is_worker_halted(self, worker_id: str) -> bool:
    return worker_id in self.HALTED_WORKERS

  def _add_transition(
    self,
    record: ExceptionRecord,
    from_status: ExceptionStatus | str | None,
    to_status: ExceptionStatus,
    actor: str,
    note: str | None,
  ) -> None:
    self.session.add(
      ExceptionTransition(
        exception_id=record.id,
        from_status=from_status.value if isinstance(from_status, ExceptionStatus) else from_status,
        to_status=to_status.value,
        actor=actor,
        note=note,
      )
    )

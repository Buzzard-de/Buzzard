from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.enums import AuditResult, RiskLevel
from buzzard_ai_complete.ai_core.models.audit import AuditLog


class AuditService:
  def __init__(self, session: Session):
    self.session = session

  def log(
    self,
    *,
    actor: str,
    action: str,
    request_id: str,
    worker_id: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    before_state: dict[str, Any] | None = None,
    after_state: dict[str, Any] | None = None,
    task_id: str | None = None,
    risk: RiskLevel | str = RiskLevel.LOW,
    result: AuditResult | str = AuditResult.OK,
  ) -> AuditLog:
    entry = AuditLog(
      actor=actor,
      worker_id=worker_id,
      action=action,
      entity_type=entity_type,
      entity_id=entity_id,
      before_state=before_state,
      after_state=after_state,
      request_id=request_id,
      task_id=task_id,
      risk=risk.value if isinstance(risk, RiskLevel) else risk,
      result=result.value if isinstance(result, AuditResult) else result,
    )
    self.session.add(entry)
    self.session.flush()
    return entry

  def list_entries(
    self,
    *,
    actor: str | None = None,
    action: str | None = None,
    entity_type: str | None = None,
    limit: int = 100,
    offset: int = 0,
  ) -> list[AuditLog]:
    query = self.session.query(AuditLog).order_by(AuditLog.created_at.desc())
    if actor:
      query = query.filter(AuditLog.actor == actor)
    if action:
      query = query.filter(AuditLog.action == action)
    if entity_type:
      query = query.filter(AuditLog.entity_type == entity_type)
    return query.offset(offset).limit(limit).all()

  def get(self, audit_id: str) -> AuditLog | None:
    return self.session.get(AuditLog, audit_id)

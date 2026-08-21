from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.enums import MemoryImpact, MemoryType
from buzzard_ai_complete.ai_core.models.memory import MemoryEntry, MemoryHistory
from buzzard_ai_complete.ai_core.services.audit_service import AuditService


class CentralMemoryService:
  def __init__(self, session: Session, audit: AuditService, request_id: str = "system"):
    self.session = session
    self.audit = audit
    self.request_id = request_id

  def write(
    self,
    *,
    source: str,
    entity: str,
    category: str,
    type: MemoryType | str,
    content: dict[str, Any],
    created_by: str,
    namespace: str,
    key: str,
    confidence: float = 0.0,
    impact: MemoryImpact | str = MemoryImpact.LOW,
    expires_at: datetime | None = None,
    related_task: str | None = None,
    audit_id: str | None = None,
  ) -> MemoryEntry:
    if not 0.0 <= confidence <= 1.0:
      raise ValueError("confidence must be between 0 and 1")
    mem_type = type.value if isinstance(type, MemoryType) else type
    impact_val = impact.value if isinstance(impact, MemoryImpact) else impact
    existing = (
      self.session.query(MemoryEntry)
      .filter(
        and_(
          MemoryEntry.namespace == namespace,
          MemoryEntry.key == key,
          MemoryEntry.valid_to.is_(None),
        )
      )
      .one_or_none()
    )
    if existing:
      self.session.add(
        MemoryHistory(
          memory_id=existing.id,
          namespace=existing.namespace,
          key=existing.key,
          content=existing.content,
          source=existing.source,
          confidence=existing.confidence,
          version=existing.version,
          changed_by=created_by,
        )
      )
      before = {
        "content": existing.content,
        "version": existing.version,
        "confidence": existing.confidence,
      }
      existing.content = content
      existing.source = source
      existing.entity = entity
      existing.category = category
      existing.type = mem_type
      existing.confidence = confidence
      existing.impact = impact_val
      existing.version += 1
      existing.updated_at = datetime.now(timezone.utc)
      existing.related_task = related_task or existing.related_task
      existing.audit_id = audit_id or existing.audit_id
      if expires_at:
        existing.expires_at = expires_at
      self.session.flush()
      self.audit.log(
        actor=created_by,
        action="memory.update",
        request_id=self.request_id,
        entity_type="memory",
        entity_id=existing.id,
        before_state=before,
        after_state={"content": content, "version": existing.version},
        task_id=related_task,
      )
      return existing

    entry = MemoryEntry(
      source=source,
      entity=entity,
      category=category,
      type=mem_type,
      content=content,
      confidence=confidence,
      impact=impact_val,
      namespace=namespace,
      key=key,
      expires_at=expires_at,
      created_by=created_by,
      related_task=related_task,
      audit_id=audit_id,
    )
    self.session.add(entry)
    self.session.flush()
    self.audit.log(
      actor=created_by,
      action="memory.create",
      request_id=self.request_id,
      entity_type="memory",
      entity_id=entry.id,
      after_state={"namespace": namespace, "key": key, "type": mem_type},
      task_id=related_task,
    )
    return entry

  def get(self, memory_id: str) -> MemoryEntry | None:
    return self.session.get(MemoryEntry, memory_id)

  def get_by_key(self, namespace: str, key: str) -> MemoryEntry | None:
    return (
      self.session.query(MemoryEntry)
      .filter(
        and_(
          MemoryEntry.namespace == namespace,
          MemoryEntry.key == key,
          MemoryEntry.valid_to.is_(None),
        )
      )
      .one_or_none()
    )

  def search(
    self,
    *,
    q: str | None = None,
    type: str | None = None,
    category: str | None = None,
    impact: str | None = None,
    limit: int = 50,
    offset: int = 0,
  ) -> list[MemoryEntry]:
    query = self.session.query(MemoryEntry).filter(MemoryEntry.valid_to.is_(None))
    if type:
      query = query.filter(MemoryEntry.type == type)
    if category:
      query = query.filter(MemoryEntry.category == category)
    if impact:
      query = query.filter(MemoryEntry.impact == impact)
    if q:
      like = f"%{q}%"
      query = query.filter(
        or_(
          MemoryEntry.namespace.ilike(like),
          MemoryEntry.key.ilike(like),
          MemoryEntry.entity.ilike(like),
          MemoryEntry.source.ilike(like),
        )
      )
    return query.order_by(MemoryEntry.updated_at.desc()).offset(offset).limit(limit).all()

  def history(self, memory_id: str) -> list[MemoryHistory]:
    return (
      self.session.query(MemoryHistory)
      .filter(MemoryHistory.memory_id == memory_id)
      .order_by(MemoryHistory.version.asc())
      .all()
    )

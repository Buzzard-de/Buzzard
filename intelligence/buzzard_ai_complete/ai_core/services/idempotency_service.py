from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.models.idempotency_key import IdempotencyKeyRecord
from buzzard_ai_complete.config import settings


class IdempotencyService:
    """Deduplicate write operations via ai_core_idempotency_keys."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, key: str) -> IdempotencyKeyRecord | None:
        record = self.session.get(IdempotencyKeyRecord, key)
        if record is None:
            return None
        expires_at = record.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            self.session.delete(record)
            self.session.flush()
            return None
        return record

    def reserve(
        self,
        key: str,
        *,
        resource_type: str,
        resource_id: str | None = None,
    ) -> IdempotencyKeyRecord | None:
        existing = self.get(key)
        if existing is not None:
            return existing
        now = datetime.now(timezone.utc)
        record = IdempotencyKeyRecord(
            key=key,
            resource_type=resource_type,
            resource_id=resource_id,
            result=None,
            created_at=now,
            expires_at=now + timedelta(seconds=settings.IDEMPOTENCY_TTL_SECONDS),
        )
        self.session.add(record)
        try:
            self.session.flush()
        except Exception:
            self.session.rollback()
            return self.get(key)
        return record

    def complete(self, key: str, result: dict[str, Any], *, resource_id: str | None = None) -> None:
        record = self.session.get(IdempotencyKeyRecord, key)
        if record is None:
            return
        record.result = result
        if resource_id:
            record.resource_id = resource_id
        self.session.flush()

    def execute_once(
        self,
        key: str,
        *,
        resource_type: str,
        handler,
    ) -> dict[str, Any]:
        existing = self.reserve(key, resource_type=resource_type)
        if existing is not None and existing.result is not None:
            return dict(existing.result)
        if existing is None:
            existing = self.reserve(key, resource_type=resource_type)
        result = handler()
        self.complete(key, result, resource_id=result.get("resource_id"))
        return result

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Callable

from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.models.event_outbox import EventOutboxRecord
from buzzard_ai_complete.config import settings


class EventService:
    """Transactional event outbox with retry and dead-letter handling."""

    STATUS_PENDING = "PENDING"
    STATUS_PROCESSING = "PROCESSING"
    STATUS_PROCESSED = "PROCESSED"
    STATUS_FAILED = "FAILED"
    STATUS_DEAD_LETTER = "DEAD_LETTER"

    def __init__(self, session: Session) -> None:
        self.session = session
        self._processed_ids: set[str] = set()

    def emit(
        self,
        event_type: str,
        payload: dict[str, Any],
        *,
        source: str,
        correlation_id: str | None = None,
        causation_id: str | None = None,
    ) -> EventOutboxRecord:
        now = datetime.now(timezone.utc)
        record = EventOutboxRecord(
            id=str(uuid.uuid4()),
            event_type=event_type,
            payload=payload,
            correlation_id=correlation_id,
            causation_id=causation_id,
            source=source,
            status=self.STATUS_PENDING,
            created_at=now,
            retry_count=0,
        )
        self.session.add(record)
        self.session.flush()
        return record

    def list_events(
        self,
        *,
        status: str | None = None,
        event_type: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[EventOutboxRecord]:
        query = self.session.query(EventOutboxRecord)
        if status:
            query = query.filter(EventOutboxRecord.status == status)
        if event_type:
            query = query.filter(EventOutboxRecord.event_type == event_type)
        return (
            query.order_by(EventOutboxRecord.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def count_events(self, *, status: str | None = None, event_type: str | None = None) -> int:
        query = self.session.query(EventOutboxRecord)
        if status:
            query = query.filter(EventOutboxRecord.status == status)
        if event_type:
            query = query.filter(EventOutboxRecord.event_type == event_type)
        return query.count()

    def get(self, event_id: str) -> EventOutboxRecord | None:
        return self.session.get(EventOutboxRecord, event_id)

    def list_dead_letter(self, *, limit: int = 50, offset: int = 0) -> list[EventOutboxRecord]:
        return self.list_events(status=self.STATUS_DEAD_LETTER, limit=limit, offset=offset)

    def process_pending(
        self,
        handler: Callable[[EventOutboxRecord], None],
        *,
        limit: int = 100,
    ) -> int:
        pending = (
            self.session.query(EventOutboxRecord)
            .filter(EventOutboxRecord.status.in_([self.STATUS_PENDING, self.STATUS_FAILED]))
            .order_by(EventOutboxRecord.created_at.asc())
            .limit(limit)
            .all()
        )
        processed = 0
        for record in pending:
            if record.id in self._processed_ids:
                continue
            record.status = self.STATUS_PROCESSING
            self.session.flush()
            try:
                handler(record)
                record.status = self.STATUS_PROCESSED
                record.processed_at = datetime.now(timezone.utc)
                record.last_error = None
                self._processed_ids.add(record.id)
                processed += 1
            except Exception as exc:
                record.retry_count += 1
                record.last_error = str(exc)[:1024]
                if record.retry_count >= settings.EVENT_MAX_RETRIES:
                    record.status = self.STATUS_DEAD_LETTER
                else:
                    record.status = self.STATUS_FAILED
            self.session.flush()
        return processed

    def replay(self, event_id: str, *, actor: str, idempotency_key: str) -> EventOutboxRecord:
        original = self.get(event_id)
        if original is None:
            raise KeyError(f"event not found: {event_id}")
        if original.status != self.STATUS_DEAD_LETTER:
            raise ValueError("only dead-letter events can be replayed")
        replay = self.emit(
            original.event_type,
            dict(original.payload),
            source=f"replay:{actor}",
            correlation_id=original.correlation_id,
            causation_id=original.id,
        )
        replay.payload = {
            **replay.payload,
            "replay": {
                "original_event_id": original.id,
                "idempotency_key": idempotency_key,
                "actor": actor,
            },
        }
        self.session.flush()
        return replay

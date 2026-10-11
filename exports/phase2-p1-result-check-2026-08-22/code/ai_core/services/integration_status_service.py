from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.integrations.registry import IntegrationStatusRegistry
from buzzard_ai_complete.ai_core.models.integration_status import IntegrationStatusRecord


class IntegrationStatusService:
    """Persist integration status to ai_core_integration_status."""

    DEFAULT_INTEGRATIONS = (
        "commerce",
        "supplier_feeds",
        "wms",
        "customs_authority",
        "crm",
        "llm_provider",
    )

    def __init__(self, session: Session) -> None:
        self.session = session

    def ensure_defaults(self) -> None:
        now = datetime.now(timezone.utc)
        for integration_id in self.DEFAULT_INTEGRATIONS:
            record = self.session.get(IntegrationStatusRecord, integration_id)
            if record is None:
                self.session.add(
                    IntegrationStatusRecord(
                        integration_id=integration_id,
                        status="EXTERNAL_INTEGRATION_PENDING",
                        message="not connected",
                        last_checked_at=now,
                        extra_metadata={},
                        created_at=now,
                        updated_at=now,
                    )
                )
        self.session.flush()

    def sync_from_registry(self, registry: IntegrationStatusRegistry) -> int:
        now = datetime.now(timezone.utc)
        count = 0
        for item in registry.list_status():
            iid = str(item["integration_id"])
            status = str(item["status"])
            record = self.session.get(IntegrationStatusRecord, iid)
            if record is None:
                record = IntegrationStatusRecord(
                    integration_id=iid,
                    status=status,
                    message=None,
                    last_checked_at=now,
                    extra_metadata={},
                    created_at=now,
                    updated_at=now,
                )
                self.session.add(record)
            else:
                record.status = status
                record.last_checked_at = now
                record.updated_at = now
            count += 1
        self.session.flush()
        return count

    def list_status(self) -> list[dict[str, Any]]:
        rows = (
            self.session.query(IntegrationStatusRecord)
            .order_by(IntegrationStatusRecord.integration_id.asc())
            .all()
        )
        return [
            {
                "integration_id": row.integration_id,
                "status": row.status,
                "message": row.message,
                "last_checked_at": row.last_checked_at.isoformat() if row.last_checked_at else None,
            }
            for row in rows
        ]

    def get_status(self, integration_id: str) -> str:
        record = self.session.get(IntegrationStatusRecord, integration_id)
        if record is None:
            return "EXTERNAL_INTEGRATION_PENDING"
        return record.status

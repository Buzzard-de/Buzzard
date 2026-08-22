from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.models.worker_registry import WorkerRegistryRecord
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker
from buzzard_ai_complete.ai_core.workers.registry import WorkerRegistry


class WorkerRegistryService:
    """Persist in-memory worker registry metadata to ai_core_workers."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def sync_registry(self, registry: WorkerRegistry) -> int:
        count = 0
        now = datetime.now(timezone.utc)
        for worker in registry.list_workers():
            record = self.session.get(WorkerRegistryRecord, worker.worker_id)
            family = getattr(worker, "family", "general")
            permissions: list[str] = []
            capabilities: list[str] = []
            risk_default = "LOW"
            extra: dict = {}
            if isinstance(worker, BuzzardWorker):
                family = worker.family
                permissions = sorted(worker.permissions)
                capabilities = sorted(worker.capabilities)
                risk_default = worker.risk_default.value
                extra = dict(worker.metadata)
            if record is None:
                record = WorkerRegistryRecord(
                    worker_id=worker.worker_id,
                    family=family,
                    status="REGISTERED",
                    capabilities=capabilities,
                    permissions=permissions,
                    risk_default=risk_default,
                    health_status="UNKNOWN",
                    extra_metadata=extra,
                    created_at=now,
                    updated_at=now,
                )
                self.session.add(record)
            else:
                record.family = family
                record.capabilities = capabilities
                record.permissions = permissions
                record.risk_default = risk_default
                record.extra_metadata = extra
                record.status = "REGISTERED"
                record.updated_at = now
            count += 1
        self.session.flush()
        return count

    def list_records(self, limit: int = 200) -> list[WorkerRegistryRecord]:
        return (
            self.session.query(WorkerRegistryRecord)
            .order_by(WorkerRegistryRecord.worker_id.asc())
            .limit(limit)
            .all()
        )

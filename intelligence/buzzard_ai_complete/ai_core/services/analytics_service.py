from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.models.return_record import ReturnRecord
from buzzard_ai_complete.ai_core.models.shipment_record import ShipmentRecord
from buzzard_ai_complete.ai_core.models.task import Task
from buzzard_ai_complete.ai_core.observability.metrics import get_metrics_registry
from buzzard_ai_complete.ai_core.workers.registry import get_registry


class AnalyticsService:
    def __init__(self, session: Session) -> None:
        self._session = session

    def worker_kpis(self) -> dict[str, Any]:
        registry = get_registry()
        workers = registry.list_workers()
        task_counts = dict(
            self._session.execute(
                select(Task.worker_id, func.count()).group_by(Task.worker_id)
            ).all()
        )
        return {
            "workers_registered": len(workers),
            "workers": [
                {
                    "worker_id": w.worker_id,
                    "family": getattr(w, "family", None),
                    "task_types": sorted(w.supported_task_types),
                    "tasks_executed": int(task_counts.get(w.worker_id, 0)),
                }
                for w in workers
            ],
        }

    def platform_kpis(self) -> dict[str, Any]:
        returns_count = self._session.scalar(select(func.count()).select_from(ReturnRecord)) or 0
        shipments_count = self._session.scalar(select(func.count()).select_from(ShipmentRecord)) or 0
        tasks_count = self._session.scalar(select(func.count()).select_from(Task)) or 0
        metrics = get_metrics_registry().collect_all()
        return {
            "returns_evaluated": returns_count,
            "shipments_created": shipments_count,
            "tasks_total": tasks_count,
            "metrics_samples": len(metrics),
        }

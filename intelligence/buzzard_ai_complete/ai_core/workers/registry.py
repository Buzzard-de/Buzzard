from __future__ import annotations

from buzzard_ai_complete.ai_core.workers.base import Worker
from buzzard_ai_complete.ai_core.workers.deterministic import (
    CategoryScanWorker,
    CustomTaskWorker,
    CustomerServiceWorker,
    PriceRecheckWorker,
    SystemHealthWorker,
)


class WorkerRegistry:
    def __init__(self) -> None:
        self._by_worker_id: dict[str, Worker] = {}
        self._by_task_type: dict[str, Worker] = {}

    def register(self, worker: Worker) -> None:
        self._by_worker_id[worker.worker_id] = worker
        for task_type in worker.supported_task_types:
            self._by_task_type[task_type] = worker

    def get_for_task(self, task_type: str, worker_id: str | None = None) -> Worker | None:
        if worker_id and worker_id in self._by_worker_id:
            return self._by_worker_id[worker_id]
        return self._by_task_type.get(task_type)

    def list_workers(self) -> list[Worker]:
        return list(self._by_worker_id.values())


def build_default_registry() -> WorkerRegistry:
    registry = WorkerRegistry()
    for worker in (
        CategoryScanWorker(),
        PriceRecheckWorker(),
        SystemHealthWorker(),
        CustomTaskWorker(),
        CustomerServiceWorker(),
    ):
        registry.register(worker)
    return registry

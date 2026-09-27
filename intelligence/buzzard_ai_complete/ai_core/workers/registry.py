from __future__ import annotations

from buzzard_ai_complete.ai_core.taxonomy.registry import TaxonomyRegistry
from buzzard_ai_complete.ai_core.workers.base import Worker
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker
from buzzard_ai_complete.ai_core.workers.category.factory import CategoryWorkerFactory
from buzzard_ai_complete.ai_core.workers.customer.service_worker import CustomerServiceAIWorker
from buzzard_ai_complete.ai_core.workers.customs.classifier_worker import CustomsClassifierWorker
from buzzard_ai_complete.ai_core.workers.deterministic import (
    CategoryScanWorker,
    CustomTaskWorker,
    SystemHealthWorker,
)
from buzzard_ai_complete.ai_core.workers.exception.coordinator_worker import ExceptionCoordinatorWorker
from buzzard_ai_complete.ai_core.workers.kurmay.synthesis_worker import KurmaySynthesisWorker
from buzzard_ai_complete.ai_core.workers.order.engine_worker import OrderEngineWorker
from buzzard_ai_complete.ai_core.workers.price.engine_worker import PriceEngineWorker
from buzzard_ai_complete.ai_core.workers.product.intelligence_worker import ProductIntelligenceWorker
from buzzard_ai_complete.ai_core.workers.security.security_worker import SecurityAIWorker
from buzzard_ai_complete.ai_core.workers.stock.engine_worker import StockEngineWorker
from buzzard_ai_complete.ai_core.workers.supplier.hub_worker import SupplierHubWorker
from buzzard_ai_complete.config import settings


class WorkerRegistry:
    def __init__(self) -> None:
        self._by_worker_id: dict[str, Worker] = {}
        self._by_task_type: dict[str, Worker] = {}

    def register(self, worker: Worker) -> None:
        self._by_worker_id[worker.worker_id] = worker
        for task_type in worker.supported_task_types:
            self._by_task_type[task_type] = worker

    def get(self, worker_id: str) -> Worker | None:
        return self._by_worker_id.get(worker_id)

    def get_for_task(self, task_type: str, worker_id: str | None = None) -> Worker | None:
        if worker_id and worker_id in self._by_worker_id:
            return self._by_worker_id[worker_id]
        return self._by_task_type.get(task_type)

    def list_workers(self) -> list[Worker]:
        return list(self._by_worker_id.values())

    def list_worker_ids(self) -> list[str]:
        return sorted(self._by_worker_id.keys())


def build_default_registry() -> WorkerRegistry:
    from buzzard_ai_complete.ai_core.workers.deterministic import (
        CustomerServiceWorker,
        PriceRecheckWorker,
    )

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


def build_phase2_registry(coordinator=None) -> WorkerRegistry:
    registry = WorkerRegistry()
    taxonomy = TaxonomyRegistry()
    factory = CategoryWorkerFactory(taxonomy)

    for worker in (
        SystemHealthWorker(),
        CustomTaskWorker(),
        SupplierHubWorker(),
        ProductIntelligenceWorker(),
        PriceEngineWorker(),
        StockEngineWorker(),
        CustomsClassifierWorker(),
        OrderEngineWorker(),
        CustomerServiceAIWorker(),
        SecurityAIWorker(),
        KurmaySynthesisWorker(),
        ExceptionCoordinatorWorker(coordinator=coordinator),
    ):
        registry.register(worker)

    for category_worker in factory.create_workers():
        registry.register(category_worker)

    return registry


def get_registry() -> WorkerRegistry:
    if settings.BUZZARD_AI_CORE_V2:
        return build_phase2_registry()
    return build_default_registry()

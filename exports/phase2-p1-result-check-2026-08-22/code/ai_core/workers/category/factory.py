from __future__ import annotations

from buzzard_ai_complete.ai_core.taxonomy.registry import TaxonomyRegistry
from buzzard_ai_complete.ai_core.workers.category.expert_worker import CategoryExpertWorker


class CategoryWorkerFactory:
    def __init__(self, registry: TaxonomyRegistry | None = None) -> None:
        self.registry = registry or TaxonomyRegistry()

    def create_workers(self) -> list[CategoryExpertWorker]:
        self.registry.load()
        return [CategoryExpertWorker(node) for node in self.registry.list_main_categories()]

    def create_for_node(self, node_id: str) -> CategoryExpertWorker | None:
        node = self.registry.get_node(node_id)
        if node is None or node.level != 1:
            return None
        return CategoryExpertWorker(node)

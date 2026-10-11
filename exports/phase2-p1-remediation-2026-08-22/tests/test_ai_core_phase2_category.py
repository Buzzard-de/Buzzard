"""Phase 2 Category Intelligence tests."""

from __future__ import annotations

import pytest

from buzzard_ai_complete.ai_core.enums import TaskStatus
from buzzard_ai_complete.ai_core.services.orchestrator import resolve_worker_id
from buzzard_ai_complete.ai_core.taxonomy.legacy_bridge import resolve_legacy_category_id
from buzzard_ai_complete.ai_core.taxonomy.registry import TaxonomyRegistry
from buzzard_ai_complete.ai_core.workers.category.factory import CategoryWorkerFactory
from buzzard_ai_complete.ai_core.workers.registry import build_phase2_registry
from buzzard_ai_complete.config import settings


@pytest.fixture(autouse=True)
def enable_v2(monkeypatch):
    monkeypatch.setenv("BUZZARD_AI_CORE_V2", "1")
    settings.BUZZARD_AI_CORE_V2 = True


def test_worker_count_matches_taxonomy_l1():
    taxonomy = TaxonomyRegistry()
    factory = CategoryWorkerFactory(taxonomy)
    workers = factory.create_workers()
    assert len(workers) == taxonomy.main_category_count()
    assert len(workers) == len(taxonomy.list_main_categories())


def test_category_worker_ids_format():
    taxonomy = TaxonomyRegistry()
    for node in taxonomy.list_main_categories():
        wid = f"category-{node.id}"
        assert wid.startswith("category-bz.")


def test_resolve_worker_id_for_category_scan():
    taxonomy = TaxonomyRegistry()
    node = taxonomy.list_main_categories()[0]
    wid = resolve_worker_id("category_scan", {"category_id": node.id})
    assert wid == f"category-{node.id}"


def test_legacy_bridge_cat_to_bz():
    resolved = resolve_legacy_category_id("cat-01")
    assert resolved is None or resolved.startswith("bz.")


def test_category_scan_writes_memory(services):
    taxonomy = TaxonomyRegistry()
    node = taxonomy.list_main_categories()[0]
    orch = services["orchestrator"]
    task = orch.create_task(
        type="category_scan",
        payload={
            "category_id": node.id,
            "offers": [{"title": "test item", "price": 9.99}],
        },
        created_by="tester",
    )
    assert task.status == TaskStatus.SUCCESS.value
    mem = services["memory"].search(q=f"categories/{node.id}", limit=10)
    assert len(mem) >= 1


def test_category_worker_registered_in_registry():
    reg = build_phase2_registry()
    taxonomy = TaxonomyRegistry()
    for node in taxonomy.list_main_categories():
        assert reg.get(f"category-{node.id}") is not None

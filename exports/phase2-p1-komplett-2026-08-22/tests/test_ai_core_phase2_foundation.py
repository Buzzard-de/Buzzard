"""Phase 2 foundation tests."""

from __future__ import annotations

import os

import pytest

from buzzard_ai_complete.ai_core.taxonomy.registry import TaxonomyRegistry
from buzzard_ai_complete.ai_core.workers.base import WorkerResult
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker
from buzzard_ai_complete.ai_core.workers.registry import build_phase2_registry, get_registry
from buzzard_ai_complete.config import settings


@pytest.fixture(autouse=True)
def enable_v2(monkeypatch):
    monkeypatch.setenv("BUZZARD_AI_CORE_V2", "1")
    settings.BUZZARD_AI_CORE_V2 = True


def test_buzzard_worker_result_extensions():
    result = WorkerResult(
        success=True,
        output={"ok": True},
        confidence=0.8,
        risk_level="MEDIUM",
        memory_entries=[{"namespace": "categories/bz.01", "type": "SIGNAL", "content": {}}],
        exceptions=[{"type": "TEST", "message": "x", "severity": "LOW"}],
    )
    data = result.to_dict()
    assert data["confidence"] == 0.8
    assert data["risk_level"] == "MEDIUM"
    assert len(data["memory_entries"]) == 1


def test_taxonomy_registry_dynamic_count():
    registry = TaxonomyRegistry()
    main = registry.list_main_categories()
    assert len(main) > 0
    assert all(node.id.startswith("bz.") for node in main)
    # Never hard-code 48 — count must come from authoritative tree at runtime
    assert registry.main_category_count() == len(main)


def test_phase2_registry_includes_category_workers():
    reg = build_phase2_registry()
    taxonomy = TaxonomyRegistry()
    expected = {f"category-{node.id}" for node in taxonomy.list_main_categories()}
    ids = set(reg.list_worker_ids())
    assert expected.issubset(ids)
    assert "kurmay" in ids
    assert "supplier-hub" in ids
    assert "price-engine" in ids


def test_routed_workers_registered():
    reg = get_registry()
    for worker_id in (
        "supplier-hub",
        "stock-engine",
        "product-intelligence",
        "order-engine",
        "customs-classifier",
    ):
        assert reg.get(worker_id) is not None


def test_buzzard_worker_permissions():
    worker = get_registry().get("price-engine")
    assert isinstance(worker, BuzzardWorker)
    assert worker.check_permission("price:read")
    assert not worker.check_permission("admin:destroy")

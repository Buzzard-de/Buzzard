"""Parameterized category worker execution — one test per L1 main category."""

from __future__ import annotations

import pytest

from buzzard_ai_complete.ai_core.enums import TaskStatus
from buzzard_ai_complete.ai_core.taxonomy.registry import TaxonomyRegistry
from buzzard_ai_complete.config import settings


@pytest.fixture(autouse=True)
def enable_v2(monkeypatch):
    monkeypatch.setenv("BUZZARD_AI_CORE_V2", "1")
    settings.BUZZARD_AI_CORE_V2 = True


@pytest.fixture(scope="module")
def main_category_ids():
    taxonomy = TaxonomyRegistry()
    return [node.id for node in taxonomy.list_main_categories()]


@pytest.mark.parametrize(
    "category_id",
    [node.id for node in TaxonomyRegistry().list_main_categories()],
)
def test_category_scan_executes_for_each_l1(services, category_id):
    orch = services["orchestrator"]
    task = orch.create_task(
        type="category_scan",
        payload={
            "category_id": category_id,
            "offers": [{"title": f"probe-{category_id}", "price": 1.0}],
        },
        created_by="tester",
    )
    assert task.status in {TaskStatus.SUCCESS.value, TaskStatus.REVIEW.value}
    assert task.result is not None
    assert task.result["success"] is True


def test_category_count_matches_taxonomy_not_hardcoded():
    taxonomy = TaxonomyRegistry()
    count = taxonomy.main_category_count()
    assert count >= 1
    assert all(node.id.startswith("bz.") for node in taxonomy.list_main_categories())

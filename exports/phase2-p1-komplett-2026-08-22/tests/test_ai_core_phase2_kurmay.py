"""Phase 2 Kurmay AI tests."""

from __future__ import annotations

import pytest

from buzzard_ai_complete.ai_core.enums import MemoryImpact, MemoryType, TaskStatus
from buzzard_ai_complete.ai_core.kurmay.rule_engine import KurmayRuleEngine
from buzzard_ai_complete.ai_core.kurmay.service import KurmayService
from buzzard_ai_complete.config import settings


@pytest.fixture(autouse=True)
def enable_v2(monkeypatch):
    monkeypatch.setenv("BUZZARD_AI_CORE_V2", "1")
    settings.BUZZARD_AI_CORE_V2 = True


def test_kurmay_rule_engine_synthesizes_conflicts():
    engine = KurmayRuleEngine()
    report = engine.synthesize(
        "r1",
        [
            {"namespace": "categories/bz.01", "type": "SIGNAL", "content": {"price": 10}, "impact": "MEDIUM", "key": "a"},
            {"namespace": "categories/bz.01", "type": "SIGNAL", "content": {"price": 20}, "impact": "MEDIUM", "key": "b"},
        ],
    )
    assert report.recommendations is not None
    assert report.situation_summary


def test_kurmay_synthesis_task(services, session):
    memory = services["memory"]
    orch = services["orchestrator"]
    memory.write(
        source="test",
        entity="e1",
        category="pricing",
        type=MemoryType.SIGNAL,
        content={"sku": "A", "delta": 5},
        created_by="tester",
        namespace="pricing",
        key="k1",
        impact=MemoryImpact.HIGH,
        actor_role="operator",
    )
    session.flush()
    task = orch.create_task(
        type="kurmay_synthesis",
        payload={
            "memory_entries": [
                {
                    "namespace": "pricing",
                    "key": "k1",
                    "type": "SIGNAL",
                    "impact": "LOW",
                    "content": {"sku": "A", "delta": 5},
                }
            ]
        },
        created_by="tester",
    )
    assert task.status == TaskStatus.SUCCESS.value
    assert task.result["success"] is True
    assert "recommendations" in task.result.get("output", {})


def test_kurmay_service_persists_report(services, session):
    svc = KurmayService(session)
    report = svc.synthesize(
        [{"namespace": "test", "type": "SIGNAL", "content": {"x": 1}, "impact": "MEDIUM", "key": "k1"}],
    )
    assert report.report_id
    assert report.recommendations is not None
    stored = svc.get(report.report_id)
    assert stored is not None

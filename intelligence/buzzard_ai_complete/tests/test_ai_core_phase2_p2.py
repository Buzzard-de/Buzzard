"""Phase 2 P2 remediation tests."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from buzzard_ai_complete.ai_core.bridge.commerce import APPROVAL_REQUIRED, EXTERNAL_INTEGRATION_PENDING, CommerceBridge
from buzzard_ai_complete.ai_core.enums import TaskStatus
from buzzard_ai_complete.ai_core.security.rate_limiter import RateLimiter
from buzzard_ai_complete.ai_core.security.service import SecurityService
from buzzard_ai_complete.ai_core.kurmay.rule_engine import KurmayRuleEngine
from buzzard_ai_complete.ai_core.taxonomy.bridge_coverage import audit_legacy_bridge_coverage
from buzzard_ai_complete.ai_core.taxonomy.registry import TaxonomyRegistry
from buzzard_ai_complete.ai_core.workers.health import ExecutionPolicy, WorkerHealth, default_execution_policy, probe_worker_health
from buzzard_ai_complete.ai_core.workers.provider import AIProviderNotConfiguredError, EnvironmentAIProvider
from buzzard_ai_complete.ai_core.workers.registry import build_phase2_registry
from buzzard_ai_complete.ai_core.workers.supplier.hub_worker import SupplierHubWorker
from buzzard_ai_complete.api.app import app
from buzzard_ai_complete.config import settings

AUTH_OPERATOR = {"Authorization": "Bearer test-token-phase1"}


@pytest.fixture(autouse=True)
def enable_v2(monkeypatch):
    monkeypatch.setenv("BUZZARD_AI_CORE_V2", "1")
    settings.BUZZARD_AI_CORE_V2 = True
    settings.API_TOKEN_ROLES = {"test-token-phase1": "operator"}
    settings.ALLOW_ROLE_HEADER = False
    settings.RATE_LIMIT_PER_MINUTE = 60


@pytest.fixture
def client():
    return TestClient(app)


# GAP-A-004
def test_execution_policy_and_worker_health_models():
    worker = SupplierHubWorker()
    policy = default_execution_policy(worker)
    assert isinstance(policy, ExecutionPolicy)
    health = probe_worker_health(worker)
    assert isinstance(health, WorkerHealth)
    assert health.worker_id == "supplier-hub"
    assert "integration_status" in health.checks


def test_agent_health_check_api_reports_probe(client):
    resp = client.post("/api/v1/agents/supplier-hub/health-check", headers=AUTH_OPERATOR)
    assert resp.status_code == 200
    body = resp.json()
    assert "checks" in body
    assert body["worker_id"] == "supplier-hub"


# GAP-B-002
def test_kurmay_detects_price_conflicts():
    engine = KurmayRuleEngine()
    report = engine.synthesize(
        "r-conflict",
        [
            {"namespace": "categories/bz.01", "type": "SIGNAL", "content": {"price": 10}, "impact": "MEDIUM", "key": "a"},
            {"namespace": "categories/bz.01", "type": "SIGNAL", "content": {"price": 20}, "impact": "MEDIUM", "key": "b"},
        ],
    )
    titles = [rec.title for rec in report.recommendations]
    assert any("Price conflict" in title for title in titles)


# GAP-C-001
def test_phase2_registry_excludes_legacy_category_worker():
    registry = build_phase2_registry()
    assert "category-worker" not in registry.list_worker_ids()
    taxonomy = TaxonomyRegistry()
    assert len(registry.list_worker_ids()) >= taxonomy.main_category_count()


# GAP-C-002
def test_legacy_bridge_coverage_audit_matches_taxonomy():
    report = audit_legacy_bridge_coverage()
    taxonomy = TaxonomyRegistry()
    assert report["total_l1"] == taxonomy.main_category_count()
    assert report["covered_count"] + report["missing_count"] == report["total_l1"]


# GAP-D-002
def test_domain_worker_writes_supplier_memory_on_external_pending(services):
    task = services["orchestrator"].create_task(
        type="supplier_sync",
        payload={"supplier_id": "SUP-1"},
        created_by="tester",
    )
    assert task.status == TaskStatus.FAILED.value
    mem = services["memory"].search(q="suppliers/SUP-1", limit=5)
    assert len(mem) >= 1


def test_price_worker_writes_pricing_memory(services):
    task = services["orchestrator"].create_task(
        type="price_recheck",
        payload={"sku": "SKU-P2", "base_price": 10, "margin": 0.2, "min_price": 5},
        created_by="tester",
    )
    assert task.status == TaskStatus.SUCCESS.value
    mem = services["memory"].search(q="pricing/SKU-P2", limit=5)
    assert len(mem) >= 1


# GAP-E-003
def test_exception_triage_routes_to_coordinator(services):
    task = services["orchestrator"].create_task(
        type="exception_triage",
        payload={"exception_id": "missing"},
        created_by="tester",
    )
    assert task.worker_id == "exception-coordinator"


# GAP-F-003
def test_api_rate_limit_middleware_returns_429(monkeypatch):
    from fastapi import FastAPI

    monkeypatch.setattr(settings, "RATE_LIMIT_PER_MINUTE", 2)
    limiter = RateLimiter(limit_per_minute=2)
    from buzzard_ai_complete.ai_core.api.middleware import RateLimitMiddleware

    mini = FastAPI()

    @mini.get("/api/v1/tasks")
    def _tasks():
        return {"ok": True}

    mini.add_middleware(RateLimitMiddleware, limiter=limiter)
    test_client = TestClient(mini)
    assert test_client.get("/api/v1/tasks").status_code == 200
    assert test_client.get("/api/v1/tasks").status_code == 200
    assert test_client.get("/api/v1/tasks").status_code == 429


# GAP-F-004 / GAP-K-001
def test_security_service_dual_writes_audit(services, session):
    security = SecurityService(audit=services["audit"], request_id="req-p2")
    before = services["audit"].count_entries(action="security.test_event")
    security.record("HIGH", "test_event", "dual write check", actor="security-bot")
    session.flush()
    after = services["audit"].count_entries(action="security.test_event")
    assert after == before + 1


# GAP-H-002
def test_api_approve_denied_for_guest(client, services, session):
    task = services["orchestrator"].create_task(
        type="price_recheck",
        payload={"sku": "A1", "base_price": 10, "margin": 0.1, "min_price": 5},
        requires_approval=True,
        created_by="tester",
    )
    session.commit()
    settings.API_TOKEN_ROLES = {"test-token-phase1": "guest"}
    resp = client.post(
        f"/api/v1/tasks/{task.id}/transition",
        json={"action": "approve", "note": "nope"},
        headers=AUTH_OPERATOR,
    )
    assert resp.status_code == 422


def test_api_reject_success_for_operator(client, services, session):
    task = services["orchestrator"].create_task(
        type="price_recheck",
        payload={"sku": "R2", "base_price": 10, "margin": 0.1, "min_price": 5},
        requires_approval=True,
        created_by="tester",
    )
    session.commit()
    settings.API_TOKEN_ROLES = {"test-token-phase1": "operator"}
    resp = client.post(
        f"/api/v1/tasks/{task.id}/transition",
        json={"action": "reject", "note": "declined"},
        headers=AUTH_OPERATOR,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == TaskStatus.FAILED.value


# GAP-I-002
def test_commerce_write_requires_approval_and_external_integration():
    bridge = CommerceBridge()
    denied = bridge.write("price_update", {"sku": "X", "price": 9.99}, approval_granted=False)
    assert denied["status"] == APPROVAL_REQUIRED
    pending = bridge.write("price_update", {"sku": "X", "price": 9.99}, approval_granted=True)
    assert pending["status"] == EXTERNAL_INTEGRATION_PENDING


# GAP-J-002
def test_approvals_query_api(client, services, session):
    task = services["orchestrator"].create_task(
        type="price_recheck",
        payload={"sku": "AP1", "base_price": 10, "margin": 0.1, "min_price": 5},
        requires_approval=True,
        created_by="tester",
    )
    services["orchestrator"].approve(task.id, actor="operator", actor_role="operator", note="ok")
    session.commit()
    resp = client.get(f"/api/v1/approvals?task_id={task.id}", headers=AUTH_OPERATOR)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] >= 1
    assert body["items"][0]["task_id"] == task.id


# GAP-M-001
def test_llm_provider_not_configured_without_credentials(monkeypatch):
    monkeypatch.setattr("buzzard_ai_complete.ai_core.workers.provider.LLM_API_KEY", "")
    monkeypatch.setattr("buzzard_ai_complete.ai_core.workers.provider.LLM_MODEL", "")
    provider = EnvironmentAIProvider()
    assert provider.is_configured() is False
    with pytest.raises(AIProviderNotConfiguredError):
        provider.generate("hello")

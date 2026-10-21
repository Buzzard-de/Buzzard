"""Phase 2 security tests."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from buzzard_ai_complete.ai_core.security.policies import PolicyEngine
from buzzard_ai_complete.ai_core.security.rate_limiter import RateLimiter
from buzzard_ai_complete.api.app import app
from buzzard_ai_complete.config import settings

AUTH = {"Authorization": "Bearer test-token-phase1"}


@pytest.fixture(autouse=True)
def enable_v2(monkeypatch):
    monkeypatch.setenv("BUZZARD_AI_CORE_V2", "1")
    settings.BUZZARD_AI_CORE_V2 = True


def test_policy_engine_approver_roles():
    policy = PolicyEngine(frozenset({"admin", "operator"}))
    assert policy.can_approve("operator")
    assert not policy.can_approve("guest")


def test_approve_requires_authorized_role(services):
    orch = services["orchestrator"]
    task = orch.create_task(
        type="price_recheck",
        payload={"sku": "X"},
        requires_approval=True,
        created_by="tester",
    )
    assert task.status == "REVIEW"
    with pytest.raises(ValueError, match="not authorized"):
        orch.approve(task.id, actor="guest", actor_role="guest")
    approved = orch.approve(task.id, actor="op1", actor_role="operator")
    assert approved.status == "SUCCESS"


def test_rate_limiter_blocks_excess():
    limiter = RateLimiter(limit_per_minute=2)
    assert limiter.allow("actor-1")
    assert limiter.allow("actor-1")
    assert not limiter.allow("actor-1")


def test_agents_endpoint_requires_auth():
    client = TestClient(app)
    resp = client.get("/api/v1/agents")
    assert resp.status_code in {401, 503}

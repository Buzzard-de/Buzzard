"""Phase 2 Agents API tests."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from buzzard_ai_complete.ai_core.taxonomy.registry import TaxonomyRegistry
from buzzard_ai_complete.api.app import app
from buzzard_ai_complete.config import settings

AUTH = {"Authorization": "Bearer test-token-phase1"}


@pytest.fixture(autouse=True)
def enable_v2(monkeypatch):
    monkeypatch.setenv("BUZZARD_AI_CORE_V2", "1")
    settings.BUZZARD_AI_CORE_V2 = True


@pytest.fixture
def client():
    return TestClient(app)


def test_list_agents(client):
    resp = client.get("/api/v1/agents", headers=AUTH)
    assert resp.status_code == 200
    data = resp.json()
    assert "workers" in data
    assert len(data["workers"]) > 5
    ids = {item["worker_id"] for item in data["workers"]}
    assert "kurmay" in ids
    assert "supplier-hub" in ids


def test_agent_detail(client):
    resp = client.get("/api/v1/agents/kurmay", headers=AUTH)
    assert resp.status_code == 200
    body = resp.json()
    assert body["worker_id"] == "kurmay"


def test_integrations_status(client):
    resp = client.get("/api/v1/integrations/status", headers=AUTH)
    assert resp.status_code == 200
    body = resp.json()
    assert "integrations" in body


def test_categories_list(client):
    resp = client.get("/api/v1/categories", headers=AUTH)
    assert resp.status_code == 200
    body = resp.json()
    taxonomy = TaxonomyRegistry()
    assert body["count"] == taxonomy.main_category_count()


def test_health_ready(client):
    resp = client.get("/api/v1/health/ready", headers=AUTH)
    assert resp.status_code == 200
    assert resp.json().get("status") == "ready"


def test_kurmay_reports_list(client):
    resp = client.get("/api/v1/reports/kurmay", headers=AUTH)
    assert resp.status_code == 200

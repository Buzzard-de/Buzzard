"""Phase 3 Wave 4 observability tests."""

from __future__ import annotations

from buzzard_ai_complete.ai_core.observability.metrics import get_metrics_registry, reset_metrics_for_tests


def test_metrics_registry_collects_counters():
    reset_metrics_for_tests()
    metrics = get_metrics_registry()
    metrics.counter("test_counter", ("label",)).inc(label="a")
    metrics.counter("test_counter", ("label",)).inc(label="a")
    collected = metrics.collect_all()
    assert any(item["name"] == "test_counter" and item["value"] == 2 for item in collected)


def test_prometheus_endpoint(session, monkeypatch):
    from fastapi.testclient import TestClient

    from buzzard_ai_complete.api.app import app

    monkeypatch.setenv("BUZZARD_OBSERVABILITY_ENABLED", "1")
    import buzzard_ai_complete.config.settings as settings

    settings.BUZZARD_OBSERVABILITY_ENABLED = True
    reset_metrics_for_tests()
    get_metrics_registry().counter("buzzard_test_metric").inc()
    client = TestClient(app)
    response = client.get("/api/v1/analytics/metrics", headers={"Authorization": "Bearer test-token-phase1"})
    assert response.status_code == 200
    assert "buzzard_test_metric" in response.text


def test_prometheus_endpoint_requires_auth(session, monkeypatch):
    from fastapi.testclient import TestClient

    from buzzard_ai_complete.api.app import app

    monkeypatch.setenv("BUZZARD_OBSERVABILITY_ENABLED", "1")
    monkeypatch.setenv("BUZZARD_API_PERMISSIONS_ENABLED", "1")
    import buzzard_ai_complete.config.settings as settings

    settings.BUZZARD_OBSERVABILITY_ENABLED = True
    settings.BUZZARD_API_PERMISSIONS_ENABLED = True
    client = TestClient(app)
    response = client.get("/api/v1/analytics/metrics")
    assert response.status_code in {401, 403}


def test_analytics_kpis_api(session):
    from fastapi.testclient import TestClient

    from buzzard_ai_complete.api.app import app

    client = TestClient(app)
    headers = {"Authorization": "Bearer test-token-phase1"}
    response = client.get("/api/v1/analytics/kpis", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert "tasks_total" in body

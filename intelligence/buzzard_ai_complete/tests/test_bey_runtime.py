from buzzard_ai_complete.runtime.bey_runtime import BEY_AGENT_ORDER, BeyRuntime, start_bey_agents


def test_start_bey_agents_boots_all_three():
    runtime = BeyRuntime()
    status = start_bey_agents(background_maintenance=False)

    assert status["started"] is True
    assert status["agent_count"] == 3
    assert [agent["name"] for agent in status["agents"]] == list(BEY_AGENT_ORDER)
    assert all(agent["status"] == "RUNNING" for agent in status["agents"])


def test_bey_runtime_singleton_is_idempotent():
    runtime = BeyRuntime()
    first = runtime.start(background_maintenance=False)
    second = runtime.start(background_maintenance=False)

    assert first["started"] is True
    assert second["started"] is True
    assert runtime.dogu.name == "dogu_bey"
    assert runtime.aslan.name == "aslan_bey"
    assert runtime.esat.name == "esat_bey"


def test_bey_dashboard_contains_operations_and_security():
    runtime = BeyRuntime()
    runtime.start(background_maintenance=False)
    dashboard = runtime.dashboard()

    assert dashboard["runtime"]["agent_count"] == 3
    assert "operations" in dashboard
    assert "security_events" in dashboard
    assert isinstance(dashboard["security_events"], list)


def test_bey_api_routes_when_fastapi_available():
    pytest = __import__("pytest")
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient

    from buzzard_ai_complete.api.app import app

    client = TestClient(app)
    health = client.get("/bey/health")
    assert health.status_code == 200
    body = health.json()
    assert body["agent_count"] == 3
    assert body["started"] is True

    scan = client.post("/bey/scan", json={"text": "hello"})
    assert scan.status_code == 200
    assert scan.json()["safe"] is True

    task = client.post(
        "/bey/tasks",
        json={"title": "Bey-Start-Test", "description": "runtime smoke", "priority": "NORMAL"},
    )
    assert task.status_code == 200
    assert task.json()["task"]["assigned_to"] == "dogu_bey"

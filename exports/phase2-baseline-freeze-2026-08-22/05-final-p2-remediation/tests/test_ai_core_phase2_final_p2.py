"""Final P2 closure tests — GAP-I-002, GAP-M-001, GAP-DOC-001."""

from __future__ import annotations

import io
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from buzzard_ai_complete.ai_core.bridge.commerce import EXTERNAL_INTEGRATION_PENDING
from buzzard_ai_complete.ai_core.enums import TaskStatus
from buzzard_ai_complete.ai_core.integrations.base import IntegrationAdapter
from buzzard_ai_complete.ai_core.integrations.registry import IntegrationStatusRegistry
from buzzard_ai_complete.ai_core.workers.base import WorkerContext
from buzzard_ai_complete.ai_core.workers.provider import EnvironmentAIProvider
from buzzard_ai_complete.api.app import app
from buzzard_ai_complete.config import settings

AUTH_OPERATOR = {"Authorization": "Bearer test-token-phase1"}
DOC_ROOT = Path(__file__).resolve().parents[3] / "docs" / "buzzard-ai-core"
ACTIVE_DOC_FILES = [
    DOC_ROOT / "PHASE2_DATA_FLOW.md",
    DOC_ROOT / "PHASE2_PERMISSION_MATRIX.md",
    DOC_ROOT / "PHASE2_ARCHITECTURE_REVIEW.md",
    DOC_ROOT / "AI_WORKER_SPEC.md",
    DOC_ROOT / "README.md",
]


@pytest.fixture(autouse=True)
def enable_v2(monkeypatch):
    monkeypatch.setenv("BUZZARD_AI_CORE_V2", "1")
    settings.BUZZARD_AI_CORE_V2 = True
    settings.API_TOKEN_ROLES = {"test-token-phase1": "operator"}
    settings.ALLOW_ROLE_HEADER = False


@pytest.fixture
def client():
    return TestClient(app)


class _ConnectedCrmAdapter(IntegrationAdapter):
    integration_id = "crm"

    def status(self) -> str:
        return "CONNECTED"

    def connect(self) -> dict:
        return {"integration_id": self.integration_id, "status": "CONNECTED"}


# GAP-I-002
def test_commerce_write_task_requires_review_before_execution(services):
    task = services["orchestrator"].create_task(
        type="commerce_write",
        payload={"action": "price_update", "write_payload": {"sku": "X", "price": 9.99}},
        created_by="tester",
    )
    assert task.status == TaskStatus.REVIEW.value
    assert task.requires_approval is True


def test_commerce_write_after_approval_returns_external_pending(services):
    task = services["orchestrator"].create_task(
        type="commerce_write",
        payload={"action": "price_update", "write_payload": {"sku": "X", "price": 9.99}},
        created_by="tester",
    )
    assert task.status == TaskStatus.REVIEW.value
    approved = services["orchestrator"].approve(
        task.id,
        actor="operator",
        actor_role="operator",
        note="approved for test",
    )
    assert approved.status == TaskStatus.FAILED.value
    assert approved.result["output"]["status"] == EXTERNAL_INTEGRATION_PENDING


def test_commerce_write_api_creates_review_task(client, services, session):
    resp = client.post(
        "/api/v1/commerce/write",
        json={"action": "price_update", "payload": {"sku": "API-1", "price": 12.0}},
        headers=AUTH_OPERATOR,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["type"] == "commerce_write"
    assert body["status"] == TaskStatus.REVIEW.value


def test_commerce_write_http_success_when_configured(monkeypatch):
    class _FakeResponse:
        def __init__(self, payload: dict):
            self._payload = json.dumps(payload).encode("utf-8")

        def read(self):
            return self._payload

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    monkeypatch.setattr("buzzard_ai_complete.config.settings.COMMERCE_API_URL", "https://commerce.example")
    monkeypatch.setattr("buzzard_ai_complete.config.settings.COMMERCE_API_TOKEN", "token")
    from buzzard_ai_complete.ai_core.bridge.commerce import CommerceBridge

    bridge = CommerceBridge()
    monkeypatch.setattr(
        bridge,
        "_request",
        lambda method, path, payload=None: {
            "status": "ok",
            "integration": "commerce",
            "action_id": "act-1",
        },
    )
    result = bridge.write("price_update", {"sku": "X", "price": 1.0}, approval_granted=True)
    assert result["status"] == "ok"


# GAP-M-001
def test_llm_provider_http_client_parses_response(monkeypatch):
    monkeypatch.setattr("buzzard_ai_complete.ai_core.workers.provider.LLM_API_KEY", "key")
    monkeypatch.setattr("buzzard_ai_complete.ai_core.workers.provider.LLM_MODEL", "gpt-test")

    class _FakeResponse:
        def read(self):
            return json.dumps(
                {"choices": [{"message": {"content": "draft reply"}}]}
            ).encode("utf-8")

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    provider = EnvironmentAIProvider(urlopen_fn=lambda request: _FakeResponse())
    assert provider.generate("hello") == "draft reply"


def test_llm_integration_status_connected_when_configured(monkeypatch):
    monkeypatch.setattr("buzzard_ai_complete.ai_core.workers.provider.LLM_API_KEY", "key")
    monkeypatch.setattr("buzzard_ai_complete.ai_core.workers.provider.LLM_MODEL", "gpt-test")
    registry = IntegrationStatusRegistry()
    assert registry.status("llm_provider") == "CONNECTED"


def test_customer_service_uses_llm_when_crm_and_provider_ready(monkeypatch):
    monkeypatch.setattr("buzzard_ai_complete.ai_core.workers.provider.LLM_API_KEY", "key")
    monkeypatch.setattr("buzzard_ai_complete.ai_core.workers.provider.LLM_MODEL", "gpt-test")

    class _FakeResponse:
        def read(self):
            return json.dumps(
                {"choices": [{"message": {"content": "We can help with your order."}}]}
            ).encode("utf-8")

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    monkeypatch.setattr(
        "buzzard_ai_complete.ai_core.workers.provider.EnvironmentAIProvider._open",
        lambda self, request: _FakeResponse(),
    )

    from buzzard_ai_complete.ai_core.workers.customer.service_worker import CustomerServiceAIWorker

    worker = CustomerServiceAIWorker()
    worker._integrations.register(_ConnectedCrmAdapter())
    context = WorkerContext(
        task_id="task-1",
        worker_id=worker.worker_id,
        request_id="r",
        attempt=1,
        timeout_seconds=30,
    )
    result = worker.execute(
        "customer_service",
        {"question": "Where is my order?", "ticket_id": "T-1"},
        context,
    )
    assert result.success is True
    assert result.output["draft_response"] == "We can help with your order."
    assert result.metadata["ai_provider_status"] == "CONNECTED"


# GAP-DOC-001
@pytest.mark.parametrize("doc_path", ACTIVE_DOC_FILES, ids=lambda p: p.name)
def test_active_architecture_docs_exclude_category_kfz_worker(doc_path: Path):
    assert doc_path.exists(), f"missing doc file: {doc_path}"
    content = doc_path.read_text(encoding="utf-8")
    forbidden_worker_ids = ("`category-kfz`", "category-kfz only")
    for token in forbidden_worker_ids:
        assert token not in content, f"{doc_path.name} still references legacy worker id {token}"


def test_active_architecture_docs_use_dynamic_taxonomy_language():
    spec = (DOC_ROOT / "AI_WORKER_SPEC.md").read_text(encoding="utf-8")
    assert "49 (48 L1 + KFZ)" not in spec
    assert "TaxonomyRegistry" in spec or "taxonomy-driven" in spec.lower()

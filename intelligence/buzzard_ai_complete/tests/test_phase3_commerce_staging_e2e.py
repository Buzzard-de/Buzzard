"""Connected Commerce API staging E2E — requires real COMMERCE_API_URL + COMMERCE_API_TOKEN.

These tests are NOT mocks. They contact the live Buzzard Commerce API staging deployment.
Skipped automatically when staging credentials are not provisioned.
"""

from __future__ import annotations

import uuid

import pytest

from buzzard_ai_complete.ai_core.bridge.commerce import CommerceBridge
from buzzard_ai_complete.ai_core.integrations.commerce_adapter import CommerceIntegrationAdapter
from buzzard_ai_complete.ai_core.integrations.commerce_config import commerce_staging_ready
from buzzard_ai_complete.ai_core.integrations.connectors.buzzard_commerce import BuzzardCommerceConnector

pytestmark = pytest.mark.skipif(
    not commerce_staging_ready(),
    reason="Commerce API staging not provisioned (COMMERCE_API_URL + COMMERCE_API_TOKEN required)",
)


@pytest.fixture
def connector():
    return BuzzardCommerceConnector()


@pytest.fixture
def adapter(connector):
    return CommerceIntegrationAdapter(connector)


@pytest.fixture
def bridge(connector):
    return CommerceBridge(connector)


def test_staging_connectivity_health(connector):
    result = connector.health_check()
    assert result["status"] == "CONNECTED", result
    assert result["integration"] == "commerce"


def test_staging_adapter_status_connected(adapter):
    assert adapter.status() == "CONNECTED"


def test_staging_read_products_list(bridge):
    result = bridge.read_products()
    assert result.get("status") not in {"NO_DATA_AVAILABLE", "ERROR"}, result


def test_staging_read_stock_list(bridge):
    result = bridge.read_stock()
    assert result.get("status") not in {"NO_DATA_AVAILABLE", "ERROR"}, result


def test_staging_idempotency_header_on_action(connector):
    key = f"staging-e2e-{uuid.uuid4()}"
    result = connector.request(
        "GET",
        "/health",
        idempotency_key=key,
    )
    assert result.get("status") in {"ok", "healthy", "CONNECTED"}, result


def test_staging_error_handling_invalid_path(connector):
    result = connector.request("GET", "/nonexistent-staging-resource-e2e")
    assert result.get("status") in {"ERROR", "NO_DATA_AVAILABLE"}
    assert "http_status" in result or "message" in result
    assert "token" not in str(result).lower()

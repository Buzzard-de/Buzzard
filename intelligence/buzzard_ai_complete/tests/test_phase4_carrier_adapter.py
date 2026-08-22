"""Phase 3 Wave 4 carrier adapter tests."""

from __future__ import annotations

import pytest

from buzzard_ai_complete.ai_core.integrations.carriers.base import ShipmentRequest
from buzzard_ai_complete.ai_core.integrations.carriers.dhl import DhlCarrierAdapter
from buzzard_ai_complete.ai_core.integrations.carrier_adapter import CarrierIntegrationAdapter
from buzzard_ai_complete.ai_core.integrations.integration_config import carrier_staging_ready


def test_dhl_mock_rate_quote(monkeypatch):
    monkeypatch.setenv("DHL_USE_MOCK", "1")
    import buzzard_ai_complete.config.settings as settings

    settings.DHL_USE_MOCK = True
    adapter = DhlCarrierAdapter()
    shipment = ShipmentRequest(order_id="ORD-1", weight_kg=2.0, destination_country="DE", destination_postal="10115")
    quotes = adapter.get_rates(shipment)
    assert any(q.available for q in quotes)
    assert quotes[0].amount > 0


def test_carrier_integration_pending_without_config(monkeypatch):
    monkeypatch.setenv("DHL_USE_MOCK", "0")
    monkeypatch.delenv("DHL_API_URL", raising=False)
    monkeypatch.delenv("DHL_API_KEY", raising=False)
    import buzzard_ai_complete.config.settings as settings

    settings.DHL_USE_MOCK = False
    settings.DHL_API_URL = ""
    settings.DHL_API_KEY = ""
    adapter = DhlCarrierAdapter()
    quotes = adapter.get_rates(
        ShipmentRequest(order_id="ORD-2", weight_kg=1.0, destination_country="DE", destination_postal="10115")
    )
    assert quotes[0].available is False
    assert quotes[0].reason == "EXTERNAL_INTEGRATION_PENDING"


def test_logistics_service_label_requires_approval_above_threshold(session, monkeypatch):
    monkeypatch.setenv("DHL_USE_MOCK", "1")
    import buzzard_ai_complete.config.settings as settings

    settings.DHL_USE_MOCK = True
    settings.LOGISTICS_LABEL_APPROVAL_THRESHOLD = 10.0
    from buzzard_ai_complete.ai_core.services.logistics_service import LogisticsService

    svc = LogisticsService(session)
    result = svc.create_label({"order_id": "ORD-3", "carrier_id": "dhl", "rate_amount": 150.0})
    assert result["status"] == "APPROVAL_REQUIRED"


@pytest.mark.skipif(not carrier_staging_ready(), reason="Carrier staging not provisioned (DHL credentials required)")
def test_carrier_live_health():
    adapter = CarrierIntegrationAdapter()
    health = adapter.health_check()
    assert health["status"] in {"CONNECTED", "EXTERNAL_INTEGRATION_PENDING"}

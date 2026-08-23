"""Phase 3 Wave 3 WMS/CRM adapter tests."""

from __future__ import annotations

import pytest

from buzzard_ai_complete.ai_core.integrations.crm_adapter import CrmAdapter
from buzzard_ai_complete.ai_core.integrations.integration_config import crm_staging_ready, wms_staging_ready
from buzzard_ai_complete.ai_core.integrations.wms_adapter import WmsAdapter


def test_wms_adapter_not_configured_honest_status():
    adapter = WmsAdapter()
    assert adapter.status() == "EXTERNAL_INTEGRATION_PENDING"
    health = adapter.health_check()
    assert health["status"] == "EXTERNAL_INTEGRATION_PENDING"


def test_crm_adapter_not_configured_honest_status():
    adapter = CrmAdapter()
    assert adapter.status() == "EXTERNAL_INTEGRATION_PENDING"


def test_wms_config_validation(monkeypatch):
    import buzzard_ai_complete.config.settings as settings

    monkeypatch.delenv("WMS_API_URL", raising=False)
    monkeypatch.delenv("WMS_API_TOKEN", raising=False)
    settings.WMS_API_URL = ""
    settings.WMS_API_TOKEN = ""
    assert not wms_staging_ready()


@pytest.mark.skipif(not wms_staging_ready(), reason="WMS staging not provisioned")
def test_wms_staging_connectivity():
    adapter = WmsAdapter()
    health = adapter.health_check()
    assert health["status"] == "CONNECTED"


@pytest.mark.skipif(not crm_staging_ready(), reason="CRM staging not provisioned")
def test_crm_staging_connectivity():
    adapter = CrmAdapter()
    health = adapter.health_check()
    assert health["status"] == "CONNECTED"

from __future__ import annotations

from typing import Any

from buzzard_ai_complete.ai_core.integrations.base import IntegrationAdapter
from buzzard_ai_complete.ai_core.integrations.suppliers.factory import get_supplier_adapter


class SupplierFeedsAdapter(IntegrationAdapter):
    integration_id = "supplier_feeds"

    def __init__(self, adapter=None) -> None:
        self._adapter = adapter

    @property
    def adapter(self):
        if self._adapter is None:
            self._adapter = get_supplier_adapter()
        return self._adapter

    def is_configured(self) -> bool:
        return self.adapter.is_configured()

    def status(self) -> str:
        if not self.is_configured():
            return "EXTERNAL_INTEGRATION_PENDING"
        health = self.health_check()
        return str(health.get("status", "EXTERNAL_INTEGRATION_PENDING"))

    def health_check(self) -> dict[str, Any]:
        if not self.is_configured():
            return {
                "status": "EXTERNAL_INTEGRATION_PENDING",
                "integration": self.integration_id,
                "message": "supplier feed not configured",
            }
        probe = self.adapter.health_check()
        if probe.get("status") == "CONNECTED":
            return {"status": "CONNECTED", "integration": self.integration_id, "details": probe}
        return {
            "status": "EXTERNAL_INTEGRATION_PENDING",
            "integration": self.integration_id,
            "details": probe,
        }

    def connect(self) -> dict[str, Any]:
        health = self.health_check()
        return {
            "integration_id": self.integration_id,
            "status": health.get("status"),
            "configured": self.is_configured(),
            "health": health,
        }

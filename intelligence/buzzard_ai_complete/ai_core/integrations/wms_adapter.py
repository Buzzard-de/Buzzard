from __future__ import annotations

from typing import Any

from buzzard_ai_complete.ai_core.integrations.base import IntegrationAdapter
from buzzard_ai_complete.ai_core.integrations.connectors.buzzard_wms import WmsConnector


class WmsAdapter(IntegrationAdapter):
    integration_id = "wms"

    def __init__(self, connector: WmsConnector | None = None) -> None:
        self._connector = connector or WmsConnector()

    def is_configured(self) -> bool:
        return self._connector.is_configured()

    def status(self) -> str:
        if not self.is_configured():
            return "EXTERNAL_INTEGRATION_PENDING"
        health = self.health_check()
        status = str(health.get("status", "EXTERNAL_INTEGRATION_PENDING"))
        if status in {"ok", "healthy", "CONNECTED"}:
            return "CONNECTED"
        if status == "ERROR":
            return "DEGRADED"
        return "EXTERNAL_INTEGRATION_PENDING"

    def health_check(self) -> dict[str, Any]:
        if not self.is_configured():
            return {
                "status": "EXTERNAL_INTEGRATION_PENDING",
                "integration": self.integration_id,
                "message": "WMS_API_URL and WMS_API_TOKEN required",
            }
        result = self._connector.health_check()
        if result.get("status") in {"ok", "healthy"}:
            return {"status": "CONNECTED", "integration": self.integration_id, "details": result}
        return {"status": "EXTERNAL_INTEGRATION_PENDING", "integration": self.integration_id, "details": result}

    def connect(self) -> dict[str, Any]:
        health = self.health_check()
        return {
            "integration_id": self.integration_id,
            "status": health.get("status"),
            "configured": self.is_configured(),
            "health": health,
        }

    def get_stock(self, *, sku: str | None = None) -> dict[str, Any]:
        return self._connector.get_stock(sku=sku)

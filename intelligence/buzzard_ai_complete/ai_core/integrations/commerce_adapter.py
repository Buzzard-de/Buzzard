from __future__ import annotations

from typing import Any

from buzzard_ai_complete.ai_core.integrations.base import IntegrationAdapter
from buzzard_ai_complete.ai_core.integrations.connectors.buzzard_commerce import BuzzardCommerceConnector
from buzzard_ai_complete.config import settings


class CommerceIntegrationAdapter(IntegrationAdapter):
    """Phase 3 commerce integration adapter — honest connectivity status."""

    integration_id = "commerce"

    def __init__(self, connector: BuzzardCommerceConnector | None = None) -> None:
        self._connector = connector or BuzzardCommerceConnector()
        self._last_health: dict[str, Any] | None = None

    @property
    def connector(self) -> BuzzardCommerceConnector:
        return self._connector

    def is_configured(self) -> bool:
        return self._connector.is_configured()

    def status(self) -> str:
        if not settings.BUZZARD_AI_CORE_V3:
            if self.is_configured():
                return "CONNECTED"
            return "EXTERNAL_INTEGRATION_PENDING"
        health = self.health_check()
        return str(health.get("status", "EXTERNAL_INTEGRATION_PENDING"))

    def health_check(self) -> dict[str, Any]:
        if not self.is_configured():
            self._last_health = {
                "status": "EXTERNAL_INTEGRATION_PENDING",
                "integration": self.integration_id,
                "message": "COMMERCE_API_URL and COMMERCE_API_TOKEN required",
            }
            return self._last_health
        self._last_health = self._connector.health_check()
        return self._last_health

    def connect(self) -> dict[str, Any]:
        health = self.health_check()
        return {
            "integration_id": self.integration_id,
            "status": health.get("status"),
            "configured": self.is_configured(),
            "health": health,
        }

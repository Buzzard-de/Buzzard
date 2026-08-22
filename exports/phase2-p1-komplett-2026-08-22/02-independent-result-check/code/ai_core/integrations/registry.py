from __future__ import annotations

from typing import Any

from buzzard_ai_complete.ai_core.integrations.base import IntegrationAdapter


class IntegrationStatusRegistry:
    """Tracks integration adapter status without fabricating connectivity."""

    def __init__(self) -> None:
        self._adapters: dict[str, IntegrationAdapter] = {}
        self._static: dict[str, str] = {
            "commerce": "EXTERNAL_INTEGRATION_PENDING",
            "supplier_feeds": "EXTERNAL_INTEGRATION_PENDING",
            "wms": "EXTERNAL_INTEGRATION_PENDING",
            "customs_authority": "EXTERNAL_INTEGRATION_PENDING",
            "crm": "EXTERNAL_INTEGRATION_PENDING",
            "llm_provider": "EXTERNAL_INTEGRATION_PENDING",
        }

    def register(self, adapter: IntegrationAdapter) -> None:
        self._adapters[adapter.integration_id] = adapter

    def status(self, integration_id: str) -> str:
        adapter = self._adapters.get(integration_id)
        if adapter is not None:
            return adapter.status()
        return self._static.get(integration_id, "EXTERNAL_INTEGRATION_PENDING")

    def list_status(self) -> list[dict[str, Any]]:
        ids = set(self._static) | set(self._adapters)
        return [{"integration_id": iid, "status": self.status(iid)} for iid in sorted(ids)]

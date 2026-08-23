from __future__ import annotations

from typing import Any

from buzzard_ai_complete.ai_core.integrations.base import IntegrationAdapter
from buzzard_ai_complete.ai_core.workers.provider import EnvironmentAIProvider
from buzzard_ai_complete.config import settings


class LlmProviderAdapter(IntegrationAdapter):
    integration_id = "llm_provider"

    def status(self) -> str:
        if EnvironmentAIProvider().is_configured():
            return "CONNECTED"
        return "EXTERNAL_INTEGRATION_PENDING"

    def connect(self) -> dict[str, Any]:
        return {
            "integration_id": self.integration_id,
            "status": self.status(),
            "model": settings.LLM_MODEL or None,
        }

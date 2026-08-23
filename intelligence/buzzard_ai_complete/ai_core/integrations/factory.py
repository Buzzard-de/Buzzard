from __future__ import annotations

from buzzard_ai_complete.ai_core.integrations.commerce_adapter import CommerceIntegrationAdapter
from buzzard_ai_complete.ai_core.integrations.llm_adapter import LlmProviderAdapter
from buzzard_ai_complete.ai_core.integrations.registry import IntegrationStatusRegistry

_registry: IntegrationStatusRegistry | None = None


def get_integration_registry() -> IntegrationStatusRegistry:
    global _registry
    if _registry is None:
        _registry = IntegrationStatusRegistry()
        _registry.register(LlmProviderAdapter())
        _registry.register(CommerceIntegrationAdapter())
    return _registry


def reset_integration_registry_for_tests() -> None:
    global _registry
    _registry = None

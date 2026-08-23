from __future__ import annotations

from buzzard_ai_complete.ai_core.integrations.commerce_adapter import CommerceIntegrationAdapter
from buzzard_ai_complete.ai_core.integrations.llm_adapter import LlmProviderAdapter
from buzzard_ai_complete.ai_core.integrations.registry import IntegrationStatusRegistry
from buzzard_ai_complete.ai_core.integrations.supplier_feeds_adapter import SupplierFeedsAdapter
from buzzard_ai_complete.config import settings

_registry: IntegrationStatusRegistry | None = None


def get_integration_registry() -> IntegrationStatusRegistry:
    global _registry
    if _registry is None:
        _registry = IntegrationStatusRegistry()
        _registry.register(LlmProviderAdapter())
        _registry.register(CommerceIntegrationAdapter())
        if settings.BUZZARD_AI_CORE_V3:
            _registry.register(SupplierFeedsAdapter())
    return _registry


def reset_integration_registry_for_tests() -> None:
    global _registry
    _registry = None

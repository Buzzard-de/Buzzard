"""External integration adapters."""

from buzzard_ai_complete.ai_core.integrations.base import IntegrationAdapter
from buzzard_ai_complete.ai_core.integrations.registry import IntegrationStatusRegistry

__all__ = ["IntegrationAdapter", "IntegrationStatusRegistry"]

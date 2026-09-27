from __future__ import annotations

import os
from abc import ABC, abstractmethod

from buzzard_ai_complete.config.settings import LLM_API_KEY, LLM_MODEL

EXTERNAL_AI_PROVIDER_PENDING = "EXTERNAL AI PROVIDER PENDING"


class AIProviderNotConfiguredError(RuntimeError):
    pass


class AIProvider(ABC):
    @abstractmethod
    def is_configured(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    def generate(self, prompt: str, **kwargs: object) -> str:
        raise NotImplementedError


class EnvironmentAIProvider(AIProvider):
    """Uses LLM_API_KEY + LLM_MODEL when configured; otherwise reports pending."""

    def is_configured(self) -> bool:
        return bool(LLM_API_KEY and LLM_MODEL)

    def generate(self, prompt: str, **kwargs: object) -> str:
        if not self.is_configured():
            raise AIProviderNotConfiguredError(EXTERNAL_AI_PROVIDER_PENDING)
        # Real HTTP integration is out of Phase 1 scope — fail explicitly, never fake output.
        raise AIProviderNotConfiguredError(
            f"{EXTERNAL_AI_PROVIDER_PENDING}: provider credentials present but remote execution not enabled in Phase 1"
        )


def get_ai_provider() -> AIProvider:
    return EnvironmentAIProvider()

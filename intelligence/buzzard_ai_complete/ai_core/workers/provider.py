from __future__ import annotations

import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from buzzard_ai_complete.config.settings import LLM_API_BASE, LLM_API_KEY, LLM_MODEL

EXTERNAL_AI_PROVIDER_PENDING = "EXTERNAL AI PROVIDER PENDING"


class AIProviderNotConfiguredError(RuntimeError):
    pass


class AIProvider:
    """Abstract AI provider contract."""

    def is_configured(self) -> bool:
        raise NotImplementedError

    def generate(self, prompt: str, **kwargs: object) -> str:
        raise NotImplementedError


class EnvironmentAIProvider(AIProvider):
    """Uses LLM_API_KEY + LLM_MODEL with a real HTTP client when configured."""

    def is_configured(self) -> bool:
        return bool(LLM_API_KEY and LLM_MODEL)

    def generate(self, prompt: str, **kwargs: object) -> str:
        if not self.is_configured():
            raise AIProviderNotConfiguredError(EXTERNAL_AI_PROVIDER_PENDING)
        payload = {
            "model": LLM_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": float(kwargs.get("temperature", 0.2)),
        }
        request = Request(
            f"{LLM_API_BASE}/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {LLM_API_KEY}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=30) as response:
                body = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            raise AIProviderNotConfiguredError(
                f"{EXTERNAL_AI_PROVIDER_PENDING}: provider HTTP error {exc.code}"
            ) from exc
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise AIProviderNotConfiguredError(
                f"{EXTERNAL_AI_PROVIDER_PENDING}: provider request failed ({exc})"
            ) from exc

        choices = body.get("choices") if isinstance(body, dict) else None
        if not choices:
            raise AIProviderNotConfiguredError(
                f"{EXTERNAL_AI_PROVIDER_PENDING}: provider returned no choices"
            )
        message = choices[0].get("message", {}) if isinstance(choices[0], dict) else {}
        content = message.get("content")
        if not content:
            raise AIProviderNotConfiguredError(
                f"{EXTERNAL_AI_PROVIDER_PENDING}: provider returned empty content"
            )
        return str(content)


def get_ai_provider() -> AIProvider:
    return EnvironmentAIProvider()

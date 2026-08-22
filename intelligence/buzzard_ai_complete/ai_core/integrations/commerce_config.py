from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from urllib.parse import urlparse

from buzzard_ai_complete.config import settings


@dataclass(frozen=True)
class CommerceConfigStatus:
    configured: bool
    valid: bool
    errors: tuple[str, ...] = field(default_factory=tuple)
    warnings: tuple[str, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict[str, Any]:
        return {
            "configured": self.configured,
            "valid": self.valid,
            "errors": list(self.errors),
            "warnings": list(self.warnings),
        }


def validate_commerce_configuration() -> CommerceConfigStatus:
    """Validate commerce env configuration without contacting external API."""
    errors: list[str] = []
    warnings: list[str] = []

    url = (settings.COMMERCE_API_URL or "").strip()
    token = (settings.COMMERCE_API_TOKEN or "").strip()

    if not url:
        errors.append("COMMERCE_API_URL is not set")
    else:
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"}:
            errors.append("COMMERCE_API_URL must use http or https")
        if not parsed.netloc:
            errors.append("COMMERCE_API_URL must include a host")

    if not token:
        errors.append("COMMERCE_API_TOKEN is not set")

    if url and token and not settings.COMMERCE_WEBHOOK_SECRET:
        warnings.append("COMMERCE_WEBHOOK_SECRET is not set; inbound webhooks will not verify HMAC")

    configured = bool(url and token)
    valid = configured and not errors
    return CommerceConfigStatus(
        configured=configured,
        valid=valid,
        errors=tuple(errors),
        warnings=tuple(warnings),
    )


def commerce_staging_ready() -> bool:
    """True only when required commerce staging env vars are present and valid."""
    return validate_commerce_configuration().valid

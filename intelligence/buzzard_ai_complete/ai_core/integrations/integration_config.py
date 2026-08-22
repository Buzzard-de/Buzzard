from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from urllib.parse import urlparse

from buzzard_ai_complete.config import settings


@dataclass(frozen=True)
class IntegrationConfigStatus:
    configured: bool
    valid: bool
    errors: tuple[str, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict[str, Any]:
        return {"configured": self.configured, "valid": self.valid, "errors": list(self.errors)}


def _validate_url_token(url_var: str, token_var: str, url: str, token: str) -> tuple[list[str], bool]:
    errors: list[str] = []
    if not url:
        errors.append(f"{url_var} is not set")
    else:
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"}:
            errors.append(f"{url_var} must use http or https")
        if not parsed.netloc:
            errors.append(f"{url_var} must include a host")
    if not token:
        errors.append(f"{token_var} is not set")
    configured = bool(url and token)
    valid = configured and not errors
    return errors, valid


def validate_wms_configuration() -> IntegrationConfigStatus:
    url = (settings.WMS_API_URL or "").strip()
    token = (settings.WMS_API_TOKEN or "").strip()
    errors, valid = _validate_url_token("WMS_API_URL", "WMS_API_TOKEN", url, token)
    return IntegrationConfigStatus(configured=bool(url and token), valid=valid, errors=tuple(errors))


def validate_crm_configuration() -> IntegrationConfigStatus:
    url = (settings.CRM_API_URL or "").strip()
    token = (settings.CRM_API_TOKEN or "").strip()
    errors, valid = _validate_url_token("CRM_API_URL", "CRM_API_TOKEN", url, token)
    return IntegrationConfigStatus(configured=bool(url and token), valid=valid, errors=tuple(errors))


def wms_staging_ready() -> bool:
    return validate_wms_configuration().valid


def crm_staging_ready() -> bool:
    return validate_crm_configuration().valid

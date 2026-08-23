from __future__ import annotations

import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from buzzard_ai_complete.ai_core.integrations.integration_config import validate_wms_configuration
from buzzard_ai_complete.config import settings


class WmsConnector:
    """HTTP connector for Buzzard WMS staging/production."""

    def __init__(self) -> None:
        self._base_url = settings.WMS_API_URL.rstrip("/") if settings.WMS_API_URL else ""
        self._token = settings.WMS_API_TOKEN

    def is_configured(self) -> bool:
        return validate_wms_configuration().valid

    def health_check(self) -> dict[str, Any]:
        if not self.is_configured():
            return {"status": "DISCONNECTED", "integration": "wms", "message": "WMS API not configured"}
        return self.request("GET", "/health")

    def request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        if not self.is_configured():
            return {"status": "NO_DATA_AVAILABLE", "integration": "wms", "message": "WMS API not configured"}
        url = f"{self._base_url}{path}"
        headers = {
            "Authorization": f"Bearer {self._token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Service-Identity": "wms-adapter",
        }
        data = json.dumps(payload).encode("utf-8") if payload is not None else None
        request = Request(url, data=data, headers=headers, method=method)
        try:
            with urlopen(request, timeout=settings.REQUEST_TIMEOUT) as response:
                body = response.read().decode("utf-8")
                parsed = json.loads(body) if body else {}
                if isinstance(parsed, dict):
                    parsed.setdefault("status", "ok")
                    parsed.setdefault("integration", "wms")
                    return parsed
                return {"status": "ok", "integration": "wms", "data": parsed}
        except HTTPError as exc:
            return {
                "status": "ERROR",
                "integration": "wms",
                "http_status": exc.code,
                "message": str(exc.reason),
            }
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            return {
                "status": "NO_DATA_AVAILABLE",
                "integration": "wms",
                "message": f"WMS API request failed: {exc}",
            }

    def get_stock(self, *, sku: str | None = None) -> dict[str, Any]:
        path = f"/stock/{sku}" if sku else "/stock"
        return self.request("GET", path)

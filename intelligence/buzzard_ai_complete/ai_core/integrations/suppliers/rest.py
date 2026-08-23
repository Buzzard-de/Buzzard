from __future__ import annotations

import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from buzzard_ai_complete.ai_core.integrations.suppliers.base import SupplierAdapter
from buzzard_ai_complete.config import settings


class RestSupplierAdapter(SupplierAdapter):
    adapter_type = "rest"

    def __init__(self) -> None:
        self._base_url = settings.SUPPLIER_FEEDS_URL.rstrip("/") if settings.SUPPLIER_FEEDS_URL else ""
        self._token = settings.SUPPLIER_FEEDS_TOKEN

    def is_configured(self) -> bool:
        return bool(self._base_url and self._token)

    def fetch_catalog(self, *, supplier_id: str) -> dict[str, Any]:
        if not self.is_configured():
            return {
                "status": "NO_DATA_AVAILABLE",
                "adapter": self.adapter_type,
                "message": "REST supplier feed not configured",
            }
        url = f"{self._base_url}/suppliers/{supplier_id}/catalog"
        headers = {
            "Authorization": f"Bearer {self._token}",
            "Accept": "application/json",
            "X-Service-Identity": "supplier-adapter",
        }
        request = Request(url, headers=headers, method="GET")
        try:
            with urlopen(request, timeout=settings.REQUEST_TIMEOUT) as response:
                body = response.read().decode("utf-8")
                parsed = json.loads(body) if body else {}
                records = parsed.get("records") or parsed.get("products") or parsed.get("items") or []
                if not isinstance(records, list):
                    return {
                        "status": "ERROR",
                        "adapter": self.adapter_type,
                        "message": "invalid catalog response format",
                    }
                return {
                    "status": "ok",
                    "adapter": self.adapter_type,
                    "supplier_id": supplier_id,
                    "records": records,
                    "count": len(records),
                }
        except HTTPError as exc:
            return {
                "status": "ERROR",
                "adapter": self.adapter_type,
                "http_status": exc.code,
                "message": str(exc.reason),
            }
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            return {
                "status": "NO_DATA_AVAILABLE",
                "adapter": self.adapter_type,
                "message": f"supplier feed request failed: {exc}",
            }

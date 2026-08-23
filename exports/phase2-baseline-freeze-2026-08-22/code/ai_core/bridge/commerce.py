from __future__ import annotations

import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from buzzard_ai_complete.config import settings

EXTERNAL_INTEGRATION_PENDING = "EXTERNAL_INTEGRATION_PENDING"
NO_DATA_AVAILABLE = "NO_DATA_AVAILABLE"
APPROVAL_REQUIRED = "APPROVAL_REQUIRED"


class CommerceBridge:
    """Read/write commerce bridge with honest external status when not connected."""

    def __init__(self) -> None:
        self._base_url = settings.COMMERCE_API_URL.rstrip("/") if settings.COMMERCE_API_URL else ""
        self._token = settings.COMMERCE_API_TOKEN

    def is_configured(self) -> bool:
        return bool(self._base_url and self._token)

    def _request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        if not self.is_configured():
            return {
                "status": NO_DATA_AVAILABLE,
                "integration": "commerce",
                "message": "commerce API not configured; set COMMERCE_API_URL and COMMERCE_API_TOKEN",
            }
        url = f"{self._base_url}{path}"
        headers = {
            "Authorization": f"Bearer {self._token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        data = json.dumps(payload).encode("utf-8") if payload is not None else None
        request = Request(url, data=data, headers=headers, method=method)
        try:
            with urlopen(request, timeout=settings.REQUEST_TIMEOUT) as response:
                body = response.read().decode("utf-8")
                parsed = json.loads(body) if body else {}
                if isinstance(parsed, dict):
                    parsed.setdefault("status", "ok")
                    parsed.setdefault("integration", "commerce")
                    return parsed
                return {"status": "ok", "integration": "commerce", "data": parsed}
        except HTTPError as exc:
            return {
                "status": "ERROR",
                "integration": "commerce",
                "http_status": exc.code,
                "message": str(exc.reason),
            }
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            return {
                "status": NO_DATA_AVAILABLE,
                "integration": "commerce",
                "message": f"commerce API request failed: {exc}",
            }

    def read_products(self, sku: str | None = None) -> dict[str, Any]:
        if not self.is_configured():
            return {
                "status": NO_DATA_AVAILABLE,
                "integration": "commerce",
                "message": "commerce read bridge not connected; no product data available",
                "sku": sku,
            }
        path = "/products"
        if sku:
            path = f"/products/{sku}"
        result = self._request("GET", path)
        result.setdefault("sku", sku)
        return result

    def read_orders(self, order_id: str | None = None) -> dict[str, Any]:
        if not self.is_configured():
            return {
                "status": NO_DATA_AVAILABLE,
                "integration": "commerce",
                "message": "commerce read bridge not connected; no order data available",
                "order_id": order_id,
            }
        path = "/orders"
        if order_id:
            path = f"/orders/{order_id}"
        result = self._request("GET", path)
        result.setdefault("order_id", order_id)
        return result

    def read_stock(self, sku: str | None = None) -> dict[str, Any]:
        if not self.is_configured():
            return {
                "status": NO_DATA_AVAILABLE,
                "integration": "commerce",
                "message": "commerce read bridge not connected; no stock data available",
                "sku": sku,
            }
        path = "/stock"
        if sku:
            path = f"/stock/{sku}"
        result = self._request("GET", path)
        result.setdefault("sku", sku)
        return result

    def write(self, action: str, payload: dict[str, Any], *, approval_granted: bool = False) -> dict[str, Any]:
        if not approval_granted:
            return {
                "status": APPROVAL_REQUIRED,
                "integration": "commerce",
                "action": action,
                "message": "commerce write requires explicit human approval",
                "payload_keys": sorted(payload.keys()),
            }
        if not self.is_configured():
            return {
                "status": EXTERNAL_INTEGRATION_PENDING,
                "integration": "commerce",
                "action": action,
                "message": "commerce write operations require external integration",
                "payload_keys": sorted(payload.keys()),
            }
        result = self._request("POST", f"/actions/{action}", payload)
        result.setdefault("action", action)
        return result

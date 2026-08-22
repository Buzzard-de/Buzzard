from __future__ import annotations

from typing import Any

from buzzard_ai_complete.ai_core.integrations.connectors.buzzard_commerce import BuzzardCommerceConnector
from buzzard_ai_complete.config import settings

EXTERNAL_INTEGRATION_PENDING = "EXTERNAL_INTEGRATION_PENDING"
NO_DATA_AVAILABLE = "NO_DATA_AVAILABLE"
APPROVAL_REQUIRED = "APPROVAL_REQUIRED"
WRITES_DISABLED = "WRITES_DISABLED"


class CommerceBridge:
    """Read/write commerce bridge with honest external status when not connected."""

    def __init__(self, connector: BuzzardCommerceConnector | None = None) -> None:
        self._connector = connector or BuzzardCommerceConnector()

    def is_configured(self) -> bool:
        return self._connector.is_configured()

    def _request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        return self._connector.request(method, path, payload)

    def read_products(self, sku: str | None = None) -> dict[str, Any]:
        if not self.is_configured():
            return {
                "status": NO_DATA_AVAILABLE,
                "integration": "commerce",
                "message": "commerce read bridge not connected; no product data available",
                "sku": sku,
            }
        path = f"/products/{sku}" if sku else "/products"
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
        path = f"/orders/{order_id}" if order_id else "/orders"
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
        path = f"/stock/{sku}" if sku else "/stock"
        result = self._request("GET", path)
        result.setdefault("sku", sku)
        return result

    def write(
        self,
        action: str,
        payload: dict[str, Any],
        *,
        approval_granted: bool = False,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        if not approval_granted:
            return {
                "status": APPROVAL_REQUIRED,
                "integration": "commerce",
                "action": action,
                "message": "commerce write requires explicit human approval",
                "payload_keys": sorted(payload.keys()),
            }
        if settings.BUZZARD_COMMERCE_WRITES_DISABLED:
            return {
                "status": WRITES_DISABLED,
                "integration": "commerce",
                "action": action,
                "message": "commerce writes disabled via BUZZARD_COMMERCE_WRITES_DISABLED",
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
        if idempotency_key:
            result = self._connector.execute_action(action, payload, idempotency_key=idempotency_key)
        else:
            result = self._request("POST", f"/actions/{action}", payload)
        result.setdefault("action", action)
        return result

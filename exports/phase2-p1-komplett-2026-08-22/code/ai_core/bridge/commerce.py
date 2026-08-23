from __future__ import annotations

from typing import Any

EXTERNAL_INTEGRATION_PENDING = "EXTERNAL_INTEGRATION_PENDING"
NO_DATA_AVAILABLE = "NO_DATA_AVAILABLE"


class CommerceBridge:
    """Read-only commerce bridge; writes report EXTERNAL_INTEGRATION_PENDING."""

    def read_products(self, sku: str | None = None) -> dict[str, Any]:
        return {
            "status": NO_DATA_AVAILABLE,
            "integration": "commerce",
            "message": "commerce read bridge not connected; no product data available",
            "sku": sku,
        }

    def read_orders(self, order_id: str | None = None) -> dict[str, Any]:
        return {
            "status": NO_DATA_AVAILABLE,
            "integration": "commerce",
            "message": "commerce read bridge not connected; no order data available",
            "order_id": order_id,
        }

    def read_stock(self, sku: str | None = None) -> dict[str, Any]:
        return {
            "status": NO_DATA_AVAILABLE,
            "integration": "commerce",
            "message": "commerce read bridge not connected; no stock data available",
            "sku": sku,
        }

    def write(self, action: str, payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "status": EXTERNAL_INTEGRATION_PENDING,
            "integration": "commerce",
            "action": action,
            "message": "commerce write operations require external integration",
            "payload_keys": sorted(payload.keys()),
        }

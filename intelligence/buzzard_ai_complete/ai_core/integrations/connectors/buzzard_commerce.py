from __future__ import annotations

import json
import time
from abc import ABC, abstractmethod
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from buzzard_ai_complete.ai_core.integrations.commerce_config import validate_commerce_configuration
from buzzard_ai_complete.config import settings


class CommerceConnector(ABC):
    @abstractmethod
    def is_configured(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    def health_check(self) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def request(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
        *,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        raise NotImplementedError


class BuzzardCommerceConnector(CommerceConnector):
    """HTTP connector for Buzzard Commerce API staging/production."""

    def __init__(self) -> None:
        self._base_url = settings.COMMERCE_API_URL.rstrip("/") if settings.COMMERCE_API_URL else ""
        self._token = settings.COMMERCE_API_TOKEN
        self._consecutive_failures = 0

    def is_configured(self) -> bool:
        return validate_commerce_configuration().valid

    def health_check(self) -> dict[str, Any]:
        config = validate_commerce_configuration()
        if not config.valid:
            return {
                "status": "DISCONNECTED",
                "integration": "commerce",
                "message": "commerce API not configured",
                "config_errors": list(config.errors),
            }
        result = self.request("GET", "/health")
        if result.get("status") in {"ok", "healthy", "CONNECTED"}:
            self._consecutive_failures = 0
            return {"status": "CONNECTED", "integration": "commerce", "details": result}
        if result.get("status") == "ERROR":
            self._consecutive_failures += 1
            status = "DISCONNECTED" if self._consecutive_failures >= 3 else "DEGRADED"
            return {
                "status": status,
                "integration": "commerce",
                "message": result.get("message"),
                "http_status": result.get("http_status"),
            }
        self._consecutive_failures = 0
        return {"status": "CONNECTED", "integration": "commerce", "details": result}

    def request(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
        *,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        config = validate_commerce_configuration()
        if not config.valid:
            return {
                "status": "NO_DATA_AVAILABLE",
                "integration": "commerce",
                "message": "commerce API not configured",
            }
        url = f"{self._base_url}{path}"
        headers = {
            "Authorization": f"Bearer {self._token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Service-Identity": "commerce-adapter",
        }
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
        data = json.dumps(payload).encode("utf-8") if payload is not None else None
        request = Request(url, data=data, headers=headers, method=method)
        try:
            with urlopen(request, timeout=settings.REQUEST_TIMEOUT) as response:
                body = response.read().decode("utf-8")
                parsed = json.loads(body) if body else {}
                if isinstance(parsed, dict):
                    parsed.setdefault("status", "ok")
                    parsed.setdefault("integration", "commerce")
                    self._consecutive_failures = 0
                    return parsed
                return {"status": "ok", "integration": "commerce", "data": parsed}
        except HTTPError as exc:
            self._consecutive_failures += 1
            retry_after = exc.headers.get("Retry-After") if exc.headers else None
            return {
                "status": "ERROR",
                "integration": "commerce",
                "http_status": exc.code,
                "message": str(exc.reason),
                "retry_after": retry_after,
            }
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            self._consecutive_failures += 1
            return {
                "status": "NO_DATA_AVAILABLE",
                "integration": "commerce",
                "message": f"commerce API request failed: {exc}",
            }

    def get_products(self, *, sku: str | None = None) -> dict[str, Any]:
        path = f"/products/{sku}" if sku else "/products"
        return self.request("GET", path)

    def get_orders(self, *, order_id: str | None = None) -> dict[str, Any]:
        path = f"/orders/{order_id}" if order_id else "/orders"
        return self.request("GET", path)

    def get_stock(self, *, sku: str | None = None) -> dict[str, Any]:
        path = f"/stock/{sku}" if sku else "/stock"
        return self.request("GET", path)

    def execute_action(
        self,
        action: str,
        payload: dict[str, Any],
        *,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        result = self.request(
            "POST",
            f"/actions/{action}",
            payload,
            idempotency_key=idempotency_key,
        )
        result.setdefault("action", action)
        return result

    def backoff_seconds(self, retry_count: int) -> float:
        return min(16.0, 2 ** max(retry_count, 0))

    def sleep_backoff(self, retry_count: int) -> None:
        time.sleep(self.backoff_seconds(retry_count))

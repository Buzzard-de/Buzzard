from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class SupplierAdapter(ABC):
    """Abstract supplier feed adapter — multi-format ingestion."""

    adapter_type: str = "base"

    @abstractmethod
    def fetch_catalog(self, *, supplier_id: str) -> dict[str, Any]:
        """Fetch raw supplier catalog records."""
        raise NotImplementedError

    @abstractmethod
    def is_configured(self) -> bool:
        raise NotImplementedError

    def health_check(self) -> dict[str, Any]:
        if not self.is_configured():
            return {
                "status": "DISCONNECTED",
                "adapter": self.adapter_type,
                "message": "supplier adapter not configured",
            }
        return {"status": "CONNECTED", "adapter": self.adapter_type}

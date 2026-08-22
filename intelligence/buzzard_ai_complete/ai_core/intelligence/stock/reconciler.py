from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class StockSource:
    source: str
    quantity: int
    reserved: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ReconciledStock:
    sku: str
    supplier_stock: int
    internal_stock: int
    wms_stock: int
    reserved_stock: int
    available_stock: int
    safety_stock: int
    conflict: bool
    conflict_reason: str | None
    sources: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "sku": self.sku,
            "supplier_stock": self.supplier_stock,
            "internal_stock": self.internal_stock,
            "wms_stock": self.wms_stock,
            "reserved_stock": self.reserved_stock,
            "available_stock": self.available_stock,
            "safety_stock": self.safety_stock,
            "conflict": self.conflict,
            "conflict_reason": self.conflict_reason,
            "sources": self.sources,
            "status": "ok",
        }


class StockReconciler:
    """Merge stock from WMS, commerce, and supplier sources with conflict detection."""

    SOURCE_PRIORITY = ("wms", "commerce", "supplier")

    def merge(self, sku: str, sources: list[StockSource], *, safety_stock: int = 0) -> ReconciledStock:
        by_name = {s.source: s for s in sources}
        supplier = by_name.get("supplier", StockSource("supplier", 0))
        commerce = by_name.get("commerce", StockSource("commerce", 0))
        wms = by_name.get("wms", StockSource("wms", 0))

        supplier_qty = max(0, supplier.quantity)
        commerce_qty = max(0, commerce.quantity)
        wms_qty = max(0, wms.quantity)
        reserved = max(supplier.reserved, commerce.reserved, wms.reserved, 0)

        internal_stock = wms_qty if wms_qty > 0 else commerce_qty
        conflict = False
        conflict_reason = None

        active = [q for q in (wms_qty, commerce_qty, supplier_qty) if q > 0]
        if len(active) >= 2 and max(active) != min(active):
            conflict = True
            conflict_reason = "quantity mismatch across sources"

        available = max(0, internal_stock - reserved)
        if supplier_qty > 0 and wms_qty == 0 and commerce_qty == 0:
            available = max(0, supplier_qty - reserved)

        return ReconciledStock(
            sku=sku,
            supplier_stock=supplier_qty,
            internal_stock=internal_stock,
            wms_stock=wms_qty,
            reserved_stock=reserved,
            available_stock=available,
            safety_stock=safety_stock,
            conflict=conflict,
            conflict_reason=conflict_reason,
            sources=[
                {"source": s.source, "quantity": s.quantity, "reserved": s.reserved}
                for s in sources
            ],
        )

    def below_safety_stock(self, stock: ReconciledStock) -> bool:
        return stock.available_stock < stock.safety_stock

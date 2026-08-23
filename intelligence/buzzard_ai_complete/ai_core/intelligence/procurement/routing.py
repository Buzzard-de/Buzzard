from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from buzzard_ai_complete.config import settings


@dataclass
class SupplierRouteCandidate:
    supplier_id: str
    supplier_code: str
    price: float
    stock_available: int
    lead_time_days: int
    priority: int
    taxonomy_id: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ProcurementRouteDecision:
    order_id: str
    selected_supplier_id: str | None
    selected_supplier_code: str | None
    approval_required: bool
    po_total: float
    routing_reason: str
    candidates_evaluated: int
    explain: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "order_id": self.order_id,
            "selected_supplier_id": self.selected_supplier_id,
            "selected_supplier_code": self.selected_supplier_code,
            "approval_required": self.approval_required,
            "po_total": self.po_total,
            "routing_reason": self.routing_reason,
            "candidates_evaluated": self.candidates_evaluated,
            "explain": self.explain,
            "status": "ok" if self.selected_supplier_id else "NO_ROUTE",
        }


class ProcurementRoutingService:
    """Select supplier for procurement by priority policy — explainable and auditable."""

    def __init__(self, *, po_approval_threshold: float | None = None) -> None:
        self._po_threshold = po_approval_threshold if po_approval_threshold is not None else settings.PROCUREMENT_PO_APPROVAL_THRESHOLD

    def route(
        self,
        *,
        order_id: str,
        line_items: list[dict[str, Any]],
        candidates: list[SupplierRouteCandidate],
        taxonomy_id: str | None = None,
    ) -> ProcurementRouteDecision:
        explain: list[str] = []
        if not candidates:
            return ProcurementRouteDecision(
                order_id=order_id,
                selected_supplier_id=None,
                selected_supplier_code=None,
                approval_required=False,
                po_total=0.0,
                routing_reason="no_supplier_candidates",
                candidates_evaluated=0,
                explain=["no candidates available"],
            )

        eligible = [c for c in candidates if c.stock_available > 0]
        explain.append(f"evaluated {len(candidates)} candidates, {len(eligible)} with stock")

        if taxonomy_id:
            taxonomy_matches = [c for c in eligible if not c.taxonomy_id or c.taxonomy_id == taxonomy_id]
            if taxonomy_matches:
                eligible = taxonomy_matches
                explain.append(f"filtered to {len(eligible)} taxonomy-compatible suppliers")

        if not eligible:
            return ProcurementRouteDecision(
                order_id=order_id,
                selected_supplier_id=None,
                selected_supplier_code=None,
                approval_required=False,
                po_total=0.0,
                routing_reason="no_stock_available",
                candidates_evaluated=len(candidates),
                explain=explain + ["no supplier with available stock"],
            )

        ranked = sorted(
            eligible,
            key=lambda c: (c.priority, c.lead_time_days, c.price),
        )
        selected = ranked[0]
        po_total = sum(float(item.get("quantity", 1)) * selected.price for item in line_items)
        approval_required = po_total >= self._po_threshold

        explain.append(
            f"selected {selected.supplier_code} (priority={selected.priority}, price={selected.price}, lead={selected.lead_time_days}d)"
        )
        if approval_required:
            explain.append(f"PO total {po_total:.2f} exceeds threshold {self._po_threshold:.2f}")

        return ProcurementRouteDecision(
            order_id=order_id,
            selected_supplier_id=selected.supplier_id,
            selected_supplier_code=selected.supplier_code,
            approval_required=approval_required,
            po_total=round(po_total, 2),
            routing_reason="priority_policy",
            candidates_evaluated=len(candidates),
            explain=explain,
        )

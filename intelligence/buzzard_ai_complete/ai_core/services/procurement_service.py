from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.intelligence.procurement.routing import (
    ProcurementRoutingService,
    SupplierRouteCandidate,
)
from buzzard_ai_complete.ai_core.services.idempotency_service import IdempotencyService
from buzzard_ai_complete.config import settings


class ProcurementService:
    """Procurement intelligence — uses Wave 3 ProcurementRoutingService, idempotent PO drafts."""

    def __init__(self, session: Session) -> None:
        self._session = session
        self._routing = ProcurementRoutingService()
        self._idempotency = IdempotencyService(session)

    def select_supplier(self, payload: dict[str, Any]) -> dict[str, Any]:
        candidates = self._build_candidates(payload.get("candidates") or [])
        decision = self._routing.route(
            order_id=str(payload.get("order_id", "PO-DRAFT")),
            line_items=payload.get("line_items") or [],
            candidates=candidates,
            taxonomy_id=payload.get("taxonomy_id"),
        )
        return decision.to_dict()

    def draft_purchase_order(self, payload: dict[str, Any], *, idempotency_key: str | None = None) -> dict[str, Any]:
        order_id = str(payload.get("order_id", "PO-DRAFT"))
        key = idempotency_key or f"po-draft:{order_id}"

        def _handler() -> dict[str, Any]:
            route = self.select_supplier(payload)
            if route.get("status") != "ok":
                return {"status": route.get("status", "NO_ROUTE"), "route": route, "duplicate": False}

            po_total = float(route.get("po_total", 0))
            approval_required = route.get("approval_required", False)
            if approval_required or po_total >= settings.PROCUREMENT_PO_APPROVAL_THRESHOLD:
                return {
                    "status": "APPROVAL_REQUIRED",
                    "route": route,
                    "po_total": po_total,
                    "duplicate": False,
                    "requires_approval": True,
                }

            if not settings.BUZZARD_AUTONOMY_L4_ENABLED and po_total > 0:
                return {
                    "status": "APPROVAL_REQUIRED",
                    "route": route,
                    "po_total": po_total,
                    "duplicate": False,
                    "requires_approval": True,
                    "reason": "L4 disabled",
                }

            from buzzard_ai_complete.ai_core.observability.autonomy import is_autonomy_disabled

            if is_autonomy_disabled():
                return {
                    "status": "BLOCKED",
                    "route": route,
                    "duplicate": False,
                    "reason": "BUZZARD_AUTONOMY_DISABLED",
                }

            l4_threshold = settings.BUZZARD_PO_AUTO_THRESHOLD_EUR
            if po_total >= l4_threshold:
                return {
                    "status": "APPROVAL_REQUIRED",
                    "route": route,
                    "po_total": po_total,
                    "duplicate": False,
                    "requires_approval": True,
                }

            return {
                "status": "DRAFT_CREATED",
                "route": route,
                "po_total": po_total,
                "duplicate": False,
                "supplier_code": route.get("selected_supplier_code"),
                "resource_id": f"po-{order_id}",
            }

        return self._idempotency.execute_once(key, resource_type="purchase_order_draft", handler=_handler)

    @staticmethod
    def _build_candidates(raw: list[dict[str, Any]]) -> list[SupplierRouteCandidate]:
        return [
            SupplierRouteCandidate(
                supplier_id=str(c.get("supplier_id", c.get("supplier_code", f"SUP-{i}"))),
                supplier_code=str(c.get("supplier_code", f"SUP-{i}")),
                price=float(c.get("price", 0)),
                stock_available=int(c.get("stock_available", 0)),
                lead_time_days=int(c.get("lead_time_days", 7)),
                priority=int(c.get("priority", 10)),
                taxonomy_id=c.get("taxonomy_id"),
            )
            for i, c in enumerate(raw)
        ]

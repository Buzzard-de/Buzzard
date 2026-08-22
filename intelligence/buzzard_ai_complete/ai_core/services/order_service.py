from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.intelligence.orders.ingestion import OrderIngestionService
from buzzard_ai_complete.ai_core.intelligence.procurement.routing import ProcurementRoutingService, SupplierRouteCandidate
from buzzard_ai_complete.ai_core.models.order_record import OrderRecord
from buzzard_ai_complete.ai_core.models.product import ProductRecord
from buzzard_ai_complete.ai_core.models.supplier import SupplierRecord
from buzzard_ai_complete.ai_core.services.event_service import EventService


class OrderService:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._ingestion = OrderIngestionService(session)
        self._procurement = ProcurementRoutingService()

    def list_orders(self, *, limit: int = 50) -> list[OrderRecord]:
        return list(
            self._session.scalars(select(OrderRecord).order_by(OrderRecord.created_at.desc()).limit(limit))
        )

    def get_order(self, order_id: str, *, source: str | None = None) -> OrderRecord | None:
        stmt = select(OrderRecord).where(OrderRecord.order_id == order_id)
        if source:
            stmt = stmt.where(OrderRecord.source == source)
        return self._session.scalar(stmt)

    def ingest(self, payload: dict[str, Any], *, idempotency_key: str | None = None) -> dict[str, Any]:
        result = self._ingestion.ingest(payload, idempotency_key=idempotency_key)
        if result.get("status") == "ok" and not result.get("duplicate"):
            route = self._route_procurement(payload)
            record = self.get_order(str(payload["order_id"]), source=str(payload["source"]))
            if record:
                record.procurement = route
                self._session.flush()
            result["procurement"] = route
            EventService(self._session).emit(
                "order.ingested",
                {"order_id": payload.get("order_id"), "source": payload.get("source")},
                source="order-service",
                correlation_id=result.get("record_id"),
            )
        return result

    def _route_procurement(self, payload: dict[str, Any]) -> dict[str, Any]:
        line_items = payload.get("line_items") or []
        if not line_items:
            return {"status": "SKIPPED", "reason": "no line items"}

        suppliers = list(self._session.scalars(select(SupplierRecord).where(SupplierRecord.status == "active")))
        candidates: list[SupplierRouteCandidate] = []
        for supplier in suppliers:
            sku = str(line_items[0].get("sku", ""))
            product = self._session.scalar(
                select(ProductRecord).where(
                    ProductRecord.sku == sku,
                    ProductRecord.supplier_id == supplier.id,
                )
            )
            candidates.append(
                SupplierRouteCandidate(
                    supplier_id=supplier.id,
                    supplier_code=supplier.supplier_code,
                    price=float(product.price if product and product.price else 0),
                    stock_available=int(product.stock_qty if product and product.stock_qty else 0),
                    lead_time_days=int((product.extra_metadata or {}).get("lead_time_days", 7) if product else 7),
                    priority=int((supplier.extra_metadata or {}).get("priority", 100)),
                    taxonomy_id=product.taxonomy_id if product else None,
                )
            )

        decision = self._procurement.route(
            order_id=str(payload.get("order_id")),
            line_items=line_items,
            candidates=candidates,
            taxonomy_id=line_items[0].get("taxonomy_id") if line_items else None,
        )
        return decision.to_dict()

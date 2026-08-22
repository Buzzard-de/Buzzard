from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.bridge.commerce import CommerceBridge, NO_DATA_AVAILABLE
from buzzard_ai_complete.ai_core.integrations.wms_adapter import WmsAdapter
from buzzard_ai_complete.ai_core.intelligence.stock.reconciler import StockReconciler, StockSource
from buzzard_ai_complete.ai_core.models.product import ProductRecord
from buzzard_ai_complete.ai_core.models.stock_snapshot import StockSnapshotRecord
from buzzard_ai_complete.ai_core.services.event_service import EventService


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class StockService:
    def __init__(
        self,
        session: Session,
        *,
        bridge: CommerceBridge | None = None,
        wms: WmsAdapter | None = None,
    ) -> None:
        self._session = session
        self._bridge = bridge or CommerceBridge()
        self._wms = wms or WmsAdapter()
        self._reconciler = StockReconciler()

    def list_snapshots(self, *, sku: str | None = None, limit: int = 50) -> list[StockSnapshotRecord]:
        stmt = select(StockSnapshotRecord).order_by(StockSnapshotRecord.reconciled_at.desc()).limit(limit)
        if sku:
            stmt = stmt.where(StockSnapshotRecord.sku == sku)
        return list(self._session.scalars(stmt))

    def sync_stock(self, sku: str, *, safety_stock: int = 0) -> dict[str, Any]:
        sources: list[StockSource] = []

        wms_data = self._wms.get_stock(sku=sku)
        if wms_data.get("status") not in {NO_DATA_AVAILABLE, "ERROR"}:
            sources.append(
                StockSource(
                    source="wms",
                    quantity=int(wms_data.get("quantity") or wms_data.get("available") or 0),
                    reserved=int(wms_data.get("reserved") or 0),
                )
            )

        commerce_data = self._bridge.read_stock(sku=sku)
        if commerce_data.get("status") not in {NO_DATA_AVAILABLE, "ERROR"}:
            sources.append(
                StockSource(
                    source="commerce",
                    quantity=int(commerce_data.get("quantity") or commerce_data.get("stock") or 0),
                    reserved=int(commerce_data.get("reserved") or 0),
                )
            )

        product = self._session.scalar(select(ProductRecord).where(ProductRecord.sku == sku))
        if product and product.stock_qty is not None:
            sources.append(StockSource(source="supplier", quantity=int(product.stock_qty)))

        if not sources:
            return {
                "status": NO_DATA_AVAILABLE,
                "sku": sku,
                "message": "no stock sources available",
            }

        reconciled = self._reconciler.merge(sku, sources, safety_stock=safety_stock)
        snapshot = StockSnapshotRecord(
            sku=sku,
            supplier_stock=reconciled.supplier_stock,
            internal_stock=reconciled.internal_stock,
            wms_stock=reconciled.wms_stock,
            reserved_stock=reconciled.reserved_stock,
            available_stock=reconciled.available_stock,
            safety_stock=reconciled.safety_stock,
            conflict=reconciled.conflict,
            conflict_reason=reconciled.conflict_reason,
            sources={"items": reconciled.sources},
        )
        self._session.add(snapshot)
        self._session.flush()

        EventService(self._session).emit(
            "stock.reconciled",
            {"sku": sku, "available_stock": reconciled.available_stock, "conflict": reconciled.conflict},
            source="stock-service",
            correlation_id=snapshot.id,
        )

        result = reconciled.to_dict()
        result["snapshot_id"] = snapshot.id
        result["below_safety_stock"] = self._reconciler.below_safety_stock(reconciled)
        return result

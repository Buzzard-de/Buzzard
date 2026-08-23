from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.bridge.commerce import CommerceBridge, NO_DATA_AVAILABLE
from buzzard_ai_complete.ai_core.integrations.suppliers.product_mapper import ProductMapper
from buzzard_ai_complete.ai_core.models.product import ProductRecord
from buzzard_ai_complete.ai_core.services.event_service import EventService


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ProductPipelineService:
    def __init__(self, session: Session, bridge: CommerceBridge | None = None) -> None:
        self._session = session
        self._bridge = bridge or CommerceBridge()
        self._mapper = ProductMapper()

    def list_products(self, *, supplier_id: str | None = None, limit: int = 100) -> list[ProductRecord]:
        stmt = select(ProductRecord).order_by(ProductRecord.updated_at.desc()).limit(limit)
        if supplier_id:
            stmt = stmt.where(ProductRecord.supplier_id == supplier_id)
        return list(self._session.scalars(stmt))

    def get_product_by_sku(self, sku: str, *, supplier_id: str | None = None) -> ProductRecord | None:
        stmt = select(ProductRecord).where(ProductRecord.sku == sku)
        if supplier_id:
            stmt = stmt.where(ProductRecord.supplier_id == supplier_id)
        return self._session.scalar(stmt)

    def enrich_product(self, sku: str, *, supplier_id: str | None = None) -> dict[str, Any]:
        product = self.get_product_by_sku(sku, supplier_id=supplier_id)
        if not product:
            return {"status": "NOT_FOUND", "sku": sku}

        commerce_data = self._bridge.read_products(sku=sku)
        base = {
            "sku": product.sku,
            "name": product.name,
            "supplier_id": product.supplier_id,
            "description": product.description,
            "brand": product.brand,
            "price": product.price,
            "currency": product.currency,
            "stock_qty": product.stock_qty,
            "taxonomy_id": product.taxonomy_id,
            "storefront_category_id": product.storefront_category_id,
            "ean": product.ean,
            "enrichment_status": product.enrichment_status,
            "metadata": product.extra_metadata,
        }
        enriched = self._mapper.enrich_product(
            base,
            commerce_data=None if commerce_data.get("status") == NO_DATA_AVAILABLE else commerce_data,
        )

        product.name = enriched.get("name", product.name)
        product.enrichment_status = enriched.get("enrichment_status", "enriched")
        product.extra_metadata = {**(product.extra_metadata or {}), **(enriched.get("attributes") or {})}
        product.updated_at = utcnow()
        self._session.flush()

        EventService(self._session).emit(
            "product.enriched",
            {"sku": sku, "supplier_id": product.supplier_id, "enrichment_status": product.enrichment_status},
            source="product-pipeline",
            correlation_id=product.id,
        )

        return {"status": "ok", "sku": sku, "product": enriched}

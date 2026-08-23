from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.integrations.suppliers.factory import get_supplier_adapter
from buzzard_ai_complete.ai_core.integrations.suppliers.normalizer import SupplierNormalizer
from buzzard_ai_complete.ai_core.integrations.suppliers.product_mapper import ProductMapper
from buzzard_ai_complete.ai_core.integrations.suppliers.security import encrypt_credential
from buzzard_ai_complete.ai_core.models.product import ProductRecord
from buzzard_ai_complete.ai_core.models.supplier import SupplierRecord
from buzzard_ai_complete.ai_core.services.event_service import EventService


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SupplierService:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._normalizer = SupplierNormalizer()
        self._mapper = ProductMapper()

    def list_suppliers(self) -> list[SupplierRecord]:
        return list(self._session.scalars(select(SupplierRecord).order_by(SupplierRecord.name)))

    def get_supplier(self, supplier_id: str) -> SupplierRecord | None:
        return self._session.get(SupplierRecord, supplier_id)

    def get_by_code(self, supplier_code: str) -> SupplierRecord | None:
        return self._session.scalar(
            select(SupplierRecord).where(SupplierRecord.supplier_code == supplier_code)
        )

    def create_supplier(
        self,
        *,
        supplier_code: str,
        name: str,
        feed_type: str = "rest",
        feed_path: str | None = None,
        credential: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> SupplierRecord:
        encrypted = encrypt_credential(credential) if credential else None
        record = SupplierRecord(
            supplier_code=supplier_code,
            name=name,
            feed_type=feed_type,
            feed_path=feed_path,
            credentials_encrypted=encrypted,
            extra_metadata=metadata or {},
        )
        self._session.add(record)
        self._session.flush()
        return record

    def sync_supplier(self, supplier_id: str) -> dict[str, Any]:
        supplier = self.get_supplier(supplier_id)
        if not supplier:
            raise ValueError("supplier not found")

        adapter = get_supplier_adapter(feed_type=supplier.feed_type, feed_path=supplier.feed_path)
        if not adapter.is_configured():
            return {
                "status": "EXTERNAL_INTEGRATION_PENDING",
                "supplier_id": supplier_id,
                "message": "supplier feed not configured",
            }

        catalog = adapter.fetch_catalog(supplier_id=supplier.supplier_code)
        if catalog.get("status") not in {"ok"}:
            return catalog

        normalized, errors = self._normalizer.normalize_batch(
            catalog.get("records") or [],
            supplier_id=supplier.id,
        )
        products_synced = 0
        for item in normalized:
            mapped = self._mapper.map_product(item)
            self._upsert_product(mapped, supplier_id=supplier.id)
            products_synced += 1

        supplier.last_synced_at = utcnow()
        supplier.updated_at = utcnow()
        self._session.flush()

        EventService(self._session).emit(
            "supplier.catalog_synced",
            {
                "supplier_id": supplier.id,
                "supplier_code": supplier.supplier_code,
                "products_synced": products_synced,
                "errors": errors,
            },
            source="supplier-service",
            correlation_id=supplier.id,
        )

        return {
            "status": "ok",
            "supplier_id": supplier.id,
            "products_synced": products_synced,
            "errors": errors,
        }

    def _upsert_product(self, mapped: dict[str, Any], *, supplier_id: str) -> ProductRecord:
        existing = self._session.scalar(
            select(ProductRecord).where(
                ProductRecord.sku == mapped["sku"],
                ProductRecord.supplier_id == supplier_id,
            )
        )
        if existing:
            existing.name = mapped["name"]
            existing.description = mapped.get("description")
            existing.brand = mapped.get("brand")
            existing.price = mapped.get("price")
            existing.currency = mapped.get("currency", "EUR")
            existing.stock_qty = mapped.get("stock_qty")
            existing.taxonomy_id = mapped.get("taxonomy_id")
            existing.storefront_category_id = mapped.get("storefront_category_id")
            existing.ean = mapped.get("ean")
            existing.enrichment_status = mapped.get("enrichment_status", "normalized")
            existing.extra_metadata = mapped.get("metadata") or {}
            existing.updated_at = utcnow()
            return existing

        record = ProductRecord(
            sku=mapped["sku"],
            supplier_id=supplier_id,
            name=mapped["name"],
            description=mapped.get("description"),
            brand=mapped.get("brand"),
            price=mapped.get("price"),
            currency=mapped.get("currency", "EUR"),
            stock_qty=mapped.get("stock_qty"),
            taxonomy_id=mapped.get("taxonomy_id"),
            storefront_category_id=mapped.get("storefront_category_id"),
            ean=mapped.get("ean"),
            enrichment_status=mapped.get("enrichment_status", "normalized"),
            extra_metadata=mapped.get("metadata") or {},
        )
        self._session.add(record)
        self._session.flush()
        return record

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from buzzard_ai_complete.ai_core.database.base import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_uuid() -> str:
    return str(uuid.uuid4())


class ProductRecord(Base):
    __tablename__ = "ai_core_products"
    __table_args__ = (UniqueConstraint("sku", "supplier_id", name="uq_ai_core_products_sku_supplier"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    sku: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    supplier_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    brand: Mapped[str | None] = mapped_column(String(256), nullable=True)
    price: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="EUR")
    stock_qty: Mapped[int | None] = mapped_column(Integer, nullable=True)
    taxonomy_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    storefront_category_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    ean: Mapped[str | None] = mapped_column(String(32), nullable=True)
    enrichment_status: Mapped[str] = mapped_column(String(32), nullable=False, default="normalized", index=True)
    extra_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )

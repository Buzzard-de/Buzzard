from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from buzzard_ai_complete.ai_core.database.base import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_uuid() -> str:
    return str(uuid.uuid4())


class StockSnapshotRecord(Base):
    __tablename__ = "ai_core_stock_snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    sku: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    supplier_stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    internal_stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    wms_stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reserved_stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    available_stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    safety_stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    conflict: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    conflict_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sources: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    reconciled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    extra_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, nullable=False, default=dict)

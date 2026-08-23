from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Float, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from buzzard_ai_complete.ai_core.database.base import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_uuid() -> str:
    return str(uuid.uuid4())


class PricingCandidateRecord(Base):
    __tablename__ = "ai_core_pricing_candidates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    sku: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    supplier_cost: Mapped[float] = mapped_column(Float, nullable=False)
    recommended_price: Mapped[float] = mapped_column(Float, nullable=False)
    margin: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="EUR")
    taxonomy_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="PENDING", index=True)
    approval_required: Mapped[bool] = mapped_column(nullable=False, default=False)
    policy_result: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    extra_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )

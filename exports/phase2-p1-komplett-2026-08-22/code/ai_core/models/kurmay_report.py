from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from buzzard_ai_complete.ai_core.database.base import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_uuid() -> str:
    return str(uuid.uuid4())


class KurmayReportRecord(Base):
    __tablename__ = "ai_core_kurmay_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    situation_summary: Mapped[str] = mapped_column(Text, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False, default="LOW", index=True)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    content: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow, index=True)

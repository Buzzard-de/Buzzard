from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from buzzard_ai_complete.ai_core.database.base import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_uuid() -> str:
    return str(uuid.uuid4())


class DecisionRecord(Base):
    __tablename__ = "ai_core_decisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    output_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    signals_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    content: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    task_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)


class PolicyRecord(Base):
    __tablename__ = "ai_core_policies"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    policy_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    rules: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    effective_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    effective_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_by: Mapped[str] = mapped_column(String(255), nullable=False)

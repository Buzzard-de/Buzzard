from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from buzzard_ai_complete.ai_core.database.base import Base
from buzzard_ai_complete.ai_core.enums import MemoryImpact, MemoryType


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_uuid() -> str:
    return str(uuid.uuid4())


class MemoryEntry(Base):
    __tablename__ = "ai_core_memory"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    source: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    entity: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    content: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    impact: Mapped[str] = mapped_column(String(20), nullable=False, default=MemoryImpact.LOW.value)
    namespace: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    key: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[str] = mapped_column(String(255), nullable=False)
    related_task: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    audit_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    valid_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )

    history: Mapped[list[MemoryHistory]] = relationship(back_populates="memory", cascade="all, delete-orphan")


class MemoryHistory(Base):
    __tablename__ = "ai_core_memory_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    memory_id: Mapped[str] = mapped_column(String(36), ForeignKey("ai_core_memory.id"), nullable=False, index=True)
    namespace: Mapped[str] = mapped_column(String(100), nullable=False)
    key: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    changed_by: Mapped[str] = mapped_column(String(255), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)

    memory: Mapped[MemoryEntry] = relationship(back_populates="history")

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from buzzard_ai_complete.ai_core.database.base import Base
from buzzard_ai_complete.ai_core.enums import ExceptionSeverity, ExceptionStatus


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_uuid() -> str:
    return str(uuid.uuid4())


class ExceptionRecord(Base):
    __tablename__ = "ai_core_exceptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    entity: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=ExceptionStatus.DETECTED.value, index=True)
    owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    assigned_to: Mapped[str | None] = mapped_column(String(255), nullable=True)
    worker_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    task_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    resolution: Mapped[str | None] = mapped_column(Text, nullable=True)
    contained: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    worker_halted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    extra_metadata: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    transitions: Mapped[list[ExceptionTransition]] = relationship(
        back_populates="exception", cascade="all, delete-orphan"
    )


class ExceptionTransition(Base):
    __tablename__ = "ai_core_exception_transitions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    exception_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ai_core_exceptions.id"), nullable=False, index=True
    )
    from_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    to_status: Mapped[str] = mapped_column(String(20), nullable=False)
    actor: Mapped[str] = mapped_column(String(255), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)

    exception: Mapped[ExceptionRecord] = relationship(back_populates="transitions")

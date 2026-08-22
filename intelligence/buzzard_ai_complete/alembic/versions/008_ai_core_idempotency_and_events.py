"""AI Core idempotency keys and event outbox (Phase 3 Wave 1).

Revision ID: 008_ai_core_idempotency_and_events
Revises: 007_ai_core_approvals
Create Date: 2026-08-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "008_ai_core_idempotency_and_events"
down_revision: Union[str, None] = "007_ai_core_approvals"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_core_idempotency_keys",
        sa.Column("key", sa.String(length=255), nullable=False),
        sa.Column("resource_type", sa.String(length=64), nullable=False),
        sa.Column("resource_id", sa.String(length=255), nullable=True),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("key"),
    )
    op.create_index(
        "idx_idempotency_expires",
        "ai_core_idempotency_keys",
        ["expires_at"],
    )

    op.create_table(
        "ai_core_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("event_type", sa.String(length=128), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("correlation_id", sa.String(length=255), nullable=True),
        sa.Column("causation_id", sa.String(length=255), nullable=True),
        sa.Column("source", sa.String(length=128), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="PENDING"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.String(length=1024), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_events_status", "ai_core_events", ["status", "created_at"])
    op.create_index("idx_events_type", "ai_core_events", ["event_type"])
    op.create_index("idx_events_correlation", "ai_core_events", ["correlation_id"])


def downgrade() -> None:
    op.drop_index("idx_events_correlation", table_name="ai_core_events", if_exists=True)
    op.drop_index("idx_events_type", table_name="ai_core_events", if_exists=True)
    op.drop_index("idx_events_status", table_name="ai_core_events", if_exists=True)
    op.drop_table("ai_core_events")
    op.drop_index("idx_idempotency_expires", table_name="ai_core_idempotency_keys", if_exists=True)
    op.drop_table("ai_core_idempotency_keys")

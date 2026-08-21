"""AI Core worker registry metadata table.

Revision ID: 004_ai_core_workers
Revises: 003_ai_core_memory_active_unique
Create Date: 2026-08-21
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004_ai_core_workers"
down_revision: Union[str, None] = "003_ai_core_memory_active_unique"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_core_workers",
        sa.Column("worker_id", sa.String(length=100), nullable=False),
        sa.Column("family", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("capabilities", sa.JSON(), nullable=False),
        sa.Column("permissions", sa.JSON(), nullable=False),
        sa.Column("risk_default", sa.String(length=20), nullable=False),
        sa.Column("health_status", sa.String(length=20), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("worker_id"),
    )
    op.create_index("ix_ai_core_workers_family", "ai_core_workers", ["family"])
    op.create_index("ix_ai_core_workers_status", "ai_core_workers", ["status"])


def downgrade() -> None:
    op.drop_index("ix_ai_core_workers_status", table_name="ai_core_workers", if_exists=True)
    op.drop_index("ix_ai_core_workers_family", table_name="ai_core_workers", if_exists=True)
    op.drop_table("ai_core_workers")

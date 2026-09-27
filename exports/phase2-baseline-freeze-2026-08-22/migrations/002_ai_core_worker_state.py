"""AI Core worker state persistence

Revision ID: 002_ai_core_worker_state
Revises: 001_ai_core_initial
Create Date: 2026-08-21
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002_ai_core_worker_state"
down_revision: Union[str, None] = "001_ai_core_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_core_worker_state",
        sa.Column("worker_id", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("halt_reason", sa.Text(), nullable=True),
        sa.Column("halted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("halted_by", sa.String(length=255), nullable=True),
        sa.Column("exception_id", sa.String(length=36), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["exception_id"], ["ai_core_exceptions.id"]),
        sa.PrimaryKeyConstraint("worker_id"),
    )
    op.create_index("ix_ai_core_worker_state_status", "ai_core_worker_state", ["status"])


def downgrade() -> None:
    op.drop_index("ix_ai_core_worker_state_status", table_name="ai_core_worker_state")
    op.drop_table("ai_core_worker_state")

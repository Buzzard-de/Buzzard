"""AI Core integration status table.

Revision ID: 005_ai_core_integration_status
Revises: 004_ai_core_workers
Create Date: 2026-08-21
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "005_ai_core_integration_status"
down_revision: Union[str, None] = "004_ai_core_workers"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_core_integration_status",
        sa.Column("integration_id", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("integration_id"),
    )
    op.create_index("ix_ai_core_integration_status_status", "ai_core_integration_status", ["status"])


def downgrade() -> None:
    op.drop_index("ix_ai_core_integration_status_status", table_name="ai_core_integration_status")
    op.drop_table("ai_core_integration_status")

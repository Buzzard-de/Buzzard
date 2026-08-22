"""AI Core suppliers table (Phase 3 Wave 2).

Revision ID: 009_ai_core_suppliers
Revises: 008_ai_core_idem_events
Create Date: 2026-08-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "009_ai_core_suppliers"
down_revision: Union[str, None] = "008_ai_core_idem_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_core_suppliers",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("supplier_code", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("feed_type", sa.String(length=32), nullable=False, server_default="rest"),
        sa.Column("feed_path", sa.String(length=512), nullable=True),
        sa.Column("credentials_encrypted", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("supplier_code"),
    )
    op.create_index("ix_ai_core_suppliers_status", "ai_core_suppliers", ["status"])


def downgrade() -> None:
    op.drop_index("ix_ai_core_suppliers_status", table_name="ai_core_suppliers", if_exists=True)
    op.drop_table("ai_core_suppliers")

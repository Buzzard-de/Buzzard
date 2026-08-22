"""AI Core shipments and returns (Phase 3 Wave 4).

Revision ID: 013_ai_core_logistics
Revises: 012_ai_core_decisions
Create Date: 2026-08-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "013_ai_core_logistics"
down_revision: Union[str, None] = "012_ai_core_decisions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_core_shipments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("order_id", sa.String(length=128), nullable=True),
        sa.Column("carrier_id", sa.String(length=64), nullable=False),
        sa.Column("tracking_number", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("label_url", sa.Text(), nullable=True),
        sa.Column("rate_amount", sa.Float(), nullable=True),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="EUR"),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_core_shipments_order_id", "ai_core_shipments", ["order_id"])
    op.create_index("ix_ai_core_shipments_carrier_id", "ai_core_shipments", ["carrier_id"])
    op.create_index("ix_ai_core_shipments_status", "ai_core_shipments", ["status"])

    op.create_table(
        "ai_core_returns",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("order_id", sa.String(length=128), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("eligibility", sa.String(length=32), nullable=True),
        sa.Column("refund_amount", sa.Float(), nullable=True),
        sa.Column("approval_required", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("approval_id", sa.String(length=36), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_core_returns_order_id", "ai_core_returns", ["order_id"])
    op.create_index("ix_ai_core_returns_status", "ai_core_returns", ["status"])


def downgrade() -> None:
    op.drop_index("ix_ai_core_returns_status", table_name="ai_core_returns", if_exists=True)
    op.drop_index("ix_ai_core_returns_order_id", table_name="ai_core_returns", if_exists=True)
    op.drop_table("ai_core_returns")
    op.drop_index("ix_ai_core_shipments_status", table_name="ai_core_shipments", if_exists=True)
    op.drop_index("ix_ai_core_shipments_carrier_id", table_name="ai_core_shipments", if_exists=True)
    op.drop_index("ix_ai_core_shipments_order_id", table_name="ai_core_shipments", if_exists=True)
    op.drop_table("ai_core_shipments")

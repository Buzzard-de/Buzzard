"""AI Core stock snapshots, orders, pricing candidates (Phase 3 Wave 3).

Revision ID: 011_ai_core_stock_orders
Revises: 010_ai_core_products
Create Date: 2026-08-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "011_ai_core_stock_orders"
down_revision: Union[str, None] = "010_ai_core_products"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_core_pricing_candidates",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("sku", sa.String(length=128), nullable=False),
        sa.Column("supplier_cost", sa.Float(), nullable=False),
        sa.Column("recommended_price", sa.Float(), nullable=False),
        sa.Column("margin", sa.Float(), nullable=True),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="EUR"),
        sa.Column("taxonomy_id", sa.String(length=32), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="PENDING"),
        sa.Column("approval_required", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("policy_result", sa.JSON(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_core_pricing_candidates_sku", "ai_core_pricing_candidates", ["sku"])
    op.create_index("ix_ai_core_pricing_candidates_status", "ai_core_pricing_candidates", ["status"])

    op.create_table(
        "ai_core_stock_snapshots",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("sku", sa.String(length=128), nullable=False),
        sa.Column("supplier_stock", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("internal_stock", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("wms_stock", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reserved_stock", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("available_stock", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("safety_stock", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("conflict", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("conflict_reason", sa.String(length=255), nullable=True),
        sa.Column("sources", sa.JSON(), nullable=False),
        sa.Column("reconciled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_core_stock_snapshots_sku", "ai_core_stock_snapshots", ["sku"])

    op.create_table(
        "ai_core_orders",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("order_id", sa.String(length=128), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("customer_ref", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="ingested"),
        sa.Column("line_items", sa.JSON(), nullable=False),
        sa.Column("pricing_snapshot", sa.JSON(), nullable=False),
        sa.Column("procurement", sa.JSON(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("order_id", "source", name="uq_ai_core_orders_order_source"),
    )
    op.create_index("ix_ai_core_orders_order_id", "ai_core_orders", ["order_id"])
    op.create_index("ix_ai_core_orders_source", "ai_core_orders", ["source"])
    op.create_index("ix_ai_core_orders_status", "ai_core_orders", ["status"])


def downgrade() -> None:
    op.drop_index("ix_ai_core_orders_status", table_name="ai_core_orders", if_exists=True)
    op.drop_index("ix_ai_core_orders_source", table_name="ai_core_orders", if_exists=True)
    op.drop_index("ix_ai_core_orders_order_id", table_name="ai_core_orders", if_exists=True)
    op.drop_table("ai_core_orders")
    op.drop_index("ix_ai_core_stock_snapshots_sku", table_name="ai_core_stock_snapshots", if_exists=True)
    op.drop_table("ai_core_stock_snapshots")
    op.drop_index("ix_ai_core_pricing_candidates_status", table_name="ai_core_pricing_candidates", if_exists=True)
    op.drop_index("ix_ai_core_pricing_candidates_sku", table_name="ai_core_pricing_candidates", if_exists=True)
    op.drop_table("ai_core_pricing_candidates")

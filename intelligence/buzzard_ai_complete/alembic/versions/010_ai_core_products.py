"""AI Core products table (Phase 3 Wave 2).

Revision ID: 010_ai_core_products
Revises: 009_ai_core_suppliers
Create Date: 2026-08-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "010_ai_core_products"
down_revision: Union[str, None] = "009_ai_core_suppliers"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_core_products",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("sku", sa.String(length=128), nullable=False),
        sa.Column("supplier_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=512), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("brand", sa.String(length=256), nullable=True),
        sa.Column("price", sa.Float(), nullable=True),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="EUR"),
        sa.Column("stock_qty", sa.Integer(), nullable=True),
        sa.Column("taxonomy_id", sa.String(length=32), nullable=True),
        sa.Column("storefront_category_id", sa.String(length=32), nullable=True),
        sa.Column("ean", sa.String(length=32), nullable=True),
        sa.Column("enrichment_status", sa.String(length=32), nullable=False, server_default="normalized"),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sku", "supplier_id", name="uq_ai_core_products_sku_supplier"),
    )
    op.create_index("ix_ai_core_products_sku", "ai_core_products", ["sku"])
    op.create_index("ix_ai_core_products_supplier_id", "ai_core_products", ["supplier_id"])
    op.create_index("ix_ai_core_products_taxonomy_id", "ai_core_products", ["taxonomy_id"])
    op.create_index("ix_ai_core_products_enrichment_status", "ai_core_products", ["enrichment_status"])


def downgrade() -> None:
    op.drop_index("ix_ai_core_products_enrichment_status", table_name="ai_core_products", if_exists=True)
    op.drop_index("ix_ai_core_products_taxonomy_id", table_name="ai_core_products", if_exists=True)
    op.drop_index("ix_ai_core_products_supplier_id", table_name="ai_core_products", if_exists=True)
    op.drop_index("ix_ai_core_products_sku", table_name="ai_core_products", if_exists=True)
    op.drop_table("ai_core_products")

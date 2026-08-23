"""AI Core decisions and policies (Phase 3 Wave 4).

Revision ID: 012_ai_core_decisions
Revises: 011_ai_core_stock_orders
Create Date: 2026-08-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "012_ai_core_decisions"
down_revision: Union[str, None] = "011_ai_core_stock_orders"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_core_decisions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("output_type", sa.String(length=64), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("signals_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("task_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_core_decisions_type", "ai_core_decisions", ["output_type", "created_at"])

    op.create_table(
        "ai_core_policies",
        sa.Column("id", sa.String(length=128), nullable=False),
        sa.Column("policy_type", sa.String(length=64), nullable=False),
        sa.Column("rules", sa.JSON(), nullable=False),
        sa.Column("effective_from", sa.DateTime(timezone=True), nullable=False),
        sa.Column("effective_to", sa.DateTime(timezone=True), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_by", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_core_policies_type", "ai_core_policies", ["policy_type"])


def downgrade() -> None:
    op.drop_index("ix_ai_core_policies_type", table_name="ai_core_policies", if_exists=True)
    op.drop_table("ai_core_policies")
    op.drop_index("ix_ai_core_decisions_type", table_name="ai_core_decisions", if_exists=True)
    op.drop_table("ai_core_decisions")

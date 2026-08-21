"""AI Core Kurmay reports table.

Revision ID: 006_ai_core_kurmay_reports
Revises: 005_ai_core_integration_status
Create Date: 2026-08-21
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "006_ai_core_kurmay_reports"
down_revision: Union[str, None] = "005_ai_core_integration_status"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_core_kurmay_reports",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("situation_summary", sa.Text(), nullable=False),
        sa.Column("risk_level", sa.String(length=20), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_core_kurmay_reports_created_at", "ai_core_kurmay_reports", ["created_at"])
    op.create_index("ix_ai_core_kurmay_reports_risk_level", "ai_core_kurmay_reports", ["risk_level"])


def downgrade() -> None:
    op.drop_index("ix_ai_core_kurmay_reports_risk_level", table_name="ai_core_kurmay_reports")
    op.drop_index("ix_ai_core_kurmay_reports_created_at", table_name="ai_core_kurmay_reports")
    op.drop_table("ai_core_kurmay_reports")

"""AI Core approvals table.

Revision ID: 007_ai_core_approvals
Revises: 006_ai_core_kurmay_reports
Create Date: 2026-08-21
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "007_ai_core_approvals"
down_revision: Union[str, None] = "006_ai_core_kurmay_reports"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_core_approvals",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("task_id", sa.String(length=36), nullable=False),
        sa.Column("actor", sa.String(length=255), nullable=False),
        sa.Column("actor_role", sa.String(length=50), nullable=False),
        sa.Column("decision", sa.String(length=20), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_core_approvals_task_id", "ai_core_approvals", ["task_id"])
    op.create_index("ix_ai_core_approvals_created_at", "ai_core_approvals", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_ai_core_approvals_created_at", table_name="ai_core_approvals", if_exists=True)
    op.drop_index("ix_ai_core_approvals_task_id", table_name="ai_core_approvals", if_exists=True)
    op.drop_table("ai_core_approvals")

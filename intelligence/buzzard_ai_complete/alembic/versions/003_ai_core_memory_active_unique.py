"""AI Core memory active-record unique index

Revision ID: 003_ai_core_memory_active_unique
Revises: 002_ai_core_worker_state
Create Date: 2026-08-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003_ai_core_memory_active_unique"
down_revision: Union[str, None] = "002_ai_core_worker_state"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "uq_ai_core_memory_active_ns_key",
        "ai_core_memory",
        ["namespace", "key"],
        unique=True,
        postgresql_where=sa.text("valid_to IS NULL"),
        sqlite_where=sa.text("valid_to IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_ai_core_memory_active_ns_key", table_name="ai_core_memory")

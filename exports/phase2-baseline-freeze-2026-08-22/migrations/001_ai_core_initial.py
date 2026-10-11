"""AI Core initial schema

Revision ID: 001_ai_core_initial
Revises:
Create Date: 2026-08-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001_ai_core_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_core_tasks",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("type", sa.String(length=100), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("priority", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("worker_id", sa.String(length=100), nullable=True),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("max_attempts", sa.Integer(), nullable=False),
        sa.Column("requires_approval", sa.Boolean(), nullable=False),
        sa.Column("approved_by", sa.String(length=255), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("timeout_seconds", sa.Integer(), nullable=False),
        sa.Column("idempotency_key", sa.String(length=255), nullable=True),
        sa.Column("parent_id", sa.String(length=36), nullable=True),
        sa.Column("created_by", sa.String(length=255), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["parent_id"], ["ai_core_tasks.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key"),
    )
    op.create_index("ix_ai_core_tasks_status", "ai_core_tasks", ["status"])
    op.create_index("ix_ai_core_tasks_type", "ai_core_tasks", ["type"])
    op.create_index("ix_ai_core_tasks_worker_id", "ai_core_tasks", ["worker_id"])

    op.create_table(
        "ai_core_task_transitions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("task_id", sa.String(length=36), nullable=False),
        sa.Column("from_status", sa.String(length=20), nullable=True),
        sa.Column("to_status", sa.String(length=20), nullable=False),
        sa.Column("actor", sa.String(length=255), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["task_id"], ["ai_core_tasks.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_core_task_transitions_task_id", "ai_core_task_transitions", ["task_id"])

    op.create_table(
        "ai_core_task_dependencies",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("task_id", sa.String(length=36), nullable=False),
        sa.Column("depends_on_id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["depends_on_id"], ["ai_core_tasks.id"]),
        sa.ForeignKeyConstraint(["task_id"], ["ai_core_tasks.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("task_id", "depends_on_id", name="uq_task_dependency"),
    )

    op.create_table(
        "ai_core_memory",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("source", sa.String(length=255), nullable=False),
        sa.Column("entity", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("type", sa.String(length=30), nullable=False),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("impact", sa.String(length=20), nullable=False),
        sa.Column("namespace", sa.String(length=100), nullable=False),
        sa.Column("key", sa.String(length=255), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(length=255), nullable=False),
        sa.Column("related_task", sa.String(length=36), nullable=True),
        sa.Column("audit_id", sa.String(length=36), nullable=True),
        sa.Column("valid_from", sa.DateTime(timezone=True), nullable=False),
        sa.Column("valid_to", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_core_memory_namespace", "ai_core_memory", ["namespace"])
    op.create_index("ix_ai_core_memory_type", "ai_core_memory", ["type"])

    op.create_table(
        "ai_core_memory_history",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("memory_id", sa.String(length=36), nullable=False),
        sa.Column("namespace", sa.String(length=100), nullable=False),
        sa.Column("key", sa.String(length=255), nullable=False),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("source", sa.String(length=255), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("changed_by", sa.String(length=255), nullable=False),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["memory_id"], ["ai_core_memory.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "ai_core_exceptions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("type", sa.String(length=100), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("entity", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("owner", sa.String(length=255), nullable=True),
        sa.Column("assigned_to", sa.String(length=255), nullable=True),
        sa.Column("worker_id", sa.String(length=100), nullable=True),
        sa.Column("task_id", sa.String(length=36), nullable=True),
        sa.Column("resolution", sa.Text(), nullable=True),
        sa.Column("contained", sa.Boolean(), nullable=False),
        sa.Column("worker_halted", sa.Boolean(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_core_exceptions_status", "ai_core_exceptions", ["status"])
    op.create_index("ix_ai_core_exceptions_severity", "ai_core_exceptions", ["severity"])

    op.create_table(
        "ai_core_exception_transitions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("exception_id", sa.String(length=36), nullable=False),
        sa.Column("from_status", sa.String(length=20), nullable=True),
        sa.Column("to_status", sa.String(length=20), nullable=False),
        sa.Column("actor", sa.String(length=255), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["exception_id"], ["ai_core_exceptions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "ai_core_audit_log",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("actor", sa.String(length=255), nullable=False),
        sa.Column("worker_id", sa.String(length=100), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("entity_type", sa.String(length=100), nullable=True),
        sa.Column("entity_id", sa.String(length=255), nullable=True),
        sa.Column("before_state", sa.JSON(), nullable=True),
        sa.Column("after_state", sa.JSON(), nullable=True),
        sa.Column("request_id", sa.String(length=36), nullable=False),
        sa.Column("task_id", sa.String(length=36), nullable=True),
        sa.Column("risk", sa.String(length=20), nullable=False),
        sa.Column("result", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_core_audit_log_action", "ai_core_audit_log", ["action"])
    op.create_index("ix_ai_core_audit_log_actor", "ai_core_audit_log", ["actor"])


def downgrade() -> None:
    op.drop_index("ix_ai_core_audit_log_actor", table_name="ai_core_audit_log")
    op.drop_index("ix_ai_core_audit_log_action", table_name="ai_core_audit_log")
    op.drop_table("ai_core_audit_log")
    op.drop_table("ai_core_exception_transitions")
    op.drop_index("ix_ai_core_exceptions_severity", table_name="ai_core_exceptions")
    op.drop_index("ix_ai_core_exceptions_status", table_name="ai_core_exceptions")
    op.drop_table("ai_core_exceptions")
    op.drop_table("ai_core_memory_history")
    op.drop_index("ix_ai_core_memory_type", table_name="ai_core_memory")
    op.drop_index("ix_ai_core_memory_namespace", table_name="ai_core_memory")
    op.drop_table("ai_core_memory")
    op.drop_table("ai_core_task_dependencies")
    op.drop_index("ix_ai_core_task_transitions_task_id", table_name="ai_core_task_transitions")
    op.drop_table("ai_core_task_transitions")
    op.drop_index("ix_ai_core_tasks_worker_id", table_name="ai_core_tasks")
    op.drop_index("ix_ai_core_tasks_type", table_name="ai_core_tasks")
    op.drop_index("ix_ai_core_tasks_status", table_name="ai_core_tasks")
    op.drop_table("ai_core_tasks")

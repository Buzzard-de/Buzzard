from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from buzzard_ai_complete.ai_core.intelligence.decision.engine import DecisionResult
from buzzard_ai_complete.ai_core.intelligence.decision.types import DecisionOutputType
from buzzard_ai_complete.ai_core.observability.autonomy import is_autonomy_disabled, record_autonomy_action
from buzzard_ai_complete.config import settings


@dataclass
class AutonomousActionPlan:
    action: str
    auto_execute: bool
    requires_approval: bool
    autonomy_level: str
    task_type: str | None = None
    task_payload: dict[str, Any] = field(default_factory=dict)
    explain: list[str] = field(default_factory=list)
    blocked: bool = False
    block_reason: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "action": self.action,
            "auto_execute": self.auto_execute,
            "requires_approval": self.requires_approval,
            "autonomy_level": self.autonomy_level,
            "task_type": self.task_type,
            "task_payload": self.task_payload,
            "explain": self.explain,
            "blocked": self.blocked,
            "block_reason": self.block_reason,
            "status": "blocked" if self.blocked else "ok",
        }


class AutonomousActionEngine:
    """Execution layer for governed autonomy — never makes decisions or grants approval."""

    L4_ACTIONS = frozenset({
        "supplier_po",
        "price_publish",
        "product_publish",
        "stock_publish",
        "customer_response_send",
    })

    def evaluate(self, decision: DecisionResult, *, worker_id: str = "autonomous-action-engine") -> AutonomousActionPlan:
        explain = list(decision.explain)

        if is_autonomy_disabled():
            explain.append("kill switch BUZZARD_AUTONOMY_DISABLED active — recommend only")
            record_autonomy_action(
                operation=decision.content.get("action", "unknown"),
                autonomy_level="L1",
                worker_id=worker_id,
                auto_executed=False,
                policy_result="BLOCKED",
            )
            return AutonomousActionPlan(
                action="recommend_only",
                auto_execute=False,
                requires_approval=True,
                autonomy_level="L1",
                explain=explain,
                blocked=True,
                block_reason="BUZZARD_AUTONOMY_DISABLED",
            )

        if decision.output_type == DecisionOutputType.EXCEPTION.value:
            return AutonomousActionPlan(
                action="escalate_exception",
                auto_execute=False,
                requires_approval=True,
                autonomy_level="L0",
                explain=explain + ["exception output — no auto execution"],
                blocked=True,
                block_reason="EXCEPTION",
            )

        if decision.requires_approval or decision.output_type == DecisionOutputType.APPROVAL_REQUEST.value:
            explain.append("L5 approval required")
            return AutonomousActionPlan(
                action="create_task",
                auto_execute=False,
                requires_approval=True,
                autonomy_level="L5",
                task_type=decision.content.get("task_type"),
                task_payload=decision.content,
                explain=explain,
            )

        if decision.autonomy_level == "L4":
            if not settings.BUZZARD_AUTONOMY_L4_ENABLED:
                explain.append("L4 disabled via BUZZARD_AUTONOMY_L4_ENABLED=false")
                return AutonomousActionPlan(
                    action="create_task",
                    auto_execute=False,
                    requires_approval=True,
                    autonomy_level="L4",
                    task_type=decision.content.get("task_type"),
                    task_payload=decision.content,
                    explain=explain,
                )
            action_name = str(decision.content.get("action", ""))
            if action_name not in self.L4_ACTIONS:
                explain.append(f"action {action_name!r} not in approved L4 set")
                return AutonomousActionPlan(
                    action="create_task",
                    auto_execute=False,
                    requires_approval=True,
                    autonomy_level="L4",
                    explain=explain,
                )
            record_autonomy_action(
                operation=action_name,
                autonomy_level="L4",
                worker_id=worker_id,
                auto_executed=True,
            )
            return AutonomousActionPlan(
                action="create_task",
                auto_execute=True,
                requires_approval=False,
                autonomy_level="L4",
                task_type=decision.content.get("task_type", "purchase_order_draft"),
                task_payload=decision.content,
                explain=explain + ["L4 conditions met — auto-execute permitted"],
            )

        if decision.autonomy_level == "L3" and decision.output_type == DecisionOutputType.TASK.value:
            record_autonomy_action(
                operation=str(decision.content.get("action", "task")),
                autonomy_level="L3",
                worker_id=worker_id,
                auto_executed=True,
            )
            return AutonomousActionPlan(
                action="create_task",
                auto_execute=True,
                requires_approval=False,
                autonomy_level="L3",
                task_type=decision.content.get("task_type"),
                task_payload=decision.content,
                explain=explain + ["L3 auto-execute"],
            )

        return AutonomousActionPlan(
            action="store_only",
            auto_execute=False,
            requires_approval=False,
            autonomy_level=decision.autonomy_level,
            explain=explain + ["no autonomous execution — store decision only"],
        )

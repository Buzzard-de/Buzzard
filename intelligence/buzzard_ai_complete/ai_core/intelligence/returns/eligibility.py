from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any


@dataclass
class ReturnEvaluation:
    eligible: bool
    eligibility: str
    refund_amount: float | None
    approval_required: bool
    reason: str | None = None
    violations: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "eligible": self.eligible,
            "eligibility": self.eligibility,
            "refund_amount": self.refund_amount,
            "approval_required": self.approval_required,
            "reason": self.reason,
            "violations": self.violations,
            "status": "ok",
        }


class ReturnEligibilityEngine:
    """Evaluate return eligibility — refunds always require approval (L5)."""

    def __init__(self, *, return_window_days: int = 30) -> None:
        self._return_window_days = return_window_days

    def evaluate(
        self,
        *,
        order_id: str,
        reason: str | None,
        order_total: float | None = None,
        order_created_at: datetime | None = None,
        line_items: list[dict[str, Any]] | None = None,
    ) -> ReturnEvaluation:
        violations: list[str] = []
        if not order_id.strip():
            violations.append("order_id is required")

        if not reason or not str(reason).strip():
            violations.append("reason is required")

        if order_created_at:
            cutoff = datetime.now(timezone.utc) - timedelta(days=self._return_window_days)
            if order_created_at < cutoff:
                violations.append(f"order outside {self._return_window_days}-day return window")

        if line_items is not None and len(line_items) == 0:
            violations.append("order has no line items")

        eligible = not violations
        refund_amount = order_total if eligible and order_total is not None else None

        return ReturnEvaluation(
            eligible=eligible,
            eligibility="ELIGIBLE" if eligible else "INELIGIBLE",
            refund_amount=refund_amount,
            approval_required=True,
            reason=reason,
            violations=violations,
        )

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from buzzard_ai_complete.ai_core.intelligence.decision.types import DecisionOutputType


@dataclass
class DecisionResult:
    output_type: str
    confidence: float
    content: dict[str, Any]
    explain: list[str] = field(default_factory=list)
    autonomy_level: str = "L1"
    requires_approval: bool = False
    signals_count: int = 0
    taxonomy_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "output_type": self.output_type,
            "confidence": self.confidence,
            "content": self.content,
            "explain": self.explain,
            "autonomy_level": self.autonomy_level,
            "requires_approval": self.requires_approval,
            "signals_count": self.signals_count,
            "taxonomy_id": self.taxonomy_id,
            "status": "ok",
        }


class DecisionEngine:
    """Central business decision engine — produces explainable outputs, never EXECUTE."""

    VALID_OUTPUT_TYPES = frozenset(t.value for t in DecisionOutputType)

    def evaluate(self, payload: dict[str, Any]) -> DecisionResult:
        signals = payload.get("signals") or []
        if not isinstance(signals, list):
            signals = []

        action = str(payload.get("action", "evaluate")).strip()
        risk_level = str(payload.get("risk_level", "LOW")).upper()
        confidence = float(payload.get("confidence", 0.5))
        taxonomy_id = payload.get("taxonomy_id")
        po_total = float(payload.get("po_total", 0))
        explain: list[str] = [f"evaluated action={action!r} with {len(signals)} signal(s)"]

        if payload.get("force_exception"):
            return DecisionResult(
                output_type=DecisionOutputType.EXCEPTION.value,
                confidence=confidence,
                content={"reason": payload.get("exception_reason", "policy_violation")},
                explain=explain + ["forced exception for policy violation"],
                autonomy_level="L0",
                requires_approval=True,
                signals_count=len(signals),
                taxonomy_id=taxonomy_id,
            )

        if risk_level in {"HIGH", "CRITICAL"} or action in {
            "commerce_write",
            "refund_recommend",
            "price_publish_outside_bounds",
            "supplier_contract",
        }:
            explain.append(f"risk_level {risk_level} requires L5 approval")
            return DecisionResult(
                output_type=DecisionOutputType.APPROVAL_REQUEST.value,
                confidence=confidence,
                content={
                    "action": action,
                    "risk_level": risk_level,
                    "message": "Human approval required",
                },
                explain=explain,
                autonomy_level="L5",
                requires_approval=True,
                signals_count=len(signals),
                taxonomy_id=taxonomy_id,
            )

        if action == "supplier_po" and po_total > 0:
            from buzzard_ai_complete.config import settings

            if po_total >= settings.BUZZARD_PO_AUTO_THRESHOLD_EUR:
                explain.append(
                    f"PO total {po_total:.2f} >= L4 threshold {settings.BUZZARD_PO_AUTO_THRESHOLD_EUR:.2f}"
                )
                return DecisionResult(
                    output_type=DecisionOutputType.APPROVAL_REQUEST.value,
                    confidence=confidence,
                    content={"action": action, "po_total": po_total},
                    explain=explain,
                    autonomy_level="L5",
                    requires_approval=True,
                    signals_count=len(signals),
                    taxonomy_id=taxonomy_id,
                )
            explain.append(f"PO total {po_total:.2f} within L4 auto threshold")
            return DecisionResult(
                output_type=DecisionOutputType.TASK.value,
                confidence=confidence,
                content={"action": action, "po_total": po_total, "task_type": "purchase_order_draft"},
                explain=explain,
                autonomy_level="L4",
                requires_approval=False,
                signals_count=len(signals),
                taxonomy_id=taxonomy_id,
            )

        if confidence < 0.4:
            return DecisionResult(
                output_type=DecisionOutputType.SIGNAL.value,
                confidence=confidence,
                content={"signals": signals, "action": action},
                explain=explain + ["low confidence — signal only"],
                autonomy_level="L0",
                requires_approval=False,
                signals_count=len(signals),
                taxonomy_id=taxonomy_id,
            )

        if confidence < 0.7:
            return DecisionResult(
                output_type=DecisionOutputType.RECOMMENDATION.value,
                confidence=confidence,
                content={"signals": signals, "action": action, "recommendation": payload.get("recommendation")},
                explain=explain + ["medium confidence — recommendation"],
                autonomy_level="L1",
                requires_approval=False,
                signals_count=len(signals),
                taxonomy_id=taxonomy_id,
            )

        if action in {"create_task", "stock_sync", "supplier_sync"}:
            return DecisionResult(
                output_type=DecisionOutputType.TASK.value,
                confidence=confidence,
                content={"action": action, "task_type": payload.get("task_type", action)},
                explain=explain + ["high confidence — task creation"],
                autonomy_level="L3" if action in {"stock_sync", "supplier_sync"} else "L2",
                requires_approval=False,
                signals_count=len(signals),
                taxonomy_id=taxonomy_id,
            )

        return DecisionResult(
            output_type=DecisionOutputType.DECISION.value,
            confidence=confidence,
            content={"action": action, "signals": signals},
            explain=explain + ["decision prepared"],
            autonomy_level="L2",
            requires_approval=False,
            signals_count=len(signals),
            taxonomy_id=taxonomy_id,
        )

    def synthesize(self, decisions: list[dict[str, Any]]) -> DecisionResult:
        if not decisions:
            return DecisionResult(
                output_type=DecisionOutputType.SIGNAL.value,
                confidence=0.0,
                content={"message": "no decisions to synthesize"},
                explain=["empty input"],
                autonomy_level="L0",
            )
        avg_confidence = sum(float(d.get("confidence", 0)) for d in decisions) / len(decisions)
        any_approval = any(d.get("requires_approval") for d in decisions)
        output_type = DecisionOutputType.APPROVAL_REQUEST.value if any_approval else DecisionOutputType.DECISION.value
        return DecisionResult(
            output_type=output_type,
            confidence=round(avg_confidence, 4),
            content={"synthesized_from": len(decisions), "decisions": decisions},
            explain=[f"synthesized {len(decisions)} prior decisions"],
            autonomy_level="L5" if any_approval else "L2",
            requires_approval=any_approval,
            signals_count=len(decisions),
        )

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from buzzard_ai_complete.config import settings


@dataclass
class PriceCandidate:
    sku: str
    supplier_cost: float
    recommended_price: float
    currency: str = "EUR"
    margin: float | None = None
    min_margin: float | None = None
    max_discount: float | None = None
    taxonomy_id: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class PricingPolicyResult:
    allowed: bool
    approval_required: bool
    status: str
    margin: float
    violations: list[str] = field(default_factory=list)
    rounded_price: float | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "allowed": self.allowed,
            "approval_required": self.approval_required,
            "status": self.status,
            "margin": self.margin,
            "violations": self.violations,
            "rounded_price": self.rounded_price,
        }


class PricingPolicyEngine:
    """Evaluate price candidates against margin and discount policy gates."""

    def __init__(
        self,
        *,
        min_margin: float | None = None,
        max_discount: float | None = None,
        rounding_precision: int = 2,
    ) -> None:
        self._min_margin = min_margin if min_margin is not None else settings.PRICING_MIN_MARGIN
        self._max_discount = max_discount if max_discount is not None else settings.PRICING_MAX_DISCOUNT
        self._rounding_precision = rounding_precision

    def evaluate(self, candidate: PriceCandidate) -> PricingPolicyResult:
        violations: list[str] = []
        if candidate.supplier_cost <= 0:
            violations.append("supplier_cost must be positive")

        rounded = round(candidate.recommended_price, self._rounding_precision)
        margin = self._compute_margin(candidate.supplier_cost, rounded)
        min_margin = candidate.min_margin if candidate.min_margin is not None else self._min_margin

        if margin < min_margin:
            violations.append(f"margin {margin:.4f} below minimum {min_margin:.4f}")

        max_discount = candidate.max_discount if candidate.max_discount is not None else self._max_discount
        reference_price = candidate.metadata.get("list_price") or candidate.metadata.get("reference_price")
        if reference_price is not None and max_discount is not None:
            ref = float(reference_price)
            if ref > 0:
                actual_discount = round((ref - rounded) / ref, 6)
                if actual_discount > max_discount:
                    violations.append(
                        f"discount {actual_discount:.4f} exceeds max_discount {max_discount:.4f}"
                    )

        approval_required = bool(violations) or margin < (min_margin + settings.PRICING_AUTO_APPROVE_MARGIN_BUFFER)
        allowed = "supplier_cost must be positive" not in violations

        status = "APPROVED" if allowed and not approval_required else "REVIEW"
        if not allowed:
            status = "BLOCKED"

        return PricingPolicyResult(
            allowed=allowed,
            approval_required=approval_required,
            status=status,
            margin=margin,
            violations=violations,
            rounded_price=rounded,
        )

    def publish_gate(self, candidate: PriceCandidate, policy: PricingPolicyResult) -> dict[str, Any]:
        if not policy.allowed:
            return {"status": "BLOCKED", "reason": policy.violations}
        if policy.approval_required:
            return {
                "status": "APPROVAL_REQUIRED",
                "sku": candidate.sku,
                "recommended_price": policy.rounded_price,
                "margin": policy.margin,
            }
        return {
            "status": "READY_TO_PUBLISH",
            "sku": candidate.sku,
            "recommended_price": policy.rounded_price,
            "margin": policy.margin,
            "currency": candidate.currency,
        }

    @staticmethod
    def _compute_margin(cost: float, price: float) -> float:
        if price <= 0:
            return 0.0
        return round((price - cost) / price, 6)

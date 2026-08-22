from __future__ import annotations

import time
from typing import Any

from buzzard_ai_complete.ai_core.bridge.commerce import CommerceBridge, NO_DATA_AVAILABLE
from buzzard_ai_complete.ai_core.enums import RiskLevel
from buzzard_ai_complete.ai_core.intelligence.pricing.policy import PriceCandidate, PricingPolicyEngine
from buzzard_ai_complete.ai_core.services.pricing_service import PricingService
from buzzard_ai_complete.ai_core.workers.base import WorkerContext, WorkerResult
from buzzard_ai_complete.ai_core.workers.buzzard_worker import BuzzardWorker
from buzzard_ai_complete.ai_core.workers.domain_memory import domain_memory_entry


class PriceEngineWorker(BuzzardWorker):
    worker_id = "price-engine"
    supported_task_types = frozenset({"price_recheck"})
    family = "pricing"
    permissions = frozenset({"price:read", "price:calculate", "pricing:evaluate", "memory:write"})
    capabilities = frozenset({"margin_calculation", "threshold_check"})
    risk_default = RiskLevel.HIGH

    def __init__(self) -> None:
        self._bridge = CommerceBridge()
        self._policy = PricingPolicyEngine()
        super().__init__()

    def execute(self, task_type: str, payload: dict[str, Any], context: WorkerContext) -> WorkerResult:
        started = time.monotonic()
        if payload.get("force_failure"):
            return WorkerResult(
                success=False,
                output={},
                metadata=self._meta(started, context),
                error=payload.get("error_message", "price check failed"),
                retryable=bool(payload.get("retryable", True)),
                risk_level=self.risk_default.value,
            )

        sku = str(payload.get("sku", "UNKNOWN"))
        session = context.session

        if session and payload.get("supplier_cost") is not None:
            svc = PricingService(session)
            result = svc.evaluate(payload)
            policy = result.get("policy", {})
            success = policy.get("allowed", False) and policy.get("status") != "BLOCKED"
            return WorkerResult(
                success=success or policy.get("status") == "REVIEW",
                output=result,
                metadata=self._meta(started, context),
                error=None if success or policy.get("status") == "REVIEW" else "POLICY_BLOCKED",
                retryable=False,
                risk_level=RiskLevel.HIGH.value if policy.get("approval_required") else RiskLevel.LOW.value,
                memory_entries=[
                    domain_memory_entry(
                        f"pricing/{sku}",
                        f"recheck/{context.task_id}",
                        result,
                        impact=RiskLevel.HIGH.value if policy.get("approval_required") else RiskLevel.LOW.value,
                    )
                ],
            )

        if not payload.get("use_commerce_bridge"):
            base_price = float(payload.get("base_price", 10.0))
            margin = float(payload.get("margin", 0.2))
            candidate = PriceCandidate(
                sku=sku,
                supplier_cost=base_price,
                recommended_price=round(base_price * (1 + margin), 2),
            )
            policy = self._policy.evaluate(candidate)
            min_price = float(payload.get("min_price", 0))
            recommended = policy.rounded_price or round(base_price * (1 + margin), 2)
            below = recommended < min_price if min_price > 0 else policy.approval_required
            blocked = policy.status == "BLOCKED"
            return WorkerResult(
                success=not blocked,
                output={
                    "sku": sku,
                    "base_price": base_price,
                    "margin": margin,
                    "recommended_price": recommended,
                    "below_threshold": below,
                    "policy": policy.to_dict(),
                    "data_source": "payload",
                },
                metadata=self._meta(started, context),
                confidence=0.9,
                risk_level=RiskLevel.HIGH.value if blocked else RiskLevel.LOW.value,
                memory_entries=[
                    domain_memory_entry(
                        f"pricing/{sku}",
                        f"recheck/{context.task_id}",
                        {
                            "sku": sku,
                            "recommended_price": recommended,
                            "below_threshold": below,
                            "policy": policy.to_dict(),
                            "data_source": "payload",
                        },
                        impact=RiskLevel.HIGH.value if blocked else RiskLevel.LOW.value,
                    )
                ],
            )

        product = self._bridge.read_products(sku=sku)
        if product.get("status") == NO_DATA_AVAILABLE:
            output = {
                "sku": sku,
                "status": NO_DATA_AVAILABLE,
                "message": "no commerce price data; supply base_price in payload for deterministic check",
            }
            return WorkerResult(
                success=False,
                output=output,
                metadata=self._meta(started, context),
                error=NO_DATA_AVAILABLE,
                retryable=False,
                risk_level=self.risk_default.value,
                memory_entries=[
                    domain_memory_entry(
                        f"pricing/{sku}",
                        f"recheck/{context.task_id}",
                        output,
                        impact=self.risk_default.value,
                    )
                ],
            )
        return WorkerResult(
            success=True,
            output=product,
            metadata=self._meta(started, context),
            memory_entries=[
                domain_memory_entry(
                    f"pricing/{sku}",
                    f"recheck/{context.task_id}",
                    product,
                )
            ],
        )

    def _meta(self, started: float, context: WorkerContext) -> dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "execution_mode": "policy_engine",
            "duration_ms": int((time.monotonic() - started) * 1000),
            "attempt": context.attempt,
            "task_id": context.task_id,
        }

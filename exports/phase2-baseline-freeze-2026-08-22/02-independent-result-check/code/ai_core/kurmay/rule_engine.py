from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from buzzard_ai_complete.ai_core.enums import MemoryImpact, RiskLevel
from buzzard_ai_complete.ai_core.kurmay.schemas import KurmayRecommendation, KurmayReport


class KurmayRuleEngine:
    """Deterministic synthesis from memory entries — no external LLM."""

    IMPACT_ORDER = {
        MemoryImpact.LOW.value: 0,
        MemoryImpact.MEDIUM.value: 1,
        MemoryImpact.HIGH.value: 2,
        MemoryImpact.CRITICAL.value: 3,
    }

    def synthesize(
        self,
        report_id: str,
        memory_entries: list[dict[str, Any]],
        exception_entries: list[dict[str, Any]] | None = None,
    ) -> KurmayReport:
        exceptions = exception_entries or []
        if not memory_entries and not exceptions:
            return KurmayReport.empty(report_id, "NO_DATA_AVAILABLE: no memory or exception context")

        sources: list[str] = []
        recommendations: list[KurmayRecommendation] = []
        max_impact = self.IMPACT_ORDER[MemoryImpact.LOW.value]
        confidence_values: list[float] = []

        for entry in memory_entries:
            namespace = str(entry.get("namespace", "unknown"))
            key = str(entry.get("key", ""))
            sources.append(f"{namespace}/{key}".rstrip("/"))
            impact = str(entry.get("impact", MemoryImpact.LOW.value))
            max_impact = max(max_impact, self.IMPACT_ORDER.get(impact, 0))
            if entry.get("confidence") is not None:
                confidence_values.append(float(entry["confidence"]))
            content = entry.get("content") or {}
            if isinstance(content, dict) and content.get("status") == "NO_DATA_AVAILABLE":
                recommendations.append(
                    KurmayRecommendation(
                        title=f"Data gap in {namespace}",
                        rationale=str(content.get("message", "missing data")),
                        priority="MEDIUM",
                        action_type="investigate",
                    )
                )

        for exc in exceptions:
            severity = str(exc.get("severity", "MEDIUM"))
            recommendations.append(
                KurmayRecommendation(
                    title=f"Exception: {exc.get('type', 'unknown')}",
                    rationale=str(exc.get("message", "")),
                    priority=severity,
                    action_type="exception_review",
                    metadata={"exception_id": exc.get("id")},
                )
            )
            if severity in {RiskLevel.HIGH.value, RiskLevel.CRITICAL.value}:
                max_impact = max(max_impact, self.IMPACT_ORDER.get(MemoryImpact.HIGH.value, 2))

        risk_level = RiskLevel.LOW.value
        if max_impact >= self.IMPACT_ORDER[MemoryImpact.CRITICAL.value]:
            risk_level = RiskLevel.CRITICAL.value
        elif max_impact >= self.IMPACT_ORDER[MemoryImpact.HIGH.value]:
            risk_level = RiskLevel.HIGH.value
        elif max_impact >= self.IMPACT_ORDER[MemoryImpact.MEDIUM.value]:
            risk_level = RiskLevel.MEDIUM.value

        confidence = sum(confidence_values) / len(confidence_values) if confidence_values else 0.5
        summary_parts = [
            f"{len(memory_entries)} memory entries",
            f"{len(exceptions)} exceptions",
            f"peak impact {max_impact}",
        ]

        return KurmayReport(
            report_id=report_id,
            generated_at=datetime.now(timezone.utc),
            situation_summary="; ".join(summary_parts),
            recommendations=recommendations,
            memory_sources=sources,
            risk_level=risk_level,
            confidence=round(confidence, 3),
            metadata={"entry_count": len(memory_entries), "exception_count": len(exceptions)},
        )

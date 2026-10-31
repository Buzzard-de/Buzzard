from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class KurmayRecommendation:
    title: str
    rationale: str
    priority: str = "MEDIUM"
    action_type: str = "review"
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class KurmayReport:
    report_id: str
    generated_at: datetime
    situation_summary: str
    recommendations: list[KurmayRecommendation]
    memory_sources: list[str] = field(default_factory=list)
    risk_level: str = "LOW"
    confidence: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "report_id": self.report_id,
            "generated_at": self.generated_at.isoformat(),
            "situation_summary": self.situation_summary,
            "recommendations": [
                {
                    "title": r.title,
                    "rationale": r.rationale,
                    "priority": r.priority,
                    "action_type": r.action_type,
                    "metadata": r.metadata,
                }
                for r in self.recommendations
            ],
            "memory_sources": self.memory_sources,
            "risk_level": self.risk_level,
            "confidence": self.confidence,
            "metadata": self.metadata,
        }

    @classmethod
    def empty(cls, report_id: str, reason: str) -> "KurmayReport":
        return cls(
            report_id=report_id,
            generated_at=datetime.now(timezone.utc),
            situation_summary=reason,
            recommendations=[],
            confidence=0.0,
            risk_level="LOW",
            metadata={"status": "NO_DATA_AVAILABLE"},
        )

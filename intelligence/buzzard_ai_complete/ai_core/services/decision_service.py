from __future__ import annotations

from typing import Any, Callable

from sqlalchemy import select
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.intelligence.autonomy.action_engine import AutonomousActionEngine
from buzzard_ai_complete.ai_core.intelligence.decision.engine import DecisionEngine, DecisionResult
from buzzard_ai_complete.ai_core.models.decision_record import DecisionRecord


class DecisionService:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._engine = DecisionEngine()
        self._autonomy = AutonomousActionEngine()

    def evaluate(self, payload: dict[str, Any]) -> dict[str, Any]:
        result = self._engine.evaluate(payload)
        return self._persist(result, task_id=payload.get("task_id"))

    def synthesize(self, payload: dict[str, Any]) -> dict[str, Any]:
        decisions = payload.get("decisions") or []
        result = self._engine.synthesize(decisions)
        return self._persist(result, task_id=payload.get("task_id"))

    def evaluate_with_autonomy(self, payload: dict[str, Any], *, worker_id: str = "decision-engine") -> dict[str, Any]:
        result = self._engine.evaluate(payload)
        persisted = self._persist(result, task_id=payload.get("task_id"))
        plan = self._autonomy.evaluate(result, worker_id=worker_id)
        persisted["autonomy_plan"] = plan.to_dict()
        return persisted

    def _persist(self, result: DecisionResult, *, task_id: str | None = None) -> dict[str, Any]:
        record = DecisionRecord(
            output_type=result.output_type,
            confidence=result.confidence,
            signals_count=result.signals_count,
            content={
                **result.content,
                "explain": result.explain,
                "autonomy_level": result.autonomy_level,
                "requires_approval": result.requires_approval,
                "taxonomy_id": result.taxonomy_id,
            },
            task_id=task_id,
        )
        self._session.add(record)
        self._session.flush()
        output = result.to_dict()
        output["decision_id"] = record.id
        return output

    def list_decisions(self, limit: int = 50) -> list[DecisionRecord]:
        return list(
            self._session.scalars(
                select(DecisionRecord).order_by(DecisionRecord.created_at.desc()).limit(limit)
            )
        )

    def get_decision(self, decision_id: str) -> DecisionRecord | None:
        return self._session.get(DecisionRecord, decision_id)

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.kurmay.rule_engine import KurmayRuleEngine
from buzzard_ai_complete.ai_core.kurmay.schemas import KurmayReport
from buzzard_ai_complete.ai_core.models.kurmay_report import KurmayReportRecord


class KurmayService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.engine = KurmayRuleEngine()

    def synthesize(
        self,
        memory_entries: list[dict[str, Any]],
        exception_entries: list[dict[str, Any]] | None = None,
        report_id: str | None = None,
    ) -> KurmayReport:
        rid = report_id or str(uuid.uuid4())
        report = self.engine.synthesize(rid, memory_entries, exception_entries)
        record = KurmayReportRecord(
            id=rid,
            situation_summary=report.situation_summary,
            risk_level=report.risk_level,
            confidence=report.confidence,
            content=report.to_dict(),
        )
        self.session.add(record)
        self.session.flush()
        return report

    def get(self, report_id: str) -> KurmayReportRecord | None:
        return self.session.get(KurmayReportRecord, report_id)

    def list_reports(self, limit: int = 50, offset: int = 0) -> list[KurmayReportRecord]:
        return (
            self.session.query(KurmayReportRecord)
            .order_by(KurmayReportRecord.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

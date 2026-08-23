"""Phase 3 Wave 4 market intelligence compliance tests."""

from __future__ import annotations

from buzzard_ai_complete.ai_core.intelligence.market.compliance import MarketSourceValidator
from buzzard_ai_complete.ai_core.services.market_service import MarketIntelligenceService


def test_market_source_rejects_scraper():
    validator = MarketSourceValidator()
    allowed, errors = validator.validate_payload({"source": "scraper", "data": {}})
    assert allowed is False
    assert errors


def test_market_source_accepts_whitelisted_source():
    validator = MarketSourceValidator()
    allowed, errors = validator.validate_payload({"source": "internal_commerce", "data": {"sku": "A"}})
    assert allowed is True
    assert not errors


def test_market_service_rejects_non_compliant_source(session):
    svc = MarketIntelligenceService(session)
    result = svc.scan({"source": "unauthorized", "data": {}})
    assert result["status"] == "REJECTED"


def test_market_worker_ingests_compliant_signal(session):
    from buzzard_ai_complete.ai_core.workers.base import WorkerContext
    from buzzard_ai_complete.ai_core.workers.market.intelligence_worker import MarketIntelligenceWorker

    worker = MarketIntelligenceWorker()
    ctx = WorkerContext(
        task_id="task-mkt-1",
        worker_id="market-intelligence",
        request_id="req-mkt-1",
        attempt=1,
        timeout_seconds=30,
        session=session,
    )
    result = worker.execute(
        "market_scan",
        {"source": "internal_commerce", "data": {"trend": "up"}},
        ctx,
    )
    session.commit()
    assert result.success is True
    assert result.output["status"] == "ok"

"""Phase 3 Wave 5 procurement worker tests."""

from __future__ import annotations

from buzzard_ai_complete.ai_core.services.procurement_service import ProcurementService
from buzzard_ai_complete.ai_core.workers.base import WorkerContext


def _candidates():
    return [
        {"supplier_code": "SUP-A", "price": 10.0, "stock_available": 5, "priority": 2, "lead_time_days": 5},
        {"supplier_code": "SUP-B", "price": 12.0, "stock_available": 10, "priority": 1, "lead_time_days": 3},
    ]


def test_procurement_worker_supplier_selection(session):
    from buzzard_ai_complete.ai_core.workers.procurement.intelligence_worker import ProcurementIntelligenceWorker

    worker = ProcurementIntelligenceWorker()
    ctx = WorkerContext(
        task_id="task-proc-1",
        worker_id="procurement-intelligence",
        request_id="req-1",
        attempt=1,
        timeout_seconds=30,
        session=session,
    )
    result = worker.execute(
        "supplier_selection",
        {"order_id": "ORD-P5-1", "line_items": [{"sku": "SKU-1", "quantity": 2}], "candidates": _candidates()},
        ctx,
    )
    assert result.success is True
    assert result.output["selected_supplier_code"] == "SUP-B"


def test_procurement_po_draft_idempotent(session, monkeypatch):
    monkeypatch.setenv("BUZZARD_AUTONOMY_L4_ENABLED", "1")
    monkeypatch.setenv("BUZZARD_AUTONOMY_DISABLED", "0")
    import buzzard_ai_complete.config.settings as settings

    settings.BUZZARD_AUTONOMY_L4_ENABLED = True
    settings.BUZZARD_AUTONOMY_DISABLED = False
    settings.BUZZARD_PO_AUTO_THRESHOLD_EUR = 500
    svc = ProcurementService(session)
    payload = {
        "order_id": "PO-IDEM-1",
        "line_items": [{"sku": "SKU-1", "quantity": 1}],
        "candidates": _candidates(),
    }
    first = svc.draft_purchase_order(payload, idempotency_key="idem-po-1")
    session.commit()
    second = svc.draft_purchase_order(payload, idempotency_key="idem-po-1")
    session.commit()
    assert first["status"] == "DRAFT_CREATED"
    assert second.get("duplicate") is True or second["status"] == first["status"]


def test_procurement_po_above_threshold_requires_approval(session):
    svc = ProcurementService(session)
    result = svc.draft_purchase_order(
        {
            "order_id": "PO-HIGH-1",
            "line_items": [{"sku": "SKU-1", "quantity": 1000}],
            "candidates": [
                {"supplier_code": "SUP-A", "price": 10.0, "stock_available": 2000, "priority": 1, "lead_time_days": 3}
            ],
        }
    )
    assert result["status"] == "APPROVAL_REQUIRED"
    assert result["requires_approval"] is True


def test_wave5_registry_includes_workers(monkeypatch):
    monkeypatch.setenv("BUZZARD_AI_CORE_V3", "1")
    import buzzard_ai_complete.config.settings as settings

    settings.BUZZARD_AI_CORE_V3 = True
    from buzzard_ai_complete.ai_core.workers.registry import get_registry

    ids = get_registry().list_worker_ids()
    assert "decision-engine" in ids
    assert "procurement-intelligence" in ids

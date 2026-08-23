"""Phase 3 Wave 3 procurement routing tests."""

from __future__ import annotations

from buzzard_ai_complete.ai_core.intelligence.procurement.routing import ProcurementRoutingService, SupplierRouteCandidate


def test_procurement_routing_selects_lowest_priority_supplier():
    svc = ProcurementRoutingService(po_approval_threshold=10000)
    candidates = [
        SupplierRouteCandidate("s1", "SUP-A", price=10, stock_available=5, lead_time_days=3, priority=2),
        SupplierRouteCandidate("s2", "SUP-B", price=12, stock_available=8, lead_time_days=1, priority=1),
    ]
    decision = svc.route(
        order_id="ORD-1",
        line_items=[{"sku": "SKU-1", "quantity": 2}],
        candidates=candidates,
    )
    assert decision.selected_supplier_code == "SUP-B"
    assert decision.routing_reason == "priority_policy"
    assert len(decision.explain) >= 1


def test_procurement_po_above_threshold_requires_approval():
    svc = ProcurementRoutingService(po_approval_threshold=100)
    candidates = [
        SupplierRouteCandidate("s1", "SUP-A", price=60, stock_available=5, lead_time_days=3, priority=1),
    ]
    decision = svc.route(
        order_id="ORD-2",
        line_items=[{"sku": "SKU-1", "quantity": 2}],
        candidates=candidates,
    )
    assert decision.approval_required is True
    assert decision.po_total == 120.0


def test_procurement_no_stock_no_route():
    svc = ProcurementRoutingService()
    candidates = [
        SupplierRouteCandidate("s1", "SUP-A", price=10, stock_available=0, lead_time_days=3, priority=1),
    ]
    decision = svc.route(order_id="ORD-3", line_items=[{"sku": "SKU-1", "quantity": 1}], candidates=candidates)
    assert decision.selected_supplier_id is None
    assert decision.routing_reason == "no_stock_available"

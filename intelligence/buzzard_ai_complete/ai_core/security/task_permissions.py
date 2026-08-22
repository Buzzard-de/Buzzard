from __future__ import annotations

TASK_REQUIRED_PERMISSIONS: dict[str, str] = {
    "category_scan": "memory:write",
    "category_analyze": "memory:write",
    "taxonomy_gap_report": "taxonomy:read",
    "supplier_sync": "supplier:read",
    "product_enrich": "product:read",
    "price_recheck": "price:read",
    "stock_sync": "stock:read",
    "customs_classify": "customs:read",
    "order_check": "order:read",
    "customer_service": "crm:read",
    "kurmay_synthesis": "memory:read",
    "security_scan": "security:inspect",
    "security_inspect": "security:inspect",
    "exception_route": "exception:read",
    "exception_triage": "exception:read",
    "exception_coordinate": "exception:read",
    "commerce_write": "commerce:write",
    "system_health": "system:read",
    "market_scan": "market:read",
    "competitor_analysis": "market:read",
    "trend_detection": "market:read",
    "shipment_rate": "logistics:read",
    "label_create": "logistics:execute",
    "tracking_update": "logistics:read",
    "return_evaluate": "returns:evaluate",
    "return_process": "returns:evaluate",
    "refund_recommend": "returns:evaluate",
    "decision_evaluate": "decisions:write",
    "decision_synthesize": "decisions:write",
    "supplier_selection": "procurement:draft",
    "purchase_order_draft": "procurement:draft",
}


def required_permission_for_task(task_type: str) -> str | None:
    return TASK_REQUIRED_PERMISSIONS.get(task_type)

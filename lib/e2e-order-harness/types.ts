export type E2eHarnessMode = "LOCAL" | "MOCK" | "SANDBOX" | "CONTROLLED_PRODUCTION";

export const E2E_TEST_ORDER_PREFIX = "E2E_TEST";

export const E2E_ORDER_ASSERTIONS = [
  "price_snapshot_immutable",
  "supplier_selected",
  "stock_reservation_correct",
  "inventory_released_when_required",
  "order_status_valid",
  "supplier_order_payload_valid",
  "tracking_association_valid",
  "return_association_valid",
  "refund_association_valid",
  "financial_reconciliation_valid",
  "analytics_event_correct",
  "audit_trail_complete",
] as const;

export const E2E_FAILURE_INJECTIONS = [
  "supplier_timeout",
  "supplier_stock_unavailable",
  "price_change",
  "payment_failure",
  "payment_timeout",
  "marketplace_timeout",
  "carrier_timeout",
  "tracking_missing",
  "return_rejected",
  "refund_failure",
  "duplicate_webhook",
  "duplicate_order",
  "unknown_supplier_outcome",
  "database_failure",
  "ai_failure",
] as const;

export const AUTO_RESTOCK_POLICY = "FORBIDDEN" as const;

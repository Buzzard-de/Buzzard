import {
  AUTO_RESTOCK_POLICY,
  E2E_FAILURE_INJECTIONS,
  E2E_ORDER_ASSERTIONS,
} from "@/lib/e2e-order-harness/types";
import {
  evaluateProductionE2eGate,
  formatE2eTestOrderId,
  isE2eTestOrderId,
  resolveDefaultE2eMode,
} from "@/lib/e2e-order-harness/gate";
import { evaluateReturnInventoryOutcome } from "@/lib/returns-engine/customerView";
import { getRehearsalSafetyCounters } from "@/lib/supplier-order-rehearsal/safety";
import { REHEARSAL_STAGE_ORDER } from "@/lib/supplier-order-rehearsal/types";
import type { PhaseReport } from "./types";

export const E2E_CANONICAL_STAGES = [
  "CUSTOMER_ORDER",
  "PRODUCT",
  "MARKET",
  "CART",
  "CHECKOUT",
  "PRICE_SNAPSHOT",
  "INVENTORY_RESERVATION",
  "ORDER",
  "SUPPLIER_SELECTION",
  "SUPPLIER_ORDER_PREPARATION",
  "MARKETPLACE_CHANNEL",
  "SHIPMENT_PREPARATION",
  "TRACKING",
  "RETURN",
  "REFUND",
  "FINANCIAL_RECONCILIATION",
  "ANALYTICS",
] as const;

export function evaluatePhaseD_e2eOrder(): PhaseReport {
  const blockers: string[] = [];

  if (resolveDefaultE2eMode() !== "LOCAL") blockers.push("E2E_DEFAULT_NOT_LOCAL");

  const prodGate = evaluateProductionE2eGate();
  if (prodGate.allowed) blockers.push("PRODUCTION_E2E_GATE_OPEN_WITHOUT_OPERATOR");

  const testId = formatE2eTestOrderId("001");
  if (!isE2eTestOrderId(testId)) blockers.push("E2E_TEST_ID_FORMAT");

  if (AUTO_RESTOCK_POLICY !== "FORBIDDEN") blockers.push("AUTO_RESTOCK_NOT_FORBIDDEN");
  if (!evaluateReturnInventoryOutcome().includes("does not auto-restock")) blockers.push("RETURNS_AUTO_RESTOCK");

  if (E2E_ORDER_ASSERTIONS.length < 10) blockers.push("E2E_ASSERTIONS_INCOMPLETE");
  if (E2E_FAILURE_INJECTIONS.length < 10) blockers.push("E2E_FAILURE_INJECTIONS_INCOMPLETE");

  const rehearsalCoverage: Record<(typeof E2E_CANONICAL_STAGES)[number], string[]> = {
    CUSTOMER_ORDER: ["CUSTOMER_ORDER"],
    PRODUCT: ["ORDER_VALIDATION"],
    MARKET: ["ORDER_VALIDATION"],
    CART: ["CUSTOMER_ORDER"],
    CHECKOUT: ["PAYMENT_STATE"],
    PRICE_SNAPSHOT: ["PRICE_SNAPSHOT"],
    INVENTORY_RESERVATION: ["INVENTORY_RESERVATION"],
    ORDER: ["ORDER_VALIDATION", "CUSTOMER_ORDER"],
    SUPPLIER_SELECTION: ["SUPPLIER_SELECTION"],
    SUPPLIER_ORDER_PREPARATION: ["SUPPLIER_ORDER_PAYLOAD", "SUPPLIER_READINESS"],
    MARKETPLACE_CHANNEL: ["ORDER_VALIDATION"],
    SHIPMENT_PREPARATION: ["SIMULATED_SHIPMENT"],
    TRACKING: ["SIMULATED_TRACKING"],
    RETURN: ["CONTROL_TOWER_RECONCILIATION"],
    REFUND: ["PAYMENT_STATE"],
    FINANCIAL_RECONCILIATION: ["CONTROL_TOWER_RECONCILIATION", "FINAL_AUDIT"],
    ANALYTICS: ["FINAL_AUDIT", "REHEARSAL_RESULT"],
  };
  for (const canonical of E2E_CANONICAL_STAGES) {
    const mapped = rehearsalCoverage[canonical];
    if (!mapped.some((s) => REHEARSAL_STAGE_ORDER.includes(s as (typeof REHEARSAL_STAGE_ORDER)[number]))) {
      blockers.push(`E2E_COVERAGE_GAP:${canonical}`);
    }
  }

  const counters = getRehearsalSafetyCounters();
  if (counters.realSupplierOrderHttpCalls > 0) blockers.push("REAL_SUPPLIER_ORDER_IN_REHEARSAL");

  return {
    phase: "D",
    label: "End-to-End Order Test Harness",
    status: blockers.length === 0 ? "COMPLETE" : "BLOCKED",
    tests: "test:supplier-order-rehearsal,test:e2e-order-harness,test:order-engine,test:returns-engine",
    blockers,
  };
}

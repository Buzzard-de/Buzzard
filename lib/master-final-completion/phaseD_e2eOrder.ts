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

export type E2eTestMode = "LOCAL" | "MOCK" | "SANDBOX" | "CONTROLLED_PRODUCTION";

export function defaultE2eTestMode(): E2eTestMode {
  return "LOCAL";
}

export function evaluateControlledProductionGate(): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (process.env.SALES_ENABLED === "1") reasons.push("SALES_ENABLED");
  if (process.env.SUPPLIER_ORDER_NETWORK_ENABLED === "1") reasons.push("SUPPLIER_ORDER_NETWORK");
  if (process.env.PAYMENT_PRODUCTION_ENABLED === "1") reasons.push("PAYMENT_PRODUCTION");
  return { allowed: reasons.length === 0, reasons };
}

export function evaluatePhaseD_e2eOrder(): PhaseReport {
  const blockers: string[] = [];
  const mode = defaultE2eTestMode();
  if (mode !== "LOCAL") blockers.push("E2E_DEFAULT_NOT_LOCAL");

  const controlled = evaluateControlledProductionGate();
  if (controlled.allowed && process.env.E2E_CONTROLLED_PRODUCTION === "1") {
    blockers.push("CONTROLLED_PRODUCTION_WITHOUT_GATES");
  }

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
    tests: "test:supplier-order-rehearsal,test:order-engine,test:first-order-fulfillment",
    blockers,
  };
}

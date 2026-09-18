import { getFirstProductionOrderDashboard } from "@/lib/supplier-first-production-order/admin";
import { loadOfficialValidationEvidence } from "@/lib/supplier-production-order-arming/evidence";
import { getInterCarsSupplierId } from "@/lib/supplier-inter-cars-production-access/config";
import { reconcileFulfillment } from "@/lib/supplier-controlled-go-live/reconciliation";
import type { OpsSectionStatus } from "./types";

export function evaluateFinancialReconciliation(): {
  status: OpsSectionStatus;
  checks: string[];
  blockers: string[];
} {
  const blockers: string[] = [];
  const checks: string[] = [];

  let firstOrderExecuted = false;
  try {
    firstOrderExecuted = getFirstProductionOrderDashboard().firstOrderState === "EXECUTED";
  } catch {
    blockers.push("FIRST_ORDER_UNAVAILABLE");
  }

  if (!firstOrderExecuted) {
    return {
      status: "UNVERIFIED",
      checks: ["CUSTOMER_ORDER", "PAYMENT", "PRICE_SNAPSHOT", "INVENTORY", "SUPPLIER_ORDER", "FULFILLMENT", "TRACKING", "FINANCIAL_RESULT"],
      blockers: ["FIRST_ORDER_NOT_EXECUTED"],
    };
  }

  const { evidence, blockers: evidenceBlockers } = loadOfficialValidationEvidence({
    supplierId: getInterCarsSupplierId(),
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
  });

  blockers.push(...evidenceBlockers);

  if (!evidence?.supplierOrderReference) {
    blockers.push("SUPPLIER_ORDER_ID_MISSING");
    return { status: "BLOCKED", checks, blockers };
  }

  checks.push("CUSTOMER_ORDER", "PAYMENT", "PRICE_SNAPSHOT", "INVENTORY_RESERVATION", "SUPPLIER_ORDER");

  const fct = reconcileFulfillment({
    evidence: {
      executionId: "closure-check",
      orderId: evidence.orderReference || "unknown",
      supplier: evidence.supplier,
      supplierOrderReference: evidence.supplierOrderReference,
      payloadHash: evidence.payloadHash || "unknown",
      armingId: "n/a",
      validationId: evidence.validationId,
      executionTimestamp: evidence.validationTimestamp,
      executionResult: "EXECUTED",
      mockExecution: false,
    },
    mockPass: false,
  });

  blockers.push(...fct.blockers);
  checks.push("FULFILLMENT", "TRACKING", "FINANCIAL_RESULT");

  if (fct.level === "PASS") return { status: "PASS", checks, blockers: [] };
  if (fct.level === "FAIL") return { status: "BLOCKED", checks, blockers };
  return { status: "UNVERIFIED", checks, blockers };
}

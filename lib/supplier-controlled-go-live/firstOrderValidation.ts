import { getIdempotentSupplierOrder } from "@/lib/supplier-engine/orderIdempotency";
import { buildSupplierOrderIdempotencyKey } from "@/lib/supplier-first-production-order/idempotency";
import {
  getLatestFirstProductionOrderForScope,
  getFirstProductionOrderRecord,
  listFirstProductionOrderRecords,
} from "@/lib/supplier-first-production-order/persistence";
import type { FirstOrderEvidence, GoLiveCheckResult } from "./types";

export function loadFirstOrderEvidence(input?: {
  executionId?: string;
  supplierId: string;
  market: string;
  channel: string;
}): { evidence?: FirstOrderEvidence; checks: GoLiveCheckResult[]; blockers: string[] } {
  const checks: GoLiveCheckResult[] = [];
  const blockers: string[] = [];

  const record = input?.executionId
    ? getFirstProductionOrderRecord(input.executionId)
    : getLatestFirstProductionOrderForScope({
        supplierId: input?.supplierId || "",
        market: input?.market || "DE",
        channel: input?.channel || "DIRECT",
      });

  if (!record) {
    blockers.push("FIRST_ORDER_NOT_FOUND");
    checks.push({ check: "FIRST_ORDER", category: "FIRST_ORDER", level: "BLOCKED", message: "No #344 execution" });
    return { checks, blockers };
  }

  if (record.state === "UNKNOWN_OUTCOME") {
    blockers.push("FIRST_ORDER_UNKNOWN_OUTCOME");
    checks.push({ check: "FIRST_ORDER", category: "FIRST_ORDER", level: "FAIL", message: "UNKNOWN_OUTCOME" });
    return {
      evidence: buildEvidence(record, "UNKNOWN_OUTCOME"),
      checks,
      blockers,
    };
  }

  if (record.state !== "EXECUTED") {
    blockers.push("FIRST_ORDER_NOT_EXECUTED");
    checks.push({ check: "FIRST_ORDER", category: "FIRST_ORDER", level: "BLOCKED", message: record.state });
    return { checks, blockers };
  }

  if (!record.supplierOrderReference) {
    blockers.push("SUPPLIER_ORDER_REFERENCE_MISSING");
    checks.push({ check: "SUPPLIER_REFERENCE", category: "FIRST_ORDER", level: "BLOCKED", message: "Missing ref" });
    return { evidence: buildEvidence(record, "EXECUTED"), checks, blockers };
  }

  const idemKey = buildSupplierOrderIdempotencyKey(record.supplier, record.orderId, record.idempotencyKey);
  const idemConfirmed = Boolean(getIdempotentSupplierOrder(idemKey));
  if (!idemConfirmed) {
    blockers.push("IDEMPOTENCY_NOT_CONFIRMED");
    checks.push({ check: "IDEMPOTENCY", category: "FIRST_ORDER", level: "BLOCKED", message: "Not confirmed" });
  } else {
    checks.push({ check: "IDEMPOTENCY", category: "FIRST_ORDER", level: "PASS", message: "Confirmed" });
  }

  if (record.payload.payloadHash && record.approval?.payloadHash !== record.payload.payloadHash) {
    blockers.push("PAYLOAD_HASH_MISMATCH");
  }

  const mockExecution = process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_MOCK === "1";
  const evidence = buildEvidence(record, "EXECUTED", mockExecution);

  if (blockers.length === 0) {
    checks.push({ check: "FIRST_ORDER", category: "FIRST_ORDER", level: "PASS", message: "EXECUTED" });
  }

  return { evidence, checks, blockers };
}

function buildEvidence(
  record: NonNullable<ReturnType<typeof getFirstProductionOrderRecord>>,
  result: FirstOrderEvidence["executionResult"],
  mockExecution?: boolean,
): FirstOrderEvidence {
  return {
    executionId: record.executionId,
    orderId: record.orderId,
    supplier: record.supplier,
    supplierOrderReference: record.supplierOrderReference,
    payloadHash: record.payload.payloadHash,
    approvalId: record.approval?.approvalId,
    armingId: record.armingId,
    validationId: record.validationId,
    executionTimestamp: record.executedAt || record.updatedAt,
    executionResult: result,
    mockExecution,
  };
}

export function listExecutedFirstOrders(supplierId: string) {
  return listFirstProductionOrderRecords().filter((r) => r.supplier === supplierId && r.state === "EXECUTED");
}

import { writeMemory, assertCustomerMemoryIsolation, resetCentralMemoryStoreForTests } from "@/lib/central-ai-memory/store";
import {
  approveHumanAction,
  hashApprovalPayload,
  requestHumanApproval,
} from "@/lib/human-approval-center/center";
import { createException, shouldAutoRetry, resetExceptionEngineForTests } from "@/lib/exception-engine/engine";
import { resetHumanApprovalCenterForTests } from "@/lib/human-approval-center/center";
import type { PhaseReport } from "./types";

export function evaluatePhaseB_memoryApprovalException(): PhaseReport {
  resetCentralMemoryStoreForTests();
  resetHumanApprovalCenterForTests();
  resetExceptionEngineForTests();
  const blockers: string[] = [];

  const mem = writeMemory({
    type: "FACT",
    scope: "PRODUCT",
    scopeKey: "SKU-TEST",
    sensitivity: "PUBLIC",
    payloadSummary: "Product category verified in PIM",
    confidence: 0.9,
    sourceType: "PRODUCT_ENGINE",
    sourceId: "pe-1",
    createdBy: "SYSTEM",
  });
  if (!mem.ok) blockers.push(`MEMORY_WRITE:${mem.errorCode}`);

  const secretMem = writeMemory({
    type: "FACT",
    scope: "GLOBAL",
    scopeKey: "x",
    sensitivity: "INTERNAL",
    payloadSummary: "api_key=hidden",
    confidence: 0.5,
    sourceType: "TEST",
    sourceId: "t",
    createdBy: "SYSTEM",
  });
  if (secretMem.ok) blockers.push("MEMORY_SECRET_NOT_DENIED");

  if (!assertCustomerMemoryIsolation("cust-a", "cust-b")) blockers.push("CUSTOMER_MEMORY_ISOLATION");

  const payload = { orderId: "ORD-1", action: "SUPPLIER_ORDER" };
  const appr = requestHumanApproval({
    requestId: "req-1",
    actor: "operator-a",
    scope: "order",
    action: "SUPPLIER_ORDER",
    risk: "CRITICAL",
    payload,
    reason: "First supplier order",
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  });
  const first = approveHumanAction(appr.approvalId, "approver-1", payload);
  const secondSame = approveHumanAction(appr.approvalId, "approver-1", payload);
  if (secondSame.ok) blockers.push("FOUR_EYES_SAME_APPROVER_ALLOWED");
  const second = approveHumanAction(appr.approvalId, "approver-2", payload);
  if (!second.ok || second.record?.status !== "APPROVED") blockers.push("FOUR_EYES_NOT_COMPLETE");

  const apprTamper = requestHumanApproval({
    requestId: "req-2",
    actor: "operator-b",
    scope: "order",
    action: "REFUND",
    risk: "HIGH",
    payload,
    reason: "Refund test",
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  });
  const tampered = approveHumanAction(apprTamper.approvalId, "approver-x", { ...payload, orderId: "ORD-2" });
  if (tampered.ok) blockers.push("PAYLOAD_HASH_NOT_ENFORCED");

  if (hashApprovalPayload(payload) !== appr.payloadHash) blockers.push("PAYLOAD_HASH_INTEGRITY");

  const ex = createException({
    category: "UNKNOWN_EXTERNAL_OUTCOME",
    severity: "CRITICAL",
    entity: "supplier-order:SO-1",
    correlationId: "corr-1",
    rootCause: "Supplier timeout with unknown outcome",
  });
  if (shouldAutoRetry(ex)) blockers.push("UNKNOWN_OUTCOME_AUTO_RETRY");

  const status = blockers.length === 0 ? "COMPLETE" : "BLOCKED";
  return {
    phase: "B",
    label: "Central Memory + Human Approval + Exception",
    status,
    tests: "test:central-ai-memory,test:human-approval-center,test:exception-engine",
    blockers,
  };
}

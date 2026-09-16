import { randomUUID } from "crypto";
import { createConnector } from "@/lib/supplier-engine/connectors/factory";
import { B2bSandboxSupplierConnector } from "@/lib/supplier-engine/connectors/b2b-sandbox";
import { withScopedValidationNetwork } from "@/lib/supplier-engine/network/scopedValidationNetwork";
import type { SupplierTransport } from "@/lib/supplier-engine/network/types";
import { getSupplier } from "@/lib/supplier-engine/registry";
import { filterSupplierFulfillmentAddress } from "@/lib/supplier-engine/orderSandbox/piiFilter";
import { isAiActor } from "@/lib/supplier-production-order-validation/eligibility";
import { markApprovalUsed } from "./approval";
import { recordFirstOrderAudit } from "./audit";
import { consumeExecutionAuthorization, validateExecutionAuthorization } from "./executionAuthorization";
import { assertFirstProductionOrderNotExpired } from "./expiry";
import { evaluateFirstProductionOrderGate } from "./firstOrderGate";
import { checkSupplierOrderIdempotency, recordIdempotentSupplierOrder } from "./idempotency";
import { isFirstOrderKillSwitched } from "./killSwitch";
import { markFirstOrderExecuted, markFirstOrderFailed, markFirstOrderUnknownOutcome } from "./outcome";
import {
  getFirstProductionOrderByIdempotency,
  getFirstProductionOrderRecord,
  saveFirstProductionOrderRecord,
} from "./persistence";
import {
  assertFirstOrderNetworkSafety,
  recordMockExecution,
  recordRealSupplierHttpCall,
  recordRealSupplierOrder,
} from "./safety";
import { resolveFirstOrderFailureInjection } from "./failureInjection";
import type { FirstProductionOrderRecord } from "./types";

function isMockExecutionAllowed(): boolean {
  const raw = process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_MOCK;
  return raw === "1" || raw?.toLowerCase() === "true";
}

export async function executeFirstProductionOrder(input: {
  executionId: string;
  authorizationId: string;
  actorId: string;
  mockTransport?: SupplierTransport;
  failureInjection?: string;
}): Promise<{
  ok: boolean;
  blocked: boolean;
  state: string;
  httpCallsMade: number;
  supplierOrderReference?: string;
  blockers: string[];
  unknownOutcome?: boolean;
}> {
  const blockers: string[] = [];
  let httpCallsMade = 0;

  if (isAiActor(input.actorId)) {
    return { ok: false, blocked: true, state: "BLOCKED", httpCallsMade: 0, blockers: ["AI_BOUNDARY:EXECUTE_FORBIDDEN"] };
  }

  try {
    assertFirstOrderNetworkSafety();
  } catch {
    return { ok: false, blocked: true, state: "BLOCKED", httpCallsMade: 0, blockers: ["NETWORK_MUST_REMAIN_DISABLED"] };
  }

  const expiryCheck = assertFirstProductionOrderNotExpired(input.executionId);
  if (expiryCheck.expired || !expiryCheck.record) {
    return { ok: false, blocked: true, state: "EXPIRED", httpCallsMade: 0, blockers: ["EXECUTION_EXPIRED"] };
  }

  const record = expiryCheck.record;

  const authCheck = validateExecutionAuthorization({
    authorizationId: input.authorizationId,
    executionId: input.executionId,
    payload: record.payload,
  });
  if (!authCheck.valid) {
    recordFirstOrderAudit({
      type: "FIRST_ORDER_REPLAY_BLOCKED",
      executionId: record.executionId,
      supplierId: record.supplier,
      correlationId: record.correlationId,
      actor: input.actorId,
      detail: { blockers: authCheck.blockers },
    });
    return { ok: false, blocked: true, state: record.state, httpCallsMade: 0, blockers: authCheck.blockers };
  }

  if (record.state !== "EXECUTION_AUTHORIZED") {
    return { ok: false, blocked: true, state: record.state, httpCallsMade: 0, blockers: ["NOT_EXECUTION_AUTHORIZED"] };
  }

  const gate = evaluateFirstProductionOrderGate({ payload: record.payload });
  if (!gate.allowed) blockers.push(...gate.blockers);

  if (isFirstOrderKillSwitched({
    supplierId: record.supplier,
    market: record.scope.market,
    channel: record.scope.channel,
  })) {
    blockers.push("KILL_SWITCH_ACTIVE");
    record.state = "KILL_SWITCHED";
    record.updatedAt = new Date().toISOString();
    saveFirstProductionOrderRecord(record);
    recordFirstOrderAudit({
      type: "FIRST_ORDER_KILL_SWITCHED",
      executionId: record.executionId,
      supplierId: record.supplier,
      correlationId: record.correlationId,
      actor: input.actorId,
    });
    return { ok: false, blocked: true, state: "KILL_SWITCHED", httpCallsMade: 0, blockers };
  }

  const idem = checkSupplierOrderIdempotency({
    supplierId: record.supplier,
    orderId: record.orderId,
    clientIdempotencyKey: record.idempotencyKey,
  });
  if (idem.duplicate) {
    return {
      ok: true,
      blocked: true,
      state: "EXECUTED",
      httpCallsMade: 0,
      supplierOrderReference: idem.existingSupplierOrderId,
      blockers: ["IDEMPOTENCY_BLOCKED"],
    };
  }

  const injection = resolveFirstOrderFailureInjection(input.failureInjection);
  if (injection) {
    return handleFailureInjection(record, injection, input.actorId);
  }

  if (blockers.length > 0) {
    record.state = "BLOCKED";
    record.blockerCodes = blockers;
    record.updatedAt = new Date().toISOString();
    saveFirstProductionOrderRecord(record);
    return { ok: false, blocked: true, state: "BLOCKED", httpCallsMade: 0, blockers };
  }

  record.state = "EXECUTING";
  record.updatedAt = new Date().toISOString();
  saveFirstProductionOrderRecord(record);

  recordFirstOrderAudit({
    type: "FIRST_ORDER_EXECUTION_STARTED",
    executionId: record.executionId,
    orderId: record.orderId,
    supplierId: record.supplier,
    correlationId: record.correlationId,
    actor: input.actorId,
    detail: { authorizationId: input.authorizationId },
  });

  const useMock = Boolean(input.mockTransport) || isMockExecutionAllowed();
  if (!useMock) {
    record.state = "BLOCKED";
    record.blockerCodes = ["REAL_EXECUTION_REQUIRES_EXPLICIT_SCOPED_NETWORK"];
    record.updatedAt = new Date().toISOString();
    saveFirstProductionOrderRecord(record);
    return {
      ok: false,
      blocked: true,
      state: "BLOCKED",
      httpCallsMade: 0,
      blockers: ["REAL_EXECUTION_REQUIRES_EXPLICIT_SCOPED_NETWORK"],
    };
  }

  const result = await runMockExecution(record, input.mockTransport);
  httpCallsMade = result.httpCallsMade;

  if (result.unknownOutcome) {
    markFirstOrderUnknownOutcome(record, result.reason || "UNKNOWN_OUTCOME");
    consumeExecutionAuthorization(input.authorizationId);
    markApprovalUsed(record.approval!.approvalId);
    return {
      ok: false,
      blocked: true,
      state: "UNKNOWN_OUTCOME",
      httpCallsMade,
      blockers: ["UNKNOWN_OUTCOME"],
      unknownOutcome: true,
    };
  }

  if (!result.ok) {
    markFirstOrderFailed(record, result.reason || "EXECUTION_FAILED");
    consumeExecutionAuthorization(input.authorizationId);
    return { ok: false, blocked: true, state: "EXECUTION_FAILED", httpCallsMade, blockers: [result.reason || "EXECUTION_FAILED"] };
  }

  recordIdempotentSupplierOrder(idem.key, result.supplierOrderReference!);
  consumeExecutionAuthorization(input.authorizationId);
  markApprovalUsed(record.approval!.approvalId);
  markFirstOrderExecuted(record, result.supplierOrderReference!);
  recordMockExecution();

  return {
    ok: true,
    blocked: false,
    state: "EXECUTED",
    httpCallsMade,
    supplierOrderReference: result.supplierOrderReference,
    blockers: [],
  };
}

async function runMockExecution(
  record: FirstProductionOrderRecord,
  transport?: SupplierTransport,
): Promise<{ ok: boolean; httpCallsMade: number; supplierOrderReference?: string; unknownOutcome?: boolean; reason?: string }> {
  let httpCallsMade = 0;
  const supplier = getSupplier(record.supplier);
  if (!supplier) return { ok: false, httpCallsMade, reason: "SUPPLIER_NOT_FOUND" };

  const connector = createConnector(supplier, supplier.integrationTypes[0] ?? "b2b-sandbox");
  if (!(connector instanceof B2bSandboxSupplierConnector)) {
    return { ok: false, httpCallsMade, reason: "CONNECTOR_NOT_B2B" };
  }
  if (transport) connector.setTransport(transport);

  const filtered = filterSupplierFulfillmentAddress(record.payload.shippingAddress);
  const supplierRequest = {
    supplierId: record.payload.supplierId,
    orderId: record.payload.orderId,
    lines: record.payload.items.map((i) => ({
      supplierSku: i.sku,
      quantity: i.quantity,
      unitPrice: i.unitCost,
    })),
    shippingAddress: filtered,
  };

  try {
    const op = await withScopedValidationNetwork(
      {
        runId: record.executionId,
        validationId: record.validationId,
        supplierId: record.supplier,
      },
      async () => {
        httpCallsMade++;
        return connector.executeControlledValidationCreateOrder(supplierRequest, {
          idempotencyKey: record.payload.payloadHash,
          correlationId: record.correlationId,
        });
      },
    );

    if (!op.ok) {
      const code = op.errorCode || "UNKNOWN";
      if (code === "TIMEOUT" || code === "NETWORK_ERROR") {
        return { ok: false, httpCallsMade, unknownOutcome: true, reason: code };
      }
      return { ok: false, httpCallsMade, reason: code };
    }

    const data = (op.data || {}) as Record<string, unknown>;
    const ref =
      (data.supplierOrderId as string) ||
      (data.orderId as string) ||
      `MOCK-IC-${randomUUID().slice(0, 8)}`;
    return { ok: true, httpCallsMade, supplierOrderReference: ref };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "UNKNOWN";
    if (msg.includes("TIMEOUT") || msg.includes("NETWORK")) {
      return { ok: false, httpCallsMade, unknownOutcome: true, reason: msg };
    }
    return { ok: false, httpCallsMade, reason: msg };
  }
}

function handleFailureInjection(
  record: FirstProductionOrderRecord,
  injection: string,
  actorId: string,
): { ok: boolean; blocked: boolean; state: string; httpCallsMade: number; blockers: string[]; unknownOutcome?: boolean } {
  void actorId;
  if (injection === "unknown_outcome" || injection === "supplier_timeout") {
    markFirstOrderUnknownOutcome(record, injection.toUpperCase());
    return { ok: false, blocked: true, state: "UNKNOWN_OUTCOME", httpCallsMade: 0, blockers: [injection.toUpperCase()], unknownOutcome: true };
  }
  if (injection === "supplier_rejection" || injection === "supplier_5xx") {
    markFirstOrderFailed(record, injection.toUpperCase());
    return { ok: false, blocked: true, state: "EXECUTION_FAILED", httpCallsMade: 0, blockers: [injection.toUpperCase()] };
  }
  record.state = "BLOCKED";
  record.blockerCodes = [injection.toUpperCase()];
  record.updatedAt = new Date().toISOString();
  saveFirstProductionOrderRecord(record);
  return { ok: false, blocked: true, state: "BLOCKED", httpCallsMade: 0, blockers: [injection.toUpperCase()] };
}

export function attemptFirstProductionOrderExecution(input: {
  armingId: string;
  actorId: string;
  executionId?: string;
  authorizationId?: string;
}): {
  blocked: boolean;
  code: string;
  reason: string;
  httpCallsMade: number;
  armed: boolean;
  state?: string;
} {
  assertFirstOrderNetworkSafety();

  const record = input.executionId ? getFirstProductionOrderRecord(input.executionId) : undefined;
  const armed = Boolean(record?.armingId === input.armingId || input.armingId);

  recordFirstOrderAudit({
    type: "FIRST_ORDER_BLOCKED",
    executionId: input.executionId,
    correlationId: record?.correlationId || randomUUID(),
    actor: input.actorId,
    detail: { armingId: input.armingId, code: "EXECUTION_REQUIRES_AUTHORIZATION" },
  });

  if (!input.executionId || !input.authorizationId) {
    return {
      blocked: true,
      code: "EXECUTION_REQUIRES_AUTHORIZATION",
      reason: "ARMED alone does not permit execution — authorization and full gate chain required",
      httpCallsMade: 0,
      armed: Boolean(armed),
    };
  }

  return {
    blocked: true,
    code: "USE_EXECUTE_FIRST_PRODUCTION_ORDER",
    reason: "Use executeFirstProductionOrder with valid authorization",
    httpCallsMade: 0,
    armed: Boolean(armed),
    state: record?.state,
  };
}

export function getFirstProductionOrderByExecution(executionId: string) {
  return getFirstProductionOrderRecord(executionId);
}

export function getFirstProductionOrderByKey(idempotencyKey: string) {
  return getFirstProductionOrderByIdempotency(idempotencyKey);
}

import { randomUUID, createHash } from "crypto";
import { createPendingPayment, authorizePayment, capturePayment } from "@/lib/order-engine/payment";
import { evaluateFulfillmentEligibility } from "./eligibility";
import {
  buildFulfillmentIdempotencyKey,
  generateFulfillmentNonce,
  resolveFulfillmentApprovalTtlMs,
  resolveFulfillmentLimits,
} from "./config";
import {
  saveFulfillmentPipelineRecord,
  getFulfillmentPipelineRecord,
  listFulfillmentPipelineRecords,
} from "./persistence";
import {
  assertFulfillmentNetworkSafety,
  recordMockFulfillmentExecution,
  recordUnknownFulfillmentOutcome,
} from "./safety";
import type {
  FulfillmentPipelineRecord,
  FulfillmentPipelineScope,
  FulfillmentPipelineState,
  StageCheckResult,
} from "./types";

export interface StartFulfillmentPipelineInput {
  orderId: string;
  scope: FulfillmentPipelineScope;
  requester: string;
  orderValue: number;
  quantity: number;
  currency: string;
  items: Array<{ sku: string; quantity: number; unitPrice: number }>;
}

export function runFulfillmentPreflight(input: StartFulfillmentPipelineInput): {
  ready: boolean;
  blockers: string[];
  checks: StageCheckResult[];
} {
  assertFulfillmentNetworkSafety();
  const eligibility = evaluateFulfillmentEligibility({
    scope: input.scope,
    requester: input.requester,
    orderValue: input.orderValue,
    quantity: input.quantity,
  });
  const checks: StageCheckResult[] = [...eligibility.checks];

  checks.push({ stage: "PAYMENT_CONFIRMED", status: "MOCK", message: "Dry-run payment path" });
  checks.push({ stage: "PRICE_SNAPSHOT", status: "MOCK", message: "Immutable snapshot binding" });
  checks.push({ stage: "INVENTORY_RESERVATION", status: "MOCK", message: "Reservation dry-run" });
  checks.push({ stage: "SUPPLIER_CREATE_ORDER", status: "BLOCKED", message: "No real createOrder in prep" });

  return { ready: eligibility.allowed, blockers: eligibility.blockers, checks };
}

export function startFulfillmentPipeline(input: StartFulfillmentPipelineInput): FulfillmentPipelineRecord {
  assertFulfillmentNetworkSafety();
  const preflight = runFulfillmentPreflight(input);
  if (!preflight.ready) {
    throw new Error(`FULFILLMENT_BLOCKED:${preflight.blockers.join(",")}`);
  }

  const now = new Date();
  const limits = resolveFulfillmentLimits(input.scope);
  const idempotencyKey = buildFulfillmentIdempotencyKey({
    orderId: input.orderId,
    supplierId: input.scope.supplierId,
    market: input.scope.market,
  });

  const payloadHash = createHash("sha256")
    .update(JSON.stringify({ orderId: input.orderId, items: input.items, scope: input.scope }))
    .digest("hex");

  const record: FulfillmentPipelineRecord = {
    pipelineId: randomUUID(),
    orderId: input.orderId,
    state: "READY",
    currentStage: "CUSTOMER_ORDER",
    scope: input.scope,
    limits,
    payloadHash,
    idempotencyKey,
    nonce: generateFulfillmentNonce(),
    nonceUsed: false,
    unknownOutcome: false,
    dryRun: true,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + resolveFulfillmentApprovalTtlMs()).toISOString(),
  };

  saveFulfillmentPipelineRecord(record);
  return record;
}

/** Dry-run pipeline stages — no real supplier order, payment capture, or network. */
export function executeFulfillmentPipelineDryRun(pipelineId: string): FulfillmentPipelineRecord {
  assertFulfillmentNetworkSafety();
  const record = getFulfillmentPipelineRecord(pipelineId);
  if (!record) throw new Error("FULFILLMENT_NOT_FOUND");
  if (record.nonceUsed) throw new Error("FULFILLMENT_NONCE_REPLAY");
  if (new Date(record.expiresAt).getTime() < Date.now()) {
    record.state = "FAILED";
    record.updatedAt = new Date().toISOString();
    saveFulfillmentPipelineRecord(record);
    throw new Error("FULFILLMENT_EXPIRED");
  }

  record.nonceUsed = true;
  record.state = "IN_PROGRESS";
  record.currentStage = "PAYMENT_CONFIRMED";
  record.updatedAt = new Date().toISOString();

  const payment = createPendingPayment({
    orderId: record.orderId,
    amount: 0,
    currency: record.scope.currency,
  });
  const auth = authorizePayment(payment);
  if (!auth.ok || !auth.payment) {
    record.state = "FAILED";
    saveFulfillmentPipelineRecord(record);
    throw new Error("FULFILLMENT_PAYMENT_MOCK_FAILED");
  }
  capturePayment(auth.payment);

  record.currentStage = "SUPPLIER_CREATE_ORDER";
  recordMockFulfillmentExecution();
  record.state = "COMPLETED";
  record.currentStage = "FINANCIAL_RECONCILIATION";
  record.updatedAt = new Date().toISOString();
  saveFulfillmentPipelineRecord(record);
  return record;
}

export function markFulfillmentUnknownOutcome(pipelineId: string): FulfillmentPipelineRecord {
  const record = getFulfillmentPipelineRecord(pipelineId);
  if (!record) throw new Error("FULFILLMENT_NOT_FOUND");
  record.state = "UNKNOWN_OUTCOME";
  record.unknownOutcome = true;
  record.updatedAt = new Date().toISOString();
  recordUnknownFulfillmentOutcome();
  saveFulfillmentPipelineRecord(record);
  return record;
}

export function resolveFulfillmentLiveStatus(): "BLOCKED" | "NOT_CONFIGURED" | "UNVERIFIED" {
  return "UNVERIFIED";
}

export function resolveFulfillmentPipelineState(): FulfillmentPipelineState {
  const records = listFulfillmentPipelineRecords();
  const latest = records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  return latest?.state || "BLOCKED";
}

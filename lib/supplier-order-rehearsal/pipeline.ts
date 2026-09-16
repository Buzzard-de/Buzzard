import { randomUUID } from "crypto";
import { createOrder, getOrder, buildSingleItemOrderInput, clearOrderRegistry, seedOrderEngineFixtures } from "@/lib/order-engine";
import { runSupplierOrderSandbox } from "@/lib/supplier-engine/orderSandbox";
import { buildSupplierOrderIdempotencyKey } from "@/lib/supplier-engine/orderSandbox/sandboxAdapter";
import { filterSupplierFulfillmentAddress, assertNoSecretsInPayload } from "@/lib/supplier-engine/orderSandbox/piiFilter";
import { runFulfillmentReconciliation } from "@/lib/fulfillment-control-tower";
import {
  activateRealSupplierOrders,
  evaluateSupplierOrderReadiness,
  buildReadinessId,
  requestSupplierOrderApproval,
  approveSupplierOrderActivation,
  resolveEffectiveApproval,
  getReadinessPolicy,
  isActivationKillSwitched,
  setGlobalKillSwitch,
  getReadinessByScope,
} from "@/lib/supplier-order-readiness";
import { listRehearsalAudit } from "./audit";
import { getRealSupplierOrderHttpCallCount } from "@/lib/supplier-order-readiness/activation";
import { recordRehearsalAudit } from "./audit";
import { resolveFailureInjection } from "./failureInjection";
import {
  saveRehearsalRecord,
  getRehearsalRecord,
  getRehearsalByIdempotency,
  getInflightRehearsal,
  setInflightRehearsal,
  clearInflightRehearsal,
} from "./persistence";
import {
  assertRehearsalNetworkSafety,
  recordBlockedRealActivationAttempt,
  getRehearsalSafetyCounters,
} from "./safety";
import {
  buildSimulatedTracking,
  classifySupplierOrderReference,
  type SimulatedSupplierStatus,
} from "./simulation";
import {
  REHEARSAL_STAGE_ORDER,
  type GoLiveRehearsalInput,
  type RehearsalStageName,
  type RehearsalStageResult,
  type RehearsalStageStatus,
  type SupplierOrderGoLiveRehearsal,
} from "./types";

function stageResult(
  stage: RehearsalStageName,
  status: RehearsalStageStatus,
  message: string,
  started: number,
  detail?: Record<string, unknown>
): RehearsalStageResult {
  const completedAt = new Date().toISOString();
  return {
    stage,
    status,
    message,
    startedAt: new Date(started).toISOString(),
    completedAt,
    durationMs: Date.now() - started,
    detail,
  };
}

function terminalStatus(status: RehearsalStageStatus): "PASSED" | "FAILED" | "BLOCKED" {
  if (status === "PASS") return "PASSED";
  if (status === "BLOCKED") return "BLOCKED";
  return "FAILED";
}

export async function runGoLiveRehearsal(input: GoLiveRehearsalInput): Promise<SupplierOrderGoLiveRehearsal> {
  assertRehearsalNetworkSafety();

  const correlationId = input.correlationId || randomUUID();
  const idempotencyKey =
    input.idempotencyKey ||
    `rehearsal_${input.market || "DE"}_${input.channel || "DIRECT"}_${input.productId || "default"}`;

  const existing = getRehearsalByIdempotency(idempotencyKey);
  if (existing && ["PASSED", "BLOCKED", "FAILED"].includes(existing.overallStatus)) {
    return existing;
  }

  const inflight = getInflightRehearsal(idempotencyKey);
  if (inflight) return inflight;

  const promise = executeRehearsal(input, correlationId, idempotencyKey);
  setInflightRehearsal(idempotencyKey, promise);
  try {
    return await promise;
  } finally {
    clearInflightRehearsal(idempotencyKey);
  }
}

async function executeRehearsal(
  input: GoLiveRehearsalInput,
  correlationId: string,
  idempotencyKey: string
): Promise<SupplierOrderGoLiveRehearsal> {
  const started = Date.now();
  const market = input.market || "DE";
  const channel = input.channel || "DIRECT";
  const failureInjection = resolveFailureInjection(input.failureInjection || "NONE");

  let rehearsal: SupplierOrderGoLiveRehearsal = {
    rehearsalId: input.resumeRehearsalId || `reh_${randomUUID().slice(0, 12)}`,
    orderId: input.orderId || "",
    supplierId: input.supplierId || "",
    market,
    channel,
    environment: process.env.NODE_ENV === "production" ? "PRODUCTION" : "SANDBOX",
    currentStage: "CUSTOMER_ORDER",
    overallStatus: "RUNNING",
    startedAt: new Date(started).toISOString(),
    correlationId,
    idempotencyKey,
    stages: [],
    supplierOrderClassification: "UNKNOWN",
    simulatedResponse: true,
    realActivationBlocked: false,
    auditEventCount: 0,
    failureInjection: input.failureInjection,
  };

  if (input.resumeRehearsalId) {
    const persisted = getRehearsalRecord(input.resumeRehearsalId);
    if (persisted) rehearsal = { ...persisted, overallStatus: "RUNNING", stages: [...persisted.stages] };
  }

  recordRehearsalAudit({ type: "REHEARSAL_CREATED", rehearsalId: rehearsal.rehearsalId, correlationId });
  saveRehearsalRecord(rehearsal);
  recordRehearsalAudit({ type: "REHEARSAL_STARTED", rehearsalId: rehearsal.rehearsalId, correlationId });

  const ctx: {
    order?: Awaited<ReturnType<typeof createOrder>>["order"];
    readinessId?: string;
    approvalId?: string;
    sandboxOrderId?: string;
    simulatedStatus?: SimulatedSupplierStatus;
  } = {};

  for (const stageName of REHEARSAL_STAGE_ORDER) {
    if (failureInjection && failureInjection.stage === stageName) {
      const injected = stageResult(stageName, failureInjection.expectedStatus, failureInjection.message, Date.now());
      rehearsal.stages.push(injected);
      rehearsal.currentStage = stageName;
      rehearsal.overallStatus = terminalStatus(failureInjection.expectedStatus);
      rehearsal.completedAt = new Date().toISOString();
      rehearsal.duration = Date.now() - started;
      recordRehearsalAudit({
        type: rehearsal.overallStatus === "BLOCKED" ? "REHEARSAL_BLOCKED" : "REHEARSAL_FAILED",
        rehearsalId: rehearsal.rehearsalId,
        correlationId,
        detail: { stage: stageName, injection: input.failureInjection },
      });
      saveRehearsalRecord(rehearsal);
      return finalizeRehearsal(rehearsal);
    }

    const stageStarted = Date.now();
    rehearsal.currentStage = stageName;
    saveRehearsalRecord(rehearsal);

    const outcome = await runStage(stageName, {
      input,
      rehearsal,
      ctx,
      correlationId,
      market,
      channel,
    });

    rehearsal.stages.push(outcome);
    rehearsal.auditEventCount = listAuditCount(rehearsal.rehearsalId);

    if (outcome.status === "BLOCKED" || outcome.status === "FAIL") {
      rehearsal.overallStatus = terminalStatus(outcome.status);
      rehearsal.completedAt = new Date().toISOString();
      rehearsal.duration = Date.now() - started;
      recordRehearsalAudit({
        type: outcome.status === "BLOCKED" ? "REHEARSAL_BLOCKED" : "REHEARSAL_FAILED",
        rehearsalId: rehearsal.rehearsalId,
        orderId: rehearsal.orderId,
        supplierId: rehearsal.supplierId,
        correlationId,
        detail: { stage: stageName, message: outcome.message },
      });
      saveRehearsalRecord(rehearsal);
      return finalizeRehearsal(rehearsal);
    }

    if (stageName === "REHEARSAL_RESULT") {
      rehearsal.overallStatus = "PASSED";
      rehearsal.completedAt = new Date().toISOString();
      rehearsal.duration = Date.now() - stageStarted;
      recordRehearsalAudit({
        type: "REHEARSAL_PASSED",
        rehearsalId: rehearsal.rehearsalId,
        orderId: rehearsal.orderId,
        supplierId: rehearsal.supplierId,
        correlationId,
      });
    }
  }

  saveRehearsalRecord(rehearsal);
  return finalizeRehearsal(rehearsal);
}

function listAuditCount(rehearsalId: string): number {
  return listRehearsalAudit({ rehearsalId }).length;
}

async function runStage(
  stage: RehearsalStageName,
  args: {
    input: GoLiveRehearsalInput;
    rehearsal: SupplierOrderGoLiveRehearsal;
    ctx: {
      order?: NonNullable<Awaited<ReturnType<typeof createOrder>>["order"]>;
      readinessId?: string;
      approvalId?: string;
      sandboxOrderId?: string;
      simulatedStatus?: SimulatedSupplierStatus;
    };
    correlationId: string;
    market: string;
    channel: import("@/lib/supplier-order-readiness/types").ReadinessChannel;
  }
): Promise<RehearsalStageResult> {
  const started = Date.now();
  const { input, rehearsal, ctx, correlationId, market, channel } = args;

  switch (stage) {
    case "CUSTOMER_ORDER": {
      if (input.orderId) {
        const order = getOrder(input.orderId);
        if (!order) {
          return stageResult(stage, "FAIL", "Order not found", started);
        }
        ctx.order = order;
        rehearsal.orderId = order.orderId;
        rehearsal.supplierId = order.items[0]?.supplierId || input.supplierId || "";
        rehearsal.inventoryReservationId =
          order.items[0]?.inventoryReservationId || order.reservationIds[0];
        rehearsal.priceSnapshotId = order.priceSnapshotId;
        rehearsal.orderValue = order.totalGross;
        return stageResult(stage, "PASS", "Existing order loaded", started, { orderId: order.orderId });
      }
      seedOrderEngineFixtures();
      const createResult = await createOrder(
        buildSingleItemOrderInput(input.productId || "reifen-pilot-sport", {
          marketId: market,
          channel: channel.toLowerCase() as "direct",
          idempotencyKey: `rehearsal_order_${correlationId}`,
        })
      );
      if (!createResult.ok || !createResult.order) {
        return stageResult(stage, "FAIL", createResult.errorMessage || "Order creation failed", started);
      }
      ctx.order = createResult.order;
      rehearsal.orderId = createResult.order.orderId;
      rehearsal.supplierId = createResult.order.items[0]?.supplierId || "";
      rehearsal.inventoryReservationId =
        createResult.order.items[0]?.inventoryReservationId || createResult.order.reservationIds[0];
      rehearsal.priceSnapshotId = createResult.order.priceSnapshotId;
      rehearsal.orderValue = createResult.order.totalGross;
      return stageResult(stage, "PASS", "Customer order created (simulated payment)", started, {
        orderId: createResult.order.orderId,
        paymentMode: "MOCK/TEST ONLY",
      });
    }

    case "ORDER_VALIDATION": {
      if (!ctx.order) return stageResult(stage, "FAIL", "Missing order", started);
      if (!["PAID", "CONFIRMED", "PROCESSING", "SUPPLIER_PENDING"].includes(ctx.order.status)) {
        return stageResult(stage, "BLOCKED", `Invalid order status ${ctx.order.status}`, started);
      }
      return stageResult(stage, "PASS", "Order validation passed", started);
    }

    case "PAYMENT_STATE": {
      if (!ctx.order) return stageResult(stage, "FAIL", "Missing order", started);
      if (ctx.order.paymentStatus !== "CAPTURED" && ctx.order.paymentStatus !== "AUTHORIZED") {
        return stageResult(stage, "BLOCKED", `Payment not ready: ${ctx.order.paymentStatus}`, started);
      }
      recordRehearsalAudit({
        type: "PAYMENT_BOUNDARY",
        rehearsalId: rehearsal.rehearsalId,
        orderId: rehearsal.orderId,
        correlationId,
        detail: { mode: "MOCK/TEST ONLY", realPaymentCaptures: 0 },
      });
      return stageResult(stage, "PASS", "Payment state validated (no real capture)", started);
    }

    case "PRICE_SNAPSHOT": {
      if (!ctx.order?.priceSnapshotId) {
        return stageResult(stage, "BLOCKED", "Price snapshot missing", started);
      }
      rehearsal.priceSnapshotId = ctx.order.priceSnapshotId;
      return stageResult(stage, "PASS", "Price snapshot present", started);
    }

    case "INVENTORY_RESERVATION": {
      const item = ctx.order?.items[0];
      const reservationId =
        item?.inventoryReservationId || ctx.order?.reservationIds[0] || rehearsal.inventoryReservationId;
      if (!reservationId) {
        return stageResult(stage, "BLOCKED", "Inventory reservation missing", started);
      }
      rehearsal.inventoryReservationId = reservationId;
      return stageResult(stage, "PASS", "Inventory reservation confirmed", started);
    }

    case "SUPPLIER_SELECTION": {
      const item = ctx.order?.items[0];
      if (!item?.supplierId) {
        return stageResult(stage, "BLOCKED", "Supplier assignment missing", started);
      }
      rehearsal.supplierId = item.supplierId;
      return stageResult(stage, "PASS", "Supplier selection immutable snapshot", started, {
        supplierId: item.supplierId,
      });
    }

    case "SUPPLIER_READINESS": {
      const scope = { supplierId: rehearsal.supplierId, market, channel };
      let readiness = getReadinessByScope(scope.supplierId, scope.market, scope.channel);
      if (!readiness || readiness.overallStatus === "EXPIRED") {
        readiness = evaluateSupplierOrderReadiness(scope, { correlationId, force: true });
      }
      rehearsal.readinessId = readiness.readinessId;
      recordRehearsalAudit({
        type: "READINESS_CHECKED",
        rehearsalId: rehearsal.rehearsalId,
        supplierId: rehearsal.supplierId,
        correlationId,
        detail: { overallStatus: readiness.overallStatus },
      });
      if (readiness.overallStatus === "BLOCKED" || readiness.overallStatus === "EXPIRED") {
        return stageResult(stage, "BLOCKED", `Readiness ${readiness.overallStatus}`, started, {
          blockers: readiness.blockers,
        });
      }
      return stageResult(stage, "PASS", `Readiness ${readiness.overallStatus}`, started);
    }

    case "APPROVAL": {
      const scope = { supplierId: rehearsal.supplierId, market, channel };
      let approval = resolveEffectiveApproval(scope);
      if (!approval && input.approver && input.requester !== input.approver) {
        const readinessId = rehearsal.readinessId || buildReadinessId(scope);
        const req = requestSupplierOrderApproval({
          readinessId,
          requester: input.requester,
          correlationId,
        });
        if (req.ok && req.approval) {
          const appr = approveSupplierOrderActivation({
            approvalId: req.approval.approvalId,
            approver: input.approver,
            correlationId,
          });
          approval = appr.approval;
        }
      }
      recordRehearsalAudit({
        type: "APPROVAL_CHECKED",
        rehearsalId: rehearsal.rehearsalId,
        correlationId,
        detail: { status: approval?.status || "MISSING" },
      });
      if (!approval || approval.status !== "APPROVED") {
        return stageResult(stage, "BLOCKED", "Approval required and not approved", started);
      }
      rehearsal.approvalId = approval.approvalId;
      return stageResult(stage, "PASS", "Approval verified (four-eyes)", started);
    }

    case "RISK_EVALUATION": {
      const scope = { supplierId: rehearsal.supplierId, market, channel };
      const readiness =
        getReadinessByScope(scope.supplierId, scope.market, scope.channel) ||
        evaluateSupplierOrderReadiness(scope, { correlationId, force: true });
      rehearsal.riskLevel = readiness.riskLevel;
      if (readiness.riskLevel === "BLOCKED") {
        return stageResult(stage, "BLOCKED", "Risk level BLOCKED", started);
      }
      recordRehearsalAudit({ type: "RISK_CHECKED", rehearsalId: rehearsal.rehearsalId, correlationId });
      return stageResult(stage, "PASS", `Risk ${readiness.riskLevel}`, started);
    }

    case "ORDER_LIMIT": {
      const policy = getReadinessPolicy();
      const value = input.orderValue ?? rehearsal.orderValue ?? 0;
      if (value > policy.maxSingleSupplierOrderValue) {
        return stageResult(stage, "BLOCKED", "Order value exceeds limit", started);
      }
      recordRehearsalAudit({ type: "LIMIT_CHECKED", rehearsalId: rehearsal.rehearsalId, correlationId });
      return stageResult(stage, "PASS", "Order limits satisfied", started);
    }

    case "KILL_SWITCH": {
      if (isActivationKillSwitched({ supplierId: rehearsal.supplierId, market, channel })) {
        return stageResult(stage, "BLOCKED", "Kill switch active", started);
      }
      recordRehearsalAudit({ type: "KILL_SWITCH_CHECKED", rehearsalId: rehearsal.rehearsalId, correlationId });
      return stageResult(stage, "PASS", "Kill switch off", started);
    }

    case "SUPPLIER_ORDER_PAYLOAD": {
      const item = ctx.order?.items[0];
      if (!item || !ctx.order) {
        return stageResult(stage, "BLOCKED", "Missing order item for payload", started);
      }
      const payloadId = `payload_${rehearsal.orderId}_${item.supplierId}`;
      rehearsal.supplierOrderPayloadId = payloadId;
      recordRehearsalAudit({ type: "PAYLOAD_PREPARED", rehearsalId: rehearsal.rehearsalId, correlationId });
      return stageResult(stage, "PASS", "Supplier order payload prepared", started, { payloadId });
    }

    case "PII_FILTERING": {
      const filtered = filterSupplierFulfillmentAddress(
        (ctx.order?.shippingAddress || {}) as unknown as Record<string, string>
      );
      const violations = assertNoSecretsInPayload(filtered as unknown as Record<string, unknown>);
      if (violations.length) {
        return stageResult(stage, "BLOCKED", "PII/security violation", started);
      }
      recordRehearsalAudit({ type: "PII_FILTERED", rehearsalId: rehearsal.rehearsalId, correlationId });
      return stageResult(stage, "PASS", "PII filtered", started);
    }

    case "ACTIVATION_BOUNDARY": {
      const activation = activateRealSupplierOrders({
        scope: { supplierId: rehearsal.supplierId, market, channel },
        requester: input.requester,
        correlationId,
        orderValue: rehearsal.orderValue,
      });
      recordBlockedRealActivationAttempt();
      rehearsal.realActivationBlocked = activation.blocked;
      recordRehearsalAudit({
        type: "REAL_ACTIVATION_BLOCKED",
        rehearsalId: rehearsal.rehearsalId,
        correlationId,
        detail: { code: activation.code, reason: activation.reason },
      });
      if (!activation.blocked) {
        return stageResult(stage, "FAIL", "Real activation should have been blocked", started);
      }
      return stageResult(stage, "PASS", "Real activation blocked — sandbox fallback", started, {
        code: activation.code,
        realHttpCalls: getRealSupplierOrderHttpCallCount(),
      });
    }

    case "SANDBOX_SUPPLIER_ACCEPTANCE": {
      const item = ctx.order?.items[0];
      if (!item || !ctx.order) {
        return stageResult(stage, "BLOCKED", "Missing order for sandbox", started);
      }
      const sandboxResult = await runSupplierOrderSandbox({
        orderId: ctx.order.orderId,
        supplierId: item.supplierId,
        productId: item.productId,
        lines: [
          {
            supplierSku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitGrossPrice,
          },
        ],
        shippingAddress: ctx.order.shippingAddress as unknown as Record<string, string>,
        currency: ctx.order.currency,
        priceSnapshotId: ctx.order.priceSnapshotId,
        idempotencyKey: buildSupplierOrderIdempotencyKey(ctx.order.orderId, item.supplierId),
        correlationId,
      });
      if (!sandboxResult.ok || !sandboxResult.supplierOrderId) {
        return stageResult(stage, "FAIL", sandboxResult.message || "Sandbox order failed", started);
      }
      ctx.sandboxOrderId = sandboxResult.supplierOrderId;
      ctx.simulatedStatus = "SANDBOX_ACCEPTED";
      rehearsal.simulatedSupplierOrderId = sandboxResult.supplierOrderId;
      rehearsal.supplierOrderClassification = classifySupplierOrderReference(sandboxResult.supplierOrderId);
      if (rehearsal.supplierOrderClassification !== "SANDBOX") {
        return stageResult(stage, "FAIL", "Sandbox order misclassified as LIVE", started);
      }
      recordRehearsalAudit({
        type: "SANDBOX_ORDER_CREATED",
        rehearsalId: rehearsal.rehearsalId,
        correlationId,
        detail: { supplierOrderId: sandboxResult.supplierOrderId },
      });
      return stageResult(stage, "PASS", "Sandbox supplier order accepted", started, {
        supplierOrderId: sandboxResult.supplierOrderId,
        classification: "SANDBOX",
      });
    }

    case "SIMULATED_CONFIRMATION": {
      ctx.simulatedStatus = "SIMULATED_CONFIRMED";
      recordRehearsalAudit({ type: "SIMULATED_CONFIRMATION", rehearsalId: rehearsal.rehearsalId, correlationId });
      return stageResult(stage, "PASS", "Simulated supplier confirmation (not real)", started);
    }

    case "SIMULATED_SHIPMENT": {
      ctx.simulatedStatus = "SIMULATED_SHIPPED";
      recordRehearsalAudit({ type: "SIMULATED_SHIPMENT", rehearsalId: rehearsal.rehearsalId, correlationId });
      return stageResult(stage, "PASS", "Simulated shipment (no real customer shipment)", started);
    }

    case "SIMULATED_TRACKING": {
      const tracking = buildSimulatedTracking(ctx.sandboxOrderId || rehearsal.simulatedSupplierOrderId || "");
      rehearsal.simulatedTrackingId = tracking.trackingId;
      recordRehearsalAudit({
        type: "SIMULATED_TRACKING",
        rehearsalId: rehearsal.rehearsalId,
        correlationId,
        detail: { trackingNumber: tracking.trackingNumber, simulated: true },
      });
      return stageResult(stage, "PASS", "Simulated tracking created", started, tracking as unknown as Record<string, unknown>);
    }

    case "CONTROL_TOWER_RECONCILIATION": {
      try {
        const run = runFulfillmentReconciliation({ correlationId });
        rehearsal.reconciliationResult = {
          runId: run.runId,
          critical: run.critical,
          passed: run.passed,
        };
        recordRehearsalAudit({ type: "RECONCILIATION_COMPLETED", rehearsalId: rehearsal.rehearsalId, correlationId });
        if (run.critical > 0) {
          return stageResult(stage, "FAIL", `${run.critical} critical reconciliation issues`, started);
        }
        return stageResult(stage, "PASS", "Control Tower reconciliation completed", started, {
          runId: run.runId,
        });
      } catch (err) {
        return stageResult(stage, "FAIL", err instanceof Error ? err.message : "Reconciliation failed", started);
      }
    }

    case "FINAL_AUDIT": {
      return stageResult(stage, "PASS", "Final audit complete", started, {
        auditEvents: listAuditCount(rehearsal.rehearsalId),
        safety: getRehearsalSafetyCounters(),
      });
    }

    case "REHEARSAL_RESULT": {
      return stageResult(stage, "PASS", "Rehearsal completed successfully", started, {
        durationMs: Date.now() - started,
        sandboxOrder: rehearsal.simulatedSupplierOrderId,
        tracking: rehearsal.simulatedTrackingId,
      });
    }

    default:
      return stageResult(stage, "SKIPPED", "Unknown stage", started);
  }
}

function finalizeRehearsal(rehearsal: SupplierOrderGoLiveRehearsal): SupplierOrderGoLiveRehearsal {
  saveRehearsalRecord(rehearsal);
  return rehearsal;
}

export function bootstrapRehearsalFixtures(): void {
  clearOrderRegistry();
  seedOrderEngineFixtures();
}

export function invalidateReadinessDuringRehearsal(
  rehearsal: SupplierOrderGoLiveRehearsal,
  reason: string
): SupplierOrderGoLiveRehearsal {
  rehearsal.overallStatus = "BLOCKED";
  rehearsal.stages.push(
    stageResult("SUPPLIER_READINESS", "BLOCKED", `Readiness invalidated: ${reason}`, Date.now())
  );
  saveRehearsalRecord(rehearsal);
  return rehearsal;
}

export { setGlobalKillSwitch };

import { randomUUID } from "crypto";
import { deriveCreateOrderCapabilityStatus } from "./capability";
import { promoteCreateOrderCapabilityValidated } from "./capabilityUpdate";
import {
  CONTROLLED_VALIDATION_MAX_QTY,
  CONTROLLED_VALIDATION_MAX_VALUE,
  getInterCarsAdapterProfile,
  getInterCarsSupplierId,
  isControlledValidationEnabled,
  resolveValidationMode,
  VALIDATION_TTL_MS,
} from "./config";
import { createControlledValidationApproval, validateControlledValidationApproval } from "./approval";
import { runControlledValidationPreflight } from "./preflight";
import { executeControlledCreateOrderHttp } from "./controlledHttp";
import { buildCanonicalPayloadFromOrder } from "./payload";
import { recordSuccessfulIdempotency } from "./idempotency";
import { recordCreateOrderValidationAudit } from "./audit";
import { emitCreateOrderValidationAnalytics } from "./analytics";
import {
  assertCreateOrderValidationNetworkSafety,
  getCreateOrderValidationSafetyCounters,
} from "./safety";
import {
  saveControlledValidationRun,
  getControlledValidationRun,
  getControlledValidationRunByIdempotency,
  setInflightControlledRun,
  getInflightControlledRun,
  clearInflightControlledRun,
  saveValidationRecord,
} from "./persistence";
import type {
  ControlledValidationRun,
  ControlledValidationRunInput,
  ControlledValidationRunResult,
  SupplierProductionOrderValidation,
  ValidationOverallStatus,
} from "./types";

function deriveRunStatus(blockers: string[], liveValidation: ControlledValidationRun["liveValidation"]): ValidationOverallStatus {
  if (liveValidation === "PASS") return "PASSED";
  if (liveValidation === "FAIL") return "FAILED";
  if (blockers.length > 0) return "BLOCKED";
  return "SKIPPED";
}

export function requestControlledValidationApproval(input: {
  validationId: string;
  supplier?: string;
  market?: string;
  channel?: import("@/lib/supplier-order-readiness/types").ReadinessChannel;
  environment?: "SANDBOX" | "STAGING" | "PRODUCTION";
  orderId: string;
  allowedProduct: string;
  allowedMarket: string;
  maximumQuantity?: number;
  maximumValue?: number;
  currency?: string;
  approvedBy: string;
  requester: string;
  ttlMs?: number;
}): { approval: ReturnType<typeof createControlledValidationApproval>; blockers: string[] } {
  const payloadResult = buildCanonicalPayloadFromOrder(input.orderId);
  const blockers = [...payloadResult.blockers];
  if (!payloadResult.payload || !payloadResult.payloadHash) {
    blockers.push("PAYLOAD_INVALID");
    return { approval: undefined!, blockers };
  }

  const expiresAt = new Date(Date.now() + (input.ttlMs ?? VALIDATION_TTL_MS)).toISOString();
  const approval = createControlledValidationApproval({
    validationId: input.validationId,
    supplier: input.supplier,
    scope: {
      market: input.allowedMarket || input.market || "DE",
      channel: input.channel || "DIRECT",
      environment: input.environment || "PRODUCTION",
    },
    maximumQuantity: input.maximumQuantity ?? CONTROLLED_VALIDATION_MAX_QTY,
    maximumValue: input.maximumValue ?? CONTROLLED_VALIDATION_MAX_VALUE,
    currency: input.currency || payloadResult.payload.currency,
    allowedProduct: input.allowedProduct,
    allowedMarket: input.allowedMarket || input.market || "DE",
    expiresAt,
    approvedBy: input.approvedBy,
    orderReference: input.orderId,
    payloadHash: payloadResult.payloadHash,
  });

  recordCreateOrderValidationAudit({
    type: "CONTROLLED_VALIDATION_APPROVED",
    validationId: input.validationId,
    orderId: input.orderId,
    supplierId: input.supplier || getInterCarsSupplierId(),
    correlationId: input.validationId,
    actor: input.approvedBy,
    detail: {
      allowedProduct: input.allowedProduct,
      allowedMarket: input.allowedMarket,
      expiresAt,
      payloadHash: payloadResult.payloadHash,
    },
  });

  return { approval, blockers };
}

export async function startControlledValidationRun(
  input: ControlledValidationRunInput,
): Promise<ControlledValidationRunResult> {
  assertCreateOrderValidationNetworkSafety();

  const validationId = input.validationId || `cvr342_${randomUUID().slice(0, 12)}`;
  const supplierId = input.supplier || getInterCarsSupplierId();
  const idempotencyKey =
    input.idempotencyKey ||
    `cvr342_${supplierId}_${input.orderId || validationId}`;

  const existing = getControlledValidationRunByIdempotency(idempotencyKey);
  if (existing && ["PASSED", "BLOCKED", "FAILED", "SKIPPED"].includes(existing.overallStatus)) {
    return { run: existing, httpCallsMade: 0, safety: getCreateOrderValidationSafetyCounters() };
  }

  const inflight = getInflightControlledRun(idempotencyKey);
  if (inflight) return inflight;

  const promise = executeControlledValidationRun({ ...input, validationId, idempotencyKey });
  setInflightControlledRun(idempotencyKey, promise);
  try {
    return await promise;
  } finally {
    clearInflightControlledRun(idempotencyKey);
  }
}

async function executeControlledValidationRun(
  input: ControlledValidationRunInput & { validationId: string; idempotencyKey: string },
): Promise<ControlledValidationRunResult> {
  const now = new Date().toISOString();
  const supplierId = input.supplier || getInterCarsSupplierId();
  const correlationId = input.correlationId || input.validationId;
  const validationMode = input.validationMode || resolveValidationMode();

  recordCreateOrderValidationAudit({
    type: "CONTROLLED_VALIDATION_REQUESTED",
    validationId: input.validationId,
    orderId: input.orderId,
    supplierId,
    correlationId,
    actor: input.requester,
  });

  const modeAllowed =
    validationMode === "CONTROLLED_VALIDATION" ||
    validationMode === "VALIDATION";
  if (!modeAllowed || !isControlledValidationEnabled()) {
    const blockers = ["CONTROLLED_VALIDATION_MODE_DISABLED"];
    const run = buildRunRecord(input, {
      now,
      supplierId,
      correlationId,
      validationMode,
      blockers,
      liveValidation: "BLOCKED",
      preflightPassed: false,
    });
    saveControlledValidationRun(run);
    recordCreateOrderValidationAudit({
      type: "CONTROLLED_VALIDATION_BLOCKED",
      validationId: input.validationId,
      supplierId,
      correlationId,
      actor: input.requester,
      detail: { blockers },
    });
    return { run, httpCallsMade: 0, safety: getCreateOrderValidationSafetyCounters() };
  }

  const preflight = runControlledValidationPreflight(input);
  const preflightPassed = preflight.blockers.length === 0;

  if (!preflightPassed) {
    const run = buildRunRecord(input, {
      now,
      supplierId,
      correlationId,
      validationMode,
      blockers: preflight.blockers,
      checks: preflight.checks,
      liveValidation: preflight.blockers.includes("CREDENTIAL_NOT_CONFIGURED") ? "BLOCKED" : "BLOCKED",
      preflightPassed: false,
      payloadHash: preflight.payloadHash,
    });
    saveControlledValidationRun(run);
    recordCreateOrderValidationAudit({
      type: "CONTROLLED_VALIDATION_BLOCKED",
      validationId: input.validationId,
      supplierId,
      correlationId,
      actor: input.requester,
      detail: { blockers: preflight.blockers },
    });
    return { run, httpCallsMade: 0, safety: getCreateOrderValidationSafetyCounters() };
  }

  recordCreateOrderValidationAudit({
    type: "CONTROLLED_VALIDATION_PREFLIGHT_PASSED",
    validationId: input.validationId,
    orderId: input.orderId,
    supplierId,
    correlationId,
    actor: input.approver,
    detail: { payloadHash: preflight.payloadHash },
  });

  if (!input.humanConfirmation || !input.confirmationNonce) {
    const blockers = ["EXPLICIT_HUMAN_CONFIRMATION_REQUIRED"];
    const run = buildRunRecord(input, {
      now,
      supplierId,
      correlationId,
      validationMode,
      blockers,
      checks: preflight.checks,
      liveValidation: "BLOCKED",
      preflightPassed: true,
      payloadHash: preflight.payloadHash,
    });
    saveControlledValidationRun(run);
    return { run, httpCallsMade: 0, safety: getCreateOrderValidationSafetyCounters() };
  }

  const approvalCheck = validateControlledValidationApproval({
    validationId: input.validationId,
    confirmationNonce: input.confirmationNonce,
    payloadHash: preflight.payloadHash,
    orderReference: input.orderId,
  });
  if (!approvalCheck.valid) {
    const run = buildRunRecord(input, {
      now,
      supplierId,
      correlationId,
      validationMode,
      blockers: approvalCheck.blockers,
      checks: preflight.checks,
      liveValidation: "BLOCKED",
      preflightPassed: true,
      payloadHash: preflight.payloadHash,
    });
    saveControlledValidationRun(run);
    return { run, httpCallsMade: 0, safety: getCreateOrderValidationSafetyCounters() };
  }

  const payloadResult = buildCanonicalPayloadFromOrder(input.orderId!);
  if (!payloadResult.payload) {
    const run = buildRunRecord(input, {
      now,
      supplierId,
      correlationId,
      validationMode,
      blockers: ["PAYLOAD_INVALID"],
      checks: preflight.checks,
      liveValidation: "BLOCKED",
      preflightPassed: true,
    });
    saveControlledValidationRun(run);
    return { run, httpCallsMade: 0, safety: getCreateOrderValidationSafetyCounters() };
  }

  recordCreateOrderValidationAudit({
    type: "CONTROLLED_VALIDATION_REQUEST_SENT",
    validationId: input.validationId,
    orderId: input.orderId,
    supplierId,
    correlationId,
    actor: input.approver,
    detail: { payloadHash: preflight.payloadHash },
  });

  const httpResult = await executeControlledCreateOrderHttp({
    validationId: input.validationId,
    supplierId,
    payload: payloadResult.payload,
    correlationId,
    transport: input.transport,
  });

  let liveValidation: ControlledValidationRun["liveValidation"] = "FAIL";
  let createOrderCapability: import("./types").CreateOrderCapabilityStatus = "UNVERIFIED";
  let capabilityState = promoteCreateOrderCapabilityValidated(false);

  if (httpResult.unknownOutcome) {
    recordCreateOrderValidationAudit({
      type: "CONTROLLED_VALIDATION_UNKNOWN_OUTCOME",
      validationId: input.validationId,
      orderId: input.orderId,
      supplierId,
      correlationId,
      actor: input.approver,
    });
    liveValidation = "FAIL";
  } else if (httpResult.responseClass === "accepted" && httpResult.supplierOrderId) {
    recordSuccessfulIdempotency(payloadResult.payload, httpResult.supplierOrderId);
    capabilityState = promoteCreateOrderCapabilityValidated(true);
    createOrderCapability = deriveCreateOrderCapabilityStatus(capabilityState);
    liveValidation = "PASS";

    recordCreateOrderValidationAudit({
      type: "CONTROLLED_VALIDATION_ACCEPTED",
      validationId: input.validationId,
      orderId: input.orderId,
      supplierId,
      correlationId,
      actor: input.approver,
      detail: { supplierOrderId: httpResult.supplierOrderId },
    });
    recordCreateOrderValidationAudit({
      type: "CAPABILITY_VALIDATED",
      validationId: input.validationId,
      supplierId,
      correlationId,
      actor: input.approver,
    });
  } else {
    recordCreateOrderValidationAudit({
      type: "CONTROLLED_VALIDATION_REJECTED",
      validationId: input.validationId,
      orderId: input.orderId,
      supplierId,
      correlationId,
      actor: input.approver,
      detail: { responseClass: httpResult.responseClass },
    });
  }

  const blockers = [...preflight.blockers, ...httpResult.blockers];
  const run = buildRunRecord(input, {
    now,
    supplierId,
    correlationId,
    validationMode,
    blockers,
    checks: [...preflight.checks, ...httpResult.checks],
    liveValidation,
    preflightPassed: true,
    payloadHash: preflight.payloadHash,
    supplierOrderId: httpResult.supplierOrderId,
    responseClass: httpResult.responseClass,
    unknownOutcome: httpResult.unknownOutcome,
    humanReviewRequired: httpResult.humanReviewRequired,
    httpCallsMade: httpResult.httpCallsMade,
    createOrderCapability,
    capabilityState,
  });
  saveControlledValidationRun(run);

  const validationRecord: SupplierProductionOrderValidation = {
    validationId: input.validationId,
    supplierId,
    adapterProfile: getInterCarsAdapterProfile(),
    environment: input.environment || "PRODUCTION",
    market: input.allowedMarket || input.market || "DE",
    channel: input.channel || "DIRECT",
    orderId: input.orderId,
    createOrderCapability,
    capabilityState,
    trackingCapability: "UNVERIFIED",
    validationMode,
    requestPayloadHash: preflight.payloadHash,
    responseClass: httpResult.responseClass,
    supplierOrderId: httpResult.supplierOrderId,
    unknownOutcome: httpResult.unknownOutcome,
    humanReviewRequired: httpResult.humanReviewRequired,
    blockerCodes: blockers,
    correlationId,
    idempotencyKey: input.idempotencyKey,
    overallStatus: deriveRunStatus(blockers, liveValidation),
    checks: run.checks,
    createdAt: now,
    updatedAt: new Date().toISOString(),
    controlledValidation: true,
    liveValidation,
  };
  saveValidationRecord(validationRecord);

  emitCreateOrderValidationAnalytics({
    eventType: liveValidation === "PASS" ? "controlled_validation_passed" : "controlled_validation_failed",
    validationId: input.validationId,
    supplierId,
    correlationId,
    detail: { liveValidation, responseClass: httpResult.responseClass },
  });

  return {
    run,
    httpCallsMade: httpResult.httpCallsMade,
    safety: getCreateOrderValidationSafetyCounters(),
  };
}

function buildRunRecord(
  input: ControlledValidationRunInput & { validationId: string; idempotencyKey: string },
  ctx: {
    now: string;
    supplierId: string;
    correlationId: string;
    validationMode: import("./types").ValidationMode;
    blockers: string[];
    checks?: import("./types").ValidationCheckResult[];
    liveValidation: ControlledValidationRun["liveValidation"];
    preflightPassed: boolean;
    payloadHash?: string;
    supplierOrderId?: string;
    responseClass?: import("./types").SupplierResponseClass;
    unknownOutcome?: boolean;
    humanReviewRequired?: boolean;
    httpCallsMade?: number;
    createOrderCapability?: import("./types").CreateOrderCapabilityStatus;
    capabilityState?: import("./types").CreateOrderCapabilityState;
  },
): ControlledValidationRun {
  return {
    validationId: input.validationId,
    supplier: ctx.supplierId,
    orderReference: input.orderId || "",
    orderId: input.orderId,
    market: input.allowedMarket || input.market || "DE",
    channel: input.channel || "DIRECT",
    environment: input.environment || "PRODUCTION",
    allowedProduct: input.allowedProduct || "",
    allowedMarket: input.allowedMarket || input.market || "DE",
    payloadHash: ctx.payloadHash,
    approvalStatus: ctx.preflightPassed ? "APPROVED" : "MISSING",
    preflightPassed: ctx.preflightPassed,
    liveValidation: ctx.liveValidation,
    createOrderCapability: ctx.createOrderCapability || "UNVERIFIED",
    capabilityState: ctx.capabilityState,
    supplierOrderReference: ctx.supplierOrderId,
    responseClass: ctx.responseClass,
    unknownOutcome: ctx.unknownOutcome ?? false,
    humanReviewRequired: ctx.humanReviewRequired ?? false,
    httpCallsMade: ctx.httpCallsMade ?? 0,
    blockerCodes: ctx.blockers,
    checks: ctx.checks || [],
    idempotencyKey: input.idempotencyKey,
    correlationId: ctx.correlationId,
    validationMode: ctx.validationMode,
    overallStatus: deriveRunStatus(ctx.blockers, ctx.liveValidation),
    approvedBy: input.approver,
    requester: input.requester,
    createdAt: ctx.now,
    updatedAt: new Date().toISOString(),
  };
}

export function getControlledValidationRunDetail(validationId: string): ControlledValidationRun | undefined {
  return getControlledValidationRun(validationId);
}

export function resolveControlledUnknownOutcome(input: {
  validationId: string;
  orderId: string;
  idempotencyKey: string;
}): { outcome: "RESOLVED" | "HUMAN_REVIEW_REQUIRED" | "UNKNOWN"; supplierOrderId?: string } {
  const run = getControlledValidationRun(input.validationId);
  if (run?.supplierOrderReference) {
    recordCreateOrderValidationAudit({
      type: "CONTROLLED_VALIDATION_RESOLVED",
      validationId: input.validationId,
      orderId: input.orderId,
      correlationId: input.idempotencyKey,
      detail: { supplierOrderId: run.supplierOrderReference },
    });
    return { outcome: "RESOLVED", supplierOrderId: run.supplierOrderReference };
  }
  recordCreateOrderValidationAudit({
    type: "HUMAN_REVIEW_REQUIRED",
    validationId: input.validationId,
    orderId: input.orderId,
    correlationId: input.idempotencyKey,
  });
  return { outcome: "HUMAN_REVIEW_REQUIRED" };
}

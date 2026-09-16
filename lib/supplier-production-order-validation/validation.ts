import { randomUUID } from "crypto";
import { blockOrderEndpointAttempt } from "@/lib/supplier-production-validation/endpointSecurity";
import {
  buildValidationIdempotencyKey,
  getInterCarsAdapterProfile,
  getInterCarsSupplierId,
  isControlledValidationEnabled,
  resolveValidationMode,
} from "./config";
import { evaluateDeclaredCapability, deriveCreateOrderCapabilityStatus } from "./capability";
import { buildCanonicalPayloadFromOrder } from "./payload";
import { validateOrderProtections } from "./request";
import { validateResponseContract } from "./response";
import { checkIdempotency, claimValidationIdempotency } from "./idempotency";
import { evaluateUpstreamGates, assertAiBoundary } from "./eligibility";
import { evaluateTrackingCapability } from "./tracking";
import { isStatusCapabilityValidated } from "./status";
import { resolveCreateOrderFailureInjection, applyFailureInjectionToChecks } from "./failureInjection";
import { recordCreateOrderValidationAudit } from "./audit";
import { emitCreateOrderValidationAnalytics } from "./analytics";
import {
  assertCreateOrderValidationNetworkSafety,
  recordBlockedProductionOrderAttempt,
} from "./safety";
import {
  saveValidationRecord,
  getValidationByIdempotency,
  getInflightValidation,
  setInflightValidation,
  clearInflightValidation,
} from "./persistence";
import type {
  CreateOrderValidationInput,
  SupplierProductionOrderValidation,
  ValidationCheckResult,
  ValidationOverallStatus,
} from "./types";

function deriveOverallStatus(blockers: string[], checks: ValidationCheckResult[]): ValidationOverallStatus {
  if (checks.some((c) => c.status === "FAIL")) return "FAILED";
  if (blockers.length > 0 || checks.some((c) => c.status === "BLOCKED")) return "BLOCKED";
  if (checks.every((c) => c.status === "SKIPPED")) return "SKIPPED";
  return "PASSED";
}

export async function runCreateOrderProductionValidation(
  input: CreateOrderValidationInput,
): Promise<SupplierProductionOrderValidation> {
  assertCreateOrderValidationNetworkSafety();

  const supplierId = input.supplierId || getInterCarsSupplierId();
  const market = input.market || "DE";
  const channel = input.channel || "DIRECT";
  const environment = input.environment || "PRODUCTION";
  const correlationId = input.correlationId || randomUUID();
  const validationMode = input.validationMode || resolveValidationMode();
  const idempotencyKey =
    input.idempotencyKey ||
    buildValidationIdempotencyKey({ supplierId, market, channel, environment, orderId: input.orderId });

  const existing = getValidationByIdempotency(idempotencyKey);
  if (existing && ["PASSED", "BLOCKED", "FAILED", "SKIPPED"].includes(existing.overallStatus)) {
    return existing;
  }

  const inflight = getInflightValidation(idempotencyKey);
  if (inflight) return inflight;

  const promise = executeValidation(input, {
    supplierId,
    market,
    channel,
    environment,
    correlationId,
    idempotencyKey,
    validationMode,
  });
  setInflightValidation(idempotencyKey, promise);
  try {
    return await promise;
  } finally {
    clearInflightValidation(idempotencyKey);
  }
}

async function executeValidation(
  input: CreateOrderValidationInput,
  scope: {
    supplierId: string;
    market: string;
    channel: import("@/lib/supplier-order-readiness/types").ReadinessChannel;
    environment: "SANDBOX" | "STAGING" | "PRODUCTION";
    correlationId: string;
    idempotencyKey: string;
    validationMode: import("./types").ValidationMode;
  },
): Promise<SupplierProductionOrderValidation> {
  const now = new Date().toISOString();
  const checks: ValidationCheckResult[] = [];
  const blockerCodes: string[] = [];

  const { state: capabilityState, blockers: capBlockers } = evaluateDeclaredCapability(scope.supplierId);
  blockerCodes.push(...capBlockers);
  checks.push({
    check: "CREATE_ORDER_CAPABILITY",
    category: "CAPABILITY",
    status: capBlockers.length ? "BLOCKED" : "PASS",
    message: capBlockers.length ? capBlockers.join(",") : "Capability checks complete",
  });

  recordCreateOrderValidationAudit({
    type: "VALIDATION_STARTED",
    supplierId: scope.supplierId,
    correlationId: scope.correlationId,
    actor: input.requester,
  });

  const aiBlockers = assertAiBoundary(input);
  blockerCodes.push(...aiBlockers);

  const upstream = evaluateUpstreamGates({
    supplierId: scope.supplierId,
    market: scope.market,
    channel: scope.channel,
    environment: scope.environment,
    requester: input.requester,
    approver: input.approver,
  });
  blockerCodes.push(...upstream.blockers);

  const injection = resolveCreateOrderFailureInjection(
    (input.failureInjection || "NONE") as import("./failureInjection").CreateOrderFailureInjection,
  );
  if (injection) {
    applyFailureInjectionToChecks(checks, injection);
    blockerCodes.push(injection.blockerCode);
  }

  let requestPayloadHash: string | undefined;
  if (input.orderId) {
    const payloadResult = buildCanonicalPayloadFromOrder(input.orderId);
    checks.push(...payloadResult.checks);
    blockerCodes.push(...payloadResult.blockers);
    requestPayloadHash = payloadResult.payloadHash;

    if (payloadResult.payload) {
      capabilityState.requestValidated = payloadResult.blockers.length === 0;
      const idem = checkIdempotency(payloadResult.payload);
      checks.push(...idem.checks);
      if (idem.isDuplicate && idem.existingSupplierOrderId) {
        blockerCodes.push("DUPLICATE_IDEMPOTENCY");
      } else if (payloadResult.payload) {
        claimValidationIdempotency(
          payloadResult.payload.idempotencyKey,
          `pending_${scope.correlationId}`,
        );
      }

      const protections = validateOrderProtections(input.orderId, payloadResult.payload);
      checks.push(...protections.checks);
      blockerCodes.push(...protections.blockers);
    }
  } else {
    checks.push({
      check: "REQUEST_SCHEMA",
      category: "REQUEST",
      status: "SKIPPED",
      message: "No orderId — request contract check skipped",
    });
  }

  capabilityState.errorHandlingValidated = true;
  checks.push({
    check: "ERROR_POLICY",
    category: "ERROR",
    status: "PASS",
    message: "Error classification policy configured",
  });

  capabilityState.idempotencyValidated = !blockerCodes.includes("DUPLICATE_IDEMPOTENCY");
  capabilityState.responseValidated = false;
  capabilityState.statusValidated = isStatusCapabilityValidated();
  capabilityState.trackingValidated = evaluateTrackingCapability() === "VALIDATED";

  let unknownOutcome = false;
  let humanReviewRequired = false;
  let responseClass: import("./types").SupplierResponseClass | undefined;
  let supplierOrderId: string | undefined;

  const canAttemptControlledHttp =
    scope.validationMode === "VALIDATION" &&
    isControlledValidationEnabled() &&
    input.humanConfirmation &&
    Boolean(input.confirmationNonce) &&
    input.approver &&
    input.approver !== input.requester &&
    capabilityState.authenticated &&
    blockerCodes.length === 0;

  if (canAttemptControlledHttp) {
    recordCreateOrderValidationAudit({
      type: "PRODUCTION_ATTEMPT_ALLOWED",
      supplierId: scope.supplierId,
      correlationId: scope.correlationId,
      actor: input.approver,
      detail: { mode: "CONTROLLED_VALIDATION" },
    });
    unknownOutcome = true;
    humanReviewRequired = true;
    blockerCodes.push("CONTROLLED_VALIDATION_NOT_IMPLEMENTED_WITHOUT_EXPLICIT_SUPPLIER_TEST_API");
  } else {
    recordCreateOrderValidationAudit({
      type: "PRODUCTION_ATTEMPT_BLOCKED",
      supplierId: scope.supplierId,
      correlationId: scope.correlationId,
      actor: input.requester,
      detail: { reason: "Network disabled / credentials / approval / mode guard" },
    });
    recordBlockedProductionOrderAttempt();
    blockOrderEndpointAttempt("https://gw.intercars.eu/ic/order/createOrder", {
      correlationId: scope.correlationId,
      supplierId: scope.supplierId,
    });
  }

  if (injection?.mockResponse) {
    const parsed = injection.mockResponse;
    responseClass = parsed.responseClass;
    humanReviewRequired = parsed.humanReviewRequired;
    unknownOutcome = parsed.responseClass === "unknown";
    checks.push(validateResponseContract(parsed));
    if (parsed.responseClass !== "accepted") {
      blockerCodes.push(injection.blockerCode);
    }
  } else if (!canAttemptControlledHttp) {
    checks.push({
      check: "RESPONSE_SCHEMA",
      category: "RESPONSE",
      status: "SKIPPED",
      message: "No live response — contract validation deferred",
    });
    blockerCodes.push("REAL_ORDER_ENDPOINT_NOT_VALIDATED");
  }

  capabilityState.productionValidated = false;
  const createOrderCapability = deriveCreateOrderCapabilityStatus(capabilityState);

  const record: SupplierProductionOrderValidation = {
    validationId: `co341_${randomUUID().slice(0, 12)}`,
    supplierId: scope.supplierId,
    adapterProfile: getInterCarsAdapterProfile(),
    environment: scope.environment,
    market: scope.market,
    channel: scope.channel,
    orderId: input.orderId,
    createOrderCapability,
    capabilityState,
    trackingCapability: evaluateTrackingCapability(),
    validationMode: scope.validationMode,
    requestPayloadHash,
    responseClass,
    supplierOrderId,
    unknownOutcome,
    humanReviewRequired,
    blockerCodes: [...new Set(blockerCodes)],
    correlationId: scope.correlationId,
    idempotencyKey: scope.idempotencyKey,
    overallStatus: "RUNNING",
    checks,
    createdAt: now,
    updatedAt: now,
    failureInjection: input.failureInjection,
  };

  record.overallStatus = deriveOverallStatus(record.blockerCodes, record.checks);
  record.updatedAt = new Date().toISOString();
  saveValidationRecord(record);

  recordCreateOrderValidationAudit({
    type: record.overallStatus === "BLOCKED" ? "VALIDATION_BLOCKED" : "VALIDATION_PASSED",
    validationId: record.validationId,
    orderId: input.orderId,
    supplierId: scope.supplierId,
    correlationId: scope.correlationId,
    actor: input.requester,
    detail: {
      createOrderCapability,
      blockers: record.blockerCodes,
      payloadHash: requestPayloadHash,
    },
  });

  emitCreateOrderValidationAnalytics({
    eventType: record.overallStatus === "BLOCKED" ? "validation_blocked" : "validation_passed",
    validationId: record.validationId,
    supplierId: scope.supplierId,
    correlationId: scope.correlationId,
    detail: { createOrderCapability },
  });

  return record;
}

export function attemptProductionCreateOrder(input: {
  orderId: string;
  requester: string;
  approver?: string;
  humanConfirmation?: boolean;
  confirmationNonce?: string;
}): {
  blocked: true;
  code: string;
  reason: string;
  httpCallsMade: number;
} {
  assertCreateOrderValidationNetworkSafety();
  recordBlockedProductionOrderAttempt();
  blockOrderEndpointAttempt("https://gw.intercars.eu/ic/order/createOrder", {
    correlationId: randomUUID(),
    supplierId: getInterCarsSupplierId(),
  });
  recordCreateOrderValidationAudit({
    type: "PRODUCTION_ATTEMPT_BLOCKED",
    orderId: input.orderId,
    supplierId: getInterCarsSupplierId(),
    correlationId: randomUUID(),
    actor: input.requester,
    detail: { code: "REAL_ORDER_ENDPOINT_NOT_VALIDATED" },
  });
  return {
    blocked: true,
    code: "REAL_ORDER_ENDPOINT_NOT_VALIDATED",
    reason: "Inter Cars createOrder not production-validated — no HTTP call permitted",
    httpCallsMade: 0,
  };
}

export function resolveUnknownOutcome(input: {
  orderId: string;
  idempotencyKey: string;
}): {
  outcome: "RESOLVED" | "HUMAN_REVIEW_REQUIRED" | "UNKNOWN";
  supplierOrderId?: string;
} {
  const payload = buildCanonicalPayloadFromOrder(input.orderId);
  if (!payload.payload) {
    return { outcome: "HUMAN_REVIEW_REQUIRED" };
  }
  const idem = checkIdempotency(payload.payload);
  if (idem.existingSupplierOrderId) {
    return { outcome: "RESOLVED", supplierOrderId: idem.existingSupplierOrderId };
  }
  recordCreateOrderValidationAudit({
    type: "UNKNOWN_OUTCOME",
    orderId: input.orderId,
    correlationId: input.idempotencyKey,
    detail: { action: "CHECK_IDEMPOTENCY" },
  });
  recordCreateOrderValidationAudit({
    type: "HUMAN_REVIEW_REQUIRED",
    orderId: input.orderId,
    correlationId: input.idempotencyKey,
  });
  return { outcome: "HUMAN_REVIEW_REQUIRED" };
}

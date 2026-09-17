import { randomUUID } from "crypto";
import { getControlledGoLiveRecord, getLatestControlledGoLiveForScope } from "@/lib/supplier-controlled-go-live/persistence";
import { recordObservationAudit } from "./audit";
import {
  getObservationByIdempotency,
  getObservationRecord,
  saveObservationRecord,
} from "./persistence";
import { evaluateObservationEligibility } from "./eligibility";
import { assertObservationNetworkSafety } from "./safety";
import {
  buildObservationIdempotencyKey,
  getInterCarsSupplierId,
  resolveDefaultRolloutScope,
  resolveBroaderRolloutLimits,
  resolveObservationConfig,
  resolveObservationThresholds,
  OBSERVATION_TTL_MS,
} from "./config";
import { createEmptyMetrics, collectObservationMetrics, computeSuccessRate, computeFailureRate } from "./metrics";
import { evaluateThresholds } from "./thresholds";
import { evaluateSupplierHealth } from "./supplierHealth";
import { evaluateOrderQuality } from "./orderQuality";
import { evaluateInventoryQuality } from "./inventoryQuality";
import { evaluatePricingQuality } from "./pricingQuality";
import { evaluateFulfillmentQuality } from "./fulfillmentQuality";
import { evaluateFinancialQuality } from "./financialQuality";
import { evaluateReturnsQuality } from "./returnsQuality";
import { evaluateCustomerImpact } from "./customerImpact";
import { evaluateObservationRisk } from "./risk";
import { hasUnresolvedCriticalIncidents } from "./incidentAnalysis";
import { emitObservationAnalytics } from "./analytics";
import type { ObservationRecord, ObservationReport, QualitySummary } from "./types";

function buildQuality(metrics: ReturnType<typeof createEmptyMetrics>): QualitySummary {
  return {
    supplierHealth: evaluateSupplierHealth(getInterCarsSupplierId()).level,
    orderQuality: evaluateOrderQuality(metrics).level,
    inventoryQuality: evaluateInventoryQuality(metrics).level,
    pricingQuality: evaluatePricingQuality(metrics).level,
    fulfillmentQuality: evaluateFulfillmentQuality(metrics).level,
    financialQuality: evaluateFinancialQuality(metrics).level,
    returnsQuality: evaluateReturnsQuality(metrics).level,
    customerImpact: evaluateCustomerImpact().level,
    security: "PASS",
  };
}

export function startObservation(input: {
  requester: string;
  goLiveId?: string;
  supplier?: string;
  market?: string;
  channel?: import("@/lib/supplier-order-readiness/types").ReadinessChannel;
  correlationId?: string;
  idempotencyKey?: string;
  mockObservation?: boolean;
}): ObservationRecord {
  assertObservationNetworkSafety();

  const supplier = input.supplier || getInterCarsSupplierId();
  const market = input.market || "DE";
  const channel = input.channel || "DIRECT";
  const goLive =
    (input.goLiveId ? getControlledGoLiveRecord(input.goLiveId) : undefined) ||
    getLatestControlledGoLiveForScope({ supplierId: supplier, market, channel });

  const idempotencyKey =
    input.idempotencyKey ||
    buildObservationIdempotencyKey({
      supplier,
      market,
      channel,
      goLiveId: goLive?.goLiveId || "none",
    });

  const existing = getObservationByIdempotency(idempotencyKey);
  if (existing) return existing;

  const correlationId = input.correlationId || randomUUID();
  const observationId = `obs346_${randomUUID().slice(0, 12)}`;
  const now = new Date().toISOString();

  recordObservationAudit({
    type: "OBSERVATION_STARTED",
    observationId,
    supplierId: supplier,
    correlationId,
    actor: input.requester,
  });

  const eligibility = evaluateObservationEligibility({
    supplierId: supplier,
    market,
    channel,
    environment: "PRODUCTION",
    requester: input.requester,
    goLiveId: goLive?.goLiveId,
  });

  let state: ObservationRecord["state"] = "BLOCKED";
  if (eligibility.blockers.length === 0 && goLive?.state === "CONTROLLED_GO_LIVE") {
    state = input.mockObservation ? "OBSERVATION_ACTIVE" : "OBSERVATION_READY";
    if (input.mockObservation || process.env.SUPPLIER_OBSERVATION_AUTO_START === "1") {
      state = "OBSERVATION_ACTIVE";
    }
  } else if (eligibility.blockers.some((b) => b.includes("FIRST_ORDER"))) {
    state = "BLOCKED";
  }

  const metrics = createEmptyMetrics();
  const record: ObservationRecord = {
    observationId,
    goLiveId: goLive?.goLiveId || "",
    supplier,
    state,
    scope: resolveDefaultRolloutScope(),
    limits: resolveBroaderRolloutLimits(),
    config: resolveObservationConfig(),
    thresholds: resolveObservationThresholds(),
    metrics,
    quality: buildQuality(metrics),
    incidents: [],
    blockerCodes: eligibility.blockers,
    correlationId,
    idempotencyKey,
    requestedBy: input.requester,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(Date.now() + OBSERVATION_TTL_MS).toISOString(),
    mockObservation: input.mockObservation,
    startedAt: state === "OBSERVATION_ACTIVE" ? now : undefined,
  };

  if (state === "OBSERVATION_ACTIVE") {
    recordObservationAudit({
      type: "OBSERVATION_STARTED",
      observationId,
      supplierId: supplier,
      correlationId,
      actor: input.requester,
      detail: { mockObservation: input.mockObservation },
    });
  }

  saveObservationRecord(record);
  emitObservationAnalytics({
    eventType: state === "OBSERVATION_ACTIVE" ? "observation_started" : "observation_blocked",
    observationId,
    supplierId: supplier,
    correlationId,
  });

  return record;
}

export function pauseObservation(input: {
  observationId: string;
  actorId: string;
}): { ok: boolean; record?: ObservationRecord } {
  const record = getObservationRecord(input.observationId);
  if (!record || record.state !== "OBSERVATION_ACTIVE") {
    return { ok: false };
  }
  record.state = "PAUSED";
  record.updatedAt = new Date().toISOString();
  saveObservationRecord(record);
  recordObservationAudit({
    type: "OBSERVATION_PAUSED",
    observationId: record.observationId,
    supplierId: record.supplier,
    correlationId: record.correlationId,
    actor: input.actorId,
  });
  return { ok: true, record };
}

export function evaluateObservationCompletion(observationId: string): ObservationRecord {
  const record = getObservationRecord(observationId);
  if (!record) throw new Error("OBSERVATION_NOT_FOUND");

  if (record.state !== "OBSERVATION_ACTIVE" && record.state !== "PAUSED") {
    return record;
  }

  record.metrics = collectObservationMetrics(record);
  record.quality = buildQuality(record.metrics);

  const startedAt = record.startedAt ? Date.parse(record.startedAt) : Date.now();
  const durationMs = Date.now() - startedAt;
  const durationOk = durationMs >= record.config.observationDurationMs;
  const ordersOk = record.metrics.ordersAttempted >= record.config.minimumOrders;
  const thresholdCheck = evaluateThresholds(record.metrics, record.thresholds);
  const risk = evaluateObservationRisk(record);
  const customer = evaluateCustomerImpact();

  const blockers: string[] = [...thresholdCheck.blockers, ...risk.blockers, ...customer.blockers];

  if (hasUnresolvedCriticalIncidents(record)) blockers.push("UNRESOLVED_CRITICAL_INCIDENT");
  if (!durationOk) blockers.push("OBSERVATION_DURATION_INCOMPLETE");
  if (!ordersOk) blockers.push("MINIMUM_ORDERS_NOT_REACHED");
  if (record.quality.fulfillmentQuality === "FAIL") blockers.push("FULFILLMENT_QUALITY_FAIL");
  if (record.quality.inventoryQuality === "FAIL") blockers.push("INVENTORY_QUALITY_FAIL");

  if (blockers.length > 0) {
    if (blockers.some((b) => b.startsWith("THRESHOLD_BREACH") || b.includes("CRITICAL"))) {
      record.state = "OBSERVATION_FAILED";
      recordObservationAudit({
        type: "OBSERVATION_FAILED",
        observationId: record.observationId,
        supplierId: record.supplier,
        correlationId: record.correlationId,
        detail: { blockers },
      });
    }
    record.blockerCodes = [...new Set(blockers)];
    record.updatedAt = new Date().toISOString();
    saveObservationRecord(record);
    return record;
  }

  record.state = "OBSERVATION_COMPLETED";
  record.completedAt = new Date().toISOString();
  record.report = buildObservationReport(record, durationMs);
  record.updatedAt = record.completedAt;
  saveObservationRecord(record);

  recordObservationAudit({
    type: "OBSERVATION_COMPLETED",
    observationId: record.observationId,
    supplierId: record.supplier,
    correlationId: record.correlationId,
    detail: { durationMs, orders: record.metrics.ordersAttempted },
  });

  emitObservationAnalytics({
    eventType: "observation_completed",
    observationId: record.observationId,
    supplierId: record.supplier,
    correlationId: record.correlationId,
  });

  return record;
}

export function requestObservationReview(input: {
  observationId: string;
  requester: string;
}): ObservationRecord {
  let record = getObservationRecord(input.observationId);
  if (!record) throw new Error("OBSERVATION_NOT_FOUND");

  if (record.state === "OBSERVATION_ACTIVE" || record.state === "PAUSED") {
    record = evaluateObservationCompletion(input.observationId);
  }

  if (record.state !== "OBSERVATION_COMPLETED") {
    recordObservationAudit({
      type: "OBSERVATION_REVIEW_BLOCKED",
      observationId: record.observationId,
      supplierId: record.supplier,
      correlationId: record.correlationId,
      actor: input.requester,
      detail: { blockers: record.blockerCodes },
    });
    return record;
  }

  const risk = evaluateObservationRisk(record);
  if (risk.blockers.length > 0) {
    record.state = "RISK_BLOCKED";
    record.blockerCodes = risk.blockers;
    record.updatedAt = new Date().toISOString();
    saveObservationRecord(record);
    return record;
  }

  record.state = "OBSERVATION_REVIEW_READY";
  record.updatedAt = new Date().toISOString();
  saveObservationRecord(record);

  recordObservationAudit({
    type: "OBSERVATION_REVIEW_REQUESTED",
    observationId: record.observationId,
    supplierId: record.supplier,
    correlationId: record.correlationId,
    actor: input.requester,
  });

  return record;
}

function buildObservationReport(record: ObservationRecord, durationMs: number): ObservationReport {
  return {
    durationMs,
    ordersObserved: record.metrics.ordersAttempted,
    successRate: computeSuccessRate(record.metrics),
    failureRate: computeFailureRate(record.metrics),
    unknownOutcomes: record.metrics.unknownOutcomes,
    supplierHealth: record.quality.supplierHealth,
    inventory: record.quality.inventoryQuality,
    pricing: record.quality.pricingQuality,
    financial: record.quality.financialQuality,
    fulfillment: record.quality.fulfillmentQuality,
    returns: record.quality.returnsQuality,
    customerImpact: record.quality.customerImpact,
    security: record.quality.security,
    criticalIncidents: record.metrics.criticalIncidents,
    generatedAt: new Date().toISOString(),
  };
}

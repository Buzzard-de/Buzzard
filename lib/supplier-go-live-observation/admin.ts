import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import { isControlledGoLiveActive } from "@/lib/supplier-controlled-go-live";
import { getLatestArmingForScope } from "@/lib/supplier-production-order-arming/persistence";
import { loadOfficialValidationEvidence } from "@/lib/supplier-production-order-arming/evidence";
import { getLatestFirstProductionOrderForScope } from "@/lib/supplier-first-production-order/persistence";
import { getObservationSafetyCounters } from "./safety";
import { listObservationAudit } from "./audit";
import {
  getLatestObservationForScope,
  getLatestBroaderRolloutForScope,
  getObservationRecord,
  listObservationRecords,
} from "./persistence";
import { getInterCarsSupplierId } from "./config";
import { formatRolloutLimits, formatRolloutScope } from "./scope";
import { computeSuccessRate, computeFailureRate } from "./metrics";
import type { ObservationDashboard } from "./types";

function mapQuality(level: string): "PASS" | "FAIL" | "UNVERIFIED" {
  if (level === "PASS") return "PASS";
  if (level === "FAIL" || level === "BLOCKED") return "FAIL";
  return "UNVERIFIED";
}

function mapOptionalQuality(level?: string): "PASS" | "FAIL" | "NOT_AVAILABLE" {
  if (!level || level === "NOT_AVAILABLE") return "NOT_AVAILABLE";
  if (level === "PASS") return "PASS";
  if (level === "FAIL" || level === "BLOCKED") return "FAIL";
  return "NOT_AVAILABLE";
}

export function getObservationDashboard(): ObservationDashboard {
  const supplierId = getInterCarsSupplierId();
  const latest = getLatestObservationForScope({ supplierId, market: "DE", channel: "DIRECT" });
  const rollout = getLatestBroaderRolloutForScope({ supplierId, market: "DE", channel: "DIRECT" });
  const arming = getLatestArmingForScope({
    supplierId,
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
  });
  const firstOrder = getLatestFirstProductionOrderForScope({ supplierId, market: "DE", channel: "DIRECT" });
  const { evidence } = loadOfficialValidationEvidence({
    supplierId,
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
  });

  const controlledActive = isControlledGoLiveActive({ supplierId, market: "DE", channel: "DIRECT" });

  let observationState: ObservationDashboard["observationState"] = "BLOCKED";
  if (latest?.state === "OBSERVATION_ACTIVE") observationState = "ACTIVE";
  else if (latest?.state === "OBSERVATION_COMPLETED" || latest?.state === "OBSERVATION_REVIEW_READY") {
    observationState = latest.state === "OBSERVATION_REVIEW_READY" ? "REVIEW_READY" : "COMPLETED";
  } else if (latest?.state === "OBSERVATION_FAILED") observationState = "FAILED";

  let broaderRollout: ObservationDashboard["broaderRollout"] = "BLOCKED";
  if (rollout?.state === "BROADER_ROLLOUT_ACTIVE") broaderRollout = "ACTIVE";
  else if (latest?.state === "OBSERVATION_REVIEW_READY" || latest?.state === "BROADER_ROLLOUT_APPROVED") {
    broaderRollout = "REVIEW_READY";
  }

  const metrics = latest?.metrics;
  const report = latest?.report;

  return {
    observationCount: listObservationRecords().length,
    observationState,
    broaderRollout,
    controlledGoLive: controlledActive ? "ACTIVE" : "BLOCKED",
    createOrderCapability: (evidence?.createOrderCapability as ObservationDashboard["createOrderCapability"]) || "UNVERIFIED",
    liveValidation: evidence ? "VALIDATED" : "NONE",
    armingState: arming?.status || "ARMING_BLOCKED",
    firstOrderState: firstOrder?.state || "BLOCKED",
    observationDurationMs: report?.durationMs ?? (latest?.startedAt ? Date.now() - Date.parse(latest.startedAt) : 0),
    observedOrders: metrics?.ordersAttempted ?? 0,
    successRate: report?.successRate ?? (metrics ? computeSuccessRate(metrics) : 0),
    failureRate: report?.failureRate ?? (metrics ? computeFailureRate(metrics) : 0),
    unknownOutcomes: metrics?.unknownOutcomes ?? 0,
    supplierHealth: mapQuality(latest?.quality.supplierHealth || "UNVERIFIED"),
    inventoryQuality: mapQuality(latest?.quality.inventoryQuality || "NOT_AVAILABLE"),
    pricingQuality: mapQuality(latest?.quality.pricingQuality || "NOT_AVAILABLE"),
    fulfillmentQuality: mapQuality(latest?.quality.fulfillmentQuality || "NOT_AVAILABLE"),
    financialQuality: mapQuality(latest?.quality.financialQuality || "NOT_AVAILABLE"),
    returns: mapOptionalQuality(latest?.quality.returnsQuality),
    customerImpact: mapOptionalQuality(latest?.quality.customerImpact),
    security: latest?.quality.security === "PASS" ? "PASS" : "FAIL",
    criticalIncidents: metrics?.criticalIncidents ?? 0,
    observationReview: latest?.state === "OBSERVATION_REVIEW_READY" ? "READY" : "BLOCKED",
    fourEyesApproval:
      latest?.approval?.status === "APPROVED" ? "APPROVED" : latest?.state === "OBSERVATION_REVIEW_READY" ? "PENDING" : "BLOCKED",
    rolloutScope: latest ? formatRolloutScope(latest.scope) : "none",
    rolloutLimits: latest ? formatRolloutLimits(latest.limits) : "none",
    productionNetwork: isSupplierOrderNetworkEnabled() ? "ON" : "OFF",
    realSupplierHttpCalls: getObservationSafetyCounters().realSupplierHttpCalls,
    realSupplierOrders: getObservationSafetyCounters().realSupplierOrders,
    realCustomerOrders: getObservationSafetyCounters().realCustomerOrders,
    marketplaceSideEffects: getObservationSafetyCounters().marketplaceSideEffects,
    paymentSideEffects: getObservationSafetyCounters().paymentSideEffects,
    carrierSideEffects: getObservationSafetyCounters().carrierSideEffects,
    customerNotifications: getObservationSafetyCounters().customerNotifications,
    blockers:
      latest?.blockerCodes ||
      (evidence ? (controlledActive ? [] : ["CONTROLLED_GO_LIVE_NOT_ACTIVE"]) : ["CREATE_ORDER_UNVERIFIED"]),
  };
}

export function getObservationDetail(observationId: string) {
  const record = getObservationRecord(observationId);
  if (!record) return null;
  return {
    record,
    audit: listObservationAudit({ observationId }).slice(-50),
    safety: getObservationSafetyCounters(),
  };
}

export function isBroaderRolloutActive(scope?: { supplierId: string; market: string; channel: string }): boolean {
  const supplierId = scope?.supplierId || getInterCarsSupplierId();
  const rollout = getLatestBroaderRolloutForScope({
    supplierId,
    market: scope?.market || "DE",
    channel: scope?.channel || "DIRECT",
  });
  return rollout?.state === "BROADER_ROLLOUT_ACTIVE" && Date.parse(rollout.expiresAt) > Date.now();
}

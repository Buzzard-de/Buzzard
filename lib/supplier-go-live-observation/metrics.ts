import { getControlledGoLiveRecord } from "@/lib/supplier-controlled-go-live/persistence";
import type { ObservationMetrics, ObservationRecord } from "./types";

export function createEmptyMetrics(): ObservationMetrics {
  return {
    ordersAttempted: 0,
    ordersAccepted: 0,
    ordersRejected: 0,
    unknownOutcomes: 0,
    duplicateAttempts: 0,
    idempotencyViolations: 0,
    supplierErrorRate: 0,
    supplierTimeoutRate: 0,
    inventoryMismatchCount: 0,
    priceMismatchCount: 0,
    fulfillmentMismatchCount: 0,
    trackingFailures: 0,
    financialReconciliationFailures: 0,
    returnIncidents: 0,
    customerImpactIncidents: 0,
    securityIncidents: 0,
    criticalIncidents: 0,
  };
}

export function collectObservationMetrics(record: ObservationRecord): ObservationMetrics {
  if (record.mockObservation && process.env.SUPPLIER_OBSERVATION_MOCK === "1") {
    return collectMockMetrics(record);
  }

  const goLive = getControlledGoLiveRecord(record.goLiveId);
  const base = { ...record.metrics };

  if (goLive?.firstOrderEvidence?.executionResult === "EXECUTED") {
    base.ordersAttempted = Math.max(base.ordersAttempted, 1);
    base.ordersAccepted = Math.max(base.ordersAccepted, 1);
  }

  if (base.ordersAttempted === 0) {
    return base;
  }

  base.supplierErrorRate = base.ordersRejected / Math.max(base.ordersAttempted, 1);
  return base;
}

function collectMockMetrics(record: ObservationRecord): ObservationMetrics {
  const configMin = record.config.minimumOrders;
  return {
    ordersAttempted: configMin,
    ordersAccepted: configMin,
    ordersRejected: 0,
    unknownOutcomes: 0,
    duplicateAttempts: 0,
    idempotencyViolations: 0,
    supplierErrorRate: 0,
    supplierTimeoutRate: 0,
    inventoryMismatchCount: 0,
    priceMismatchCount: 0,
    fulfillmentMismatchCount: 0,
    trackingFailures: 0,
    financialReconciliationFailures: 0,
    returnIncidents: 0,
    customerImpactIncidents: 0,
    securityIncidents: 0,
    criticalIncidents: 0,
    mockMetrics: true,
  };
}

export function computeSuccessRate(metrics: ObservationMetrics): number {
  if (metrics.ordersAttempted === 0) return 0;
  return metrics.ordersAccepted / metrics.ordersAttempted;
}

export function computeFailureRate(metrics: ObservationMetrics): number {
  if (metrics.ordersAttempted === 0) return 0;
  return metrics.ordersRejected / metrics.ordersAttempted;
}

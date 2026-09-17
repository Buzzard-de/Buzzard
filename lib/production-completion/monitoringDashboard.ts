import { getFinalGoLiveSafetyCounters } from "@/lib/final-production-go-live/safety";
import { getCreateOrderValidationSafetyCounters } from "@/lib/supplier-production-order-validation/safety";
import { listValidationRecords } from "@/lib/supplier-production-order-validation/persistence";
import type { HealthStatus, ProductionMonitoringSnapshot } from "./types";

export function buildProductionMonitoringSnapshot(): ProductionMonitoringSnapshot {
  const safety = getFinalGoLiveSafetyCounters();
  const validation342 = getCreateOrderValidationSafetyCounters();
  const validations = listValidationRecords();
  const unknownOutcomes = validations.filter((v) => String(v.overallStatus).includes("UNKNOWN")).length;

  const supplierFailures = validations.filter((v) => v.overallStatus === "FAILED").length;
  const criticalIncidents =
    (safety.realSupplierOrders > 0 && validation342.realSupplierOrderCalls === 0 ? 1 : 0) +
    (unknownOutcomes > 0 ? unknownOutcomes : 0);

  let healthStatus: HealthStatus = "HEALTHY";
  if (criticalIncidents > 0 || unknownOutcomes > 0) healthStatus = "CRITICAL";
  else if (supplierFailures > 0) healthStatus = "DEGRADED";
  else if (safety.realSupplierOrders > 0 || safety.realPayments > 0) healthStatus = "DEGRADED";

  return {
    healthStatus,
    orders: safety.realSupplierOrders,
    supplierOrders: safety.realSupplierOrders,
    supplierFailures,
    paymentFailures: 0,
    carrierFailures: 0,
    returns: safety.realRefunds,
    refunds: safety.realRefunds,
    inventoryAnomalies: 0,
    pricingAnomalies: 0,
    aiFailures: 0,
    marketingSpend: safety.realMarketingSpend,
    unknownOutcomes,
    criticalIncidents,
  };
}

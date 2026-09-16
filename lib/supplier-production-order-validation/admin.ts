import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import { getCreateOrderValidationSafetyCounters } from "./safety";
import { listCreateOrderValidationAudit } from "./audit";
import { getValidationRecord, listValidationRecords, getLatestValidationForScope } from "./persistence";
import { getInterCarsSupplierId } from "./config";
import type { CreateOrderValidationDashboard } from "./types";

export function getCreateOrderValidationDashboard(): CreateOrderValidationDashboard {
  const records = listValidationRecords();
  const latest = getLatestValidationForScope({
    supplierId: getInterCarsSupplierId(),
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
  });
  const timestamps = records.map((r) => Date.parse(r.updatedAt)).filter(Number.isFinite);

  return {
    validationCount: records.length,
    passed: records.filter((r) => r.overallStatus === "PASSED").length,
    blocked: records.filter((r) => r.overallStatus === "BLOCKED").length,
    failed: records.filter((r) => r.overallStatus === "FAILED").length,
    skipped: records.filter((r) => r.overallStatus === "SKIPPED").length,
    createOrderCapability: latest?.createOrderCapability || "UNVERIFIED",
    trackingCapability: latest?.trackingCapability || "UNVERIFIED",
    productionOrderNetwork: isSupplierOrderNetworkEnabled() ? "ON" : "OFF",
    realSupplierOrderCalls: getCreateOrderValidationSafetyCounters().realSupplierOrderCalls,
    realCustomerOrders: getCreateOrderValidationSafetyCounters().realCustomerOrders,
    lastValidationAt: timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : undefined,
    blockers: latest?.blockerCodes || ["REAL_ORDER_ENDPOINT_NOT_VALIDATED"],
    safety: getCreateOrderValidationSafetyCounters(),
  };
}

export function listCreateOrderValidationRows(filter?: {
  supplierId?: string;
  status?: string;
}) {
  return listValidationRecords().filter((row) => {
    if (filter?.supplierId && row.supplierId !== filter.supplierId) return false;
    if (filter?.status && row.overallStatus !== filter.status) return false;
    return true;
  });
}

export function getCreateOrderValidationDetail(validationId: string) {
  const validation = getValidationRecord(validationId);
  if (!validation) return null;
  return {
    validation,
    audit: listCreateOrderValidationAudit({ validationId }).slice(-50),
    safety: getCreateOrderValidationSafetyCounters(),
    capabilityState: validation.capabilityState,
  };
}

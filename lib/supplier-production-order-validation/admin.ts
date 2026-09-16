import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import { isScopedValidationNetworkEnabled } from "@/lib/supplier-engine/network/scopedValidationNetwork";
import { validateProductionCredentials } from "@/lib/supplier-production-validation/credentialValidation";
import { getCreateOrderValidationSafetyCounters } from "./safety";
import { listCreateOrderValidationAudit } from "./audit";
import {
  getValidationRecord,
  listValidationRecords,
  getLatestValidationForScope,
  getLatestControlledValidationRun,
  listControlledValidationRuns,
  getControlledValidationRun,
} from "./persistence";
import { getInterCarsSupplierId, isControlledValidationEnabled } from "./config";
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

  const latestControlled = getLatestControlledValidationRun({
    supplierId: getInterCarsSupplierId(),
    market: "DE",
  });
  const credential = validateProductionCredentials({
    supplierId: getInterCarsSupplierId(),
    environment: "PRODUCTION",
  });

  return {
    controlledValidationEnabled: isControlledValidationEnabled(),
    controlledValidationNetwork: isScopedValidationNetworkEnabled() ? "SCOPED" : "OFF",
    lastControlledValidation: latestControlled?.liveValidation,
    lastControlledValidationAt: latestControlled?.updatedAt,
    credentialsStatus:
      credential.status === "VALID" || credential.status === "CONFIGURED"
        ? "CONFIGURED"
        : credential.status === "NOT_CONFIGURED"
          ? "NOT_CONFIGURED"
          : "INVALID",
    apiAccessStatus:
      latestControlled?.liveValidation === "PASS"
        ? "AVAILABLE"
        : credential.status === "NOT_CONFIGURED"
          ? "NOT_AVAILABLE"
          : "UNKNOWN",
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
  const controlledRun = getControlledValidationRun(validationId);
  if (!validation && !controlledRun) return null;
  return {
    validation,
    controlledRun,
    audit: listCreateOrderValidationAudit({ validationId }).slice(-50),
    safety: getCreateOrderValidationSafetyCounters(),
    capabilityState: validation?.capabilityState || controlledRun?.capabilityState,
  };
}

export function listControlledValidationRows() {
  return listControlledValidationRuns();
}

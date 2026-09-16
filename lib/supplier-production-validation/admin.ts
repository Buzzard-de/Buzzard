import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import { isLiveReadEnabled } from "@/lib/supplier-engine/liveSupplier/config";
import { getProductionValidationSafetyCounters } from "./safety";
import { getValidationRecord, listValidationRecords } from "./persistence";
import { listValidationAudit } from "./audit";
import type { ProductionValidationDashboard } from "./types";

export function getProductionValidationDashboard(): ProductionValidationDashboard {
  const records = listValidationRecords();
  const timestamps = records.map((r) => Date.parse(r.updatedAt)).filter(Number.isFinite);
  return {
    validationCount: records.length,
    passed: records.filter((r) => r.overallStatus === "PASSED").length,
    failed: records.filter((r) => r.overallStatus === "FAILED").length,
    blocked: records.filter((r) => r.overallStatus === "BLOCKED").length,
    skipped: records.filter((r) => r.overallStatus === "SKIPPED").length,
    running: records.filter((r) => r.overallStatus === "RUNNING").length,
    suppliersValidated: new Set(records.map((r) => r.supplierId)).size,
    marketsValidated: new Set(records.map((r) => r.market)).size,
    channelsValidated: new Set(records.map((r) => r.channel)).size,
    lastValidationAt: timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : undefined,
    realSupplierOrderNetwork: isSupplierOrderNetworkEnabled() ? "ENABLED" : "DISABLED",
    liveReadMode: isLiveReadEnabled() ? "CONTROLLED" : "DISABLED",
    productionOrderActivation: "NOT ACTIVE",
    safety: getProductionValidationSafetyCounters(),
  };
}

export function listProductionValidationRows(filter?: {
  supplierId?: string;
  market?: string;
  channel?: string;
  status?: string;
}) {
  return listValidationRecords().filter((row) => {
    if (filter?.supplierId && row.supplierId !== filter.supplierId) return false;
    if (filter?.market && row.market !== filter.market) return false;
    if (filter?.channel && row.channel !== filter.channel) return false;
    if (filter?.status && row.overallStatus !== filter.status) return false;
    return true;
  });
}

export function getProductionValidationDetail(validationId: string) {
  const validation = getValidationRecord(validationId);
  if (!validation) return null;
  return {
    validation,
    audit: listValidationAudit({ validationId }).slice(-50),
    safety: getProductionValidationSafetyCounters(),
  };
}

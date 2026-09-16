import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import { getRehearsalRecord, listRehearsalRecords } from "./persistence";
import { getRehearsalSafetyCounters } from "./safety";
import { listRehearsalAudit } from "./audit";
import type { RehearsalDashboard } from "./types";

export function getSupplierOrderRehearsalDashboard(): RehearsalDashboard {
  const records = listRehearsalRecords();
  const durations = records.filter((r) => r.duration != null).map((r) => r.duration!);
  const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  return {
    rehearsalCount: records.length,
    passed: records.filter((r) => r.overallStatus === "PASSED").length,
    failed: records.filter((r) => r.overallStatus === "FAILED").length,
    blocked: records.filter((r) => r.overallStatus === "BLOCKED").length,
    running: records.filter((r) => r.overallStatus === "RUNNING").length,
    criticalFailures: records.filter((r) => r.overallStatus === "FAILED").length,
    suppliersTested: new Set(records.map((r) => r.supplierId)).size,
    marketsTested: new Set(records.map((r) => r.market)).size,
    channelsTested: new Set(records.map((r) => r.channel)).size,
    averageDurationMs: Math.round(avg),
    realSupplierOrderNetwork: isSupplierOrderNetworkEnabled() ? "ENABLED" : "DISABLED",
    rehearsalMode: records.some((r) => r.overallStatus === "RUNNING") ? "ACTIVE" : "COMPLETE",
    safety: getRehearsalSafetyCounters(),
  };
}

export function listSupplierOrderRehearsalRows(filter?: {
  supplierId?: string;
  market?: string;
  channel?: string;
  status?: string;
}) {
  return listRehearsalRecords().filter((row) => {
    if (filter?.supplierId && row.supplierId !== filter.supplierId) return false;
    if (filter?.market && row.market !== filter.market) return false;
    if (filter?.channel && row.channel !== filter.channel) return false;
    if (filter?.status && row.overallStatus !== filter.status) return false;
    return true;
  });
}

export function getSupplierOrderRehearsalDetail(rehearsalId: string) {
  const rehearsal = getRehearsalRecord(rehearsalId);
  if (!rehearsal) return null;
  return {
    rehearsal,
    audit: listRehearsalAudit({ rehearsalId }).slice(-50),
    safety: getRehearsalSafetyCounters(),
  };
}

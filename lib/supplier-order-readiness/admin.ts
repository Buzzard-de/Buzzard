import { listMarkets } from "@/lib/market-engine/registry";
import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import { READINESS_CHANNELS } from "./config";
import { listKnownSuppliersForReadiness } from "./checks";
import { evaluateSupplierOrderReadiness, buildReadinessId } from "./evaluator";
import { isGlobalKillSwitchActive } from "./killSwitch";
import { listApprovalRecords, listReadinessRecords, getReadinessRecord } from "./persistence";
import { buildDryRunActivationPreview } from "./preview";
import { resolveEffectiveApproval } from "./approval";
import { listReadinessAudit } from "./audit";
import type { ReadinessDashboard, ReadinessScope, SupplierOrderReadiness } from "./types";

export function getSupplierOrderReadinessDashboard(): ReadinessDashboard {
  const records = listReadinessRecords();
  const approvals = listApprovalRecords();
  return {
    suppliersReady: new Set(records.filter((r) => r.overallStatus === "READY").map((r) => r.supplierId)).size,
    suppliersBlocked: new Set(records.filter((r) => r.overallStatus === "BLOCKED").map((r) => r.supplierId)).size,
    marketsReady: new Set(records.filter((r) => r.overallStatus === "READY").map((r) => r.market)).size,
    channelsReady: new Set(records.filter((r) => r.overallStatus === "READY").map((r) => r.channel)).size,
    pendingApprovals: approvals.filter((a) => a.status === "PENDING").length,
    expiredApprovals: approvals.filter((a) => a.status === "EXPIRED").length,
    criticalBlockers: records.reduce((sum, r) => sum + r.blockers.length, 0),
    networkStatus: isSupplierOrderNetworkEnabled() ? "ENABLED" : "DISABLED",
    globalKillSwitch: isGlobalKillSwitchActive(),
    realSupplierOrderNetwork: isSupplierOrderNetworkEnabled() ? "ENABLED" : "DISABLED",
    currentEnvironment: process.env.NODE_ENV === "production" ? "PRODUCTION" : "SANDBOX",
  };
}

export function listSupplierOrderReadinessRows(filter?: {
  supplierId?: string;
  market?: string;
  channel?: string;
  status?: string;
}): SupplierOrderReadiness[] {
  return listReadinessRecords().filter((row) => {
    if (filter?.supplierId && row.supplierId !== filter.supplierId) return false;
    if (filter?.market && row.market !== filter.market) return false;
    if (filter?.channel && row.channel !== filter.channel) return false;
    if (filter?.status && row.overallStatus !== filter.status) return false;
    return true;
  });
}

export function getSupplierOrderReadinessDetail(readinessId: string) {
  const readiness = getReadinessRecord(readinessId);
  if (!readiness) return null;
  const scope: ReadinessScope = {
    supplierId: readiness.supplierId,
    market: readiness.market,
    channel: readiness.channel,
    environment: readiness.environment,
  };
  return {
    readiness,
    approval: resolveEffectiveApproval(scope),
    audit: listReadinessAudit({ supplierId: readiness.supplierId }).slice(-20),
    preview: buildDryRunActivationPreview(scope, readiness.correlationId),
  };
}

export function evaluateAllSupplierReadinessScopes(correlationId: string): SupplierOrderReadiness[] {
  const suppliers = listKnownSuppliersForReadiness();
  const markets = listMarkets().map((m) => m.countryCode);
  const results: SupplierOrderReadiness[] = [];
  for (const supplierId of suppliers.slice(0, 100)) {
    for (const market of markets) {
      for (const channel of READINESS_CHANNELS) {
        results.push(
          evaluateSupplierOrderReadiness({ supplierId, market, channel }, { correlationId, force: true })
        );
      }
    }
  }
  return results;
}

export { buildReadinessId };

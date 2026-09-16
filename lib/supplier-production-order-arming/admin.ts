import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import { loadOfficialValidationEvidence } from "./evidence";
import { isArmingKillSwitched } from "./killSwitch";
import { getArmingSafetyCounters } from "./safety";
import { listArmingAudit } from "./audit";
import { getArmingRecord, listArmingRecords, getLatestArmingForScope } from "./persistence";
import { getInterCarsSupplierId } from "./config";
import type { ProductionArmingDashboard } from "./types";

export function getProductionArmingDashboard(): ProductionArmingDashboard {
  const supplierId = getInterCarsSupplierId();
  const records = listArmingRecords();
  const latest = getLatestArmingForScope({
    supplierId,
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
  });
  const { evidence, blockers: evidenceBlockers } = loadOfficialValidationEvidence({
    supplierId,
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
  });

  const timestamps = records.map((r) => Date.parse(r.updatedAt)).filter(Number.isFinite);

  return {
    armingCount: records.length,
    armed: records.filter((r) => r.status === "ARMED").length,
    blocked: records.filter((r) => r.status === "ARMING_BLOCKED").length,
    ready: records.filter((r) => r.status === "ARMING_READY").length,
    expired: records.filter((r) => r.status === "EXPIRED").length,
    createOrderCapability: evidence?.createOrderCapability as ProductionArmingDashboard["createOrderCapability"] || "UNVERIFIED",
    validationEvidence: evidence ? "PRESENT" : "NONE",
    armingState: latest?.status || "ARMING_BLOCKED",
    productionReadiness: evidenceBlockers.length === 0 && evidence ? "PASS" : "BLOCKED",
    killSwitch: isArmingKillSwitched({ supplierId, market: "DE", channel: "DIRECT" }) ? "ON" : "OFF",
    productionOrderNetwork: isSupplierOrderNetworkEnabled() ? "ON" : "OFF",
    realSupplierOrderCalls: getArmingSafetyCounters().realSupplierOrderCalls,
    realCustomerOrders: getArmingSafetyCounters().realCustomerOrders,
    blockers: latest?.blockerCodes || evidenceBlockers || ["CREATE_ORDER_UNVERIFIED"],
    lastArmingAt: timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : undefined,
  };
}

export function getProductionArmingDetail(armingId: string) {
  const record = getArmingRecord(armingId);
  if (!record) return null;
  return {
    record,
    audit: listArmingAudit({ armingId }).slice(-50),
    safety: getArmingSafetyCounters(),
  };
}

export function listProductionArmingRows(filter?: { supplier?: string; status?: string }) {
  return listArmingRecords().filter((row) => {
    if (filter?.supplier && row.supplier !== filter.supplier) return false;
    if (filter?.status && row.status !== filter.status) return false;
    return true;
  });
}

import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import { getLatestArmingForScope } from "@/lib/supplier-production-order-arming/persistence";
import { loadOfficialValidationEvidence } from "./evidence";
import { isFirstOrderKillSwitched } from "./killSwitch";
import { getFirstOrderSafetyCounters } from "./safety";
import { listFirstOrderAudit } from "./audit";
import { getFirstProductionOrderRecord, listFirstProductionOrderRecords, getLatestFirstProductionOrderForScope } from "./persistence";
import { getInterCarsSupplierId } from "./config";
import type { FirstProductionOrderDashboard } from "./types";

export function getFirstProductionOrderDashboard(): FirstProductionOrderDashboard {
  const supplierId = getInterCarsSupplierId();
  const records = listFirstProductionOrderRecords();
  const latest = getLatestFirstProductionOrderForScope({ supplierId, market: "DE", channel: "DIRECT" });
  const arming = getLatestArmingForScope({
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

  return {
    executionCount: records.length,
    blocked: records.filter((r) => r.state === "BLOCKED").length,
    ready: records.filter((r) => r.state === "FIRST_ORDER_READY").length,
    authorized: records.filter((r) => r.state === "EXECUTION_AUTHORIZED").length,
    executed: records.filter((r) => r.state === "EXECUTED").length,
    unknownOutcomes: records.filter((r) => r.state === "UNKNOWN_OUTCOME").length,
    createOrderCapability: (evidence?.createOrderCapability as FirstProductionOrderDashboard["createOrderCapability"]) || "UNVERIFIED",
    validationEvidence: evidence ? "PRESENT" : "NONE",
    armingState: arming?.status || "ARMING_BLOCKED",
    firstOrderState: latest?.state || "BLOCKED",
    productionOrderNetwork: isSupplierOrderNetworkEnabled() ? "ON" : "OFF",
    realSupplierHttpCalls: getFirstOrderSafetyCounters().realSupplierHttpCalls,
    realSupplierOrders: getFirstOrderSafetyCounters().realSupplierOrders,
    realCustomerOrders: getFirstOrderSafetyCounters().realCustomerOrders,
    marketplaceSideEffects: getFirstOrderSafetyCounters().marketplaceSideEffects,
    paymentSideEffects: getFirstOrderSafetyCounters().paymentSideEffects,
    carrierSideEffects: getFirstOrderSafetyCounters().carrierSideEffects,
    customerNotifications: getFirstOrderSafetyCounters().customerNotifications,
    blockers: latest?.blockerCodes || evidenceBlockers || ["CREATE_ORDER_UNVERIFIED"],
  };
}

export function getFirstProductionOrderDetail(executionId: string) {
  const record = getFirstProductionOrderRecord(executionId);
  if (!record) return null;
  return {
    record,
    audit: listFirstOrderAudit({ executionId }).slice(-50),
    safety: getFirstOrderSafetyCounters(),
    killSwitch: isFirstOrderKillSwitched({
      supplierId: record.supplier,
      market: record.scope.market,
      channel: record.scope.channel,
    }),
  };
}

export function listFirstProductionOrderRows(filter?: { supplier?: string; state?: string }) {
  return listFirstProductionOrderRecords().filter((row) => {
    if (filter?.supplier && row.supplier !== filter.supplier) return false;
    if (filter?.state && row.state !== filter.state) return false;
    return true;
  });
}

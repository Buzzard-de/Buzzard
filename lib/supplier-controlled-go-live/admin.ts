import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import { getLatestArmingForScope } from "@/lib/supplier-production-order-arming/persistence";
import { loadOfficialValidationEvidence } from "@/lib/supplier-production-order-arming/evidence";
import { getLatestFirstProductionOrderForScope } from "@/lib/supplier-first-production-order/persistence";
import { getGoLiveSafetyCounters } from "./safety";
import { listGoLiveAudit } from "./audit";
import { getControlledGoLiveRecord, listControlledGoLiveRecords, getLatestControlledGoLiveForScope } from "./persistence";
import { getInterCarsSupplierId } from "./config";
import type { GoLiveDashboard } from "./types";

function levelFromChecks(checks: { check: string; level: string }[], name: string): string {
  const c = checks.find((x) => x.check === name);
  return c?.level || "NOT_AVAILABLE";
}

export function getControlledGoLiveDashboard(): GoLiveDashboard {
  const supplierId = getInterCarsSupplierId();
  const records = listControlledGoLiveRecords();
  const latest = getLatestControlledGoLiveForScope({ supplierId, market: "DE", channel: "DIRECT" });
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

  const checks = latest?.checks || [];
  const controlledGoLive: GoLiveDashboard["controlledGoLive"] =
    latest?.state === "CONTROLLED_GO_LIVE"
      ? "ACTIVE"
      : latest?.state === "GO_LIVE_REVIEW_READY" || latest?.state === "HUMAN_APPROVAL"
        ? "REVIEW_READY"
        : "BLOCKED";

  return {
    goLiveCount: records.length,
    blocked: records.filter((r) => r.state === "BLOCKED").length,
    reviewReady: records.filter((r) => ["GO_LIVE_REVIEW_READY", "HUMAN_APPROVAL"].includes(r.state)).length,
    active: records.filter((r) => r.state === "CONTROLLED_GO_LIVE").length,
    rolledBack: records.filter((r) => r.state === "ROLLED_BACK").length,
    createOrderCapability: (evidence?.createOrderCapability as GoLiveDashboard["createOrderCapability"]) || "UNVERIFIED",
    liveValidation: evidence ? "VALIDATED" : "NONE",
    armingState: arming?.status || "ARMING_BLOCKED",
    firstOrderState: firstOrder?.state || "BLOCKED",
    firstOrderOutcome:
      firstOrder?.state === "EXECUTED"
        ? "VALIDATED"
        : firstOrder?.state === "UNKNOWN_OUTCOME"
          ? "UNKNOWN"
          : firstOrder?.state === "EXECUTION_FAILED"
            ? "FAILED"
            : "NOT_AVAILABLE",
    supplierConfirmation:
      levelFromChecks(checks, "SUPPLIER_CONFIRMATION") === "PASS"
        ? "VALIDATED"
        : levelFromChecks(checks, "SUPPLIER_CONFIRMATION") === "UNVERIFIED"
          ? "UNVERIFIED"
          : "NONE",
    tracking:
      levelFromChecks(checks, "TRACKING") === "PASS"
        ? "VALIDATED"
        : levelFromChecks(checks, "TRACKING") === "UNVERIFIED"
          ? "UNVERIFIED"
          : "NONE",
    fctReconciliation: mapReconciliation(levelFromChecks(checks, "FCT_ORDER")),
    inventoryReconciliation: mapReconciliation(levelFromChecks(checks, "INVENTORY")),
    pricingReconciliation: mapReconciliation(levelFromChecks(checks, "PRICING")),
    financialReconciliation: mapReconciliation(levelFromChecks(checks, "FINANCIAL")),
    security: levelFromChecks(checks, "SECURITY") === "PASS" ? "PASS" : "FAIL",
    risk: levelFromChecks(checks, "RISK") === "PASS" ? "PASS" : "FAIL",
    fourEyesApproval:
      latest?.approval?.status === "APPROVED" ? "APPROVED" : latest?.state === "GO_LIVE_REVIEW_READY" ? "PENDING" : "BLOCKED",
    controlledGoLive,
    productionNetwork: isSupplierOrderNetworkEnabled() ? "ON" : "OFF",
    realSupplierHttpCalls: getGoLiveSafetyCounters().realSupplierHttpCalls,
    realSupplierOrders: getGoLiveSafetyCounters().realSupplierOrders,
    realCustomerOrders: getGoLiveSafetyCounters().realCustomerOrders,
    marketplaceSideEffects: getGoLiveSafetyCounters().marketplaceSideEffects,
    paymentSideEffects: getGoLiveSafetyCounters().paymentSideEffects,
    carrierSideEffects: getGoLiveSafetyCounters().carrierSideEffects,
    customerNotifications: getGoLiveSafetyCounters().customerNotifications,
    blockers: latest?.blockerCodes || (evidence ? [] : ["CREATE_ORDER_UNVERIFIED"]),
  };
}

function mapReconciliation(level: string): "PASS" | "FAIL" | "NOT_AVAILABLE" {
  if (level === "PASS") return "PASS";
  if (level === "FAIL" || level === "BLOCKED") return "FAIL";
  return "NOT_AVAILABLE";
}

export function getControlledGoLiveDetail(goLiveId: string) {
  const record = getControlledGoLiveRecord(goLiveId);
  if (!record) return null;
  return {
    record,
    audit: listGoLiveAudit({ goLiveId }).slice(-50),
    safety: getGoLiveSafetyCounters(),
  };
}

export function listControlledGoLiveRows(filter?: { supplier?: string; state?: string }) {
  return listControlledGoLiveRecords().filter((row) => {
    if (filter?.supplier && row.supplier !== filter.supplier) return false;
    if (filter?.state && row.state !== filter.state) return false;
    return true;
  });
}

export function isControlledGoLiveActive(scope?: { supplierId: string; market: string; channel: string }): boolean {
  const supplierId = scope?.supplierId || getInterCarsSupplierId();
  const latest = getLatestControlledGoLiveForScope({
    supplierId,
    market: scope?.market || "DE",
    channel: scope?.channel || "DIRECT",
  });
  return latest?.state === "CONTROLLED_GO_LIVE" && Date.parse(latest.expiresAt) > Date.now();
}

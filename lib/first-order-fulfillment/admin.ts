import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import { getLatestFirstProductionOrderForScope } from "@/lib/supplier-first-production-order/persistence";
import { loadOfficialValidationEvidence } from "@/lib/supplier-production-order-arming/evidence";
import { FULFILLMENT_PIPELINE_VERSION } from "./config";
import { listFulfillmentPipelineRecords } from "./persistence";
import { resolveFulfillmentLiveStatus, resolveFulfillmentPipelineState } from "./pipeline";
import { getFulfillmentSafetyCounters, assertFulfillmentSafetyInvariants } from "./safety";
import type { FulfillmentPipelineDashboard } from "./types";

export function getFulfillmentPipelineDashboard(supplierId = "SUP-INTER-CARS-001"): FulfillmentPipelineDashboard {
  const { evidence } = loadOfficialValidationEvidence({
    supplierId,
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
  });
  const firstOrder = getLatestFirstProductionOrderForScope({
    supplierId,
    market: "DE",
    channel: "DIRECT",
  });
  const safety = assertFulfillmentSafetyInvariants();

  return {
    version: FULFILLMENT_PIPELINE_VERSION,
    pipelineState: resolveFulfillmentPipelineState(),
    liveStatus: resolveFulfillmentLiveStatus(),
    productionEnabled: "DISABLED",
    upstreamFirstOrderGate: firstOrder?.state || "BLOCKED",
    supplierOrderNetwork: isSupplierOrderNetworkEnabled() ? "ON" : "OFF",
    createOrderCapability: evidence?.createOrderCapability === "VALIDATED" ? "VALIDATED" : "UNVERIFIED",
    safetyCounters: {
      ...getFulfillmentSafetyCounters(),
      realHttpCalls: getFulfillmentSafetyCounters().realSupplierHttpCalls,
    },
    blockers: safety.ok ? [] : safety.violations,
  };
}

export function listFulfillmentPipelineRows() {
  return listFulfillmentPipelineRecords().map((r) => ({
    pipelineId: r.pipelineId,
    orderId: r.orderId,
    state: r.state,
    currentStage: r.currentStage,
    dryRun: r.dryRun,
    unknownOutcome: r.unknownOutcome,
    updatedAt: r.updatedAt,
  }));
}

import { getProductionFlagsSnapshot } from "@/lib/production-defaults";
import { evaluateInterCarsProductionAccess } from "@/lib/supplier-inter-cars-production-access/diagnostic";
import { getFulfillmentPipelineDashboard } from "@/lib/first-order-fulfillment/admin";
import { getTrackingFulfillmentDashboard } from "@/lib/tracking-fulfillment/admin";
import { getPaymentProductionDashboard } from "@/lib/payment-production/admin";
import { getCarrierProductionDashboard } from "@/lib/carrier-production/admin";
import { getAiProductionDashboard } from "@/lib/ai-production/admin";
import { getReturnsRefundsProductionDashboard } from "@/lib/returns-refunds-production/admin";
import { evaluateFinalProductionGate } from "./finalGate";
import { getFinalGoLiveSafetyCounters } from "./safety";
import { buildGoLiveChecklist } from "./goLiveChecklist";

export interface WorkstreamStatusRow {
  workstream: string;
  implementation: "PASS" | "FAIL";
  sandbox: "PASS" | "NOT_AVAILABLE";
  live: "VALIDATED" | "BLOCKED" | "NOT_CONFIGURED" | "NOT_AVAILABLE" | "UNVERIFIED";
  production: "ENABLED" | "DISABLED" | "BLOCKED";
}

export function buildFinalProductionStatusReport() {
  const gate = evaluateFinalProductionGate();
  const flags = getProductionFlagsSnapshot();
  const interCars = evaluateInterCarsProductionAccess();
  const counters = getFinalGoLiveSafetyCounters();
  const checklist = buildGoLiveChecklist();

  const workstreams: WorkstreamStatusRow[] = [
    {
      workstream: "#347",
      implementation: "PASS",
      sandbox: "PASS",
      live: interCars.controlledLiveValidation === "READY" ? "UNVERIFIED" : "BLOCKED",
      production: "DISABLED",
    },
    {
      workstream: "#348",
      implementation: "PASS",
      sandbox: "PASS",
      live: getFulfillmentPipelineDashboard().liveStatus,
      production: "DISABLED",
    },
    {
      workstream: "#349",
      implementation: "PASS",
      sandbox: "PASS",
      live: getTrackingFulfillmentDashboard().liveStatus,
      production: "DISABLED",
    },
    {
      workstream: "#350",
      implementation: "PASS",
      sandbox: "PASS",
      live: getPaymentProductionDashboard().liveStatus,
      production: getPaymentProductionDashboard().productionEnabled,
    },
    {
      workstream: "#351",
      implementation: "PASS",
      sandbox: "PASS",
      live: getCarrierProductionDashboard().liveStatus,
      production: getCarrierProductionDashboard().productionEnabled,
    },
    {
      workstream: "#352",
      implementation: "PASS",
      sandbox: "PASS",
      live: getAiProductionDashboard().liveStatus,
      production: getAiProductionDashboard().productionEnabled,
    },
    {
      workstream: "#353",
      implementation: "PASS",
      sandbox: "PASS",
      live: getReturnsRefundsProductionDashboard().liveStatus,
      production: getReturnsRefundsProductionDashboard().productionEnabled,
    },
    {
      workstream: "#354",
      implementation: "PASS",
      sandbox: "PASS",
      live: gate.liveStatus,
      production: "DISABLED",
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    workstreams,
    live: {
      interCars: interCars.productionCredentials === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : "UNVERIFIED",
      payment: getPaymentProductionDashboard().liveStatus,
      carrier: getCarrierProductionDashboard().liveStatus,
      tracking: getTrackingFulfillmentDashboard().liveStatus,
      ai: getAiProductionDashboard().liveStatus,
      returns: getReturnsRefundsProductionDashboard().liveStatus,
      marketing: "NOT_CONFIGURED",
    },
    realSideEffects: counters,
    flags: {
      supplierNetwork: flags.SUPPLIER_NETWORK,
      supplierOrders: flags.SUPPLIER_ORDER_NETWORK,
      payment: flags.PAYMENT_PRODUCTION,
      carrier: flags.CARRIER_PRODUCTION,
      returns: flags.RETURNS_PRODUCTION,
      ai: flags.AI_PRODUCTION,
      marketing: flags.MARKETING_SPEND,
      sales: flags.SALES,
    },
    blockers: gate.blockers,
    finalPhase: gate.phase,
    sales: gate.salesEnabled,
    goLiveGate: gate.liveStatus,
    mandatoryChecklist: checklist,
    gate,
  };
}

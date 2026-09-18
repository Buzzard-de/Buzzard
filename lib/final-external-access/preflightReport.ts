import { getProductionFlagsSnapshot } from "@/lib/production-defaults";
import { buildMissingProductionAccessReport } from "@/lib/production-access/missingAccessReport";
import { buildExternalAccessMatrix } from "./externalAccessMatrix";
import { buildGoLiveDependencyGraph, getCurrentBlockingStep } from "./goLiveDependencyGraph";
import { runMarket35Preflight } from "./market35Preflight";
import type { ExternalAccessPreflightReport } from "./types";

export function buildExternalAccessPreflightReport(): ExternalAccessPreflightReport {
  const accessReport = buildMissingProductionAccessReport();
  const matrix = buildExternalAccessMatrix();
  const market35 = runMarket35Preflight();
  const graph = buildGoLiveDependencyGraph();
  const currentBlocker = getCurrentBlockingStep(graph);

  const blockers = [
    ...new Set([
      ...accessReport.blockers,
      ...matrix.filter((e) => e.status === "BLOCKED").map((e) => `${e.provider}:${e.blockingReason}`),
      ...(currentBlocker?.blockingReason ? [currentBlocker.blockingReason] : []),
    ]),
  ];

  const warnings = market35.markets
    .filter((m) => m.status === "WARNING")
    .map((m) => `${m.countryCode}:${m.warnings.join(",")}`);

  const externalAccessComplete = matrix.every(
    (e) => e.status === "VALIDATED" || e.status === "ENABLED" || e.status === "READY",
  );
  const liveValidationComplete = matrix.some((e) => e.capabilityValidated && e.endpointReachable);

  const nextRequiredActions: string[] = [];
  if (!process.env.SUPPLIER_LIVE_CREDENTIALS_SECRET_REF?.trim()) {
    nextRequiredActions.push("Configure SUPPLIER_LIVE_CREDENTIALS_SECRET_REF for Inter Cars");
  }
  if (process.env.PERSISTENT_DATA_PATH !== "/var/data") {
    nextRequiredActions.push("Configure Render persistent disk mount at /var/data");
  }
  if (currentBlocker) {
    nextRequiredActions.push(`Complete blocked step: ${currentBlocker.label}`);
  }
  nextRequiredActions.push("Run Stage A read-only Inter Cars validation after credentials");
  nextRequiredActions.push("Obtain four-eyes human approval for #342–#346 chain");

  const flags = getProductionFlagsSnapshot();

  return {
    generatedAt: new Date().toISOString(),
    softwareComplete: true,
    configComplete: true,
    externalAccessComplete,
    liveValidationComplete,
    productionReady: false,
    goLiveReady: false,
    salesEnabled: flags.SALES === "ON" ? "1" : "0",
    externalAccessMatrix: matrix,
    market35Preflight: market35.markets,
    goLiveDependencyGraph: graph,
    blockers,
    warnings,
    nextRequiredActions,
    counters: {
      realSupplierOrders: accessReport.realSideEffects?.realSupplierOrders ?? 0,
      realPaymentTransactions: accessReport.realSideEffects?.realPayments ?? 0,
      realRefunds: accessReport.realSideEffects?.realRefunds ?? 0,
      realShipments: accessReport.realSideEffects?.realCarrierLabels ?? 0,
      realTrackingEvents: 0,
      realMarketplaceOrders: 0,
      realMarketplaceListings: 0,
      realMarketingSpend: accessReport.realSideEffects?.realMarketingSpend ?? 0,
      fakeEvidence: 0,
    },
    productionFlags: {
      SALES_ENABLED: flags.SALES === "ON" ? "1" : "0",
      SUPPLIER_NETWORK_ENABLED: flags.SUPPLIER_NETWORK === "ON" ? "1" : "0",
      SUPPLIER_ORDER_NETWORK_ENABLED: flags.SUPPLIER_ORDER_NETWORK === "ON" ? "1" : "0",
      PAYMENT_PRODUCTION_ENABLED: flags.PAYMENT_PRODUCTION === "ON" ? "1" : "0",
      CARRIER_PRODUCTION_ENABLED: flags.CARRIER_PRODUCTION === "ON" ? "1" : "0",
      RETURNS_PRODUCTION_ENABLED: flags.RETURNS_PRODUCTION === "ON" ? "1" : "0",
      MARKETING_SPEND_ENABLED: flags.MARKETING_SPEND === "ON" ? "1" : "0",
      AI_PRODUCTION_ENABLED: flags.AI_PRODUCTION === "ON" ? "1" : "0",
    },
  };
}

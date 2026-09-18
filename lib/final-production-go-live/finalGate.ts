import { getProductionFlagsSnapshot } from "@/lib/production-defaults";
import { getFulfillmentPipelineDashboard } from "@/lib/first-order-fulfillment/admin";
import { getTrackingFulfillmentDashboard } from "@/lib/tracking-fulfillment/admin";
import { getPaymentProductionDashboard } from "@/lib/payment-production/admin";
import { getCarrierProductionDashboard } from "@/lib/carrier-production/admin";
import { getAiProductionDashboard } from "@/lib/ai-production/admin";
import { getReturnsRefundsProductionDashboard } from "@/lib/returns-refunds-production/admin";
import { evaluateInterCarsProductionAccess } from "@/lib/supplier-inter-cars-production-access/diagnostic";
import { getProductionAccessDashboard } from "@/lib/supplier-inter-cars-production-access/admin";
import { isProductionKillSwitchActive, getProductionKillSwitchDashboard } from "@/lib/production-kill-switch";
import { evaluateSecurityGate } from "@/lib/production-completion/securityGate";
import { evaluateBackupGate } from "@/lib/production-completion/backupGate";
import { buildProductionMonitoringSnapshot } from "@/lib/production-completion/monitoringDashboard";
import { isSalesEnabled, isMarketingSpendEnabled } from "./config";
import { evaluateMarketingProviders } from "./marketingRegistry";
import { assertFinalGoLiveSafetyInvariants, getFinalGoLiveSafetyCounters } from "./safety";
import { buildGoLiveChecklist } from "./goLiveChecklist";
import type { FinalGateCheck, FinalProductionGoLiveDashboard, GoLivePhase } from "./types";

function check(domain: string, name: string, status: FinalGateCheck["status"], message: string): FinalGateCheck {
  return { domain, check: name, status, message };
}

export function evaluateFinalProductionGate(): FinalProductionGoLiveDashboard {
  const flags = getProductionFlagsSnapshot();
  const interCars = evaluateInterCarsProductionAccess();
  const fulfillment = getFulfillmentPipelineDashboard();
  const tracking = getTrackingFulfillmentDashboard();
  const payment = getPaymentProductionDashboard();
  const carrier = getCarrierProductionDashboard();
  const ai = getAiProductionDashboard();
  const returns = getReturnsRefundsProductionDashboard();
  const marketing = evaluateMarketingProviders();
  const safety = assertFinalGoLiveSafetyInvariants();
  const accessDash = getProductionAccessDashboard();
  const killSwitch = getProductionKillSwitchDashboard();
  const securityGate = evaluateSecurityGate();
  const backupGate = evaluateBackupGate();
  const monitoring = buildProductionMonitoringSnapshot();

  const checks: FinalGateCheck[] = [
    check("WEBSITE", "production_build", "UNVERIFIED", "Requires deployment verification"),
    check("INTERNATIONAL", "35_markets", "UNVERIFIED", "Market engine configured"),
    check("SUPPLIER", "inter_cars_profile", interCars.interCarsProfile === "CONFIGURED" ? "PASS" : "NOT_CONFIGURED", interCars.interCarsProfile),
    check("SUPPLIER", "credentials", interCars.productionCredentials === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : "UNVERIFIED", interCars.productionCredentials),
    check("SUPPLIER", "create_order", interCars.createOrderCapability === "VALIDATED" ? "PASS" : "UNVERIFIED", interCars.createOrderCapability),
    check("ORDER", "fulfillment_pipeline", fulfillment.pipelineState === "BLOCKED" ? "BLOCKED" : "UNVERIFIED", fulfillment.pipelineState),
    check("TRACKING", "tracking_live", tracking.liveStatus, tracking.liveStatus),
    check("PAYMENT", "payment_production", payment.productionEnabled === "DISABLED" ? "PASS" : "BLOCKED", payment.productionEnabled),
    check("CARRIER", "carrier_production", carrier.productionEnabled === "DISABLED" ? "PASS" : "BLOCKED", carrier.productionEnabled),
    check("RETURNS", "returns_production", returns.productionEnabled === "DISABLED" ? "PASS" : "BLOCKED", returns.productionEnabled),
    check("AI", "ai_production", ai.productionEnabled === "DISABLED" ? "PASS" : "BLOCKED", ai.productionEnabled),
    check("AI", "ai_authority", "PASS", ai.defaultAuthority),
    check("SECURITY", "network_off", flags.SUPPLIER_ORDER_NETWORK === "OFF" ? "PASS" : "BLOCKED", flags.SUPPLIER_ORDER_NETWORK),
    check("SECURITY", "sales_closed", !isSalesEnabled() ? "PASS" : "BLOCKED", isSalesEnabled() ? "ON" : "OFF"),
    check("MARKETING", "spend_disabled", !isMarketingSpendEnabled() ? "PASS" : "BLOCKED", isMarketingSpendEnabled() ? "ON" : "OFF"),
    check(
      "OPERATIONS",
      "kill_switch",
      killSwitch.global || isProductionKillSwitchActive() ? "BLOCKED" : "PASS",
      killSwitch.global ? "GLOBAL_KILL_SWITCH_ACTIVE" : "Kill switch available",
    ),
    check("ARMING", "343_state", accessDash.armingState === "ARMED" ? "PASS" : "UNVERIFIED", accessDash.armingState),
    check("FIRST_ORDER", "344_state", accessDash.firstOrderState === "EXECUTED" ? "PASS" : "UNVERIFIED", accessDash.firstOrderState),
    check("GO_LIVE", "345_state", accessDash.controlledGoLive === "ACTIVE" ? "PASS" : "UNVERIFIED", accessDash.controlledGoLive),
    check("OBSERVATION", "346_state", String(accessDash.observationState).includes("COMPLETED") ? "PASS" : "UNVERIFIED", String(accessDash.observationState)),
    check("SECURITY", "final_gate", securityGate.status === "PASS" ? "PASS" : securityGate.status === "BLOCKED" ? "BLOCKED" : "UNVERIFIED", securityGate.message),
    check("MONITORING", "health", monitoring.healthStatus === "HEALTHY" ? "PASS" : monitoring.healthStatus === "CRITICAL" ? "BLOCKED" : "UNVERIFIED", monitoring.healthStatus),
    check("BACKUP", "database_backup", backupGate.status === "PASS" ? "PASS" : backupGate.status === "BLOCKED" ? "BLOCKED" : "UNVERIFIED", backupGate.message),
  ];

  const blockers = [
    ...checks.filter((c) => c.status === "BLOCKED" || c.status === "NOT_CONFIGURED").map((c) => `${c.domain}:${c.check}`),
    ...safety.violations,
  ];

  const phase = resolveGoLivePhase(checks, blockers);

  const mandatoryChecklist = buildGoLiveChecklist();
  const checklistBlockers = mandatoryChecklist
    .filter((item) => item.status !== "PASS")
    .map((item) => `CHECKLIST:${item.id}`);

  return {
    version: "354.1.0",
    phase,
    salesEnabled: isSalesEnabled() ? "OPEN" : "CLOSED",
    marketingSpendEnabled: isMarketingSpendEnabled() ? "ON" : "OFF",
    liveStatus: "BLOCKED",
    checks,
    mandatoryChecklist,
    marketingProviders: marketing,
    safetyCounters: getFinalGoLiveSafetyCounters(),
    blockers: [...new Set([...blockers, ...checklistBlockers])],
  };
}

function resolveGoLivePhase(checks: FinalGateCheck[], blockers: string[]): GoLivePhase {
  if (blockers.length > 0) return "NOT_READY";
  const allPass = checks.every((c) => c.status === "PASS");
  if (allPass) return "READY";
  return "NOT_READY";
}

export function getFinalProductionGoLiveDashboard(): FinalProductionGoLiveDashboard {
  return evaluateFinalProductionGate();
}

import { isProductionFlagEnabled } from "@/lib/production-defaults";
import { isProductionKillSwitchActive } from "@/lib/production-kill-switch";
import { getProductionAccessDashboard } from "@/lib/supplier-inter-cars-production-access/admin";
import { evaluateInterCarsProductionAccess } from "@/lib/supplier-inter-cars-production-access/diagnostic";
import { evaluateFinalSalesEnablement } from "./salesEnablement";
import { getCriticalBlockers, buildFinalBlockerRegistry } from "./blockerRegistry";
import { evaluateInterCarsFlow } from "./interCarsFlow";
import type { FinalClosureState } from "./types";

export function resolveFinalClosureState(): FinalClosureState {
  if (isProductionKillSwitchActive()) {
    return "EMERGENCY_STOP";
  }

  const sales = evaluateFinalSalesEnablement();
  if (sales.salesEnabled === "OPEN" && sales.allowed) {
    return "SALES_ENABLED";
  }

  const blockers = getCriticalBlockers(buildFinalBlockerRegistry());
  if (blockers.length > 0 && !isProductionFlagEnabled("SALES")) {
    const dash = getProductionAccessDashboard();
    const interCars = evaluateInterCarsProductionAccess();

    if (String(dash.observationState).includes("COMPLETED")) {
      return "READY_FOR_SALES";
    }
    if (dash.controlledGoLive === "ACTIVE" || String(dash.observationState).includes("ACTIVE")) {
      return "OBSERVATION";
    }
    if (dash.controlledGoLive === "ACTIVE") {
      return "CONTROLLED_GO_LIVE";
    }

    const flow = evaluateInterCarsFlow();
    const stageBPass = flow.find((s) => s.stage === "B")?.status === "PASS";
    const stageAPass = flow.find((s) => s.stage === "A")?.status === "PASS";

    if (stageBPass && interCars.createOrderCapability === "VALIDATED") {
      return "READY_FOR_CONTROLLED_GO_LIVE";
    }
    if (stageAPass) {
      return "NOT_READY";
    }

    return "BLOCKED";
  }

  if (blockers.length === 0) {
    return "READY_FOR_SALES";
  }

  return "BLOCKED";
}

import { evaluateInterCarsProductionAccess } from "@/lib/supplier-inter-cars-production-access/diagnostic";
import { getProductionAccessDashboard } from "@/lib/supplier-inter-cars-production-access/admin";
import { hasProductionEvidence } from "@/lib/production-access/evidenceStore";
import type { ClosureSectionStatus, InterCarsFlowStage } from "./types";

function stageStatus(pass: boolean, configured?: boolean): ClosureSectionStatus {
  if (pass) return "PASS";
  if (configured) return "UNVERIFIED";
  return "BLOCKED";
}

export function evaluateInterCarsFlow(): InterCarsFlowStage[] {
  const diag = evaluateInterCarsProductionAccess();
  const dash = getProductionAccessDashboard();
  const readValidated =
    diag.readOnlyLiveValidation === "VALIDATED" ||
    ["health", "catalog", "stock", "price"].every((c) => hasProductionEvidence("inter-cars", c));

  return [
    {
      stage: "A",
      name: "Read-only validation (health/catalog/stock/price)",
      status: stageStatus(readValidated, diag.productionCredentials !== "NOT_CONFIGURED"),
      blockers: readValidated ? [] : ["INTER_CARS_READ_VALIDATION"],
    },
    {
      stage: "B",
      name: "Controlled CreateOrder (#342)",
      status: stageStatus(diag.createOrderCapability === "VALIDATED", readValidated),
      blockers: diag.createOrderCapability === "VALIDATED" ? [] : ["CREATE_ORDER_VALIDATION"],
    },
    {
      stage: "C",
      name: "Production order arming (#343)",
      status: stageStatus(dash.armingState === "ARMED", diag.createOrderCapability === "VALIDATED"),
      blockers: dash.armingState === "ARMED" ? [] : ["ARMING_NOT_COMPLETE"],
    },
    {
      stage: "D",
      name: "First production order (#344)",
      status: stageStatus(dash.firstOrderState === "EXECUTED", dash.armingState === "ARMED"),
      blockers: dash.firstOrderState === "EXECUTED" ? [] : ["FIRST_PRODUCTION_ORDER"],
    },
    {
      stage: "E",
      name: "Controlled go-live (#345)",
      status: stageStatus(dash.controlledGoLive === "ACTIVE", dash.firstOrderState === "EXECUTED"),
      blockers: dash.controlledGoLive === "ACTIVE" ? [] : ["CONTROLLED_GO_LIVE_NOT_ACTIVE"],
    },
    {
      stage: "F",
      name: "Observation period (#346)",
      status: stageStatus(
        String(dash.observationState).includes("COMPLETED"),
        dash.controlledGoLive === "ACTIVE",
      ),
      blockers: String(dash.observationState).includes("COMPLETED") ? [] : ["OBSERVATION"],
    },
  ];
}

export function canAdvanceInterCarsFlow(currentStage: InterCarsFlowStage["stage"]): boolean {
  const flow = evaluateInterCarsFlow();
  const idx = flow.findIndex((s) => s.stage === currentStage);
  if (idx < 0) return false;
  return flow[idx].status === "PASS";
}

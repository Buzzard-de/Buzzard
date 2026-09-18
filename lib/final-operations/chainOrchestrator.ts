import { evaluateInterCarsFlow, canAdvanceInterCarsFlow } from "@/lib/final-closure/interCarsFlow";
import { getProductionAccessDashboard } from "@/lib/supplier-inter-cars-production-access/admin";
import { evaluateInterCarsProductionAccess } from "@/lib/supplier-inter-cars-production-access/diagnostic";
import { loadOfficialValidationEvidence } from "@/lib/supplier-production-order-arming/evidence";
import { getInterCarsSupplierId } from "@/lib/supplier-inter-cars-production-access/config";
import { isProductionKillSwitchActive } from "@/lib/production-kill-switch";
import type { OperationsChainStep, OpsSectionStatus } from "./types";
import { getInterCarsCredentialMeta } from "./credentialDetection";

function mapStatus(s: string): OpsSectionStatus {
  if (s === "PASS" || s === "VALIDATED" || s === "EXECUTED" || s === "COMPLETED" || s === "ARMED" || s === "ACTIVE") {
    return "PASS";
  }
  if (s === "NOT_CONFIGURED" || s === "MISSING") return "NOT_CONFIGURED";
  if (s === "BLOCKED" || s === "FAILED") return "BLOCKED";
  return "UNVERIFIED";
}

export function buildOperationsChain(): OperationsChainStep[] {
  const flow = evaluateInterCarsFlow();
  const dash = getProductionAccessDashboard();
  const diag = evaluateInterCarsProductionAccess();
  const cred = getInterCarsCredentialMeta();
  const killSwitch = isProductionKillSwitchActive();

  const { blockers: evidenceBlockers } = loadOfficialValidationEvidence({
    supplierId: getInterCarsSupplierId(),
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
  });

  const steps: OperationsChainStep[] = [
    {
      id: "ACCESS",
      label: "Credential access",
      status: cred === "MISSING" ? "NOT_CONFIGURED" : cred === "INVALID" ? "BLOCKED" : "UNVERIFIED",
      blockers: cred === "MISSING" ? ["INTER_CARS_CREDENTIAL"] : [],
      canAdvance: cred !== "MISSING" && cred !== "INVALID",
    },
    {
      id: "INTER_CARS_READ",
      label: "Stage A: health/catalog/stock/price",
      status: mapStatus(flow.find((f) => f.stage === "A")?.status || "BLOCKED"),
      blockers: flow.find((f) => f.stage === "A")?.blockers || [],
      canAdvance: canAdvanceInterCarsFlow("A"),
    },
    {
      id: "CREATE_ORDER_342",
      label: "Stage B: controlled CreateOrder #342",
      status:
        diag.createOrderCapability === "VALIDATED" && evidenceBlockers.length === 0 ? "PASS" : "UNVERIFIED",
      blockers: evidenceBlockers.length ? evidenceBlockers : flow.find((f) => f.stage === "B")?.blockers || [],
      canAdvance: canAdvanceInterCarsFlow("B") && evidenceBlockers.length === 0,
    },
    {
      id: "ARMING_343",
      label: "Stage C: production order arming #343",
      status: dash.armingState === "ARMED" ? "PASS" : "BLOCKED",
      blockers: dash.armingState === "ARMED" ? [] : ["ARMING_NOT_COMPLETE"],
      canAdvance: canAdvanceInterCarsFlow("C") && !killSwitch,
    },
    {
      id: "FIRST_ORDER_344",
      label: "Stage D: first production order #344",
      status: dash.firstOrderState === "EXECUTED" ? "PASS" : "BLOCKED",
      blockers: dash.firstOrderState === "EXECUTED" ? [] : ["FIRST_PRODUCTION_ORDER"],
      canAdvance: canAdvanceInterCarsFlow("D"),
    },
    {
      id: "CONTROLLED_GO_LIVE_345",
      label: "Stage E: controlled go-live #345",
      status: dash.controlledGoLive === "ACTIVE" ? "PASS" : "BLOCKED",
      blockers: dash.controlledGoLive === "ACTIVE" ? [] : ["CONTROLLED_GO_LIVE_NOT_ACTIVE"],
      canAdvance: canAdvanceInterCarsFlow("E"),
    },
    {
      id: "OBSERVATION_346",
      label: "Stage F: observation #346",
      status: String(dash.observationState).includes("COMPLETED") ? "PASS" : "BLOCKED",
      blockers: String(dash.observationState).includes("COMPLETED") ? [] : ["OBSERVATION"],
      canAdvance: canAdvanceInterCarsFlow("F"),
    },
  ];

  return steps;
}

export function canAdvanceOperationsChain(fromStepId: string): boolean {
  const chain = buildOperationsChain();
  const idx = chain.findIndex((s) => s.id === fromStepId);
  if (idx < 0) return false;
  if (!chain[idx].canAdvance) return false;
  for (let i = 0; i < idx; i++) {
    if (chain[i].status !== "PASS") return false;
  }
  return true;
}

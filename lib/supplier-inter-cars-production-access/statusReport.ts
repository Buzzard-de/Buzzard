import { resolveInterCarsSecretRef } from "@/lib/production-access/secretRefs";
import { evaluateInterCarsProductionAccess } from "./diagnostic";
import { evaluateStageAReadValidation } from "./stageA";
import { getProductionAccessSafetyCounters } from "./safety";

export interface InterCarsAccessStatusReport {
  generatedAt: string;
  software: "COMPLETE";
  credential: string;
  stageA: string;
  stage342: string;
  supplierOrder: string;
  realSideEffects: number;
  fakeEvidence: number;
  finalStatus: string;
  handoffStageB: string;
  handoffStage343: string;
  blockers: string[];
}

export function buildInterCarsAccessStatusReport(): InterCarsAccessStatusReport {
  const diag = evaluateInterCarsProductionAccess();
  const secret = resolveInterCarsSecretRef();
  const stageA = evaluateStageAReadValidation(diag.productionCredentials);
  const counters = getProductionAccessSafetyCounters();
  const realSideEffects = counters.realHttpCalls + diag.realHttpCalls + diag.realCreateOrderCalls;

  const handoff343 =
    diag.createOrderCapability === "VALIDATED" ? "READY_FOR_343_ARMING" : "BLOCKED";

  const credential =
    secret.credentialStatus === "NOT_CONFIGURED"
      ? "NOT_CONFIGURED"
      : secret.credentialStatus === "BLOCKED"
        ? "BLOCKED"
        : diag.productionCredentials === "VALID"
          ? "CONFIGURED"
          : String(diag.productionCredentials);

  const finalStatus =
    stageA.status === "VALIDATED" && diag.createOrderCapability === "VALIDATED"
      ? "READY_FOR_OPS"
      : stageA.handoff === "READY_FOR_STAGE_B_342"
        ? "READY_FOR_STAGE_B"
        : secret.credentialStatus === "NOT_CONFIGURED"
          ? "BLOCKED_NO_CREDENTIALS"
          : "BLOCKED";

  return {
    generatedAt: new Date().toISOString(),
    software: "COMPLETE",
    credential,
    stageA: stageA.status,
    stage342: diag.createOrderCapability,
    supplierOrder: diag.supplierOrderNetwork === "ON" ? "ENABLED" : "DISABLED",
    realSideEffects,
    fakeEvidence: 0,
    finalStatus,
    handoffStageB: stageA.handoff,
    handoffStage343: handoff343,
    blockers: [...new Set([...diag.blockers, ...stageA.blockers])],
  };
}

export function formatInterCarsAccessStatusReport(): string {
  const r = buildInterCarsAccessStatusReport();
  return [
    "INTER CARS AUTOMATIC ACCESS",
    `SOFTWARE: ${r.software}`,
    `CREDENTIAL: ${r.credential}`,
    `STAGE_A: ${r.stageA}`,
    `#342: ${r.stage342}`,
    `SUPPLIER_ORDER: ${r.supplierOrder}`,
    `REAL_SIDE_EFFECTS: ${r.realSideEffects}`,
    `FAKE_EVIDENCE: ${r.fakeEvidence}`,
    `HANDOFF_STAGE_B: ${r.handoffStageB}`,
    `HANDOFF_343: ${r.handoffStage343}`,
    `FINAL_STATUS: ${r.finalStatus}`,
    r.blockers.length ? `BLOCKERS: ${r.blockers.join(", ")}` : "BLOCKERS: none",
  ].join("\n");
}

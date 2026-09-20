/**
 * Master final completion — mandatory execution order A → F.
 * Each phase consumes the prior phase output; a BLOCKED prior phase blocks downstream software validation.
 */
import { evaluatePhaseA_aiIntegration } from "./phaseA_aiIntegration";
import { evaluatePhaseB_memoryApprovalException } from "./phaseB_memoryApprovalException";
import { evaluatePhaseC_marketplace } from "./phaseC_marketplace";
import { evaluatePhaseD_e2eOrder } from "./phaseD_e2eOrder";
import { evaluatePhaseE_security } from "./phaseE_security";
import { evaluatePhaseF_goLive, buildFinalDependencyGraph } from "./phaseF_goLive";
import type { FinalCompletionPhase, PhaseReport } from "./types";

export interface PhaseExecutionChain {
  executionOrder: FinalCompletionPhase[];
  phases: PhaseReport[];
  phaseInputsValid: boolean;
  dependencyGraph: ReturnType<typeof buildFinalDependencyGraph>;
}

function blockedFromPrior(phase: FinalCompletionPhase, prior: PhaseReport): PhaseReport {
  return {
    phase,
    label: `Blocked — prior phase ${prior.phase} not complete`,
    status: "BLOCKED",
    tests: "n/a",
    blockers: [`PRIOR_PHASE_${prior.phase}_BLOCKED`],
  };
}

export function executeMasterFinalPhasesInOrder(): PhaseExecutionChain {
  const executionOrder: FinalCompletionPhase[] = ["A", "B", "C", "D", "E", "F"];

  const phaseA = evaluatePhaseA_aiIntegration();
  const phaseB =
    phaseA.status === "BLOCKED" ? blockedFromPrior("B", phaseA) : evaluatePhaseB_memoryApprovalException();
  const phaseC =
    phaseB.status === "BLOCKED" ? blockedFromPrior("C", phaseB) : evaluatePhaseC_marketplace();
  const phaseD =
    phaseC.status === "BLOCKED" ? blockedFromPrior("D", phaseC) : evaluatePhaseD_e2eOrder();
  const phaseE =
    phaseD.status === "BLOCKED" ? blockedFromPrior("E", phaseD) : evaluatePhaseE_security();
  const phaseF =
    phaseE.status === "BLOCKED" ? blockedFromPrior("F", phaseE) : evaluatePhaseF_goLive();

  const phases = [phaseA, phaseB, phaseC, phaseD, phaseE, phaseF];
  const phaseInputsValid = phases.every((p, i) => {
    if (i === 0) return true;
    const prior = phases[i - 1];
    return prior.status !== "BLOCKED";
  });

  return {
    executionOrder,
    phases,
    phaseInputsValid,
    dependencyGraph: buildFinalDependencyGraph(),
  };
}

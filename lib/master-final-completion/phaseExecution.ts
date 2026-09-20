/**
 * Master final completion — mandatory execution order A → F.
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

export function executeMasterFinalPhasesInOrder(): PhaseExecutionChain {
  const executionOrder: FinalCompletionPhase[] = ["A", "B", "C", "D", "E", "F"];
  const phaseA = evaluatePhaseA_aiIntegration();
  const phaseB = evaluatePhaseB_memoryApprovalException();
  const phaseC = evaluatePhaseC_marketplace();
  const phaseD = evaluatePhaseD_e2eOrder();
  const phaseE = evaluatePhaseE_security();
  const phaseF = evaluatePhaseF_goLive();

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

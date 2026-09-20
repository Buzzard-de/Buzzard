import type { ControlCenterStatus } from "@/lib/external-access-control-center/types";

export type FinalCompletionPhase = "A" | "B" | "C" | "D" | "E" | "F";

export type PhaseStatus = "COMPLETE" | "PARTIAL" | "BLOCKED" | "HUMAN_REQUIRED";

export interface PhaseReport {
  phase: FinalCompletionPhase;
  label: string;
  status: PhaseStatus;
  tests: string;
  blockers: string[];
}

export interface TestCoverageRow {
  area: string;
  tests: string;
  pass: string;
  fail: string;
  blocked: string;
  humanRequired: string;
  note?: string;
}

export interface HumanActionMatrixRow {
  provider: string;
  action: string;
  reason: string;
  blocking: boolean;
  requiredEvidence: string;
  verification: string;
  status: ControlCenterStatus | string;
}

export interface MasterFinalCompletionReport {
  generatedAt: string;
  executionOrder: FinalCompletionPhase[];
  phases: PhaseReport[];
  scoreboard: Record<string, string>;
  dependencyGraph: Array<{ step: string; status: string; blockingReason?: string }>;
  testCoverage: TestCoverageRow[];
  humanActionMatrix: HumanActionMatrixRow[];
  sideEffects: Record<string, number>;
  fakeProductionEvidence: number;
  humanRequiredCount: number;
  blockers: string[];
  nextHumanAction: string;
  SALES_ENABLED: string;
  phaseInputsValid: boolean;
  workerRegistryAudit?: { ok: boolean; workerCount: number };
  marketplaceCapabilityCells?: number;
}

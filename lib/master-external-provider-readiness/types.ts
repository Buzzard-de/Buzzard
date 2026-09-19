import type { ControlCenterStatus } from "@/lib/external-access-control-center/types";

export type ExternalEvidenceSource = "EXTERNAL_LIVE" | "LOCAL" | "MOCK" | "SANDBOX" | "UNIT_TEST" | "CONFIGURATION";

export type ExternalProviderCategory =
  | "PAYMENT"
  | "CARRIER"
  | "RETURNS"
  | "MARKETPLACE"
  | "AI"
  | "MARKETING";

export type CredentialDisplayState =
  | "NOT_CONFIGURED"
  | "REFERENCE_PRESENT"
  | "CONFIGURED"
  | "VALIDATED"
  | "EXPIRED"
  | "INVALID"
  | "UNVERIFIED";

export interface ExternalProviderEvidenceInput {
  category: ExternalProviderCategory;
  providerId: string;
  environment: "PRODUCTION" | "CONTROLLED_VALIDATION";
  source: ExternalEvidenceSource;
  capability: string;
  timestamp: string;
  endpoint: string;
  responseStatus: number;
  secretRef: string;
  evidenceReference: string;
  operator: string;
  expiresAt?: string;
}

export interface ExternalProviderEvidence extends ExternalProviderEvidenceInput {
  id: string;
  payloadHash: string;
}

export interface MasterProviderMatrixRow {
  provider: string;
  category: string;
  required: boolean;
  configured: boolean;
  secretRef: string;
  credentialState: CredentialDisplayState;
  networkState: ControlCenterStatus;
  liveValidation: ControlCenterStatus;
  productionEvidence: "NONE" | "PARTIAL" | "VALIDATED";
  humanApproval: boolean;
  blocking: boolean;
  nextHumanAction: string;
}

export interface ExternalBlocker {
  id: string;
  provider: string;
  category: string;
  status: ControlCenterStatus;
  reason: string;
  requiredHumanAction: string;
  requiredEvidence: string;
  blocking: boolean;
}

export interface MasterPhaseStatusSnapshot {
  phase: "363" | "364" | "365" | "366";
  complete: true;
  summary: Record<string, string>;
}

export interface MasterExternalProviderReadinessReport {
  generatedAt: string;
  executionOrder: ["363", "364", "365", "366"];
  phases: MasterPhaseStatusSnapshot[];
  scoreboard: Record<string, ControlCenterStatus | string>;
  masterMatrix: MasterProviderMatrixRow[];
  blockers: ExternalBlocker[];
  nextHumanActions: import("@/lib/external-access-control-center/types").HumanActionItem[];
  market35ProviderImpact: { ready: number; partial: number; blocked: number; humanRequired: number };
  fakeProductionEvidence: number;
  sideEffects: Record<string, number>;
}

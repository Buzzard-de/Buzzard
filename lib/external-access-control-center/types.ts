export type ControlCenterStatus =
  | "NOT_REQUIRED"
  | "NOT_CONFIGURED"
  | "CONFIGURED"
  | "HUMAN_REQUIRED"
  | "BLOCKED_EXTERNAL_ACCESS"
  | "UNVERIFIED_EXTERNAL"
  | "VALIDATION_PENDING"
  | "VALIDATED"
  | "READY"
  | "FAILED"
  | "DISABLED"
  | "PASS"
  | "BLOCKED"
  | "UNVERIFIED"
  | "WARNING"
  | "PARTIAL";

export type EvidenceType =
  | "LOCAL_TEST"
  | "UNIT_TEST"
  | "INTEGRATION_TEST"
  | "SANDBOX"
  | "BLUEPRINT"
  | "CONFIGURATION"
  | "LIVE_HEALTH"
  | "LIVE_API"
  | "LIVE_ORDER"
  | "LIVE_PAYMENT"
  | "LIVE_SHIPMENT"
  | "LIVE_REFUND"
  | "HUMAN_APPROVAL"
  | "FOUR_EYES_APPROVAL";

export interface EvidenceRecordView {
  id: string;
  providerId: string;
  type: EvidenceType;
  environment: string;
  timestamp: string;
  source: string;
  status: string;
  reference?: string;
  payloadHash: string;
  operator?: string;
  isProductionEvidence: boolean;
}

export interface ProviderRegistryEntry {
  providerId: string;
  name: string;
  category: string;
  environment: string;
  required: boolean;
  secretRefs: string[];
  credentialState: ControlCenterStatus;
  configurationState: ControlCenterStatus;
  networkState: ControlCenterStatus;
  liveValidationState: ControlCenterStatus;
  evidenceState: ControlCenterStatus;
  humanActionRequired: boolean;
  productionEnabled: boolean;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dependencies: string[];
  lastValidation?: string;
  blockers: string[];
  warnings: string[];
}

export interface ExternalAccessMatrixRow {
  provider: string;
  required: boolean;
  configured: boolean;
  credentialsPresent: boolean;
  secretReferencePresent: boolean;
  networkEnabled: boolean;
  liveValidation: ControlCenterStatus;
  productionEvidence: "NONE" | "PARTIAL" | "VALIDATED";
  humanApproval: boolean;
  blocked: boolean;
  nextHumanAction: string;
}

export interface GoLiveControlStep {
  id: string;
  label: string;
  status: ControlCenterStatus;
  blockingReason?: string;
  requiredHumanApproval?: boolean;
}

export interface HumanActionItem {
  priority: number;
  provider: string;
  action: string;
  why: string;
  requiredEvidence: string;
  verificationMethod: string;
  blocking: boolean;
}

export interface BuzzardFinalStatusScoreboard {
  SOFTWARE: ControlCenterStatus;
  CONFIGURATION: ControlCenterStatus;
  PERSISTENCE: ControlCenterStatus;
  EXTERNAL_ACCESS: ControlCenterStatus;
  LIVE_VALIDATION: ControlCenterStatus;
  SECURITY: ControlCenterStatus;
  BACKUP: ControlCenterStatus;
  SUPPLIER: ControlCenterStatus;
  PAYMENT: ControlCenterStatus;
  CARRIER: ControlCenterStatus;
  RETURNS: ControlCenterStatus;
  MARKETPLACE: ControlCenterStatus;
  AI: ControlCenterStatus;
  MARKETING: ControlCenterStatus;
  MARKETS_35: ControlCenterStatus;
  CUSTOMS: ControlCenterStatus;
  CHECKOUT: ControlCenterStatus;
  HUMAN_APPROVAL: ControlCenterStatus;
  FIRST_ORDER: ControlCenterStatus;
  OBSERVATION: ControlCenterStatus;
  PRODUCTION: ControlCenterStatus;
  SALES: ControlCenterStatus;
}

export interface ExternalAccessControlCenterReport {
  generatedAt: string;
  masterStatus: {
    SOFTWARE_COMPLETE: boolean;
    CONFIGURATION_COMPLETE: boolean;
    EXTERNAL_ACCESS: ControlCenterStatus;
    LIVE_VALIDATION: ControlCenterStatus;
    PRODUCTION: ControlCenterStatus;
    GO_LIVE: ControlCenterStatus;
    SALES_ENABLED: "0" | "1";
  };
  scoreboard: BuzzardFinalStatusScoreboard;
  providerRegistry: ProviderRegistryEntry[];
  accessMatrix: ExternalAccessMatrixRow[];
  evidenceRecords: EvidenceRecordView[];
  goLiveDependencyGraph: GoLiveControlStep[];
  renderControl: {
    BLUEPRINT_CONFIGURATION: ControlCenterStatus;
    LIVE_PERSISTENT_DISK: ControlCenterStatus;
    LIVE_DB_PATH: ControlCenterStatus;
    LIVE_DB_HEALTH: ControlCenterStatus;
    LIVE_RESTART_PERSISTENCE: ControlCenterStatus;
    LIVE_BACKUP: ControlCenterStatus;
    LIVE_RESTORE: ControlCenterStatus;
    LIVE_DEPLOYMENT: ControlCenterStatus;
    LIVE_HEALTH: ControlCenterStatus;
    PERSISTENCE: ControlCenterStatus;
  };
  renderPersistenceVerification?: {
    acceptedEvidenceCount: number;
    expiredEvidenceCount: number;
    localHintsNote: string;
  };
  masterExternalReadiness?: {
    scoreboard: Record<string, string>;
    blockerCount: number;
    matrixSize: number;
    market35: { ready: number; partial: number; blocked: number; humanRequired: number };
  };
  masterProviderMatrix?: import("@/lib/master-external-provider-readiness/types").MasterProviderMatrixRow[];
  externalBlockers?: import("@/lib/master-external-provider-readiness/types").ExternalBlocker[];
  interCarsAccess?: {
    credentialReference: string;
    credentialValidation: ControlCenterStatus;
    readOnlyAccess: ControlCenterStatus;
    createOrder: string;
    stage342Gate: string;
    capabilitySummary: Record<string, string>;
  };
  market35Summary: { ready: number; partial: number; blocked: number; humanRequired: number };
  nextHumanActions: HumanActionItem[];
  blockers: string[];
  warnings: string[];
  sideEffectCounters: Record<string, number>;
  fakeProductionEvidence: number;
  auditSnapshot: string[];
}

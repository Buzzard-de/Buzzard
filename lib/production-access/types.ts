/** Canonical provider access states — never conflate with MOCK/SANDBOX success. */
export type AccessStatus =
  | "NOT_CONFIGURED"
  | "CONFIGURED"
  | "VALIDATING"
  | "VALIDATED"
  | "BLOCKED"
  | "FAILED"
  | "REVOKED"
  | "EXPIRED"
  | "NOT_AVAILABLE"
  | "UNVERIFIED";

export type ValidationEnvironment = "MOCK" | "SANDBOX" | "CONTROLLED_VALIDATION" | "PRODUCTION";

export interface SecretRefStatus {
  providerId: string;
  secretRefKey: string;
  secretRefConfigured: boolean;
  secretResolvable: boolean;
  credentialStatus: AccessStatus;
}

export interface AccessChecklistItem {
  id: string;
  label: string;
  status: AccessStatus;
  required: true;
}

export interface ProviderAccessEvidence {
  evidenceId: string;
  provider: string;
  capability: string;
  endpoint: string;
  timestamp: string;
  correlationId: string;
  requestHash: string;
  responseStatus: number;
  supplierReference?: string;
  environment: ValidationEnvironment;
  operator?: string;
}

export interface ProviderAccessState {
  providerId: string;
  domain: string;
  accessState: AccessStatus;
  credentialConfigured: boolean;
  secretRefConfigured: boolean;
  endpointConfigured: boolean;
  networkPermission: boolean;
  healthCheck: AccessStatus;
  authenticationCheck: AccessStatus;
  capabilityCheck: AccessStatus;
  liveValidation: AccessStatus;
  evidenceCount: number;
  lastValidationAt?: string;
  expirationAt?: string;
  operator?: string;
  correlationId?: string;
  failureReason?: string;
  productionEnabled: "OFF" | "ON" | "BLOCKED";
  blockers: string[];
}

export interface ProviderAccessReport {
  providerId: string;
  domain: string;
  secretRef: SecretRefStatus;
  checklist: AccessChecklistItem[];
  liveValidation: AccessStatus;
  productionEnabled: "OFF" | "ON" | "BLOCKED";
  blockers: string[];
  state?: ProviderAccessState;
}

export interface MissingProductionAccessReport {
  generatedAt: string;
  providers: ProviderAccessReport[];
  interCars: ProviderAccessReport;
  liveSequence: {
    phase1Access: AccessStatus;
    phase2Supplier: AccessStatus;
    phase3Providers: AccessStatus;
    phase4Final: AccessStatus;
  };
  realWorldChecklist: AccessChecklistItem[];
  productionFlags: Record<string, "ON" | "OFF">;
  realSideEffects: Record<string, number>;
  sales: "CLOSED" | "OPEN";
  blockers: string[];
}

/** Credential metadata — never contains secret values. */
export type CredentialMetaStatus = "MISSING" | "CONFIGURED" | "INVALID" | "VALIDATED";

export type OpsSectionStatus = "PASS" | "UNVERIFIED" | "BLOCKED" | "NOT_CONFIGURED" | "SKIPPED";

export interface CredentialMeta {
  providerId: string;
  secretRefKey: string;
  status: CredentialMetaStatus;
  updatedAt: string;
}

export interface OperationsChainStep {
  id: string;
  label: string;
  status: OpsSectionStatus;
  blockers: string[];
  canAdvance: boolean;
}

export interface FinalOperationsReport {
  generatedAt: string;
  softwareComplete: true;
  operationalBlockers: string[];
  interCarsCredential: CredentialMetaStatus | "MISSING" | "CONFIGURED";
  interCarsRead: OpsSectionStatus;
  createOrder342: OpsSectionStatus;
  arming343: OpsSectionStatus;
  firstOrder344: OpsSectionStatus;
  controlledGoLive345: OpsSectionStatus;
  observation346: OpsSectionStatus;
  payment: OpsSectionStatus;
  carrier: OpsSectionStatus;
  ai: OpsSectionStatus;
  returns: OpsSectionStatus;
  marketing: OpsSectionStatus;
  financialReconciliation: OpsSectionStatus;
  backupRestore: OpsSectionStatus;
  security: OpsSectionStatus;
  monitoring: OpsSectionStatus;
  sales: "OPEN" | "CLOSED";
  finalGoLive: "READY" | "BLOCKED";
  realSideEffects: Record<string, number>;
  fakeEvidenceCount: number;
  criticalBlockers: number;
  chain: OperationsChainStep[];
  credentials: CredentialMeta[];
}

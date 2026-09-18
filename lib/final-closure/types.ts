export type FinalClosureState =
  | "NOT_READY"
  | "BLOCKED"
  | "READY_FOR_CONTROLLED_GO_LIVE"
  | "CONTROLLED_GO_LIVE"
  | "OBSERVATION"
  | "READY_FOR_SALES"
  | "SALES_ENABLED"
  | "EMERGENCY_STOP"
  | "CLOSED";

export type ClosureSectionStatus = "PASS" | "BLOCKED" | "NOT_CONFIGURED" | "UNVERIFIED";

export type BlockerSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type BlockerCode =
  | "INTER_CARS_CREDENTIAL"
  | "INTER_CARS_API_ACCESS"
  | "INTER_CARS_READ_VALIDATION"
  | "CREATE_ORDER_VALIDATION"
  | "FIRST_PRODUCTION_ORDER"
  | "TRACKING_VALIDATION"
  | "PAYMENT_CREDENTIAL"
  | "PAYMENT_VALIDATION"
  | "CARRIER_CREDENTIAL"
  | "CARRIER_VALIDATION"
  | "AI_CREDENTIAL"
  | "AI_VALIDATION"
  | "RETURNS_CREDENTIAL"
  | "RETURNS_VALIDATION"
  | "MARKETING_CREDENTIAL"
  | "MARKETING_VALIDATION"
  | "BACKUP_RESTORE"
  | "SECURITY"
  | "MONITORING"
  | "FINANCIAL_RECONCILIATION"
  | "OBSERVATION";

export interface FinalBlocker {
  code: BlockerCode | string;
  provider?: string;
  severity: BlockerSeverity;
  status: ClosureSectionStatus;
  description: string;
  requiredAction: string;
  evidenceId?: string;
  updatedAt: string;
}

export interface ClosureSectionReport {
  section: string;
  status: ClosureSectionStatus;
  message: string;
}

export interface InterCarsFlowStage {
  stage: "A" | "B" | "C" | "D" | "E" | "F";
  name: string;
  status: ClosureSectionStatus;
  blockers: string[];
}

export interface BackupRestoreEvidence {
  evidenceId: string;
  steps: Array<{ step: string; status: "PASS" | "BLOCKED" | "SKIPPED"; detail?: string }>;
  result: "PASS" | "BLOCKED" | "UNVERIFIED";
  timestamp: string;
}

export interface FinalClosureAuditEvent {
  eventId: string;
  fromState: FinalClosureState;
  toState: FinalClosureState;
  operator: string;
  timestamp: string;
  approval?: string;
  evidenceId?: string;
  scope?: string;
  correlationId: string;
}

export interface FinalSalesEnablementResult {
  allowed: boolean;
  salesEnabled: "OPEN" | "CLOSED";
  blockers: string[];
  reasons: string[];
}

export interface FinalClosureReport {
  generatedAt: string;
  finalState: FinalClosureState;
  finalGoLive: "READY" | "BLOCKED";
  finalDecision: "READY" | "BLOCKED";
  software: "PASS" | "BLOCKED";
  sections: ClosureSectionReport[];
  blockers: FinalBlocker[];
  criticalBlockerCount: number;
  interCarsFlow: InterCarsFlowStage[];
  sales: "OPEN" | "CLOSED";
  realSideEffects: Record<string, number>;
  fakeEvidenceCount: number;
  backupRestore: BackupRestoreEvidence;
}

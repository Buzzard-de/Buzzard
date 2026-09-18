export type ReadinessStatus = "PASS" | "WARNING" | "BLOCKED" | "MISSING" | "NOT_APPLICABLE";

export type BlockerCategory =
  | "SOFTWARE"
  | "CONFIGURATION"
  | "EXTERNAL_CREDENTIAL"
  | "EXTERNAL_ACCESS"
  | "MANUAL_DEPLOYMENT"
  | "HUMAN_APPROVAL"
  | "LIVE_VALIDATION"
  | "LEGAL_BUSINESS"
  | "NOT_APPLICABLE";

export type ScoreboardValue = "YES" | "NO" | "BLOCKED";

export interface ReadinessMatrixEntry {
  area: string;
  status: ReadinessStatus;
  ssot: string;
  tests: string;
  notes: string;
}

export interface EngineIntegrityEntry {
  engine: string;
  exists: boolean;
  ssot: string;
  dataFlow: ReadinessStatus;
  tests: ReadinessStatus;
  idempotency: ReadinessStatus;
  security: ReadinessStatus;
  persistence: ReadinessStatus;
  integration: ReadinessStatus;
  duplicateEngine: boolean;
  notes: string;
}

export interface ClassifiedBlocker {
  code: string;
  category: BlockerCategory;
  message: string;
}

export interface NextActionItem {
  step: number;
  label: string;
  status: "COMPLETE" | "PENDING" | "BLOCKED";
}

export interface TestExecutionResult {
  command: string;
  status: "PASS" | "FAIL" | "BLOCKED" | "SKIPPED";
  durationMs?: number;
}

export interface SideEffectCounters {
  realSupplierOrders: number;
  realPaymentTransactions: number;
  realRefunds: number;
  realShipments: number;
  realMarketplaceOrders: number;
  realMarketplaceListings: number;
  realAdSpend: number;
  fakeEvidence: number;
}

export interface InternalProductionReadinessAudit {
  generatedAt: string;
  scoreboard: {
    SOFTWARE_COMPLETE: ScoreboardValue;
    CONFIG_COMPLETE: ScoreboardValue;
    INTERNAL_READINESS: ScoreboardValue;
    EXTERNAL_ACCESS: ScoreboardValue;
    LIVE_VALIDATION: ScoreboardValue;
    DEPLOYMENT_READY: ScoreboardValue;
    PRODUCTION_READY: ScoreboardValue;
    GO_LIVE_READY: ScoreboardValue;
    SALES_ENABLED: "0" | "1";
  };
  readinessMatrix: ReadinessMatrixEntry[];
  engineIntegrity: EngineIntegrityEntry[];
  blockers: ClassifiedBlocker[];
  warnings: string[];
  nextActions: NextActionItem[];
  testResults: TestExecutionResult[];
  sideEffectCounters: {
    start: SideEffectCounters;
    end: SideEffectCounters;
  };
  productionFlags: Record<string, string>;
  auditFailure: boolean;
  auditFailureReasons: string[];
}

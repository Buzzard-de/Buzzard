export type ReadinessOverallStatus = "READY" | "CONDITIONALLY_READY" | "BLOCKED" | "EXPIRED";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
export type CapabilityClassification = "AVAILABLE" | "NOT_SUPPORTED" | "DISABLED" | "UNKNOWN";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "BLOCKED";
export type ReadinessDomainStatus = "PASS" | "WARNING" | "BLOCKED" | "SKIPPED" | "UNKNOWN";

export type ReadinessChannel =
  | "DIRECT"
  | "AMAZON"
  | "EBAY"
  | "KAUFLAND"
  | "ALLEGRO"
  | "BOL"
  | "CDISCOUNT"
  | "OTTO";

export interface ReadinessScope {
  supplierId: string;
  market: string;
  channel: ReadinessChannel;
  environment?: "SANDBOX" | "PRODUCTION";
}

export interface ReadinessCheckResult {
  code: string;
  category: string;
  level: "PASS" | "WARNING" | "BLOCKED" | "CRITICAL";
  message: string;
  blocking: boolean;
}

export interface SupplierOrderReadiness {
  readinessId: string;
  supplierId: string;
  market: string;
  channel: ReadinessChannel;
  environment: "SANDBOX" | "PRODUCTION";
  generatedAt: string;
  expiresAt: string;
  overallStatus: ReadinessOverallStatus;
  approvalStatus: ApprovalStatus;
  networkStatus: "DISABLED" | "ENABLED";
  credentialStatus: ReadinessDomainStatus;
  connectorStatus: ReadinessDomainStatus;
  supplierCapabilityStatus: ReadinessDomainStatus;
  productReadinessStatus: ReadinessDomainStatus;
  stockReadinessStatus: ReadinessDomainStatus;
  priceReadinessStatus: ReadinessDomainStatus;
  fulfillmentReadinessStatus: ReadinessDomainStatus;
  reconciliationStatus: ReadinessDomainStatus;
  incidentStatus: ReadinessDomainStatus;
  securityStatus: ReadinessDomainStatus;
  idempotencyStatus: ReadinessDomainStatus;
  retryStatus: ReadinessDomainStatus;
  auditStatus: ReadinessDomainStatus;
  riskLevel: RiskLevel;
  evaluatorVersion: string;
  correlationId: string;
  checks: ReadinessCheckResult[];
  blockers: string[];
  warnings: string[];
}

export interface SupplierOrderApproval {
  approvalId: string;
  readinessId: string;
  supplierId: string;
  market: string;
  channel: ReadinessChannel;
  orderRiskLevel?: RiskLevel;
  status: ApprovalStatus;
  requester: string;
  approver?: string;
  requestedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  approvalScope: ReadinessScope;
  expiresAt: string;
  correlationId: string;
}

export interface ActivationAttemptResult {
  allowed: false;
  blocked: true;
  reason: string;
  code: string;
  networkStatus: "DISABLED" | "ENABLED";
  readinessStatus?: ReadinessOverallStatus;
  approvalStatus?: ApprovalStatus;
  correlationId: string;
}

export interface ActivationPreview {
  supplierId: string;
  market: string;
  channel: ReadinessChannel;
  readiness: SupplierOrderReadiness;
  approval?: SupplierOrderApproval;
  killSwitch: {
    global: boolean;
    supplier: boolean;
    market?: boolean;
    channel?: boolean;
  };
  networkState: {
    supplierOrderNetwork: "DISABLED" | "ENABLED";
    currentEnvironment: "SANDBOX" | "PRODUCTION";
  };
  capabilities: Record<string, CapabilityClassification>;
  risk: RiskLevel;
  limits: {
    maxOrderValue?: number;
    maxDailyOrderValue?: number;
    maxSingleSupplierOrderValue?: number;
  };
  wouldActivate: false;
  blockReasons: string[];
}

export interface ReadinessAuditEvent {
  eventId: string;
  type: string;
  supplierId?: string;
  market?: string;
  channel?: string;
  actor?: string;
  correlationId: string;
  timestamp: string;
  detail?: Record<string, unknown>;
}

export interface ReadinessDashboard {
  suppliersReady: number;
  suppliersBlocked: number;
  marketsReady: number;
  channelsReady: number;
  pendingApprovals: number;
  expiredApprovals: number;
  criticalBlockers: number;
  networkStatus: "DISABLED" | "ENABLED";
  globalKillSwitch: boolean;
  realSupplierOrderNetwork: "DISABLED" | "ENABLED";
  currentEnvironment: "SANDBOX" | "PRODUCTION";
}

export interface ReadinessEvaluationRun {
  runId: string;
  correlationId: string;
  startedAt: string;
  completedAt: string;
  evaluated: number;
  ready: number;
  conditionallyReady: number;
  blocked: number;
  expired: number;
  durationMs: number;
}

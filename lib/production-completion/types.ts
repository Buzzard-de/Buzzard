export type CompletionSectionStatus =
  | "PASS"
  | "WARNING"
  | "BLOCKED"
  | "NOT_CONFIGURED"
  | "UNVERIFIED";

export type BlockerSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface StructuredBlocker {
  code: string;
  severity: BlockerSeverity;
  provider?: string;
  description: string;
  resolution: string;
  evidence?: string;
  status: CompletionSectionStatus;
}

export type CompletionSection =
  | "ACCESS"
  | "SUPPLIERS"
  | "PAYMENT"
  | "CARRIER"
  | "AI"
  | "RETURNS"
  | "MARKETING"
  | "FIRST_ORDER"
  | "OBSERVATION"
  | "SECURITY"
  | "BACKUP"
  | "MONITORING"
  | "GO_LIVE";

export interface CompletionSectionReport {
  section: CompletionSection;
  status: CompletionSectionStatus;
  message: string;
  blockers: StructuredBlocker[];
}

export type HealthStatus = "HEALTHY" | "DEGRADED" | "BLOCKED" | "CRITICAL";

export interface ProductionMonitoringSnapshot {
  healthStatus: HealthStatus;
  orders: number;
  supplierOrders: number;
  supplierFailures: number;
  paymentFailures: number;
  carrierFailures: number;
  returns: number;
  refunds: number;
  inventoryAnomalies: number;
  pricingAnomalies: number;
  aiFailures: number;
  marketingSpend: number;
  unknownOutcomes: number;
  criticalIncidents: number;
}

export interface FinalProductionCompletionReport {
  generatedAt: string;
  software: "PASS" | "BLOCKED";
  sections: CompletionSectionReport[];
  blockers: StructuredBlocker[];
  monitoring: ProductionMonitoringSnapshot;
  sales: "OPEN" | "CLOSED";
  finalGoLive: "READY" | "BLOCKED";
  realSideEffects: Record<string, number>;
  fakeEvidenceCount: number;
}

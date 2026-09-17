import type { ReadinessChannel } from "@/lib/supplier-order-readiness/types";
import type { GoLiveLimits, GoLiveScope } from "@/lib/supplier-controlled-go-live/types";

export type ObservationState =
  | "BLOCKED"
  | "OBSERVATION_READY"
  | "OBSERVATION_ACTIVE"
  | "OBSERVATION_COMPLETED"
  | "OBSERVATION_REVIEW_READY"
  | "BROADER_ROLLOUT_APPROVAL_PENDING"
  | "BROADER_ROLLOUT_APPROVED"
  | "BROADER_ROLLOUT_ACTIVE"
  | "OBSERVATION_FAILED"
  | "VALIDATION_FAILED"
  | "UNKNOWN_OUTCOME"
  | "RISK_BLOCKED"
  | "EXPIRED"
  | "REJECTED"
  | "PAUSED"
  | "ROLLED_BACK"
  | "KILL_SWITCHED";

export type CheckLevel = "PASS" | "BLOCKED" | "UNVERIFIED" | "REVIEW_REQUIRED" | "FAIL" | "NOT_AVAILABLE";

export interface ObservationConfig {
  observationDurationMs: number;
  minimumOrders: number;
  minimumObservationData: boolean;
}

export interface ObservationThresholds {
  maxSupplierErrorRate?: number;
  maxUnknownOutcomeRate?: number;
  maxInventoryMismatch?: number;
  maxPriceMismatch?: number;
  maxFinancialMismatch?: number;
  maxCriticalIncidents?: number;
  configured: boolean;
}

export interface RolloutScope extends GoLiveScope {
  markets?: string[];
  allowedCurrencies?: string[];
}

export interface RolloutLimits extends GoLiveLimits {
  allowedMarkets?: string[];
  allowedCurrencies?: string[];
}

export interface ObservationMetrics {
  ordersAttempted: number;
  ordersAccepted: number;
  ordersRejected: number;
  unknownOutcomes: number;
  duplicateAttempts: number;
  idempotencyViolations: number;
  supplierErrorRate: number;
  supplierTimeoutRate: number;
  inventoryMismatchCount: number;
  priceMismatchCount: number;
  fulfillmentMismatchCount: number;
  trackingFailures: number;
  financialReconciliationFailures: number;
  returnIncidents: number;
  customerImpactIncidents: number;
  securityIncidents: number;
  criticalIncidents: number;
  mockMetrics?: boolean;
}

export interface QualitySummary {
  supplierHealth: CheckLevel;
  orderQuality: CheckLevel;
  inventoryQuality: CheckLevel;
  pricingQuality: CheckLevel;
  fulfillmentQuality: CheckLevel;
  financialQuality: CheckLevel;
  returnsQuality: CheckLevel;
  customerImpact: CheckLevel;
  security: CheckLevel;
}

export interface ObservationIncident {
  incidentId: string;
  fingerprint: string;
  supplierId: string;
  category: string;
  code: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  orderId?: string;
  status: "OPEN" | "RESOLVED";
  detectedAt: string;
}

export interface RolloutApproval {
  approvalId: string;
  observationId: string;
  rolloutId: string;
  requesterId: string;
  primaryApproverId: string;
  secondaryApproverId?: string;
  scope: RolloutScope;
  limits: RolloutLimits;
  metrics: ObservationMetrics;
  scopeHash: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "INVALIDATED";
  createdAt: string;
  expiresAt: string;
}

export interface ObservationRecord {
  observationId: string;
  goLiveId: string;
  supplier: string;
  state: ObservationState;
  scope: RolloutScope;
  limits: RolloutLimits;
  config: ObservationConfig;
  thresholds: ObservationThresholds;
  metrics: ObservationMetrics;
  quality: QualitySummary;
  incidents: ObservationIncident[];
  blockerCodes: string[];
  correlationId: string;
  idempotencyKey: string;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  expiresAt: string;
  mockObservation?: boolean;
  report?: ObservationReport;
  approval?: RolloutApproval;
  rolloutId?: string;
}

export interface ObservationReport {
  durationMs: number;
  ordersObserved: number;
  successRate: number;
  failureRate: number;
  unknownOutcomes: number;
  supplierHealth: CheckLevel;
  inventory: CheckLevel;
  pricing: CheckLevel;
  financial: CheckLevel;
  fulfillment: CheckLevel;
  returns: CheckLevel;
  customerImpact: CheckLevel;
  security: CheckLevel;
  criticalIncidents: number;
  generatedAt: string;
}

export interface BroaderRolloutRecord {
  rolloutId: string;
  observationId: string;
  goLiveId: string;
  supplier: string;
  state: ObservationState;
  scope: RolloutScope;
  limits: RolloutLimits;
  approval?: RolloutApproval;
  blockerCodes: string[];
  correlationId: string;
  idempotencyKey: string;
  activatedBy?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  activatedAt?: string;
  pausedAt?: string;
  rolledBackAt?: string;
}

export interface ObservationDashboard {
  observationCount: number;
  observationState: "ACTIVE" | "COMPLETED" | "BLOCKED" | "FAILED" | "REVIEW_READY";
  broaderRollout: "ACTIVE" | "REVIEW_READY" | "BLOCKED";
  controlledGoLive: "ACTIVE" | "BLOCKED" | "REVIEW_READY";
  createOrderCapability: "VALIDATED" | "UNVERIFIED" | "BLOCKED";
  liveValidation: "VALIDATED" | "UNVERIFIED" | "NONE";
  armingState: string;
  firstOrderState: string;
  observationDurationMs: number;
  observedOrders: number;
  successRate: number;
  failureRate: number;
  unknownOutcomes: number;
  supplierHealth: "PASS" | "FAIL" | "UNVERIFIED";
  inventoryQuality: "PASS" | "FAIL" | "UNVERIFIED";
  pricingQuality: "PASS" | "FAIL" | "UNVERIFIED";
  fulfillmentQuality: "PASS" | "FAIL" | "UNVERIFIED";
  financialQuality: "PASS" | "FAIL" | "UNVERIFIED";
  returns: "PASS" | "FAIL" | "NOT_AVAILABLE";
  customerImpact: "PASS" | "FAIL" | "NOT_AVAILABLE";
  security: "PASS" | "FAIL";
  criticalIncidents: number;
  observationReview: "READY" | "BLOCKED";
  fourEyesApproval: "APPROVED" | "PENDING" | "BLOCKED";
  rolloutScope: string;
  rolloutLimits: string;
  productionNetwork: "ON" | "OFF";
  realSupplierHttpCalls: number;
  realSupplierOrders: number;
  realCustomerOrders: number;
  marketplaceSideEffects: number;
  paymentSideEffects: number;
  carrierSideEffects: number;
  customerNotifications: number;
  blockers: string[];
}

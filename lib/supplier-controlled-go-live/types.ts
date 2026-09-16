import type { ReadinessChannel } from "@/lib/supplier-order-readiness/types";
import type { ValidationEvidence } from "@/lib/supplier-production-order-arming/types";

export type GoLiveState =
  | "BLOCKED"
  | "FIRST_ORDER_PENDING"
  | "FIRST_ORDER_COMPLETED"
  | "POST_ORDER_VALIDATION"
  | "GO_LIVE_REVIEW_READY"
  | "HUMAN_APPROVAL"
  | "CONTROLLED_GO_LIVE"
  | "VALIDATION_FAILED"
  | "UNKNOWN_OUTCOME"
  | "EXPIRED"
  | "REJECTED"
  | "KILL_SWITCHED"
  | "ROLLED_BACK"
  | "PAUSED";

export type CheckLevel = "PASS" | "BLOCKED" | "UNVERIFIED" | "REVIEW_REQUIRED" | "FAIL";

export interface GoLiveScope {
  supplier: string;
  market: string;
  channel: ReadinessChannel;
  environment: "SANDBOX" | "PRODUCTION";
  currency: string;
  allowedCategories?: string[];
}

export interface GoLiveLimits {
  maximumOrderValue: number;
  maximumDailyOrders: number;
  maximumDailyValue: number;
  allowedSupplier: string;
  allowedMarket: string;
  allowedCurrency: string;
  allowedCategories?: string[];
}

export interface FirstOrderEvidence {
  executionId: string;
  orderId: string;
  supplier: string;
  supplierOrderReference?: string;
  payloadHash: string;
  approvalId?: string;
  armingId: string;
  validationId: string;
  executionTimestamp: string;
  executionResult: "EXECUTED" | "UNKNOWN_OUTCOME" | "EXECUTION_FAILED" | "NOT_AVAILABLE";
  mockExecution?: boolean;
}

export interface GoLiveCheckResult {
  check: string;
  category: string;
  level: CheckLevel;
  message: string;
  blocking?: boolean;
}

export interface GoLiveApproval {
  approvalId: string;
  goLiveId: string;
  requesterId: string;
  primaryApproverId: string;
  secondaryApproverId?: string;
  scope: GoLiveScope;
  limits: GoLiveLimits;
  firstOrderEvidence: FirstOrderEvidence;
  validationEvidence: ValidationEvidence;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  createdAt: string;
  expiresAt: string;
  scopeHash: string;
}

export interface ControlledGoLiveRecord {
  goLiveId: string;
  supplier: string;
  state: GoLiveState;
  scope: GoLiveScope;
  limits: GoLiveLimits;
  firstOrderEvidence?: FirstOrderEvidence;
  validationEvidence?: ValidationEvidence;
  approval?: GoLiveApproval;
  checks: GoLiveCheckResult[];
  blockerCodes: string[];
  correlationId: string;
  idempotencyKey: string;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  activatedAt?: string;
  rolledBackAt?: string;
  pausedAt?: string;
}

export interface GoLiveDashboard {
  goLiveCount: number;
  blocked: number;
  reviewReady: number;
  active: number;
  rolledBack: number;
  createOrderCapability: "VALIDATED" | "UNVERIFIED" | "BLOCKED";
  liveValidation: "VALIDATED" | "UNVERIFIED" | "NONE";
  armingState: string;
  firstOrderState: string;
  firstOrderOutcome: "VALIDATED" | "FAILED" | "UNKNOWN" | "NOT_AVAILABLE";
  supplierConfirmation: "VALIDATED" | "UNVERIFIED" | "FAILED" | "NONE";
  tracking: "VALIDATED" | "UNVERIFIED" | "NONE";
  fctReconciliation: "PASS" | "FAIL" | "NOT_AVAILABLE";
  inventoryReconciliation: "PASS" | "FAIL" | "NOT_AVAILABLE";
  pricingReconciliation: "PASS" | "FAIL" | "NOT_AVAILABLE";
  financialReconciliation: "PASS" | "FAIL" | "NOT_AVAILABLE";
  security: "PASS" | "FAIL";
  risk: "PASS" | "FAIL";
  fourEyesApproval: "APPROVED" | "PENDING" | "BLOCKED";
  controlledGoLive: "ACTIVE" | "REVIEW_READY" | "BLOCKED";
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

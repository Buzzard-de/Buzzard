import type { ReadinessChannel } from "@/lib/supplier-order-readiness/types";

export type ActivationEnvironment = "SANDBOX" | "STAGING" | "PRODUCTION";
export type NetworkState = "DISABLED" | "ARMED" | "ENABLED";
export type ActivationStatus =
  | "DRAFT"
  | "PRECHECK"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "BLOCKED"
  | "ACTIVATING"
  | "ACTIVE"
  | "EXPIRED"
  | "REVOKED"
  | "CANCELLED"
  | "COMPLETED";

export type FirstOrderGateStatus =
  | "PREPARED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "BLOCKED"
  | "EXECUTING"
  | "SENT"
  | "CONFIRMED"
  | "FAILED"
  | "CANCELLED";

export type ActivationRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "BLOCKED";
export type PreflightCheckStatus = "PASS" | "FAIL" | "BLOCKED" | "SKIPPED" | "WARNING";

export interface SupplierOrderActivationApproval {
  approvalId: string;
  activationId: string;
  requesterId: string;
  approverId: string;
  scope: {
    supplierId: string;
    adapterProfile: string;
    environment: ActivationEnvironment;
    market: string;
    channel: ReadinessChannel;
    maxOrderValue: number;
    maxDailyOrderValue: number;
    maxOrders: number;
    riskLevel: ActivationRiskLevel;
  };
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  createdAt: string;
  expiresAt: string;
  scopeHash: string;
}

export interface PreflightCheckResult {
  check: string;
  category: string;
  status: PreflightCheckStatus;
  message: string;
  blocking?: boolean;
  detail?: Record<string, unknown>;
}

export interface SupplierOrderActivationRequest {
  activationId: string;
  supplierId: string;
  adapterProfile: string;
  environment: ActivationEnvironment;
  market: string;
  channel: ReadinessChannel;
  requestedBy: string;
  approvedBy?: string;
  orderScope?: Record<string, unknown>;
  customerScope?: Record<string, unknown>;
  maxOrderValue?: number;
  maxDailyOrderValue?: number;
  maxOrders?: number;
  riskLevel: ActivationRiskLevel;
  readinessId?: string;
  validationId?: string;
  rehearsalId?: string;
  approvalId?: string;
  killSwitchState?: Record<string, unknown>;
  networkState: NetworkState;
  realOrderSent: boolean;
  status: ActivationStatus;
  reason?: string;
  correlationId: string;
  idempotencyKey: string;
  preflightChecks?: PreflightCheckResult[];
  confirmationNonce?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface FirstSupplierOrderGate {
  firstOrderId: string;
  activationId: string;
  supplierId: string;
  market: string;
  channel: ReadinessChannel;
  orderValue: number;
  currency: string;
  readinessStatus?: string;
  approvalStatus?: string;
  riskLevel?: string;
  limitsStatus?: string;
  killSwitchState?: string;
  networkState: NetworkState;
  orderPayloadHash: string;
  supplierPayloadHash: string;
  inventoryReservationId?: string;
  priceSnapshotId?: string;
  status: FirstOrderGateStatus;
  createdAt: string;
  expiresAt: string;
  correlationId: string;
  idempotencyKey: string;
}

export interface ActivationPreflightInput {
  supplierId: string;
  market: string;
  channel: ReadinessChannel;
  environment?: ActivationEnvironment;
  requester: string;
  correlationId?: string;
  orderValue?: number;
  rehearsalId?: string;
}

export interface CreateActivationInput {
  supplierId?: string;
  market?: string;
  channel?: ReadinessChannel;
  environment?: ActivationEnvironment;
  requester: string;
  approver?: string;
  correlationId?: string;
  idempotencyKey?: string;
  maxOrderValue?: number;
  maxDailyOrderValue?: number;
  maxOrders?: number;
  orderScope?: Record<string, unknown>;
  customerScope?: Record<string, unknown>;
  rehearsalId?: string;
}

export interface ActivationSafetyCounters {
  realSupplierOrderCalls: number;
  realSupplierCancelCalls: number;
  realSupplierReturnCalls: number;
  realSupplierRefundCalls: number;
  realPaymentCalls: number;
  realMarketplaceCalls: number;
  realCarrierCalls: number;
  realCustomerShipments: number;
}

export interface ActivationDashboard {
  activationCount: number;
  blocked: number;
  approved: number;
  armed: number;
  active: number;
  firstOrdersPrepared: number;
  firstOrdersSent: number;
  realSupplierOrderNetwork: "DISABLED" | "ENABLED";
  interCarsCreateOrder: "UNVERIFIED" | "VALIDATED";
  productionActivation: "NOT ACTIVE" | "ARMED" | "ACTIVE";
  firstRealOrder: "NOT SENT" | "SENT";
  networkState: NetworkState;
  safety: ActivationSafetyCounters;
}

export interface FirstOrderPreview {
  supplierId: string;
  environment: ActivationEnvironment;
  market: string;
  channel: ReadinessChannel;
  orderValue: number;
  currency: string;
  itemCount: number;
  orderPayloadHash: string;
  supplierPayloadHash: string;
  inventoryReservationId?: string;
  priceSnapshotId?: string;
  readinessStatus: string;
  approvalStatus: string;
  riskLevel: string;
  killSwitchActive: boolean;
  networkState: NetworkState;
  createOrderCapability: string;
  gates: PreflightCheckResult[];
  httpCallsMade: number;
}

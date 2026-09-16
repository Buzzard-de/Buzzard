import type { ReadinessChannel } from "@/lib/supplier-order-readiness/types";
import type { ValidationEvidence } from "@/lib/supplier-production-order-arming/types";

export type FirstProductionOrderState =
  | "BLOCKED"
  | "ELIGIBLE"
  | "FIRST_ORDER_READY"
  | "APPROVED"
  | "EXECUTION_AUTHORIZED"
  | "EXECUTING"
  | "EXECUTED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED"
  | "UNKNOWN_OUTCOME"
  | "KILL_SWITCHED"
  | "EXECUTION_FAILED";

export type FirstOrderCheckStatus = "PASS" | "FAIL" | "BLOCKED" | "SKIPPED" | "WARNING";

export interface FirstProductionOrderScope {
  supplier: string;
  market: string;
  channel: ReadinessChannel;
  environment: "SANDBOX" | "PRODUCTION";
  currency: string;
  allowedProductCategory?: string;
  allowedSku?: string;
}

export interface FirstProductionOrderLimits {
  maximumQuantity: number;
  maximumOrderValue: number;
  allowedSupplier: string;
  allowedMarket: string;
  allowedCurrency: string;
  allowedProductCategory?: string;
  allowedSku?: string;
}

export interface FirstProductionOrderPayload {
  orderId: string;
  purpose: "FIRST_PRODUCTION_ORDER";
  supplierId: string;
  market: string;
  channel: ReadinessChannel;
  items: Array<{ sku: string; quantity: number; unitCost: number }>;
  shippingAddress: { country: string; city: string; postalCode?: string };
  currency: string;
  inventoryReservationId: string;
  priceSnapshotId: string;
  priceSnapshotHash: string;
  supplierAssignmentSnapshotId: string;
  payloadHash: string;
  armingId: string;
}

export interface FirstProductionOrderApproval {
  approvalId: string;
  executionId: string;
  requesterId: string;
  primaryApproverId: string;
  secondaryApproverId?: string;
  scope: FirstProductionOrderScope;
  limits: FirstProductionOrderLimits;
  payloadHash: string;
  validationEvidence: ValidationEvidence;
  armingId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  createdAt: string;
  expiresAt: string;
  scopeHash: string;
}

export interface ExecutionAuthorization {
  authorizationId: string;
  executionId: string;
  orderId: string;
  supplier: string;
  payloadHash: string;
  approvalId: string;
  armingId: string;
  scope: FirstProductionOrderScope;
  limits: FirstProductionOrderLimits;
  nonce: string;
  status: "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
}

export interface FirstOrderCheckResult {
  check: string;
  category: string;
  status: FirstOrderCheckStatus;
  message: string;
  blocking?: boolean;
}

export interface FirstProductionOrderRecord {
  executionId: string;
  orderId: string;
  supplier: string;
  state: FirstProductionOrderState;
  scope: FirstProductionOrderScope;
  limits: FirstProductionOrderLimits;
  payload: FirstProductionOrderPayload;
  validationId: string;
  armingId: string;
  approval?: FirstProductionOrderApproval;
  authorization?: ExecutionAuthorization;
  supplierOrderReference?: string;
  blockerCodes: string[];
  checks: FirstOrderCheckResult[];
  correlationId: string;
  idempotencyKey: string;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  executedAt?: string;
  unknownOutcome?: boolean;
}

export interface FirstProductionOrderInput {
  orderId?: string;
  armingId?: string;
  supplier?: string;
  market?: string;
  channel?: ReadinessChannel;
  environment?: "SANDBOX" | "PRODUCTION";
  currency?: string;
  requester: string;
  correlationId?: string;
  idempotencyKey?: string;
  payload?: Partial<FirstProductionOrderPayload>;
}

export interface FirstProductionOrderDashboard {
  executionCount: number;
  blocked: number;
  ready: number;
  authorized: number;
  executed: number;
  unknownOutcomes: number;
  createOrderCapability: "VALIDATED" | "UNVERIFIED" | "BLOCKED";
  validationEvidence: "PRESENT" | "NONE";
  armingState: string;
  firstOrderState: FirstProductionOrderState;
  productionOrderNetwork: "OFF" | "ON";
  realSupplierHttpCalls: number;
  realSupplierOrders: number;
  realCustomerOrders: number;
  marketplaceSideEffects: number;
  paymentSideEffects: number;
  carrierSideEffects: number;
  customerNotifications: number;
  blockers: string[];
}

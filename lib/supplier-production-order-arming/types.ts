import type { ReadinessChannel } from "@/lib/supplier-order-readiness/types";

export type ArmingStatus = "ARMING_BLOCKED" | "ARMING_READY" | "ARMED" | "EXPIRED" | "DISARMED" | "REJECTED";
export type ArmingEnvironment = "SANDBOX" | "STAGING" | "PRODUCTION";
export type ArmingCheckStatus = "PASS" | "FAIL" | "BLOCKED" | "SKIPPED" | "WARNING";

export interface ProductionArmingScope {
  supplier: string;
  market: string;
  channel: ReadinessChannel;
  environment: ArmingEnvironment;
  currency: string;
  allowedProductCategory?: string;
}

export interface ProductionArmingLimits {
  maximumQuantity: number;
  maximumOrderValue: number;
  allowedSupplier: string;
  allowedMarket: string;
  allowedCurrency: string;
  allowedProductCategory?: string;
}

export interface ValidationEvidence {
  validationId: string;
  supplier: string;
  orderReference?: string;
  payloadHash?: string;
  supplierOrderReference?: string;
  validationTimestamp: string;
  result: string;
  approvalReference?: string;
  liveValidation: string;
  createOrderCapability: string;
  productionValidated: boolean;
}

export interface ProductionArmingApproval {
  approvalId: string;
  armingId: string;
  requesterId: string;
  approverId: string;
  scope: ProductionArmingScope;
  limits: ProductionArmingLimits;
  validationEvidence: ValidationEvidence;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  createdAt: string;
  expiresAt: string;
  scopeHash: string;
}

export interface ArmingCheckResult {
  check: string;
  category: string;
  status: ArmingCheckStatus;
  message: string;
  blocking?: boolean;
  detail?: Record<string, unknown>;
}

export interface ProductionOrderArmingRecord {
  armingId: string;
  supplier: string;
  scope: ProductionArmingScope;
  limits: ProductionArmingLimits;
  validationEvidence: ValidationEvidence;
  approval?: ProductionArmingApproval;
  status: ArmingStatus;
  blockerCodes: string[];
  checks: ArmingCheckResult[];
  correlationId: string;
  idempotencyKey: string;
  requestedBy: string;
  approvedBy?: string;
  armedBy?: string;
  disarmedBy?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  armedAt?: string;
  disarmedAt?: string;
}

export interface ProductionArmingInput {
  supplier?: string;
  market?: string;
  channel?: ReadinessChannel;
  environment?: ArmingEnvironment;
  currency?: string;
  requester: string;
  correlationId?: string;
  idempotencyKey?: string;
}

export interface ProductionArmingDashboard {
  armingCount: number;
  armed: number;
  blocked: number;
  ready: number;
  expired: number;
  createOrderCapability: "VALIDATED" | "UNVERIFIED" | "BLOCKED";
  validationEvidence: "PRESENT" | "NONE";
  armingState: ArmingStatus;
  productionReadiness: "PASS" | "BLOCKED";
  killSwitch: "ON" | "OFF";
  productionOrderNetwork: "OFF" | "ON";
  realSupplierOrderCalls: number;
  realCustomerOrders: number;
  blockers: string[];
  lastArmingAt?: string;
}

import type { ReadinessChannel } from "@/lib/supplier-order-readiness/types";

export type ValidationMode = "MOCK" | "SANDBOX" | "VALIDATION" | "CONTROLLED_VALIDATION" | "PRODUCTION";
export type ControlledValidationStatus = "PASS" | "BLOCKED" | "SKIPPED" | "FAIL" | "PENDING";
export type CreateOrderCapabilityStatus = "UNVERIFIED" | "VALIDATED" | "BLOCKED";
export type ValidationEnvironment = "SANDBOX" | "STAGING" | "PRODUCTION";
export type ValidationOverallStatus = "PENDING" | "RUNNING" | "PASSED" | "FAILED" | "BLOCKED" | "SKIPPED";
export type ValidationCheckStatus = "PASS" | "FAIL" | "BLOCKED" | "SKIPPED" | "WARNING";

export type SupplierResponseClass =
  | "accepted"
  | "rejected"
  | "pending"
  | "duplicate"
  | "validation_error"
  | "authentication_error"
  | "authorization_error"
  | "rate_limited"
  | "server_error"
  | "unknown";

export type SupplierOrderStatusClass =
  | "SUBMITTED"
  | "ACCEPTED"
  | "REJECTED"
  | "PROCESSING"
  | "SHIPPED"
  | "CANCELLED"
  | "UNKNOWN";

export interface CreateOrderCapabilityState {
  declared: boolean;
  configured: boolean;
  authenticated: boolean;
  endpointAvailable: boolean;
  requestValidated: boolean;
  responseValidated: boolean;
  idempotencyValidated: boolean;
  errorHandlingValidated: boolean;
  statusValidated: boolean;
  trackingValidated: boolean;
  productionValidated: boolean;
}

export interface ValidationCheckResult {
  check: string;
  category: string;
  status: ValidationCheckStatus;
  message: string;
  blocking?: boolean;
  detail?: Record<string, unknown>;
}

export interface ControlledValidationScope {
  market: string;
  channel: ReadinessChannel;
  environment: ValidationEnvironment;
}

export interface ControlledValidationApproval {
  approvalId: string;
  validationId: string;
  supplier: string;
  scope: ControlledValidationScope;
  maximumQuantity: number;
  maximumValue: number;
  currency: string;
  allowedProduct: string;
  allowedMarket: string;
  expiresAt: string;
  approvedBy: string;
  approvalTimestamp: string;
  orderReference: string;
  payloadHash: string;
  confirmationNonce: string;
  status: "APPROVED" | "REVOKED" | "EXPIRED";
}

export interface ControlledValidationRun {
  validationId: string;
  supplier: string;
  orderReference: string;
  orderId?: string;
  market: string;
  channel: ReadinessChannel;
  environment: ValidationEnvironment;
  allowedProduct: string;
  allowedMarket: string;
  payloadHash?: string;
  approvalStatus: "APPROVED" | "MISSING" | "EXPIRED" | "REVOKED";
  preflightPassed: boolean;
  liveValidation: ControlledValidationStatus;
  createOrderCapability: CreateOrderCapabilityStatus;
  capabilityState?: CreateOrderCapabilityState;
  supplierOrderReference?: string;
  responseClass?: SupplierResponseClass;
  unknownOutcome: boolean;
  humanReviewRequired: boolean;
  httpCallsMade: number;
  blockerCodes: string[];
  checks: ValidationCheckResult[];
  idempotencyKey: string;
  correlationId: string;
  validationMode: ValidationMode;
  overallStatus: ValidationOverallStatus;
  approvedBy?: string;
  requester: string;
  createdAt: string;
  updatedAt: string;
}

export interface ControlledValidationRunInput {
  validationId?: string;
  supplier?: string;
  market?: string;
  channel?: ReadinessChannel;
  environment?: ValidationEnvironment;
  orderId?: string;
  orderReference?: string;
  allowedProduct?: string;
  allowedMarket?: string;
  requester: string;
  approver?: string;
  correlationId?: string;
  idempotencyKey?: string;
  validationMode?: ValidationMode;
  payloadHash?: string;
  humanConfirmation?: boolean;
  confirmationNonce?: string;
  failureInjection?: string;
  transport?: import("@/lib/supplier-engine/network/types").SupplierTransport;
}

export interface ControlledValidationRunResult {
  run: ControlledValidationRun;
  httpCallsMade: number;
  safety: CreateOrderValidationSafetyCounters;
}

export interface SupplierProductionOrderValidation {
  validationId: string;
  supplierId: string;
  adapterProfile: string;
  environment: ValidationEnvironment;
  market: string;
  channel: ReadinessChannel;
  orderId?: string;
  createOrderCapability: CreateOrderCapabilityStatus;
  capabilityState: CreateOrderCapabilityState;
  trackingCapability: "UNVERIFIED" | "VALIDATED" | "DECLARED";
  validationMode: ValidationMode;
  requestPayloadHash?: string;
  responseClass?: SupplierResponseClass;
  supplierOrderId?: string;
  unknownOutcome: boolean;
  humanReviewRequired: boolean;
  blockerCodes: string[];
  correlationId: string;
  idempotencyKey: string;
  overallStatus: ValidationOverallStatus;
  checks: ValidationCheckResult[];
  createdAt: string;
  updatedAt: string;
  failureInjection?: string;
  controlledValidation?: boolean;
  liveValidation?: ControlledValidationStatus;
}

export interface CreateOrderValidationInput {
  supplierId?: string;
  market?: string;
  channel?: ReadinessChannel;
  environment?: ValidationEnvironment;
  orderId?: string;
  requester: string;
  approver?: string;
  correlationId?: string;
  idempotencyKey?: string;
  validationMode?: ValidationMode;
  failureInjection?: string;
  /** Explicit human confirmation for controlled validation */
  humanConfirmation?: boolean;
  confirmationNonce?: string;
}

export interface CreateOrderValidationSafetyCounters {
  controlledValidationHttpCalls: number;
  realSupplierOrderCalls: number;
  realSupplierCancelCalls: number;
  realSupplierReturnCalls: number;
  realSupplierRefundCalls: number;
  realPaymentCalls: number;
  realMarketplaceCalls: number;
  realCarrierCalls: number;
  realCustomerOrders: number;
  realCustomerShipments: number;
}

export interface CreateOrderValidationDashboard {
  controlledValidationEnabled: boolean;
  controlledValidationNetwork: "OFF" | "SCOPED";
  lastControlledValidation?: ControlledValidationStatus;
  lastControlledValidationAt?: string;
  credentialsStatus: "CONFIGURED" | "NOT_CONFIGURED" | "INVALID";
  apiAccessStatus: "AVAILABLE" | "NOT_AVAILABLE" | "UNKNOWN";
  validationCount: number;
  passed: number;
  blocked: number;
  failed: number;
  skipped: number;
  createOrderCapability: CreateOrderCapabilityStatus;
  trackingCapability: "UNVERIFIED" | "VALIDATED" | "DECLARED";
  productionOrderNetwork: "OFF" | "ON";
  realSupplierOrderCalls: number;
  realCustomerOrders: number;
  lastValidationAt?: string;
  blockers: string[];
  safety: CreateOrderValidationSafetyCounters;
}

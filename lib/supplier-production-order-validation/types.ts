import type { ReadinessChannel } from "@/lib/supplier-order-readiness/types";

export type ValidationMode = "MOCK" | "SANDBOX" | "VALIDATION" | "PRODUCTION";
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

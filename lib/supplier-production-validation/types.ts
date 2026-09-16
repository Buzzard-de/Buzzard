import type { ReadinessChannel } from "@/lib/supplier-order-readiness/types";

export type ValidationEnvironment = "SANDBOX" | "STAGING" | "PRODUCTION";
export type CredentialStatus =
  | "NOT_CONFIGURED"
  | "CONFIGURED"
  | "VALID"
  | "INVALID"
  | "EXPIRED"
  | "REVOKED"
  | "MISMATCH"
  | "BLOCKED";

export type CapabilityStatus =
  | "NOT_CONFIGURED"
  | "DECLARED"
  | "UNVERIFIED"
  | "VALIDATED"
  | "LIVE_READ_VALIDATED"
  | "SKIPPED"
  | "BLOCKED";

export type ValidationOverallStatus = "PENDING" | "RUNNING" | "PASSED" | "FAILED" | "BLOCKED" | "SKIPPED";
export type ValidationCheckStatus = "PASS" | "FAIL" | "BLOCKED" | "SKIPPED" | "WARNING";

export type EndpointClassification =
  | "HEALTH"
  | "CATALOG"
  | "STOCK"
  | "PRICE"
  | "ORDER_CREATE"
  | "ORDER_STATUS"
  | "TRACKING"
  | "RETURN"
  | "REFUND"
  | "UNKNOWN";

export type FailureInjectionType =
  | "NONE"
  | "CREDENTIAL_MISSING"
  | "CREDENTIAL_INVALID"
  | "CREDENTIAL_EXPIRED"
  | "ENVIRONMENT_MISMATCH"
  | "ENDPOINT_MISMATCH"
  | "HEALTH_FAILURE"
  | "CATALOG_FAILURE"
  | "STOCK_FAILURE"
  | "PRICE_FAILURE"
  | "STALE_DATA"
  | "MALFORMED_JSON"
  | "MALFORMED_XML"
  | "SSRF_URL"
  | "PRIVATE_IP"
  | "REDIRECT_ATTACK"
  | "UNKNOWN_ENDPOINT"
  | "POST_ORDER_ENDPOINT"
  | "SUPPLIER_DISABLED"
  | "MARKET_UNSUPPORTED"
  | "CHANNEL_UNSUPPORTED"
  | "CAPABILITY_MISMATCH"
  | "KILL_SWITCH"
  | "READINESS_BLOCKER";

export interface ValidationScope {
  supplierId: string;
  market: string;
  channel: ReadinessChannel;
  environment: ValidationEnvironment;
  adapterProfile?: string;
}

export interface ValidationCheckResult {
  check: string;
  status: ValidationCheckStatus;
  message: string;
  detail?: Record<string, unknown>;
}

export interface SupplierProductionCapabilityValidation {
  validationId: string;
  supplierId: string;
  adapterProfile: string;
  environment: ValidationEnvironment;
  market: string;
  channel: ReadinessChannel;
  credentialStatus: CredentialStatus;
  credentialType: string;
  healthStatus: CapabilityStatus;
  catalogReadStatus: CapabilityStatus;
  stockReadStatus: CapabilityStatus;
  priceReadStatus: CapabilityStatus;
  createOrderCapability: CapabilityStatus;
  orderStatusCapability: CapabilityStatus;
  trackingCapability: CapabilityStatus;
  returnCapability: CapabilityStatus;
  refundCapability: CapabilityStatus;
  dropshippingCapability: CapabilityStatus;
  blindShippingCapability: CapabilityStatus;
  whiteLabelCapability: CapabilityStatus;
  liveReadTimestamp?: string;
  capabilityVersion: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "BLOCKED";
  readinessStatus: "READY" | "BLOCKED" | "UNKNOWN";
  blockerCodes: string[];
  correlationId: string;
  idempotencyKey: string;
  overallStatus: ValidationOverallStatus;
  checks: ValidationCheckResult[];
  createdAt: string;
  updatedAt: string;
  failureInjection?: FailureInjectionType;
}

export interface ProductionValidationInput {
  supplierId?: string;
  market?: string;
  channel?: ReadinessChannel;
  environment?: ValidationEnvironment;
  requester: string;
  correlationId?: string;
  idempotencyKey?: string;
  failureInjection?: FailureInjectionType;
  /** When true, run read-only live probes if guards allow */
  allowLiveRead?: boolean;
}

export interface ProductionValidationSafetyCounters {
  realHealthCalls: number;
  realCatalogCalls: number;
  realStockCalls: number;
  realPriceCalls: number;
  realOrderCalls: number;
  realCancelCalls: number;
  realReturnCalls: number;
  realRefundCalls: number;
  realTrackingCalls: number;
  realCustomerShipments: number;
  realPaymentCaptures: number;
  realMarketplaceSubmissions: number;
  realCarrierCalls: number;
}

export interface ProductionValidationDashboard {
  validationCount: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  running: number;
  suppliersValidated: number;
  marketsValidated: number;
  channelsValidated: number;
  lastValidationAt?: string;
  realSupplierOrderNetwork: "DISABLED" | "ENABLED";
  liveReadMode: "CONTROLLED" | "DISABLED";
  productionOrderActivation: "NOT ACTIVE";
  safety: ProductionValidationSafetyCounters;
}

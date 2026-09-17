import type { ReadinessChannel } from "@/lib/supplier-order-readiness/types";

export type FulfillmentPipelineStage =
  | "CUSTOMER_ORDER"
  | "PAYMENT_CONFIRMED"
  | "PRICE_SNAPSHOT"
  | "INVENTORY_RESERVATION"
  | "SUPPLIER_SELECTION"
  | "SUPPLIER_READINESS"
  | "FOUR_EYES_APPROVAL"
  | "RISK_EVALUATION"
  | "LIMITS"
  | "KILL_SWITCH"
  | "PAYLOAD_CONSTRUCTION"
  | "PII_MINIMIZATION"
  | "PAYLOAD_HASH"
  | "IDEMPOTENCY"
  | "EXECUTION_AUTHORIZATION"
  | "SUPPLIER_CREATE_ORDER"
  | "SUPPLIER_CONFIRMATION"
  | "SHIPMENT"
  | "TRACKING"
  | "FCT_RECONCILIATION"
  | "FINANCIAL_RECONCILIATION";

export type FulfillmentPipelineState =
  | "BLOCKED"
  | "READY"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "UNKNOWN_OUTCOME"
  | "FAILED"
  | "KILL_SWITCHED";

export type StageCheckStatus = "PASS" | "FAIL" | "BLOCKED" | "SKIPPED" | "MOCK";

export interface FulfillmentPipelineScope {
  supplierId: string;
  market: string;
  channel: ReadinessChannel;
  environment: "SANDBOX" | "PRODUCTION";
  currency: string;
}

export interface FulfillmentPipelineLimits {
  maximumOrderValue: number;
  maximumQuantity: number;
  allowedSupplier: string;
  allowedMarket: string;
  singleOrderOnly: true;
}

export interface FulfillmentPipelineRecord {
  pipelineId: string;
  orderId: string;
  state: FulfillmentPipelineState;
  currentStage: FulfillmentPipelineStage;
  scope: FulfillmentPipelineScope;
  limits: FulfillmentPipelineLimits;
  payloadHash?: string;
  idempotencyKey: string;
  nonce: string;
  nonceUsed: boolean;
  approvalId?: string;
  authorizationId?: string;
  supplierOrderReference?: string;
  unknownOutcome: boolean;
  dryRun: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface StageCheckResult {
  stage: FulfillmentPipelineStage;
  status: StageCheckStatus;
  message: string;
}

export interface FulfillmentPipelineDashboard {
  version: string;
  pipelineState: FulfillmentPipelineState;
  liveStatus: "BLOCKED" | "NOT_CONFIGURED" | "UNVERIFIED";
  productionEnabled: "DISABLED" | "BLOCKED";
  upstreamFirstOrderGate: string;
  supplierOrderNetwork: "ON" | "OFF";
  createOrderCapability: "VALIDATED" | "UNVERIFIED" | "BLOCKED";
  safetyCounters: {
    realSupplierOrders: number;
    realCustomerOrders: number;
    realHttpCalls: number;
    unknownOutcomes: number;
    mockExecutions: number;
  };
  blockers: string[];
}

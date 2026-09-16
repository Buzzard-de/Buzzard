import type { ReadinessChannel } from "@/lib/supplier-order-readiness/types";

export type RehearsalOverallStatus = "PENDING" | "RUNNING" | "PASSED" | "FAILED" | "BLOCKED" | "CANCELLED";
export type RehearsalStageStatus = "PENDING" | "RUNNING" | "PASS" | "FAIL" | "BLOCKED" | "SKIPPED";

export type RehearsalStageName =
  | "CUSTOMER_ORDER"
  | "ORDER_VALIDATION"
  | "PAYMENT_STATE"
  | "PRICE_SNAPSHOT"
  | "INVENTORY_RESERVATION"
  | "SUPPLIER_SELECTION"
  | "SUPPLIER_READINESS"
  | "APPROVAL"
  | "RISK_EVALUATION"
  | "ORDER_LIMIT"
  | "KILL_SWITCH"
  | "SUPPLIER_ORDER_PAYLOAD"
  | "PII_FILTERING"
  | "ACTIVATION_BOUNDARY"
  | "SANDBOX_SUPPLIER_ACCEPTANCE"
  | "SIMULATED_CONFIRMATION"
  | "SIMULATED_SHIPMENT"
  | "SIMULATED_TRACKING"
  | "CONTROL_TOWER_RECONCILIATION"
  | "FINAL_AUDIT"
  | "REHEARSAL_RESULT";

export const REHEARSAL_STAGE_ORDER: RehearsalStageName[] = [
  "CUSTOMER_ORDER",
  "ORDER_VALIDATION",
  "PAYMENT_STATE",
  "PRICE_SNAPSHOT",
  "INVENTORY_RESERVATION",
  "SUPPLIER_SELECTION",
  "SUPPLIER_READINESS",
  "APPROVAL",
  "RISK_EVALUATION",
  "ORDER_LIMIT",
  "KILL_SWITCH",
  "SUPPLIER_ORDER_PAYLOAD",
  "PII_FILTERING",
  "ACTIVATION_BOUNDARY",
  "SANDBOX_SUPPLIER_ACCEPTANCE",
  "SIMULATED_CONFIRMATION",
  "SIMULATED_SHIPMENT",
  "SIMULATED_TRACKING",
  "CONTROL_TOWER_RECONCILIATION",
  "FINAL_AUDIT",
  "REHEARSAL_RESULT",
];

export type FailureInjectionType =
  | "NONE"
  | "MISSING_CREDENTIAL"
  | "SUPPLIER_DISABLED"
  | "STALE_STOCK"
  | "PRICE_MISMATCH"
  | "INVENTORY_RESERVATION_FAILURE"
  | "READINESS_BLOCKED"
  | "APPROVAL_EXPIRED"
  | "SELF_APPROVAL"
  | "RISK_LIMIT_EXCEEDED"
  | "KILL_SWITCH_ENABLED"
  | "CONNECTOR_UNAVAILABLE"
  | "TIMEOUT"
  | "HTTP_429"
  | "HTTP_5XX"
  | "MALFORMED_SUPPLIER_RESPONSE"
  | "DUPLICATE_ORDER"
  | "DUPLICATE_TRACKING"
  | "CONTROL_TOWER_MISMATCH";

export interface RehearsalStageResult {
  stage: RehearsalStageName;
  status: RehearsalStageStatus;
  message: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  detail?: Record<string, unknown>;
}

export interface SupplierOrderGoLiveRehearsal {
  rehearsalId: string;
  orderId: string;
  supplierId: string;
  market: string;
  channel: ReadinessChannel;
  environment: "SANDBOX" | "PRODUCTION";
  readinessId?: string;
  approvalId?: string;
  riskLevel?: string;
  orderValue?: number;
  inventoryReservationId?: string;
  priceSnapshotId?: string;
  supplierOrderPayloadId?: string;
  simulatedSupplierOrderId?: string;
  simulatedTrackingId?: string;
  currentStage: RehearsalStageName;
  overallStatus: RehearsalOverallStatus;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  correlationId: string;
  idempotencyKey: string;
  stages: RehearsalStageResult[];
  supplierOrderClassification: "SANDBOX" | "LIVE" | "UNKNOWN";
  simulatedResponse: boolean;
  realActivationBlocked: boolean;
  reconciliationResult?: Record<string, unknown>;
  auditEventCount: number;
  failureInjection?: FailureInjectionType;
}

export interface GoLiveRehearsalInput {
  market?: string;
  channel?: ReadinessChannel;
  productId?: string;
  orderId?: string;
  supplierId?: string;
  orderValue?: number;
  requester: string;
  approver?: string;
  correlationId?: string;
  idempotencyKey?: string;
  failureInjection?: FailureInjectionType;
  resumeRehearsalId?: string;
}

export interface RehearsalSafetyCounters {
  realSupplierOrderHttpCalls: number;
  realCustomerShipments: number;
  realPaymentCaptures: number;
  realMarketplaceSubmissions: number;
  realCarrierCalls: number;
  realSupplierReturns: number;
  realSupplierRefunds: number;
}

export interface RehearsalDashboard {
  rehearsalCount: number;
  passed: number;
  failed: number;
  blocked: number;
  running: number;
  criticalFailures: number;
  suppliersTested: number;
  marketsTested: number;
  channelsTested: number;
  averageDurationMs: number;
  realSupplierOrderNetwork: "DISABLED" | "ENABLED";
  rehearsalMode: "ACTIVE" | "COMPLETE";
  safety: RehearsalSafetyCounters;
}

export interface RehearsalAuditEvent {
  eventId: string;
  type: string;
  rehearsalId?: string;
  orderId?: string;
  supplierId?: string;
  correlationId: string;
  timestamp: string;
  detail?: Record<string, unknown>;
}

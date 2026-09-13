import type { SupplierOrderRequest } from "../types";

export type SupplierOrderSandboxStatus =
  | "PREPARED"
  | "VALIDATED"
  | "SANDBOX_ACCEPTED"
  | "SUPPLIER_PENDING"
  | "SUPPLIER_CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED";

export type SupplierOrderFailureClass = "RETRYABLE" | "PERMANENT";

export interface SupplierOrderPayloadLine {
  productId?: string;
  supplierSku: string;
  quantity: number;
  unitPrice: number;
  currency: string;
}

export interface SupplierOrderPayload {
  buzzardOrderId: string;
  supplierId: string;
  correlationId: string;
  idempotencyKey: string;
  lines: SupplierOrderPayloadLine[];
  shippingDestination: Record<string, string>;
  billingContext?: Record<string, string>;
  customerReference?: string;
  currency: string;
  priceSnapshotIds?: string[];
  dropshipping: boolean;
  whiteLabel: boolean;
  blindShipping: boolean;
  source: "SANDBOX";
}

export interface SupplierOrderSandboxTracking {
  supplierOrderReference: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  shipmentStatus: string;
  simulated: true;
}

export interface SupplierOrderSandboxRecord {
  supplierOrderId: string;
  buzzardOrderId: string;
  supplierId: string;
  status: SupplierOrderSandboxStatus;
  idempotencyKey: string;
  correlationId: string;
  payload: SupplierOrderPayload;
  tracking?: SupplierOrderSandboxTracking;
  failureClass?: SupplierOrderFailureClass;
  failureCode?: string;
  failureMessage?: string;
  latencyMs: number;
  sandbox: true;
  networkDispatched: false;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierOrderSandboxResult {
  ok: boolean;
  sandbox: true;
  source: "SANDBOX" | "IDEMPOTENT_REPLAY";
  supplierOrderId?: string;
  status: SupplierOrderSandboxStatus | string;
  message: string;
  idempotentReplay?: boolean;
  tracking?: SupplierOrderSandboxTracking;
  payload?: SupplierOrderPayload;
  failureClass?: SupplierOrderFailureClass;
  dryRun: true;
}

export interface SupplierOrderSandboxInput extends SupplierOrderRequest {
  idempotencyKey?: string;
  correlationId?: string;
  productId?: string;
  currency?: string;
  priceSnapshotId?: string;
  customerReference?: string;
  billingAddress?: Record<string, string>;
  /** Test-only failure injection */
  _testFailure?: string;
  _testSimulateTimeout?: boolean;
}

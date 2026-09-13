import { randomUUID } from "crypto";
import { bootstrapSupplierEnginePersistence } from "../bootstrap";
import { getSupplier, isSupplierSelectable } from "../registry";
import { getSupplierHealth } from "../health";
import { isSupplierOrderNetworkEnabled } from "../network";
import { recordSupplierEngineAudit } from "../audit";
import { redactSecrets } from "../security";
import {
  buildDeterministicSandboxOrderId,
  buildSandboxTracking,
  buildSupplierOrderIdempotencyKey,
  validateSandboxPayload,
} from "./sandboxAdapter";
import { filterSupplierFulfillmentAddress, sanitizePayloadForInspection, assertNoSecretsInPayload } from "./piiFilter";
import { assertSupplierOrderTransition } from "./lifecycle";
import { failureResult } from "./failures";
import { assertOrderSandboxNetworkSafety } from "./networkSafety";
import {
  getLastSupplierOrderSandboxForSupplier,
  getSupplierOrderSandboxByIdempotency,
  saveSupplierOrderSandboxRecord,
} from "./persistence";
import type {
  SupplierOrderPayload,
  SupplierOrderSandboxInput,
  SupplierOrderSandboxRecord,
  SupplierOrderSandboxResult,
} from "./types";

const inflightSandbox = new Map<string, Promise<SupplierOrderSandboxResult>>();

function buildPayload(input: SupplierOrderSandboxInput): SupplierOrderPayload {
  const idempotencyKey =
    input.idempotencyKey || buildSupplierOrderIdempotencyKey(input.orderId, input.supplierId);
  return {
    buzzardOrderId: input.orderId,
    supplierId: input.supplierId,
    correlationId: input.correlationId || randomUUID(),
    idempotencyKey,
    lines: input.lines.map((line) => ({
      productId: input.productId,
      supplierSku: line.supplierSku,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      currency: input.currency || "EUR",
    })),
    shippingDestination: filterSupplierFulfillmentAddress(input.shippingAddress),
    billingContext: input.billingAddress
      ? filterSupplierFulfillmentAddress(input.billingAddress)
      : undefined,
    customerReference: input.customerReference,
    currency: input.currency || "EUR",
    priceSnapshotIds: input.priceSnapshotId ? [input.priceSnapshotId] : undefined,
    dropshipping: input.dropshipping ?? false,
    whiteLabel: input.whiteLabel ?? false,
    blindShipping: input.blindShipping ?? false,
    source: "SANDBOX",
  };
}

function toResult(
  record: SupplierOrderSandboxRecord,
  replay = false
): SupplierOrderSandboxResult {
  return {
    ok: record.status !== "FAILED" && record.status !== "CANCELLED",
    sandbox: true,
    source: replay ? "IDEMPOTENT_REPLAY" : "SANDBOX",
    supplierOrderId: record.supplierOrderId,
    status: record.status,
    message: replay
      ? "Idempotent replay — existing sandbox supplier order returned"
      : "Sandbox supplier order accepted — no real supplier network dispatch",
    idempotentReplay: replay,
    tracking: record.tracking,
    payload: record.payload,
    failureClass: record.failureClass,
    dryRun: true,
  };
}

async function executeSupplierOrderSandbox(
  input: SupplierOrderSandboxInput
): Promise<SupplierOrderSandboxResult> {
  bootstrapSupplierEnginePersistence();
  const started = Date.now();
  assertOrderSandboxNetworkSafety();

  if (isSupplierOrderNetworkEnabled()) {
    const fail = failureResult("ORDER_NETWORK_ENABLED", "Real supplier order network must remain disabled");
    return {
      ok: false,
      sandbox: true,
      source: "SANDBOX",
      status: "FAILED",
      message: fail.failureMessage,
      failureClass: fail.failureClass,
      dryRun: true,
    };
  }

  const payload = buildPayload(input);
  const piiViolations = assertNoSecretsInPayload(payload as unknown as Record<string, unknown>);
  if (piiViolations.length) {
    return {
      ok: false,
      sandbox: true,
      source: "SANDBOX",
      status: "FAILED",
      message: "PII/security violation in payload",
      failureClass: "PERMANENT",
      dryRun: true,
    };
  }

  const existing = getSupplierOrderSandboxByIdempotency(payload.idempotencyKey);
  if (existing) {
    recordSupplierEngineAudit({
      supplierId: input.supplierId,
      action: "supplier.order_sandbox.idempotent_replay",
      metadata: {
        orderId: input.orderId,
        supplierOrderId: existing.supplierOrderId,
        idempotencyKey: payload.idempotencyKey,
      },
    });
    return toResult(existing, true);
  }

  const supplier = getSupplier(input.supplierId);
  if (!supplier) {
    return {
      ok: false,
      sandbox: true,
      source: "SANDBOX",
      status: "FAILED",
      message: "UNKNOWN_SUPPLIER",
      failureClass: "PERMANENT",
      dryRun: true,
    };
  }

  if (!isSupplierSelectable(input.supplierId)) {
    return {
      ok: false,
      sandbox: true,
      source: "SANDBOX",
      status: "FAILED",
      message: "SUPPLIER_DISABLED",
      failureClass: "PERMANENT",
      dryRun: true,
    };
  }

  const health = getSupplierHealth(input.supplierId);
  if (health.healthStatus === "UNHEALTHY" && !input._testFailure) {
    return {
      ok: false,
      sandbox: true,
      source: "SANDBOX",
      status: "FAILED",
      message: "CONNECTOR_UNHEALTHY",
      failureClass: "PERMANENT",
      dryRun: true,
    };
  }

  const validation = validateSandboxPayload(payload);
  if (!validation.valid) {
    return {
      ok: false,
      sandbox: true,
      source: "SANDBOX",
      status: "FAILED",
      message: validation.errors[0] || "PAYLOAD_VALIDATION_FAILED",
      failureClass: "PERMANENT",
      dryRun: true,
    };
  }

  if (input._testFailure) {
    const fail = failureResult(input._testFailure, input._testFailure);
    const now = new Date().toISOString();
    const failedRecord: SupplierOrderSandboxRecord = {
      supplierOrderId: buildDeterministicSandboxOrderId(
        payload.buzzardOrderId,
        payload.supplierId,
        payload.idempotencyKey
      ),
      buzzardOrderId: payload.buzzardOrderId,
      supplierId: payload.supplierId,
      status: "FAILED",
      idempotencyKey: payload.idempotencyKey,
      correlationId: payload.correlationId,
      payload,
      failureClass: fail.failureClass,
      failureCode: fail.failureCode,
      failureMessage: fail.failureMessage,
      latencyMs: Date.now() - started,
      sandbox: true,
      networkDispatched: false,
      createdAt: now,
      updatedAt: now,
    };
    saveSupplierOrderSandboxRecord(failedRecord);
    return toResult(failedRecord);
  }

  if (input._testSimulateTimeout) {
    const fail = failureResult("TIMEOUT", "Simulated supplier timeout");
    return {
      ok: false,
      sandbox: true,
      source: "SANDBOX",
      status: "FAILED",
      message: fail.failureMessage,
      failureClass: fail.failureClass,
      dryRun: true,
    };
  }

  const now = new Date().toISOString();
  const supplierOrderId = buildDeterministicSandboxOrderId(
    payload.buzzardOrderId,
    payload.supplierId,
    payload.idempotencyKey
  );

  let status: SupplierOrderSandboxRecord["status"] = "PREPARED";
  assertSupplierOrderTransition(status, "VALIDATED");
  status = "VALIDATED";
  assertSupplierOrderTransition(status, "SANDBOX_ACCEPTED");
  status = "SANDBOX_ACCEPTED";

  const tracking = buildSandboxTracking(supplierOrderId);
  const record: SupplierOrderSandboxRecord = {
    supplierOrderId,
    buzzardOrderId: payload.buzzardOrderId,
    supplierId: payload.supplierId,
    status,
    idempotencyKey: payload.idempotencyKey,
    correlationId: payload.correlationId,
    payload,
    tracking,
    latencyMs: Date.now() - started,
    sandbox: true,
    networkDispatched: false,
    createdAt: now,
    updatedAt: now,
  };

  saveSupplierOrderSandboxRecord(record);

  recordSupplierEngineAudit({
    supplierId: input.supplierId,
    action: "supplier.order_sandbox.accepted",
    correlationId: payload.correlationId,
    metadata: redactSecrets(
      sanitizePayloadForInspection({
        orderId: input.orderId,
        supplierOrderId,
        idempotencyKey: payload.idempotencyKey,
        status,
        latencyMs: record.latencyMs,
      }) as Record<string, unknown>
    ) as Record<string, unknown>,
  });

  return toResult(record);
}

export async function runSupplierOrderSandbox(
  input: SupplierOrderSandboxInput
): Promise<SupplierOrderSandboxResult> {
  const idempotencyKey =
    input.idempotencyKey || buildSupplierOrderIdempotencyKey(input.orderId, input.supplierId);
  const inflight = inflightSandbox.get(idempotencyKey);
  if (inflight) return inflight;

  const promise = executeSupplierOrderSandbox(input);
  inflightSandbox.set(idempotencyKey, promise);
  try {
    return await promise;
  } finally {
    inflightSandbox.delete(idempotencyKey);
  }
}

export function getSupplierOrderSandboxAdminSummary(supplierId: string) {
  const recent = getLastSupplierOrderSandboxForSupplier(supplierId);
  return {
    realSupplierOrderNetwork: "DISABLED",
    lastSandboxOrder: recent
      ? {
          supplierOrderId: recent.supplierOrderId,
          buzzardOrderId: recent.buzzardOrderId,
          status: recent.status,
          idempotencyKey: recent.idempotencyKey,
          latencyMs: recent.latencyMs,
          error: recent.failureCode,
          updatedAt: recent.updatedAt,
        }
      : null,
  };
}

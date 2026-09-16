import { createHash } from "crypto";
import { filterSupplierFulfillmentAddress } from "@/lib/supplier-engine/orderSandbox/piiFilter";
import { getArmingRecord } from "@/lib/supplier-production-order-arming/persistence";
import { hashCreateOrderPayload } from "@/lib/supplier-production-order-validation/payload";
import {
  FIRST_ORDER_TTL_MS,
  buildFirstOrderIdempotencyKey,
  getInterCarsSupplierId,
  resolveFirstProductionOrderLimits,
} from "./config";
import { evaluateFirstProductionOrderEligibility } from "./eligibility";
import { evaluateFirstProductionOrderLimits } from "./limits";
import { validateFirstOrderScope } from "./scope";
import type {
  FirstOrderCheckResult,
  FirstProductionOrderInput,
  FirstProductionOrderLimits,
  FirstProductionOrderPayload,
  FirstProductionOrderScope,
} from "./types";

export function buildDefaultFirstOrderPayload(input: {
  armingId: string;
  supplierId: string;
  market: string;
  channel: import("@/lib/supplier-order-readiness/types").ReadinessChannel;
  orderId: string;
  priceSnapshotHash?: string;
  payloadHash?: string;
}): FirstProductionOrderPayload {
  const items = [{ sku: "first-order-sku", quantity: 1, unitCost: 100 }];
  const shippingAddress = filterSupplierFulfillmentAddress({
    country: input.market,
    city: "Berlin",
  }) as FirstProductionOrderPayload["shippingAddress"];
  const canonical = {
    orderId: input.orderId,
    purpose: "FIRST_PRODUCTION_ORDER" as const,
    supplierId: input.supplierId,
    market: input.market,
    channel: input.channel,
    items,
    shippingAddress,
    currency: "EUR",
    inventoryReservationId: `res_${input.orderId}`,
    priceSnapshotId: `price_${input.orderId}`,
    priceSnapshotHash: input.priceSnapshotHash || createHash("sha256").update(`price_${input.orderId}`).digest("hex").slice(0, 16),
    supplierAssignmentSnapshotId: `assign_${input.orderId}`,
    armingId: input.armingId,
  };
  const payloadHash =
    input.payloadHash ||
    hashCreateOrderPayload({
      supplierId: canonical.supplierId,
      orderId: canonical.orderId,
      lines: items.map((i) => ({ sku: i.sku, quantity: i.quantity })),
      shippingAddress: canonical.shippingAddress,
    });
  return { ...canonical, payloadHash };
}

export function runFirstProductionOrderPreflight(input: FirstProductionOrderInput): {
  blockers: string[];
  checks: FirstOrderCheckResult[];
  scope: FirstProductionOrderScope;
  limits: FirstProductionOrderLimits;
  payload?: FirstProductionOrderPayload;
  armingId?: string;
  validationId?: string;
} {
  const supplier = input.supplier || getInterCarsSupplierId();
  const market = input.market || "DE";
  const channel = input.channel || "DIRECT";
  const environment = input.environment || "PRODUCTION";

  const eligibility = evaluateFirstProductionOrderEligibility({
    supplierId: supplier,
    market,
    channel,
    environment,
    requester: input.requester,
    armingId: input.armingId,
  });

  const armingId = input.armingId || eligibility.armingId;
  const arming = armingId ? getArmingRecord(armingId) : undefined;
  const scope: FirstProductionOrderScope = {
    supplier,
    market,
    channel,
    environment: environment === "SANDBOX" ? "SANDBOX" : "PRODUCTION",
    currency: input.currency || arming?.scope.currency || "EUR",
    allowedProductCategory: arming?.limits.allowedProductCategory,
    allowedSku: resolveFirstProductionOrderLimits().allowedSku,
  };
  const limits = resolveFirstProductionOrderLimits();

  const blockers = [...eligibility.blockers];
  const checks = [...eligibility.checks];

  if (!armingId || !arming) {
    blockers.push("ARMING_NOT_FOUND");
    return { blockers: [...new Set(blockers)], checks, scope, limits };
  }
  if (arming.status !== "ARMED") blockers.push("ARMING_NOT_ARMED");
  if (Date.parse(arming.expiresAt) <= Date.now()) blockers.push("ARMING_EXPIRED");

  const orderId = input.orderId || `FPO-${Date.now()}`;
  const payload =
    input.payload && input.payload.purpose === "FIRST_PRODUCTION_ORDER"
      ? (input.payload as FirstProductionOrderPayload)
      : buildDefaultFirstOrderPayload({
          armingId,
          supplierId: supplier,
          market,
          channel,
          orderId,
          priceSnapshotHash: input.payload?.priceSnapshotHash,
          payloadHash: arming?.validationEvidence?.payloadHash,
        });

  if (payload.purpose !== "FIRST_PRODUCTION_ORDER") blockers.push("NOT_FIRST_PRODUCTION_ORDER");
  if (payload.armingId !== armingId) blockers.push("ARMING_ID_MISMATCH");

  const scopeCheck = validateFirstOrderScope(scope, payload);
  blockers.push(...scopeCheck.blockers);

  const limitCheck = evaluateFirstProductionOrderLimits({ payload, limits });
  blockers.push(...limitCheck.blockers);
  checks.push({
    check: "LIMITS",
    category: "LIMITS",
    status: limitCheck.allowed ? "PASS" : "BLOCKED",
    message: limitCheck.allowed ? "Within limits" : limitCheck.blockers.join(","),
  });

  if (arming.validationEvidence?.payloadHash && payload.payloadHash !== arming.validationEvidence.payloadHash) {
    blockers.push("PAYLOAD_HASH_MISMATCH");
    checks.push({ check: "PAYLOAD_HASH", category: "PAYLOAD", status: "BLOCKED", message: "Hash mismatch" });
  } else {
    checks.push({ check: "PAYLOAD_HASH", category: "PAYLOAD", status: "PASS", message: payload.payloadHash });
  }

  if (!payload.inventoryReservationId) blockers.push("INVENTORY_RESERVATION_MISSING");
  if (!payload.priceSnapshotId) blockers.push("PRICE_SNAPSHOT_MISSING");

  recordPreflightAudit(input, blockers);

  return {
    blockers: [...new Set(blockers)],
    checks,
    scope,
    limits: limitCheck.limits,
    payload,
    armingId,
    validationId: arming.validationEvidence?.validationId,
  };
}

function recordPreflightAudit(input: FirstProductionOrderInput, blockers: string[]): void {
  void input;
  void blockers;
}

export { buildFirstOrderIdempotencyKey, FIRST_ORDER_TTL_MS };

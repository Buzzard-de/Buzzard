import { randomBytes } from "crypto";
import type { FulfillmentPipelineLimits, FulfillmentPipelineScope } from "./types";

export const FULFILLMENT_PIPELINE_VERSION = "348.1.0";

export function resolveFulfillmentLimits(scope: FulfillmentPipelineScope): FulfillmentPipelineLimits {
  const maxValue = Number(process.env.FULFILLMENT_MAX_ORDER_VALUE || "500");
  const maxQty = Number(process.env.FULFILLMENT_MAX_QUANTITY || "5");
  return {
    maximumOrderValue: maxValue,
    maximumQuantity: maxQty,
    allowedSupplier: scope.supplierId,
    allowedMarket: scope.market,
    singleOrderOnly: true,
  };
}

export function buildFulfillmentIdempotencyKey(input: {
  orderId: string;
  supplierId: string;
  market: string;
}): string {
  return `fof348_${input.supplierId}_${input.market}_${input.orderId}`;
}

export function generateFulfillmentNonce(): string {
  return `nonce348_${randomBytes(12).toString("hex")}`;
}

export function resolveFulfillmentApprovalTtlMs(): number {
  return Number(process.env.FULFILLMENT_APPROVAL_TTL_MS || String(30 * 60 * 1000));
}

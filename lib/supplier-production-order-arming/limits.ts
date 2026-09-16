import { evaluateOrderLimits } from "@/lib/supplier-order-activation/limits";
import { listActivationRecords } from "@/lib/supplier-order-activation/persistence";
import { resolveArmingLimits } from "./config";
import type { ProductionArmingLimits } from "./types";

export function buildArmingLimits(): ProductionArmingLimits {
  const cfg = resolveArmingLimits();
  return {
    maximumQuantity: cfg.maximumQuantity,
    maximumOrderValue: cfg.maximumOrderValue,
    allowedSupplier: cfg.allowedSupplier,
    allowedMarket: cfg.allowedMarket,
    allowedCurrency: cfg.allowedCurrency,
    allowedProductCategory: cfg.allowedProductCategory,
  };
}

export function validateArmingLimits(input: {
  limits: ProductionArmingLimits;
  supplierId: string;
  market: string;
  channel: import("@/lib/supplier-order-readiness/types").ReadinessChannel;
  environment: string;
  orderValue?: number;
  totalQuantity?: number;
}): { allowed: boolean; blockers: string[] } {
  const blockers: string[] = [];
  const cfg = resolveArmingLimits();

  if (input.limits.maximumQuantity > cfg.maximumQuantity) blockers.push("LIMIT_QUANTITY_EXCEEDED");
  if (input.limits.maximumOrderValue > cfg.maximumOrderValue) blockers.push("LIMIT_VALUE_EXCEEDED");
  if (input.limits.allowedSupplier !== cfg.allowedSupplier) blockers.push("LIMIT_SUPPLIER_MISMATCH");
  if (input.limits.allowedMarket !== input.market) blockers.push("LIMIT_MARKET_MISMATCH");

  const activation = listActivationRecords()
    .filter(
      (a) =>
        a.supplierId === input.supplierId &&
        a.market === input.market &&
        a.channel === input.channel &&
        a.environment === input.environment,
    )
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];

  if (activation) {
    const firstOrder = evaluateOrderLimits({
      activation,
      orderValue: input.orderValue ?? input.limits.maximumOrderValue,
      isFirstOrder: true,
      totalQuantity: input.totalQuantity ?? input.limits.maximumQuantity,
      itemCount: 1,
    });
    blockers.push(...firstOrder.blockers);
  }

  return { allowed: blockers.length === 0, blockers };
}

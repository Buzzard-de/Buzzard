import { evaluateOrderLimits } from "@/lib/supplier-order-activation/limits";
import { listActivationRecords } from "@/lib/supplier-order-activation/persistence";
import { getLatestArmingForScope } from "@/lib/supplier-production-order-arming/persistence";
import { resolveFirstProductionOrderLimits } from "./config";
import type { FirstProductionOrderLimits, FirstProductionOrderPayload } from "./types";

export function evaluateFirstProductionOrderLimits(input: {
  payload: FirstProductionOrderPayload;
  limits?: FirstProductionOrderLimits;
}): { allowed: boolean; blockers: string[]; limits: FirstProductionOrderLimits } {
  const blockers: string[] = [];
  const configured = input.limits || resolveFirstProductionOrderLimits();
  const totalQty = input.payload.items.reduce((sum, i) => sum + i.quantity, 0);
  const orderValue = input.payload.items.reduce((sum, i) => sum + i.unitCost * i.quantity, 0);

  if (input.payload.supplierId !== configured.allowedSupplier) blockers.push("SUPPLIER_LIMIT_MISMATCH");
  if (input.payload.market !== configured.allowedMarket) blockers.push("MARKET_LIMIT_MISMATCH");
  if (input.payload.currency !== configured.allowedCurrency) blockers.push("CURRENCY_LIMIT_MISMATCH");
  if (totalQty > configured.maximumQuantity) blockers.push("QUANTITY_LIMIT_EXCEEDED");
  if (orderValue > configured.maximumOrderValue) blockers.push("ORDER_VALUE_LIMIT_EXCEEDED");

  const arming = getLatestArmingForScope({
    supplierId: input.payload.supplierId,
    market: input.payload.market,
    channel: input.payload.channel,
    environment: "PRODUCTION",
  });
  if (arming) {
    if (totalQty > arming.limits.maximumQuantity) blockers.push("ARMING_QUANTITY_LIMIT_EXCEEDED");
    if (orderValue > arming.limits.maximumOrderValue) blockers.push("ARMING_VALUE_LIMIT_EXCEEDED");
  }

  const activation = listActivationRecords()
    .filter(
      (a) =>
        a.supplierId === input.payload.supplierId &&
        a.market === input.payload.market &&
        a.channel === input.payload.channel,
    )
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];

  if (activation) {
    const activationLimits = evaluateOrderLimits({
      activation,
      orderValue,
      isFirstOrder: true,
      itemCount: input.payload.items.length,
      totalQuantity: totalQty,
    });
    if (!activationLimits.allowed) blockers.push(...activationLimits.blockers);
  }

  return { allowed: blockers.length === 0, blockers, limits: configured };
}

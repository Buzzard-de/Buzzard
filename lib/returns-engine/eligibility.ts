import { getOrder } from "@/lib/order-engine";
import { getSupplierPolicy } from "./registry";
import type { CreateReturnInput, EligibilityResult, ReturnReason } from "./types";

export interface ReturnWindowConfig {
  returnWindowDays: number;
  byMarket?: Record<string, number>;
  byChannel?: Record<string, number>;
  byCategory?: Record<string, number>;
  bySupplier?: Record<string, number>;
}

const DEFAULT_WINDOW: ReturnWindowConfig = {
  returnWindowDays: 14,
  byMarket: { DE: 14, FR: 14, PL: 14 },
  byChannel: { amazon: 30, ebay: 30, direct: 14 },
  bySupplier: { TEST_SUPPLIER_A: 30 },
};

let windowConfig: ReturnWindowConfig = { ...DEFAULT_WINDOW };

export function setReturnWindowConfig(config: Partial<ReturnWindowConfig>): void {
  windowConfig = { ...windowConfig, ...config };
}

export function getReturnWindowDays(input: {
  marketId: string;
  channel: string;
  categoryId?: string;
  supplierId?: string;
}): number {
  if (input.supplierId && windowConfig.bySupplier?.[input.supplierId] != null) {
    return windowConfig.bySupplier[input.supplierId]!;
  }
  if (input.categoryId && windowConfig.byCategory?.[input.categoryId] != null) {
    return windowConfig.byCategory[input.categoryId]!;
  }
  if (windowConfig.byChannel?.[input.channel] != null) {
    return windowConfig.byChannel[input.channel]!;
  }
  if (windowConfig.byMarket?.[input.marketId] != null) {
    return windowConfig.byMarket[input.marketId]!;
  }
  return windowConfig.returnWindowDays;
}

function isReturnableOrderStatus(status: string): boolean {
  return ["DELIVERED", "SHIPPED", "RETURN_REQUESTED", "SUPPLIER_CONFIRMED"].includes(status);
}

function checkSupplierPolicy(
  supplierId: string,
  reason: ReturnReason
): { allowed: boolean; reasonCode: string } {
  const policy = getSupplierPolicy(supplierId);
  if (!policy) return { allowed: true, reasonCode: "NO_POLICY_DEFAULT_ALLOW" };
  if (!policy.acceptsReturns) return { allowed: false, reasonCode: "SUPPLIER_NO_RETURNS" };
  if (reason === "CUSTOMER_CHANGED_MIND" && !policy.acceptsCustomerChangeOfMind) {
    return { allowed: false, reasonCode: "SUPPLIER_NO_CHANGE_OF_MIND" };
  }
  if (
    (reason === "PRODUCT_DEFECTIVE" || reason === "PRODUCT_DAMAGED") &&
    !policy.acceptsDefective
  ) {
    return { allowed: false, reasonCode: "SUPPLIER_NO_DEFECTIVE" };
  }
  return { allowed: true, reasonCode: "SUPPLIER_POLICY_OK" };
}

export function evaluateReturnEligibility(input: CreateReturnInput): EligibilityResult {
  const order = getOrder(input.orderId);
  if (!order) {
    return { outcome: "ineligible", reasonCode: "ORDER_NOT_FOUND" };
  }

  if (order.customerId !== input.customerId) {
    return { outcome: "ineligible", reasonCode: "UNAUTHORIZED" };
  }

  if (!isReturnableOrderStatus(order.status)) {
    return { outcome: "ineligible", reasonCode: "ORDER_STATUS_NOT_RETURNABLE" };
  }

  const orderDate = new Date(order.createdAt);
  const windowDays = getReturnWindowDays({
    marketId: order.marketId,
    channel: order.channel,
    supplierId: order.items[0]?.supplierId,
  });
  const deadline = new Date(orderDate);
  deadline.setDate(deadline.getDate() + windowDays);

  if (new Date() > deadline) {
    return {
      outcome: "ineligible",
      reasonCode: "RETURN_WINDOW_EXPIRED",
      returnWindowDays: windowDays,
      returnWindowDeadline: deadline.toISOString(),
    };
  }

  const supplierId = order.items[0]?.supplierId;
  if (supplierId) {
    const policyCheck = checkSupplierPolicy(supplierId, input.reason);
    if (!policyCheck.allowed) {
      return {
        outcome: "ineligible",
        reasonCode: policyCheck.reasonCode,
        returnWindowDays: windowDays,
        returnWindowDeadline: deadline.toISOString(),
      };
    }
  }

  if (input.reason === "OTHER" || input.reason === "MARKETPLACE_REASON") {
    return {
      outcome: "reviewRequired",
      reasonCode: "MANUAL_REVIEW_REQUIRED",
      returnWindowDays: windowDays,
      returnWindowDeadline: deadline.toISOString(),
    };
  }

  for (const item of input.items) {
    const orderItem = order.items.find((oi) => oi.orderItemId === item.orderItemId);
    if (!orderItem) {
      return { outcome: "ineligible", reasonCode: "INVALID_ORDER_ITEM" };
    }
    if (item.quantity > orderItem.quantity) {
      return { outcome: "ineligible", reasonCode: "QUANTITY_EXCEEDS_ORDER" };
    }
  }

  return {
    outcome: "eligible",
    reasonCode: "ELIGIBLE",
    returnWindowDays: windowDays,
    returnWindowDeadline: deadline.toISOString(),
  };
}

import { createOrder, getOrder, saveOrder, clearOrderRegistry, clearOrderEvents, clearOrderAuditLog } from "@/lib/order-engine";
import { seedOrderEngineFixtures, buildSingleItemOrderInput, TEST_CUSTOMER_A, TEST_CUSTOMER_B } from "@/lib/order-engine/test-fixtures";
import { TEST_SUPPLIER_ID } from "@/lib/inventory-engine/test-fixtures";
import { clearReturnsRegistry, setSupplierPolicy } from "./registry";
import { clearReturnEvents } from "./events";
import { clearReturnAuditLog } from "./audit";
import { setReturnWindowConfig } from "./eligibility";
import type { CreateReturnInput, SupplierReturnPolicy } from "./types";

export { TEST_SUPPLIER_ID, TEST_CUSTOMER_A, TEST_CUSTOMER_B };

export const FIXTURE_PRODUCTS = {
  TIRE: "reifen-pilot-sport",
  OIL: "motoroel-5w30",
  DISC: "bremsscheibe-280",
  PADS: "bremsbelaege-vorder",
} as const;

export const TEST_SUPPLIER_POLICY_FULL: SupplierReturnPolicy = {
  supplierId: TEST_SUPPLIER_ID,
  returnWindowDays: 30,
  acceptsReturns: true,
  acceptsDefective: true,
  acceptsCustomerChangeOfMind: true,
  refundMethod: "SUPPLIER_REFUND",
  restockingFeePercent: 0,
  shippingReimbursement: true,
  damagePolicy: "FULL_DEDUCTION",
  requiredEvidence: ["photo"],
};

export const TEST_SUPPLIER_POLICY_NO_RECOVERY: SupplierReturnPolicy = {
  ...TEST_SUPPLIER_POLICY_FULL,
  acceptsReturns: false,
  acceptsCustomerChangeOfMind: false,
};

export const TEST_SUPPLIER_POLICY_PARTIAL: SupplierReturnPolicy = {
  ...TEST_SUPPLIER_POLICY_FULL,
  restockingFeePercent: 30,
  shippingReimbursement: false,
};

export function seedReturnsEngineFixtures(): void {
  clearReturnsRegistry();
  clearReturnEvents();
  clearReturnAuditLog();
  clearOrderRegistry();
  clearOrderEvents();
  clearOrderAuditLog();

  seedOrderEngineFixtures();
  setReturnWindowConfig({ returnWindowDays: 30, byMarket: { DE: 30 } });
  setSupplierPolicy(TEST_SUPPLIER_POLICY_FULL);
}

export async function createDeliveredOrder(productId: string = FIXTURE_PRODUCTS.TIRE): Promise<string> {
  const result = await createOrder(
    buildSingleItemOrderInput(productId, {
      idempotencyKey: `ret_ord_${productId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    })
  );
  if (!result.ok || !result.order) throw new Error("ORDER_CREATION_FAILED");

  saveOrder({
    ...result.order,
    status: "DELIVERED",
    fulfillmentStatus: "DELIVERED",
    updatedAt: new Date().toISOString(),
  });
  return result.order.orderId;
}

export function buildReturnInput(
  orderId: string,
  options?: Partial<CreateReturnInput>
): CreateReturnInput {
  const order = getOrder(orderId)!;
  return {
    orderId,
    customerId: order.customerId,
    reason: "PRODUCT_DEFECTIVE",
    items: order.items.map((i) => ({
      orderItemId: i.orderItemId,
      quantity: i.quantity,
      condition: "DEFECTIVE" as const,
    })),
    idempotencyKey: options?.idempotencyKey ?? `ret_${orderId}_${Date.now()}`,
    ...options,
  };
}

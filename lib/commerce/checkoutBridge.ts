import type { CheckoutAddress, CheckoutCustomer } from "@/lib/checkout/types";
import { toCommerceAddress } from "@/lib/commerce/map";
import {
  CommerceClientError,
  startCheckout,
  submitCheckout,
  validateCheckout,
} from "@/lib/commerce/client";
import { generateIdempotencyKey } from "@/lib/commerce/runtime";
import type { CommerceCompleteResponse, CommerceOrderType } from "@/lib/commerce/types";

export async function runCommerceCheckout(input: {
  cartId: string;
  customerId?: string;
  customer: CheckoutCustomer;
  shippingAddress: CheckoutAddress;
  billingAddress: CheckoutAddress;
  shippingMethodId: string;
  orderType?: CommerceOrderType;
  idempotencyKey?: string;
}): Promise<CommerceCompleteResponse & { errorKey?: string }> {
  const billing = toCommerceAddress(input.billingAddress, input.customer);
  const shipping = toCommerceAddress(input.shippingAddress, input.customer);
  const orderType = input.orderType || "READINESS_TEST";
  const idempotencyKey = input.idempotencyKey || generateIdempotencyKey("storefront");

  try {
    const { checkout } = await startCheckout({
      cartId: input.cartId,
      customerId: input.customerId,
      orderType,
    });

    await validateCheckout(checkout.id, {
      billingAddress: billing,
      shippingAddress: shipping,
      shippingMethod: input.shippingMethodId,
      customerId: input.customerId,
    });

    return await submitCheckout(checkout.id, {
      customerId: input.customerId,
      idempotencyKey,
      orderType,
    });
  } catch (err) {
    if (err instanceof CommerceClientError) {
      return { success: false, errorKey: err.code, checkoutId: "", state: "FAILED" };
    }
    return { success: false, errorKey: "checkout.orderFailed", checkoutId: "", state: "FAILED" };
  }
}

export async function previewCommerceCheckoutTotals(input: {
  cartId: string;
  customerId?: string;
  shippingAddress: CheckoutAddress;
  billingAddress: CheckoutAddress;
  shippingMethodId: string;
  customer: CheckoutCustomer;
}): Promise<{
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
} | null> {
  try {
    const billing = toCommerceAddress(input.billingAddress, input.customer);
    const shipping = toCommerceAddress(input.shippingAddress, input.customer);
    const { checkout } = await startCheckout({ cartId: input.cartId, customerId: input.customerId, orderType: "DRY_RUN" });
    const validated = await validateCheckout(checkout.id, {
      billingAddress: billing,
      shippingAddress: shipping,
      shippingMethod: input.shippingMethodId,
      customerId: input.customerId,
    });
    if (!validated.totals) return null;
    return {
      subtotal: validated.totals.subtotal,
      shipping: validated.totals.shipping,
      tax: validated.totals.tax,
      total: validated.totals.total,
    };
  } catch {
    return null;
  }
}

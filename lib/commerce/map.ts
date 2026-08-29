import type { CartLineItem } from "@/lib/cart/types";
import type { CommerceAddress, CommerceCartItem } from "@/lib/commerce/types";
import type { CheckoutAddress, CheckoutCustomer } from "@/lib/checkout/types";

export function mapCommerceItemToCartLine(item: CommerceCartItem): CartLineItem {
  return {
    lineId: item.id,
    productId: item.productId,
    name: item.title || item.sku || item.productId,
    sku: item.sku || "",
    unitPrice: item.priceSnapshot,
    qty: item.quantity,
    variantIds: item.variantId ? [item.variantId] : [],
    variantLabel: item.variantId ? String(item.metadata?.variantLabel || item.variantId) : "",
    imageKey: typeof item.metadata?.imageKey === "string" ? item.metadata.imageKey : "default",
    vatRate: 19,
  };
}

export function mapCartLinesToCommerceItems(
  items: CartLineItem[]
): Array<{ productId: string; variantId?: string; quantity: number }> {
  return items.map((item) => ({
    productId: item.productId,
    variantId: item.variantIds[0],
    quantity: item.qty,
  }));
}

export function toCommerceAddress(
  address: CheckoutAddress,
  customer?: CheckoutCustomer
): CommerceAddress {
  return {
    firstName: address.firstName || customer?.firstName,
    lastName: address.lastName || customer?.lastName,
    line1: address.street,
    city: address.city,
    postalCode: address.zip,
    country: address.country,
  };
}

export function pickPrimaryVariantId(variantIds: string[] = []): string | undefined {
  return variantIds[0];
}

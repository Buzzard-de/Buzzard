import { getProductById } from "@/lib/products/service";
import type { ProductVariant } from "@/lib/products/types";
import { validateCoupon } from "./coupons";
import { calculateShippingCost, freeShippingRemaining } from "./shipping";
import type { CheckoutCartLineInput, OrderLineQuote, OrderQuote } from "./types";

export function buildVariantLabel(variants: ProductVariant[], variantIds: string[]): string {
  if (!variantIds.length) return "";
  const selected = variants.filter((v) => variantIds.includes(v.id));
  return selected.map((v) => `${v.label}: ${v.value}`).join(", ");
}

export function resolveLinePricing(
  productId: string,
  variantIds: string[],
  qty: number
): OrderLineQuote | null {
  const product = getProductById(productId);
  if (!product || product.stockStatus === "out_of_stock") return null;

  const selected = product.variants.filter((v) => variantIds.includes(v.id));
  const variantPrice = selected.find((v) => v.price?.amount)?.price?.amount;
  const unitPrice = variantPrice ?? product.price;
  const sku = selected.find((v) => v.sku)?.sku ?? product.sku;
  const stock =
    selected.find((v) => typeof v.stock === "number")?.stock ?? product.stock;

  if (stock < qty) return null;

  const lineTotal = Math.round(unitPrice * qty * 100) / 100;
  const vatRate = product.vatRate;
  const vatAmount = Math.round((lineTotal - lineTotal / (1 + vatRate / 100)) * 100) / 100;

  return {
    productId: product.id,
    name: product.name,
    sku,
    variantIds,
    variantLabel: buildVariantLabel(product.variants, variantIds),
    qty,
    unitPrice,
    lineTotal,
    vatRate,
    vatAmount,
    imageKey: product.imageKey,
  };
}

export function calculateOrderQuote(
  lines: CheckoutCartLineInput[],
  shippingMethodId: string,
  couponCode?: string,
  countryCode?: string
): OrderQuote | null {
  const resolved: OrderLineQuote[] = [];

  for (const line of lines) {
    const priced = resolveLinePricing(line.productId, line.variantIds, line.qty);
    if (!priced) return null;
    resolved.push(priced);
  }

  const subtotal = resolved.reduce((sum, line) => sum + line.lineTotal, 0);
  const coupon = validateCoupon(couponCode, subtotal);
  const discount = coupon.valid ? coupon.discount : 0;
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const shipping = calculateShippingCost(discountedSubtotal, shippingMethodId, countryCode);
  const vatAmount =
    Math.round(resolved.reduce((sum, line) => sum + line.vatAmount, 0) * 100) / 100;
  const total = Math.round((discountedSubtotal + shipping) * 100) / 100;

  return {
    currency: "EUR",
    lines: resolved,
    subtotal,
    shipping,
    discount,
    vatAmount,
    total,
    freeShippingRemaining: freeShippingRemaining(discountedSubtotal, countryCode),
    shippingMethodId,
    couponCode: coupon.valid ? coupon.normalizedCode : undefined,
  };
}

export function cartLinesToInput(
  items: Array<{ productId: string; variantIds: string[]; qty: number }>
): CheckoutCartLineInput[] {
  return items.map((item) => ({
    productId: item.productId,
    variantIds: item.variantIds,
    qty: item.qty,
  }));
}

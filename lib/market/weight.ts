import { getProductById } from "@/lib/products/service";
import type { CheckoutCartLineInput } from "@/lib/checkout/types";

const DEFAULT_ITEM_WEIGHT_KG = 0.5;

export function calculateLinesWeightKg(
  lines: Array<Pick<CheckoutCartLineInput, "productId" | "qty">>
): number {
  let total = 0;
  for (const line of lines) {
    const product = getProductById(line.productId);
    if (!product) continue;
    const weight = product.shipping?.weight_kg ?? DEFAULT_ITEM_WEIGHT_KG;
    total += weight * line.qty;
  }
  return Math.max(DEFAULT_ITEM_WEIGHT_KG, Math.round(total * 100) / 100);
}

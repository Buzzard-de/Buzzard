import { getProductById } from "@/lib/products/service";
import type { CheckoutCartLineInput } from "@/lib/checkout/types";

export function calculateLinesWeightKg(
  lines: Array<Pick<CheckoutCartLineInput, "productId" | "qty">>
): number | null {
  let total = 0;
  for (const line of lines) {
    const product = getProductById(line.productId);
    const weight = product?.shipping?.weight_kg;
    if (weight == null || !(weight > 0)) return null;
    total += weight * line.qty;
  }
  return lines.length === 0 ? null : Math.round(total * 100) / 100;
}

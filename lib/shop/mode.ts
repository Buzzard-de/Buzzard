import { shouldUseCommerceCore } from "@/lib/commerce/runtime";

export { shouldUseCommerceCore };

/** Live sales — requires NEXT_PUBLIC_SALES_ENABLED=1 AND server BUZZARD_SALES_ENABLED=1 */
export function isSalesEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SALES_ENABLED === "1";
}

export function showPrices(): boolean {
  return isSalesEnabled() || shouldUseCommerceCore();
}

/** Cart + checkout UI — commerce dry-run OR live sales */
export function isCheckoutEnabled(): boolean {
  return isSalesEnabled() || shouldUseCommerceCore();
}

export function isCommerceDryRun(): boolean {
  return shouldUseCommerceCore() && !isSalesEnabled();
}

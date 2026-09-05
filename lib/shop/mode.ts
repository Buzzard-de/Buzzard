import { shouldUseCommerceCore } from "@/lib/commerce/runtime";

export { shouldUseCommerceCore };

/** Live sales — requires NEXT_PUBLIC_SALES_ENABLED=1 AND server BUZZARD_SALES_ENABLED=1 */
export function isSalesEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SALES_ENABLED === "1";
}

/** Public storefront prices — always shown for catalog browsing */
export function showPrices(): boolean {
  return true;
}

/** Warenkorb / Merkliste — always available for inquiry flow */
export function isCartEnabled(): boolean {
  return true;
}

/** Payment checkout — live sales only */
export function isCheckoutEnabled(): boolean {
  return isSalesEnabled();
}

export function isCatalogMode(): boolean {
  return !isSalesEnabled();
}

export function isCommerceDryRun(): boolean {
  return shouldUseCommerceCore() && !isSalesEnabled();
}

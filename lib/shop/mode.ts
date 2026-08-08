/** Storefront is catalog-only until NEXT_PUBLIC_SALES_ENABLED=1 */
export function isSalesEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SALES_ENABLED === "1";
}

export function showPrices(): boolean {
  return isSalesEnabled();
}

export function isCheckoutEnabled(): boolean {
  return isSalesEnabled();
}

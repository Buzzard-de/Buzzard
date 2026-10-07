/**
 * Shop JSON contains 53 L1 records. Canonical master taxonomy is 48 (bz.01–bz.48).
 * Five shop L1 rows reuse a master code; three of those are not unique customer L1:
 *   cat-30 — duplicate of cat-28 (same name, master bz.38)
 *   cat-37 — Foto & Video, mapped as subset of Elektronik (cat-12 / bz.12)
 *   cat-39 — Fahrzeug & Mobilität, mapped as subset of Reisen (cat-32 / bz.40)
 * Remaining shop-only expansions cat-26 (Tierfutter) and cat-29 (Verpackung) stay
 * customer-visible, yielding 50 user-facing main categories. Records are not deleted.
 */
export const INTERNAL_ONLY_L1_IDS = ["cat-30", "cat-37", "cat-39"] as const;

export const APPROVED_CUSTOMER_FACING_L1_COUNT = 50;
export const INTERNAL_SHOP_L1_COUNT = 53;
export const MASTER_TAXONOMY_L1_COUNT = 48;

export function isCustomerFacingL1(categoryId: string): boolean {
  return !INTERNAL_ONLY_L1_IDS.includes(categoryId as (typeof INTERNAL_ONLY_L1_IDS)[number]);
}

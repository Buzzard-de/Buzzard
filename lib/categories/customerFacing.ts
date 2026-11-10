/**
 * Shop JSON contains 56 L1 records. Canonical master taxonomy is 48 (bz.01–bz.48).
 * Hidden from the customer storefront (records are kept, not deleted):
 *   cat-30 — duplicate of cat-28 (same name, master bz.38)
 *   cat-37 — Foto & Video, mapped as subset of Elektronik (cat-12 / bz.12)
 *   cat-39 — Fahrzeug & Mobilität, mapped as subset of Reisen (cat-32 / bz.40)
 *   cat-25 — Lebensmittel & Getränke (customer-hidden; cat-46 Getränke stays)
 *   cat-43 — Schmuck & Uhren
 *   cat-53 — Luxus, Sammlerstücke & Wertvolles
 * Shop expansions cat-26, cat-29, cat-54 (Reifen und Felgen),
 * cat-55 (Baumaschinen) and cat-56 (Nutztierhaltung) stay visible,
 * yielding 50 user-facing main categories.
 */
export const INTERNAL_ONLY_L1_IDS = [
  "cat-25",
  "cat-30",
  "cat-37",
  "cat-39",
  "cat-43",
  "cat-53",
] as const;

export const APPROVED_CUSTOMER_FACING_L1_COUNT = 50;
export const INTERNAL_SHOP_L1_COUNT = 56;
export const MASTER_TAXONOMY_L1_COUNT = 48;

export function isCustomerFacingL1(categoryId: string): boolean {
  return !INTERNAL_ONLY_L1_IDS.includes(categoryId as (typeof INTERNAL_ONLY_L1_IDS)[number]);
}

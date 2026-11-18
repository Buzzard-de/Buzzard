/**
 * Which analytics sections a role is given. Mirrors roleSections() and
 * canSeeFinance() of server/lib/analyticsEngine.js; the API decides, this table
 * only keeps the pages from asking for what the API refuses.
 * server/__tests__/adminUiPermissions.test.mjs fails when the two differ.
 */

export const ANALYTICS_SECTIONS = [
  "overview",
  "sales",
  "products",
  "categories",
  "customers",
  "inventory",
  "suppliers",
  "finance",
  "returns",
];

const BY_ROLE = {
  administrator: ANALYTICS_SECTIONS,
  order_manager: ["overview", "sales", "customers", "suppliers", "returns"],
  catalog_manager: ["overview", "products", "categories", "inventory", "suppliers"],
};

const OTHER_ROLES = ["overview", "sales", "products", "categories", "inventory"];

/** @param {string | null | undefined} role */
export function analyticsSectionsForRole(role) {
  if (!role) return [];
  return [...(BY_ROLE[role] || OTHER_ROLES)];
}

/**
 * @param {string | null | undefined} role
 * @param {string} section
 */
export function canSeeAnalyticsSection(role, section) {
  return analyticsSectionsForRole(role).includes(section);
}

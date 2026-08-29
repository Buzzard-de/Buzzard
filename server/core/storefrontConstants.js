/** Part 7 — Storefront bridge constants */

const STOREFRONT_PRODUCT_STATUS = Object.freeze(["READY", "ACTIVE"]);

const STOREFRONT_BLOCKED_STATUS = Object.freeze([
  "DRAFT",
  "IMPORTED",
  "VALIDATING",
  "HIDDEN",
  "BLOCKED",
  "ARCHIVED",
]);

const STOREFRONT_VISIBILITY = Object.freeze({
  PUBLIC: "PUBLIC",
  CATALOG: "CATALOG",
  HIDDEN: "HIDDEN",
  PRIVATE: "PRIVATE",
});

const SYNC_STATUS = Object.freeze({
  SYNCED: "SYNCED",
  PENDING: "PENDING",
  STALE: "STALE",
  ERROR: "ERROR",
});

const SORT_OPTIONS = Object.freeze({
  RELEVANCE: "relevance",
  PRICE_ASC: "price-asc",
  PRICE_DESC: "price-desc",
  NEWEST: "newest",
  NAME: "name-asc",
});

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;
const CACHE_TTL_MS = Number(process.env.BUZZARD_STOREFRONT_CACHE_TTL_MS) || 60_000;

function isStorefrontBridgeEnabled() {
  if (process.env.BUZZARD_PIM_STOREFRONT === "0") return false;
  if (process.env.BUZZARD_DB_ENABLED === "0") return false;
  return true;
}

module.exports = {
  STOREFRONT_PRODUCT_STATUS,
  STOREFRONT_BLOCKED_STATUS,
  STOREFRONT_VISIBILITY,
  SYNC_STATUS,
  SORT_OPTIONS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  CACHE_TTL_MS,
  isStorefrontBridgeEnabled,
};

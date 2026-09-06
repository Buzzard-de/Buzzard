/**
 * Dynamic category filter generation from attribute definitions.
 */
const { getAttributesForCategory } = require("./automotiveAttributes");

const FILTER_DEFS = {
  tireWidth: { type: "range", labelKey: "automotive.filters.tireWidth" },
  aspectRatio: { type: "select", labelKey: "automotive.filters.aspectRatio" },
  rimDiameter: { type: "select", labelKey: "automotive.filters.rimDiameter" },
  season: { type: "select", labelKey: "automotive.filters.season" },
  loadIndex: { type: "select", labelKey: "automotive.filters.loadIndex" },
  speedRating: { type: "select", labelKey: "automotive.filters.speedRating" },
  brand: { type: "select", labelKey: "automotive.filters.brand" },
  viscosity: { type: "select", labelKey: "automotive.filters.viscosity" },
  capacity: { type: "select", labelKey: "automotive.filters.capacity" },
  oilType: { type: "select", labelKey: "automotive.filters.oilType" },
  acea: { type: "select", labelKey: "automotive.filters.acea" },
  api: { type: "select", labelKey: "automotive.filters.api" },
  manufacturerApproval: { type: "select", labelKey: "automotive.filters.approval" },
  voltage: { type: "select", labelKey: "automotive.filters.voltage" },
  capacityAh: { type: "select", labelKey: "automotive.filters.capacityAh" },
  coldCrankingAmps: { type: "select", labelKey: "automotive.filters.cca" },
  batteryTechnology: { type: "select", labelKey: "automotive.filters.technology" },
  filterType: { type: "select", labelKey: "automotive.filters.filterType" },
  discDiameter: { type: "range", labelKey: "automotive.filters.discDiameter" },
};

const CATEGORY_FILTER_KEYS = {
  "auto-sub-01": ["tireWidth", "aspectRatio", "rimDiameter", "season", "loadIndex", "speedRating", "brand"],
  "auto-sub-03": ["viscosity", "capacity", "oilType", "acea", "api", "manufacturerApproval", "brand"],
  "auto-sub-04": ["discDiameter", "axlePosition", "brand"],
  "auto-sub-05": ["filterType", "brand"],
  "auto-sub-06": ["voltage", "capacityAh", "coldCrankingAmps", "batteryTechnology", "brand"],
};

function getFiltersForCategory(categoryId) {
  const keys = CATEGORY_FILTER_KEYS[categoryId] || ["brand"];
  return keys.map((key) => ({
    key,
    ...(FILTER_DEFS[key] || { type: "select", labelKey: `automotive.filters.${key}` }),
  }));
}

function buildFilterQuery(filters = {}) {
  const query = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      query[key] = value;
    }
  }
  return query;
}

function productMatchesFilters(product, filters = {}) {
  const attrs = product.attributes || product;
  for (const [key, value] of Object.entries(filters)) {
    if (!value) continue;
    if (attrs[key] === undefined || String(attrs[key]) !== String(value)) {
      return false;
    }
  }
  return true;
}

module.exports = {
  FILTER_DEFS,
  CATEGORY_FILTER_KEYS,
  getFiltersForCategory,
  getAttributesForCategory,
  buildFilterQuery,
  productMatchesFilters,
};

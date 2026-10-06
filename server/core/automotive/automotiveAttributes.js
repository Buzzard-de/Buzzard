/**
 * Reusable automotive product attribute definitions.
 */
const COMMON_ATTRIBUTES = [
  "brand",
  "manufacturer",
  "partNumber",
  "oemNumber",
  "ean",
  "gtin",
  "mpn",
  "condition",
  "weight",
  "length",
  "width",
  "height",
];

const TIRE_ATTRIBUTES = [
  "tireWidth",
  "aspectRatio",
  "rimDiameter",
  "loadIndex",
  "speedRating",
  "season",
  "runFlat",
  "reinforced",
  "vehicleType",
  "tubeType",
  "axlePosition",
  "commercialRating",
];

const OIL_ATTRIBUTES = [
  "viscosity",
  "acea",
  "api",
  "manufacturerApproval",
  "capacity",
  "oilType",
];

const BATTERY_ATTRIBUTES = [
  "voltage",
  "capacityAh",
  "coldCrankingAmps",
  "batteryTechnology",
  "terminalType",
];

const BRAKE_ATTRIBUTES = [
  "discDiameter",
  "discThickness",
  "numberOfHoles",
  "axlePosition",
];

const FILTER_ATTRIBUTES = [
  "filterType",
  "filterLength",
  "filterWidth",
  "filterHeight",
  "diameter",
];

const CATEGORY_ATTRIBUTE_MAP = {
  "auto-sub-01": [...COMMON_ATTRIBUTES, ...TIRE_ATTRIBUTES],
  "auto-sub-03": [...COMMON_ATTRIBUTES, ...OIL_ATTRIBUTES],
  "auto-sub-04": [...COMMON_ATTRIBUTES, ...BRAKE_ATTRIBUTES],
  "auto-sub-05": [...COMMON_ATTRIBUTES, ...FILTER_ATTRIBUTES],
  "auto-sub-06": [...COMMON_ATTRIBUTES, ...BATTERY_ATTRIBUTES],
};

function getAttributesForCategory(categoryId) {
  if (CATEGORY_ATTRIBUTE_MAP[categoryId]) {
    return [...CATEGORY_ATTRIBUTE_MAP[categoryId]];
  }
  return [...COMMON_ATTRIBUTES];
}

function getAllAttributeKeys() {
  const set = new Set([
    ...COMMON_ATTRIBUTES,
    ...TIRE_ATTRIBUTES,
    ...OIL_ATTRIBUTES,
    ...BATTERY_ATTRIBUTES,
    ...BRAKE_ATTRIBUTES,
    ...FILTER_ATTRIBUTES,
  ]);
  return [...set];
}

function validateAttributeKey(key) {
  return getAllAttributeKeys().includes(key);
}

module.exports = {
  COMMON_ATTRIBUTES,
  TIRE_ATTRIBUTES,
  OIL_ATTRIBUTES,
  BATTERY_ATTRIBUTES,
  BRAKE_ATTRIBUTES,
  FILTER_ATTRIBUTES,
  CATEGORY_ATTRIBUTE_MAP,
  getAttributesForCategory,
  getAllAttributeKeys,
  validateAttributeKey,
};

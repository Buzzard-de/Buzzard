const constructionConstants = require("../constructionMachinery/constants");

const ENGINE_ID = "vehicle-parts-intelligence-sourcing";
const RULE_VERSION = "vpe-compat-1.0.0";
const DOMAIN = "automotive";
const SHOP_L1_ID = "cat-05";
const COMMERCIAL_SUBDOMAIN = "commercial";

const CROSS_REF_STATES = Object.freeze({
  EXACT_OEM_MATCH: "EXACT_OEM_MATCH",
  VERIFIED_CROSS_REFERENCE: "VERIFIED_CROSS_REFERENCE",
  VERIFIED_AFTERMARKET_EQUIVALENT: "VERIFIED_AFTERMARKET_EQUIVALENT",
  CONDITIONAL_REPLACEMENT: "CONDITIONAL_REPLACEMENT",
  POSSIBLE_MATCH: "POSSIBLE_MATCH",
  NO_VERIFIED_MATCH: "NO_VERIFIED_MATCH",
  VERIFIED_INCOMPATIBLE: "VERIFIED_INCOMPATIBLE",
});

const VEHICLE_CLASSES = Object.freeze([
  "passenger",
  "suv",
  "van",
  "pickup",
  "truck",
  "bus",
  "motorcycle",
  "scooter",
  "trailer",
  "semi-trailer",
  "ev",
  "hybrid",
  "phev",
  "hydrogen",
]);

module.exports = {
  ...constructionConstants,
  ENGINE_ID,
  RULE_VERSION,
  DOMAIN,
  SHOP_L1_ID,
  COMMERCIAL_SUBDOMAIN,
  CROSS_REF_STATES,
  VEHICLE_CLASSES,
};

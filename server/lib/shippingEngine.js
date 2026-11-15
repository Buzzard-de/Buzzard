const fs = require("fs");
const path = require("path");

const rulesFile = path.join(__dirname, "..", "..", "data", "buzzard_shipping_rules.json");

let cachedRules = null;

function loadRules() {
  if (cachedRules) return cachedRules;
  const raw = JSON.parse(fs.readFileSync(rulesFile, "utf8"));
  const methods = {};
  for (const [id, method] of Object.entries(raw.methods || {})) {
    methods[id] = {
      id,
      labelKey: method.labelKey || null,
      price: null,
      status: "SHIPPING_RATE_UNVERIFIED",
      commercialEligibility: "BLOCKED",
    };
  }
  cachedRules = { methods };
  return cachedRules;
}

function lineWeightKg(line, product) {
  const qty = line.qty || 1;
  const perUnit = product?.shipping?.weight_kg;
  if (perUnit == null || !Number.isFinite(Number(perUnit))) return null;
  return Number(perUnit) * qty;
}

function lineShippingClass(line, product) {
  return product?.shipping?.class || line.shippingClass || "standard";
}

function calculateShipping(input = {}) {
  const { selectTransportCost } = require("./commerce/pricingPolicy");
  const rates = Array.isArray(input.rates) ? input.rates.slice() : [];
  if (!rates.length && input.rate != null && input.carrier && input.suitable === true) {
    rates.push({
      carrier: input.carrier,
      service: input.service || input.methodId,
      amount: input.rate,
      verified: input.verified === true,
      suitable: true,
      contracted: input.contracted === true,
      countries: input.countries,
      zones: input.zones,
      origin: input.rateOrigin,
    });
  }
  const selected = selectTransportCost({
    origin: input.origin || input.supplierOrigin,
    country: input.country,
    zone: input.zone || input.deliveryZone,
    weightKg: input.weightKg ?? input.weight,
    dimensions: input.dimensions,
    rates,
    shippingIncluded: input.shippingIncluded === true,
    supplierOfferIncludesShipping: input.supplierOfferIncludesShipping === true,
    inclusionEvidence: input.inclusionEvidence || input.shippingIncludedEvidence,
  });
  return {
    ...selected,
    shipping: selected.ok ? selected.shippingCost : null,
    price: selected.ok ? selected.shippingCost : null,
    methodId: input.methodId || selected.selected?.service || null,
    freeShippingRemaining: null,
  };
}

function listMethods() {
  const rules = loadRules();
  return Object.entries(rules.methods || {}).map(([id, method]) => ({
    id,
    labelKey: method.labelKey || null,
    price: null,
    status: "SHIPPING_RATE_UNVERIFIED",
    commercialEligibility: "BLOCKED",
    live: false,
  }));
}

module.exports = {
  loadRules,
  calculateShipping,
  listMethods,
  lineWeightKg,
  lineShippingClass,
};

const fs = require("fs");
const path = require("path");

const rulesFile = path.join(__dirname, "..", "..", "data", "buzzard_shipping_rules.json");

let cachedRules = null;

function loadRules() {
  if (cachedRules) return cachedRules;
  cachedRules = JSON.parse(fs.readFileSync(rulesFile, "utf8"));
  return cachedRules;
}

function lineWeightKg(line, product) {
  const qty = line.qty || 1;
  const perUnit = product?.shipping?.weight_kg ?? 1;
  return perUnit * qty;
}

function lineShippingClass(line, product) {
  return product?.shipping?.class || line.shippingClass || "standard";
}

function calculateShipping({
  lines = [],
  methodId = "standard",
  country = "DE",
  subtotal = 0,
  productsById = new Map(),
}) {
  const rules = loadRules();
  const method = rules.methods[methodId] || rules.methods.standard;
  if (!method) return { shipping: 0, methodId: "standard", breakdown: {} };

  if (method.countries && !method.countries.includes(String(country).toUpperCase())) {
    return { shipping: null, errorKey: "logistics.shipping.unavailable" };
  }

  let shipping = method.baseCost || 0;
  let totalWeight = 0;
  let classSurcharge = 0;

  for (const line of lines) {
    const product = productsById.get(line.productId);
    totalWeight += lineWeightKg(line, product);
    const shipClass = lineShippingClass(line, product);
    classSurcharge = Math.max(classSurcharge, rules.classSurcharges[shipClass] || 0);
  }

  const weightSurcharge = Math.max(0, totalWeight - 5) * (rules.weightSurchargePerKg || 0);
  const countrySurcharge = rules.countrySurcharges[String(country).toUpperCase()] || 0;

  shipping += weightSurcharge + countrySurcharge + classSurcharge;

  if (method.freeEligible && subtotal >= rules.freeShippingThreshold) {
    shipping = 0;
  }

  shipping = Math.round(shipping * 100) / 100;

  return {
    shipping,
    methodId,
    freeShippingRemaining: Math.max(0, rules.freeShippingThreshold - subtotal),
    breakdown: {
      base: method.baseCost,
      weightSurcharge: Math.round(weightSurcharge * 100) / 100,
      countrySurcharge,
      classSurcharge,
      totalWeight: Math.round(totalWeight * 100) / 100,
    },
  };
}

function listMethods(country = "DE") {
  const rules = loadRules();
  return Object.entries(rules.methods)
    .filter(([, method]) => !method.countries || method.countries.includes(String(country).toUpperCase()))
    .map(([id, method]) => ({ id, ...method }));
}

module.exports = {
  loadRules,
  calculateShipping,
  listMethods,
  lineWeightKg,
  lineShippingClass,
};

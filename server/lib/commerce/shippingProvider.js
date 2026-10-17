/**
 * Part 8 — Shipping provider abstraction (no real shipment creation in Part 8)
 */
const { roundMoney } = require("./commerceValidation");

const METHODS = Object.freeze({
  STANDARD: { id: "standard", name: "Standard Shipping", baseDays: 3, basePrice: 4.99 },
  EXPRESS: { id: "express", name: "Express Shipping", baseDays: 1, basePrice: 9.99 },
  PICKUP: { id: "pickup", name: "Pickup", baseDays: 0, basePrice: 0 },
});

function listMethods() {
  return Object.values(METHODS);
}

function calculateShipping({
  methodId = "standard",
  country = "DE",
  subtotal = 0,
  itemCount = 0,
  liveRate = false,
  currency = "EUR",
} = {}) {
  const requestedCurrency = String(currency || "EUR").trim().toUpperCase();
  if (requestedCurrency !== "EUR") {
    return {
      ok: false,
      dryRun: true,
      live: false,
      liveRate: false,
      shipmentCreated: false,
      inventedFx: false,
      reason: "SHIPPING_CURRENCY_UNSUPPORTED",
      note: "Local shipping table is EUR-only. No FX rate is invented.",
    };
  }
  const method = METHODS[String(methodId || "standard").toUpperCase()] || METHODS.STANDARD;
  let price = method.basePrice;

  if (country && country.toUpperCase() !== "DE") {
    price += 5;
  }
  if (subtotal >= 100) {
    price = roundMoney(Math.max(0, price - 2));
  }

  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + method.baseDays + (country?.toUpperCase() !== "DE" ? 2 : 0));

  const envHints = Boolean(
    process.env.DHL_API_KEY || process.env.DPD_API_KEY || process.env.GLS_API_KEY || process.env.UPS_API_KEY
  );

  return {
    ok: true,
    methodId: method.id,
    methodName: method.name,
    price: roundMoney(price),
    currency: "EUR",
    estimatedDelivery: estimatedDelivery.toISOString().slice(0, 10),
    dryRun: true,
    live: false,
    liveRate: false,
    liveRateRequested: liveRate === true || envHints,
    source: "local_table",
    shipmentCreated: false,
    inventedFx: false,
    itemCount,
    note: "Local shipping table only. Carrier API keys do not enable live rates.",
  };
}

function getProviderHealth() {
  return {
    provider: "foundation",
    status: "READY",
    realShipmentEnabled: false,
    adapters: ["DHL", "DPD", "GLS", "Hermes", "UPS"],
    note: "Adapter stubs only — no live shipment creation",
  };
}

module.exports = {
  METHODS,
  listMethods,
  calculateShipping,
  getProviderHealth,
};

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

function calculateShipping({ methodId = "standard", country = "DE", subtotal = 0, itemCount = 0 } = {}) {
  const method = METHODS[methodId.toUpperCase()] || METHODS.STANDARD;
  let price = method.basePrice;

  if (country && country.toUpperCase() !== "DE") {
    price += 5;
  }
  if (subtotal >= 100) {
    price = roundMoney(Math.max(0, price - 2));
  }

  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + method.baseDays + (country?.toUpperCase() !== "DE" ? 2 : 0));

  return {
    methodId: method.id,
    methodName: method.name,
    price: roundMoney(price),
    currency: "EUR",
    estimatedDelivery: estimatedDelivery.toISOString().slice(0, 10),
    dryRun: true,
    shipmentCreated: false,
    itemCount,
  };
}

function getProviderHealth() {
  return {
    provider: "foundation",
    status: "READY",
    realShipmentEnabled: false,
    adapters: ["DHL", "DPD", "Hermes"],
    note: "Adapter stubs only — no live shipment creation",
  };
}

module.exports = {
  METHODS,
  listMethods,
  calculateShipping,
  getProviderHealth,
};

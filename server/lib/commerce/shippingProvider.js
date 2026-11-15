/**
 * Shipping quotes stay unverified until a carrier tariff is supplied
 * with country, zone, weight, dimensions, and service. This module does
 * not invent a euro amount and does not call a carrier API.
 */
const { assessShipping, carrierRateStatus, selectTransportCost } = require("./pricingPolicy");

const METHODS = Object.freeze([
  { id: "standard", name: "Standard Shipping" },
  { id: "express", name: "Express Shipping" },
  { id: "pickup", name: "Pickup" },
]);

function listMethods() {
  return METHODS.map((method) => ({
    ...method,
    price: null,
    currency: null,
    status: "SHIPPING_RATE_UNVERIFIED",
    commercialEligibility: "BLOCKED",
    live: false,
  }));
}

function calculateShipping(input = {}) {
  if (input.rates || input.shippingIncluded === true || input.supplierOfferIncludesShipping === true) {
    const selected = selectTransportCost(input);
    return {
      ...selected,
      price: selected.ok ? selected.shippingCost : null,
      methodId: selected.selected?.service || null,
      currency: selected.ok ? input.currency || "EUR" : null,
      dryRun: true,
      itemCount: input.itemCount ?? null,
    };
  }
  const assessment = assessShipping({
    country: input.country,
    zone: input.zone || input.deliveryZone,
    weightKg: input.weightKg ?? input.weight,
    dimensions: input.dimensions,
    service: input.service || input.serviceType || input.methodId,
    carrier: input.carrier,
    shippingCost: input.rate ?? input.shippingCost ?? input.amount,
    verified: input.verified === true || input.rateVerified === true,
  });
  return {
    ...assessment,
    price: assessment.ok ? assessment.shippingCost : null,
    methodId: input.methodId || input.service || input.serviceType || null,
    currency: assessment.ok ? input.currency || "EUR" : null,
    dryRun: true,
    itemCount: input.itemCount ?? null,
  };
}

function getProviderHealth() {
  return {
    provider: "foundation",
    status: "UNVERIFIED",
    realShipmentEnabled: false,
    official: false,
    adapters: carrierRateStatus(),
    note: "Carrier rate APIs are not connected. No fixed euro amount is a shipping price.",
  };
}

module.exports = {
  METHODS,
  listMethods,
  calculateShipping,
  getProviderHealth,
};

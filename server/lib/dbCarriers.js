const { carriers } = require("./commercialIntegrations");

// Adapter boundary for DHL/DPD/GLS/UPS and country-specific carriers.
async function createShipment({
  orderNumber,
  countryCode,
  weightKg,
  address,
  carrier,
} = {}) {
  const key = String(carrier || "").trim().toLowerCase();
  const adapter = carriers[key];
  if (!adapter) {
    return {
      status: "BLOCKED_EXTERNAL",
      code: "CARRIER_UNKNOWN",
      provider: null,
      requestedCarrier: key || null,
      live: false,
      shipmentCreated: false,
      trackingNumber: null,
      labelUrl: null,
      orderNumber: orderNumber || null,
      countryCode: countryCode || null,
    };
  }
  return adapter({ orderNumber, countryCode, weightKg, address });
}

module.exports = {
  createShipment,
};

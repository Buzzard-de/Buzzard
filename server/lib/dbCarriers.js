const { carriers } = require("./commercialIntegrations");

// Adapter boundary for DHL/DPD/GLS/UPS and country-specific carriers.
async function createShipment({
  orderNumber,
  countryCode,
  weightKg,
  address,
  carrier = "dhl",
}) {
  const adapter = carriers[carrier] || carriers.dhl;
  return adapter({ orderNumber, countryCode, weightKg, address });
}

module.exports = {
  createShipment,
};

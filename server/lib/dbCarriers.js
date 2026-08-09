// Adapter boundary for DHL/DPD/GLS/UPS and country-specific carriers.
async function createShipment({ orderNumber, countryCode, weightKg, address }) {
  return {
    provider: "MOCK_CARRIER",
    status: "label_pending",
    trackingNumber: null,
    orderNumber,
    countryCode,
    weightKg,
    address,
  };
}

module.exports = {
  createShipment,
};

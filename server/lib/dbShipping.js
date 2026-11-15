const { selectTransportCost } = require("./commerce/pricingPolicy");

function calculateShipping(country, weight, _subtotal, extra = {}) {
  const input = country && typeof country === "object" ? country : { country, weightKg: weight, ...(extra || {}) };
  return selectTransportCost(input);
}

module.exports = {
  calculateShipping,
};

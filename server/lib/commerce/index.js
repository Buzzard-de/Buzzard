/**
 * Part 8 — Commerce Core public exports
 */
module.exports = {
  ...require("./commerceFeatureFlags"),
  ...require("./commerceValidation"),
  ...require("./commerceGuards"),
  cartService: require("./cartService"),
  checkoutService: require("./checkoutService"),
  orderService: require("./orderService"),
  paymentService: require("./paymentService"),
  shippingProvider: require("./shippingProvider"),
  taxProvider: require("./taxProvider"),
  commerceReadiness: require("./commerceReadiness"),
  idempotency: require("./idempotency"),
  riskEngine: require("./riskEngine"),
  webhookFoundation: require("./webhookFoundation"),
  goLiveApproval: require("./goLiveApproval"),
  legacyPimMigration: require("./legacyPimMigration"),
  productSearch: require("./productSearchAbstraction"),
};

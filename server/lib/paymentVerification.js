const { decideAsset } = require("./banking/eu27/fiatPolicy");

const VALID_PROVIDERS = new Set(["paypal", "stripe", "klarna", "sepa"]);

function verifyPaymentIntent({ provider, currency, assetType, instrument } = {}) {
  const asset = decideAsset({
    currency,
    assetType,
    instrument,
  });
  if ((currency || assetType || instrument) && !asset.ok) {
    return {
      ok: false,
      code: asset.code,
      errorKey: "checkout.paymentFailed",
      demo: false,
      transactionId: null,
      captured: false,
      live: false,
      realMoneyMovement: false,
    };
  }
  if (!VALID_PROVIDERS.has(provider)) {
    return {
      ok: false,
      code: "PAYMENT_UNVERIFIED",
      errorKey: "checkout.paymentFailed",
      demo: false,
      transactionId: null,
      captured: false,
      live: false,
      realMoneyMovement: false,
    };
  }
  return {
    ok: false,
    code: "PAYMENT_UNVERIFIED",
    errorKey: "checkout.paymentFailed",
    demo: false,
    transactionId: null,
    captured: false,
    paymentAuthorized: false,
    live: false,
    realMoneyMovement: false,
  };
}

module.exports = { verifyPaymentIntent, VALID_PROVIDERS };

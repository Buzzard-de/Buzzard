/**
 * Fraud review stays on the existing synthetic screen.
 * It does not call an external bureau and it does not move money.
 */
const { fraudScreen } = require("../../finance/bankingAdapter");
const { decideAsset } = require("./fiatPolicy");

function reviewPayment({ currency = "EUR", assetType = "fiat", amount = 0, country = null } = {}) {
  const fiat = decideAsset({ currency, assetType });
  if (!fiat.ok) return { ...fiat, reviewed: false, moneyMoved: false, externalCall: false };
  const screen = fraudScreen({ amount, country });
  return {
    ok: true,
    code: screen.decision,
    reviewed: true,
    country: screen.country || country,
    live: false,
    externalCall: false,
    moneyMoved: false,
  };
}

module.exports = { reviewPayment };

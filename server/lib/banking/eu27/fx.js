/**
 * FX quote boundary. Same-currency identity is the only rate this module states.
 * A cross-currency rate is UNKNOWN until a sourced rate exists. None is invented.
 */
const { decideAsset } = require("./fiatPolicy");

function quoteRate({ base, quote } = {}) {
  const left = decideAsset({ currency: base, assetType: "fiat" });
  if (!left.ok) return { ...left, rate: null, invented: false, externalCall: false, live: false };
  const right = decideAsset({ currency: quote, assetType: "fiat" });
  if (!right.ok) return { ...right, rate: null, invented: false, externalCall: false, live: false };
  if (left.currency === right.currency) {
    return {
      ok: true,
      code: "IDENTITY_RATE",
      base: left.currency,
      quote: right.currency,
      rate: "1",
      invented: false,
      externalCall: false,
      live: false,
      moneyMoved: false,
    };
  }
  return {
    ok: false,
    code: "FX_RATE_UNKNOWN",
    base: left.currency,
    quote: right.currency,
    rate: null,
    invented: false,
    externalCall: false,
    live: false,
    moneyMoved: false,
  };
}

module.exports = { quoteRate };

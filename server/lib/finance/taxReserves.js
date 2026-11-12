/**
 * Emergency reserve is 25% of NET PROFIT, not turnover and not a tax rate.
 * Tax reserve is a separate bucket. Germany is not in the 26-country pool.
 */
const EMERGENCY_RATE_ON_NET_PROFIT = 0.25;

function readProfit(value) {
  if (value == null || value === "") return { present: false, value: null };
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return { invalid: true, value: null };
  if (!/^\d+(\.\d{1,2})?$/.test(String(value))) return { invalid: true, value: null };
  return { present: true, value };
}

function split({ netProfit, taxEstimate, country = "FR" } = {}) {
  const net = readProfit(netProfit);
  const tax = readProfit(taxEstimate);
  const de = String(country).toUpperCase() === "DE";
  const countryCode = String(country).toUpperCase();
  if (net.invalid || tax.invalid) {
    return {
      ok: false,
      code: "INVALID_AMOUNT",
      country: countryCode,
      germanySeparate: de,
      emergencyReserve: null,
      taxReserve: null,
      mixed: false,
      paymentAuthority: false,
      elsterLive: false,
    };
  }
  return {
    ok: net.present,
    code: net.present ? "RESERVE_COMPUTED" : "PROFIT_UNKNOWN",
    country: countryCode,
    germanySeparate: de,
    emergencyReserve: net.present ? (de ? 0 : Number((net.value * EMERGENCY_RATE_ON_NET_PROFIT).toFixed(2))) : null,
    taxReserve: tax.present ? tax.value : null,
    mixed: false,
    paymentAuthority: false,
    elsterLive: false,
  };
}

module.exports = { EMERGENCY_RATE_ON_NET_PROFIT, split };

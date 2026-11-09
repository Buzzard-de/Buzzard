/**
 * Emergency reserve is 25% of NET PROFIT, not turnover and not a tax rate.
 * Tax reserve is a separate bucket. Germany is not in the 26-country pool.
 */
const EMERGENCY_RATE_ON_NET_PROFIT = 0.25;

function split({ netProfit = 0, taxEstimate = 0, country = "FR" } = {}) {
  const net = Math.max(0, Number(netProfit) || 0);
  const tax = Math.max(0, Number(taxEstimate) || 0);
  const de = String(country).toUpperCase() === "DE";
  return {
    country: String(country).toUpperCase(),
    germanySeparate: de,
    emergencyReserve: de ? 0 : Number((net * EMERGENCY_RATE_ON_NET_PROFIT).toFixed(2)),
    taxReserve: tax,
    mixed: false,
    paymentAuthority: false,
    elsterLive: false,
  };
}

module.exports = { EMERGENCY_RATE_ON_NET_PROFIT, split };

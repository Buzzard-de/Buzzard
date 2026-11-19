/**
 * Finance / tax ops snapshot (pools + filing gates, no ELSTER live).
 */
const { listPools, POOL_COUNTRIES } = require("../commerce/taxPools");
const { assess: assessTaxConnect } = require("../commerce/taxConnect");
const { AB27 } = require("../commerce/ab27Tax");
const { snapshot: paymentSnapshot } = require("./paymentConnectorRegistry");

function snapshot() {
  const pools = listPools();
  const taxConnect = assessTaxConnect();
  const payments = paymentSnapshot();
  return {
    live: false,
    productionReady: false,
    ab27Countries: AB27.length,
    taxPools: {
      configured: pools.length,
      poolCountries: POOL_COUNTRIES.length,
      reservePercentDefault: 25,
      paymentAuthority: false,
    },
    taxConnect: {
      status: taxConnect.status,
      filingLive: false,
      elsterLive: false,
    },
    payments: {
      providers: payments.providers.length,
      anyLive: payments.anyLive,
    },
    salesEnabled: process.env.BUZZARD_SALES_ENABLED === "1",
  };
}

module.exports = { snapshot };
/**
 * Carrier comparison. Never treats estimates as contracted rates.
 */
const { compareCarriers } = require("../commerce/ab27Logistics");
const { isSalesEnabled } = require("../salesMode");
const { load } = require("./carrierMaster");

function recommend({ destination, weightKg = 1, preferSpeed = false } = {}) {
  const quote = compareCarriers({ destination, weightKg, preferSpeed });
  const master = load();
  const dest = String(destination || "").toUpperCase();
  const destKey = dest === "GR" ? "EL" : dest;
  const country = master.counts.find((c) => c.iso === destKey);
  return {
    ...quote,
    liveRate: false,
    contracted: false,
    salesEnabled: isSalesEnabled(),
    countryVerification: country?.verification || "UNKNOWN",
    cheapestNotAutoSelected: true,
    selectionNote: "Dry-run scoring only. No live contract price.",
  };
}

module.exports = { recommend };

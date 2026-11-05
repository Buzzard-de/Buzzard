/**
 * Carrier comparison. Never treats estimates as contracted rates.
 */
const { compareCarriers } = require("../commerce/ab27Logistics");
const { isSalesEnabled } = require("../salesMode");
const { load } = require("./carrierMaster");

function recommend({
  destination,
  origin,
  postalCode,
  weightKg = 1,
  volumetricKg,
  preferSpeed = false,
} = {}) {
  const quote = compareCarriers({ destination, weightKg, preferSpeed });
  const master = load();
  const dest = String(destination || "").toUpperCase();
  const destKey = dest === "GR" ? "EL" : dest;
  const country = master.counts.find((c) => c.iso === destKey);
  const estimate = quote.estimate ?? quote.estimatedCost ?? null;
  return {
    ...quote,
    origin: origin || "UNKNOWN",
    postalCode: postalCode || "UNKNOWN",
    volumetricKg: volumetricKg == null ? "UNKNOWN" : volumetricKg,
    liveRate: false,
    contracted: false,
    estimateIsNotPrice: true,
    estimate,
    salesEnabled: isSalesEnabled(),
    countryVerification: country?.verification || "UNKNOWN",
    cheapestNotAutoSelected: true,
    cannotStartShipment: true,
    selectionNote: "Dry-run scoring only. Unverified estimates are not contracted prices.",
  };
}

module.exports = { recommend };

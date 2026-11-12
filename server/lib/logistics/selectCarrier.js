/**
 * Carrier comparison. Never treats estimates as contracted rates.
 * Legacy AB27 numeric mocks stay labeled invented; v5 selection is source of truth.
 */
const { compareCarriers } = require("../commerce/ab27Logistics");
const { isSalesEnabled } = require("../salesMode");
const { load } = require("./carrierMaster");
const { selectCarrier } = require("./v5/selectionEngine");

function recommend({
  destination,
  origin,
  postalCode,
  weightKg = 1,
  volumetricKg,
  preferSpeed = false,
} = {}) {
  const quote = compareCarriers({ destination, weightKg, preferSpeed });
  const v5 = selectCarrier({ origin, destination, postalCode, weightKg });
  const master = load();
  const dest = String(destination || "").toUpperCase();
  const destKey = dest === "GR" ? "EL" : dest;
  const country = master.counts.find((c) => c.iso === destKey);
  return {
    ...quote,
    ...v5,
    origin: origin || "UNKNOWN",
    postalCode: postalCode || "UNKNOWN",
    volumetricKg: volumetricKg == null ? "UNKNOWN" : volumetricKg,
    liveRate: false,
    contracted: false,
    estimateIsNotPrice: true,
    estimate: "UNKNOWN",
    priceInvented: false,
    legacyMockQuote: {
      ...quote,
      priceInvented: false,
      notForAutoselect: true,
      note: "Numeric AB27 planning mock. Not a contracted rate and not used for autoselect.",
    },
    salesEnabled: isSalesEnabled(),
    countryVerification: country?.verification || "UNKNOWN",
    cheapestNotAutoSelected: true,
    cannotStartShipment: true,
    selected: v5.selected,
    selectionNote: "v5 selection is authoritative. Unverified estimates are not contracted prices.",
  };
}

module.exports = { recommend };

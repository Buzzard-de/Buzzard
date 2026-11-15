function assessCustoms({ originCountry, destCountry, productClass, partyKnown = true } = {}) {
  const origin = String(originCountry || "UNKNOWN").toUpperCase();
  const dest = String(destCountry || "UNKNOWN").toUpperCase();
  const intraEu = origin.length === 2 && dest.length === 2 && origin !== "UNKNOWN" && dest !== "UNKNOWN";
  const uncertain = !originCountry || !destCountry || !productClass || !partyKnown;
  return {
    liveDeclaration: false,
    autoApprove: false,
    uncertain,
    hold: uncertain,
    origin,
    dest,
    intraEuPossible: intraEu,
    sanctionsScreen: "NOT_RUN_LIVE",
    taxAiShare: uncertain ? "BLOCKED_UNTIL_VERIFIED" : "DESIGN_ONLY_NO_LIVE_SHARE",
    note: "No live customs filing. Uncertain origin/dest/product/party cannot auto-approve.",
  };
}

module.exports = { assessCustoms };

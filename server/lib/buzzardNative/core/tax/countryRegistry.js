const { STANDARD_VAT, AB27, SNAPSHOT } = require("../../../commerce/ab27Tax");

const AUTHORITY = Object.freeze({
  DE: { authority: "Bundeszentralamt für Steuern / BZSt", filing: "USt, KSt human-filed", oss: true, ioss: true },
  FR: { authority: "DGFiP", filing: "human-filed", oss: true, ioss: true },
});

function countries() {
  return AB27.map((code) => {
    const meta = AUTHORITY[code] || { authority: "member-state tax authority", filing: "human-filed", oss: true, ioss: true };
    return {
      countryCode: code === "EL" ? "EL" : code,
      iso: code === "EL" ? "GR" : code,
      currency: "EUR",
      vatStandardRate: STANDARD_VAT[code],
      vatReducedRates: "NOT_IN_SNAPSHOT",
      vatSpecialRates: "NOT_IN_SNAPSHOT",
      taxAuthority: meta.authority,
      filingRequirements: meta.filing,
      filingDeadlines: "UNKNOWN",
      ossIossApplicability: { oss: meta.oss, ioss: meta.ioss, live: false },
      corporateTaxReference: "NOT_IN_SNAPSHOT",
      sourceRegistry: SNAPSHOT.source,
      effectiveDate: SNAPSHOT.retrievedAt,
      lastVerifiedDate: SNAPSHOT.retrievedAt,
      verificationStatus: "UNVERIFIED",
      liveLegal: false,
    };
  });
}

function getCountry(code) {
  const c = String(code || "").toUpperCase();
  const mapped = c === "GR" ? "EL" : c;
  return countries().find((row) => row.countryCode === mapped || row.iso === c) || null;
}

module.exports = { countries, getCountry, NET_INCOME_RESERVE_RATE: 0.25 };

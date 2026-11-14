const { STANDARD_VAT, AB27, SNAPSHOT } = require("../../../commerce/ab27Tax");

const EURO_MEMBERS = new Set(["AT", "BE", "CY", "DE", "EE", "EL", "ES", "FI", "FR", "HR", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK"]);
const OTHER_CURRENCY = Object.freeze({
  CZ: "CZK",
  DK: "DKK",
  HU: "HUF",
  PL: "PLN",
  RO: "RON",
  SE: "SEK",
});

function currencyFor(code) {
  if (OTHER_CURRENCY[code]) return OTHER_CURRENCY[code];
  if (EURO_MEMBERS.has(code)) return "EUR";
  return "UNKNOWN";
}

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
      currency: currencyFor(code),
      locale: "UNKNOWN",
      vatStandardRate: Object.prototype.hasOwnProperty.call(STANDARD_VAT, code) ? STANDARD_VAT[code] : null,
      vatOfficial: false,
      vatVerified: false,
      vatSource: Object.prototype.hasOwnProperty.call(STANDARD_VAT, code) ? "UNVERIFIED_LOCAL_SNAPSHOT" : "UNKNOWN",
      vatReducedRates: "UNKNOWN",
      vatSpecialRates: "UNKNOWN",
      paymentConfig: "UNKNOWN",
      shippingConfig: "UNKNOWN",
      returnRules: "UNKNOWN",
      marketplaceEligibility: "UNKNOWN",
      complianceStatus: "UNKNOWN",
      taxAuthority: meta.authority,
      filingRequirements: meta.filing,
      filingDeadlines: "UNKNOWN",
      ossIossApplicability: { oss: meta.oss, ioss: meta.ioss, live: false },
      corporateTaxReference: "NOT_IN_SNAPSHOT",
      sourceRegistry: SNAPSHOT.source,
      effectiveDate: "UNKNOWN",
      lastVerifiedDate: null,
      snapshotRetrievedAt: SNAPSHOT.retrievedAt,
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

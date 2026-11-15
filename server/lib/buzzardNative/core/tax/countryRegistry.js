const { STANDARD_VAT, SNAPSHOT } = require("../../../commerce/ab27Tax");

const EU27_CODES = Object.freeze([
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES", "FI", "FR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK",
]);

const ISO_ALIASES = Object.freeze({ GR: "EL" });

const EURO_MEMBERS = new Set(["AT", "BE", "CY", "DE", "EE", "EL", "ES", "FI", "FR", "HR", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK"]);
const OTHER_CURRENCY = Object.freeze({
  CZ: "CZK",
  DK: "DKK",
  HU: "HUF",
  PL: "PLN",
  RO: "RON",
  SE: "SEK",
});

const COMMERCIAL_FIELDS = Object.freeze([
  "locale",
  "vatReducedRates",
  "vatSpecialRates",
  "paymentConfig",
  "shippingConfig",
  "returnRules",
  "marketplaceEligibility",
  "complianceStatus",
  "taxAuthority",
  "filingRequirements",
  "filingDeadlines",
  "corporateTaxReference",
  "effectiveDate",
]);

function canonicalCode(code) {
  const raw = String(code ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(raw)) return null;
  return ISO_ALIASES[raw] || raw;
}

function currencyFor(code) {
  if (OTHER_CURRENCY[code]) return OTHER_CURRENCY[code];
  if (EURO_MEMBERS.has(code)) return "EUR";
  return "UNKNOWN";
}

function snapshotRate(code, table = STANDARD_VAT) {
  const key = canonicalCode(code);
  const ownRate = key != null && Object.prototype.hasOwnProperty.call(table, key);
  if (!ownRate) {
    return {
      vatStandardRate: null,
      vatSource: "UNKNOWN",
      vatOfficial: false,
      vatVerified: false,
    };
  }
  return {
    vatStandardRate: table[key],
    vatSource: "UNVERIFIED_LOCAL_SNAPSHOT",
    vatOfficial: false,
    vatVerified: false,
  };
}

function countryRow(code) {
  const rate = snapshotRate(code);
  return {
    countryCode: code,
    iso: code === "EL" ? "GR" : code,
    currency: currencyFor(code),
    locale: "UNKNOWN",
    vatStandardRate: rate.vatStandardRate,
    vatOfficial: false,
    vatVerified: false,
    vatSource: rate.vatSource,
    vatReducedRates: "UNKNOWN",
    vatSpecialRates: "UNKNOWN",
    paymentConfig: "UNKNOWN",
    shippingConfig: "UNKNOWN",
    returnRules: "UNKNOWN",
    marketplaceEligibility: "UNKNOWN",
    complianceStatus: "UNKNOWN",
    taxAuthority: "UNKNOWN",
    filingRequirements: "UNKNOWN",
    filingDeadlines: "UNKNOWN",
    ossIossApplicability: { oss: "UNKNOWN", ioss: "UNKNOWN", live: false },
    corporateTaxReference: "UNKNOWN",
    sourceRegistry: SNAPSHOT.source,
    effectiveDate: "UNKNOWN",
    lastVerifiedDate: null,
    snapshotRetrievedAt: SNAPSHOT.retrievedAt,
    verificationStatus: "UNVERIFIED",
    liveLegal: false,
    filingReady: false,
  };
}

function missingFields(row) {
  if (!row) return ["countryCode"];
  const missing = COMMERCIAL_FIELDS.filter((field) => row[field] == null || row[field] === "UNKNOWN");
  if (row.currency === "UNKNOWN") missing.push("currency");
  if (row.vatStandardRate == null || row.vatSource !== "UNVERIFIED_LOCAL_SNAPSHOT") missing.push("vatStandardRate");
  if (row.ossIossApplicability?.oss !== true) missing.push("oss");
  if (row.ossIossApplicability?.ioss !== true) missing.push("ioss");
  return missing;
}

function countries() {
  return EU27_CODES.map(countryRow);
}

function getCountry(code) {
  const mapped = canonicalCode(code);
  if (!mapped) return null;
  return countries().find((row) => row.countryCode === mapped || row.iso === String(code || "").trim().toUpperCase()) || null;
}

function validateCountry(code) {
  const raw = String(code ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(raw)) {
    return {
      ok: false,
      structural: false,
      commercialReady: false,
      code: "COUNTRY_CODE_INVALID",
      country: null,
      iso: null,
      currency: "UNKNOWN",
      vatStandardRate: null,
      vatOfficial: false,
      vatVerified: false,
      vatSource: "UNKNOWN",
      verificationStatus: "UNVERIFIED",
      missingFields: ["countryCode"],
      inheritedGermanyRate: false,
      liveLegal: false,
      filingReady: false,
    };
  }
  const row = getCountry(raw);
  if (!row) {
    return {
      ok: false,
      structural: false,
      commercialReady: false,
      code: "COUNTRY_UNKNOWN",
      country: null,
      iso: raw,
      currency: "UNKNOWN",
      vatStandardRate: null,
      vatOfficial: false,
      vatVerified: false,
      vatSource: "UNKNOWN",
      verificationStatus: "UNVERIFIED",
      missingFields: ["countryCode"],
      inheritedGermanyRate: false,
      liveLegal: false,
      filingReady: false,
    };
  }
  const germany = snapshotRate("DE");
  const own = snapshotRate(row.countryCode);
  const inheritedGermanyRate = row.countryCode !== "DE" && own.vatStandardRate != null && germany.vatStandardRate != null && own.vatSource === "UNKNOWN" && own.vatStandardRate === germany.vatStandardRate;
  return {
    ok: false,
    structural: true,
    commercialReady: false,
    code: "COUNTRY_MODEL_UNVERIFIED",
    country: row.countryCode,
    iso: row.iso,
    currency: row.currency,
    vatStandardRate: row.vatStandardRate,
    vatOfficial: false,
    vatVerified: false,
    vatSource: row.vatSource,
    verificationStatus: row.verificationStatus,
    missingFields: missingFields(row),
    inheritedGermanyRate,
    liveLegal: false,
    filingReady: false,
  };
}

function validateCountryModel() {
  const rows = countries();
  const problems = [];
  if (rows.length !== 27) problems.push("EU27_COUNT");
  const isos = new Set(rows.map((row) => row.iso));
  if (isos.size !== 27) problems.push("DUPLICATE_ISO");
  for (const code of EU27_CODES) {
    const row = rows.find((item) => item.countryCode === code);
    if (!row) {
      problems.push(`MISSING_${code}`);
      continue;
    }
    if (row.vatOfficial === true || row.vatVerified === true || row.verificationStatus === "VERIFIED") problems.push(`OFFICIAL_${code}`);
    if (row.lastVerifiedDate != null || row.lastVerifiedDate === row.snapshotRetrievedAt) problems.push(`VERIFIED_DATE_${code}`);
    if (row.countryCode !== "DE") {
      const withoutOwnRate = snapshotRate(code, { DE: 19 });
      if (withoutOwnRate.vatStandardRate != null || withoutOwnRate.vatSource !== "UNKNOWN") problems.push(`GERMANY_DEFAULT_${code}`);
    }
  }
  const greece = getCountry("GR");
  const hellas = getCountry("EL");
  if (!greece || !hellas || greece.countryCode !== "EL" || greece.iso !== "GR" || hellas.iso !== "GR") problems.push("GREECE_MAPPING");
  return {
    ok: problems.length === 0,
    code: problems.length === 0 ? "MODEL_STRUCTURE_READY" : "MODEL_STRUCTURE_INVALID",
    countries: rows.length,
    problems,
    commercialReady: false,
    liveLegal: false,
    filingReady: false,
  };
}

module.exports = {
  countries,
  getCountry,
  validateCountry,
  validateCountryModel,
  snapshotRate,
  EU27_CODES,
  NET_INCOME_RESERVE_RATE: 0.25,
};

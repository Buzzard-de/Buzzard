const EU27 = require("../../logistics/eu27Seed").COUNTRIES || null;

function countryList() {
  if (EU27) return EU27.map((c) => c.iso);
  return [
    "DE","FR","IT","ES","NL","BE","AT","PL","CZ","SK","HU","RO","BG","EL","PT","IE","DK","SE","FI","EE","LV","LT","LU","MT","CY","SI","HR",
  ];
}

function isValidPostcodeShape(iso, postalCode) {
  const pc = String(postalCode || "").trim();
  if (!pc || pc === "UNKNOWN") return false;
  const rules = {
    DE: /^\d{5}$/,
    FR: /^\d{5}$/,
    IT: /^\d{5}$/,
    ES: /^\d{5}$/,
    NL: /^\d{4}\s?[A-Z]{2}$/i,
    BE: /^\d{4}$/,
    AT: /^\d{4}$/,
    PL: /^\d{2}-?\d{3}$/,
    CZ: /^\d{3}\s?\d{2}$/,
    SK: /^\d{3}\s?\d{2}$/,
    HU: /^\d{4}$/,
    RO: /^\d{6}$/,
    BG: /^\d{4}$/,
    EL: /^\d{5}$/,
    PT: /^\d{4}-?\d{3}$/,
    IE: /^[A-Z0-9]{3}\s?[A-Z0-9]{4}$/i,
    DK: /^\d{4}$/,
    SE: /^\d{3}\s?\d{2}$/,
    FI: /^\d{5}$/,
    EE: /^\d{5}$/,
    LV: /^(LV-?)?\d{4}$/i,
    LT: /^(LT-?)?\d{5}$/i,
    LU: /^\d{4}$/,
    MT: /^[A-Z]{3}\s?\d{4}$/i,
    CY: /^\d{4}$/,
    SI: /^\d{4}$/,
    HR: /^\d{5}$/,
  };
  const re = rules[iso];
  if (!re) return false;
  return re.test(pc);
}

function lookupCoverage({ country, postalCode, carrierId } = {}) {
  const iso = country === "GR" ? "EL" : String(country || "").toUpperCase();
  const known = countryList().includes(iso);
  if (!known) {
    return {
      supported: false,
      delivery_available: false,
      reason: "UNSUPPORTED_DESTINATION",
      postal_code: postalCode || "UNKNOWN",
      confidence_level: "UNKNOWN",
    };
  }
  const shapeOk = isValidPostcodeShape(iso, postalCode);
  return {
    supported: true,
    country_code: iso,
    postal_code: postalCode || "UNKNOWN",
    postal_code_prefix: "UNKNOWN",
    city: "UNKNOWN",
    region: "UNKNOWN",
    carrier_id: carrierId || "UNKNOWN",
    service_type: "UNKNOWN",
    delivery_available: "UNKNOWN",
    pickup_available: "UNKNOWN",
    returns_available: "UNKNOWN",
    locker_available: "UNKNOWN",
    PUDO_available: "UNKNOWN",
    rural_delivery: "UNKNOWN",
    estimated_delivery_days: "UNKNOWN",
    postcodeShapeValid: shapeOk,
    nationwideClaim: false,
    coverageGranularity: "UNKNOWN",
    source: "NO_OFFICIAL_POSTCODE_FILE_INGESTED",
    verification_date: "2026-11-06",
    confidence_level: "UNKNOWN",
    license: "UNKNOWN",
  };
}

function classifyCoverageGranularity({ countryWideEvidence = false, postcodeEvidence = false } = {}) {
  if (postcodeEvidence) return "POSTCODE_LEVEL";
  if (countryWideEvidence) return "COUNTRY_LEVEL";
  return "UNKNOWN";
}

function carrierPostcodeCoverage({ country, carrierId } = {}) {
  const iso = country === "GR" ? "EL" : String(country || "").toUpperCase();
  return {
    country_code: countryList().includes(iso) ? iso : "UNKNOWN",
    carrier_id: carrierId || "UNKNOWN",
    coverageGranularity: "UNKNOWN",
    delivery_postcodes: "UNKNOWN",
    pickup_postcodes: "UNKNOWN",
    return_regions: "UNKNOWN",
    locker_pudo: "UNKNOWN",
    rural_restrictions: "UNKNOWN",
    regional_limits: "UNKNOWN",
    estimated_delivery_days: "UNKNOWN",
    weight_size_limits: "UNKNOWN",
    international_acceptance: "UNKNOWN",
    nationalCoverageVerified: false,
    source: "NO_CARRIER_POSTCODE_FILE_INGESTED",
    verification_date: "2026-11-06",
  };
}

function countryCoverageMatrix() {
  return countryList().map((iso) => ({
    iso,
    postcodeFile: "NOT_INGESTED",
    coverageVerified: false,
    nationalCoverageVerified: false,
    delivery_available: "UNKNOWN",
    pickup_available: "UNKNOWN",
    return_available: "UNKNOWN",
    locker_available: "UNKNOWN",
    PUDO_available: "UNKNOWN",
    rural_delivery: "UNKNOWN",
    estimated_delivery_days: "UNKNOWN",
    status: "UNKNOWN",
    coverageGranularity: "UNKNOWN",
    source: "NO_OFFICIAL_POSTCODE_FILE_INGESTED",
    verification_date: "2026-11-06",
    confidence_level: "UNKNOWN",
  }));
}

function postcodeLicenseMatrix() {
  return countryList().map((iso) => ({
    iso,
    officialPostcodeListFound: "UNKNOWN",
    fileIngested: false,
    licenseReviewed: false,
    license: "LICENSE_NOT_REVIEWED_FILE_NOT_INGESTED",
    nationalCoverageVerified: false,
    note: "Finding a national postcode list does not prove a carrier serves every code.",
  }));
}

module.exports = {
  lookupCoverage,
  isValidPostcodeShape,
  countryCoverageMatrix,
  postcodeLicenseMatrix,
  classifyCoverageGranularity,
  carrierPostcodeCoverage,
  countryList,
};

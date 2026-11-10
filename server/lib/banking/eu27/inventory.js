/**
 * EU-27 institution inventory.
 * Quoted ECB rows stay SOURCE_QUOTED. Missing registers stay gaps.
 * Nothing in this file is a live bank connection.
 */
const { EU_COUNTRY_CODES, getMarket } = require("../../../core/marketEngineRegistry");
const snapshot = require("../../../../data/banking/eu27/ecb-significant-part-a.json");
const swedishRegister = require("../../../../data/banking/eu27/se-fi-register.json");
const { evidenceOf } = require("./evidence");

const INSTITUTION_TYPES = Object.freeze([
  "STATE_BANK",
  "PRIVATE_BANK",
  "COMMERCIAL_BANK",
  "SAVINGS_BANK",
  "COOPERATIVE_BANK",
  "DIGITAL_BANK",
  "LICENSED_CREDIT_INSTITUTION",
  "PAYMENT_INSTITUTION",
  "ELECTRONIC_MONEY_INSTITUTION",
  "LOCAL_PAYMENT_SYSTEM",
]);

const REGISTER_CATEGORY_SLOTS = Object.freeze({
  Bankaktiebolag: Object.freeze(["COMMERCIAL_BANK", "LICENSED_CREDIT_INSTITUTION"]),
  Sparbank: Object.freeze(["SAVINGS_BANK", "LICENSED_CREDIT_INSTITUTION"]),
  Medlemsbank: Object.freeze(["COOPERATIVE_BANK", "LICENSED_CREDIT_INSTITUTION"]),
});

const NATIONAL_REGISTER_POINTERS = Object.freeze([
  {
    countryCode: "CZ",
    url: "https://jerrs.cnb.cz/apljerrsdad/JERRS.WEB07.INTRO_PAGE?p_lang=en",
    structuredListImported: false,
    current: true,
    note: "CNB JERRS is an interactive search. The fetched page has no entity table.",
  },
  {
    countryCode: "DK",
    url: "https://www.finanstilsynet.dk/",
    structuredListImported: false,
    current: false,
    note: "The historical annex Bilag5_1PI.pdf is not a current register and was not imported.",
  },
  {
    countryCode: "HU",
    url: "https://intezmenykereso.mnb.hu/en/Home/Index",
    structuredListImported: false,
    current: true,
    note: "MNB search page. The fetched document has no institution table.",
  },
  {
    countryCode: "PL",
    url: "https://www.knf.gov.pl/podmioty/Podmioty_sektora_bankowego",
    structuredListImported: false,
    current: true,
    note: "KNF category index. The fetched page does not name institutions.",
  },
  {
    countryCode: "RO",
    url: "https://www.bnr.ro/en/24444-rci-part-i",
    structuredListImported: false,
    current: true,
    note: "BNR credit-institution page. The fetched document has no institution table.",
  },
  {
    countryCode: "SE",
    url: "https://www.fi.se/sv/vara-register/foretagsregistret/",
    structuredListImported: true,
    current: true,
    importedCategories: Object.freeze(["Bankaktiebolag", "Sparbank", "Medlemsbank"]),
    note: "Only exact Huvudverksamhet matches are imported. The Finansiella institut query is not the bank census and was not imported.",
  },
]);

function eu27Countries() {
  return [...EU_COUNTRY_CODES].sort().map((countryCode) => {
    const market = getMarket(countryCode);
    return {
      countryCode,
      countryName: market ? market.countryName : null,
      currency: market ? market.currency : null,
    };
  });
}

function withEvidence(row) {
  return { ...row, endpoint: null, live: false, evidence: evidenceOf({ ...row, endpoint: null, live: false }) };
}

function entities() {
  const ecb = snapshot.entities.map((row) => withEvidence({
    ...row,
    sourceKind: "ECB_SSM_SIGNIFICANT",
    coverageSlots: [],
  }));
  const national = swedishRegister.entities.map((row) => withEvidence({
    ...row,
    sourceKind: "NATIONAL_REGISTER",
    coverageSlots: [...(REGISTER_CATEGORY_SLOTS[row.institutionType] || [])],
  }));
  return [...ecb, ...national];
}

function entitiesByCountry(countryCode) {
  const code = String(countryCode || "").toUpperCase();
  return entities().filter((row) => row.countryCode === code);
}

function slotCounts(rows) {
  return INSTITUTION_TYPES.map((slot) => ({
    slot,
    quoted: rows.filter((row) => row.coverageSlots.includes(slot) && row.verificationStatus === "SOURCE_QUOTED").length,
  }));
}

function countryRecord(country) {
  const rows = entitiesByCountry(country.countryCode);
  const slots = slotCounts(rows);
  const ecbQuoted = rows.filter((row) => row.sourceKind === "ECB_SSM_SIGNIFICANT").length;
  const nationalQuoted = rows.filter((row) => row.sourceKind === "NATIONAL_REGISTER").length;
  return {
    ...country,
    quotedEntities: rows.length,
    ecbQuoted,
    nationalQuoted,
    slots,
    registryComplete: slots.every((slot) => slot.quoted > 0),
    ownershipVerified: rows.filter((row) => row.ownershipClass === "STATE" || row.ownershipClass === "PRIVATE").length,
    paymentInstitutionsImported: slots.find((slot) => slot.slot === "PAYMENT_INSTITUTION").quoted,
    electronicMoneyInstitutionsImported: slots.find((slot) => slot.slot === "ELECTRONIC_MONEY_INSTITUTION").quoted,
    localPaymentSystemsVerified: slots.find((slot) => slot.slot === "LOCAL_PAYMENT_SYSTEM").quoted,
    apiDocumentsFetched: 0,
    liveConnectors: 0,
    gaps: gapList(country.countryCode, ecbQuoted, nationalQuoted),
  };
}

function coverage() {
  const countries = eu27Countries().map(countryRecord);
  const registry = registryComplete(countries);
  return {
    schema: snapshot.schema,
    researchDate: snapshot.researchDate,
    complete: registry.complete,
    code: registry.code,
    liveReady: false,
    countryCount: countries.length,
    quotedEntities: countries.reduce((sum, country) => sum + country.quotedEntities, 0),
    registers: snapshot.registers,
    nationalRegisterPointers: NATIONAL_REGISTER_POINTERS,
    notes: [...snapshot.notes, ...swedishRegister.notes],
    countries,
    institutionTypes: INSTITUTION_TYPES,
  };
}

function registryComplete(prepared) {
  const countries = prepared || eu27Countries().map(countryRecord);
  const complete = countries.length === 27 && countries.every((country) => country.registryComplete);
  return {
    code: complete ? "EU27_REGISTRY_COMPLETE" : "EU27_REGISTRY_INCOMPLETE",
    complete,
    countries: countries.map((country) => ({
      countryCode: country.countryCode,
      complete: country.registryComplete,
      slots: country.slots,
    })),
  };
}

function gapList(countryCode, ecbQuoted, nationalQuoted) {
  const gaps = [
    "OWNERSHIP_UNKNOWN",
    "EBA_CREDIT_REGISTER_NOT_IMPORTED",
    "EBA_PAYMENT_REGISTER_NOT_IMPORTED",
    "LOCAL_PAYMENT_SYSTEM_NOT_VERIFIED",
    "API_DOCUMENTATION_NOT_FETCHED",
    "FEES_AND_SETTLEMENT_UNKNOWN",
  ];
  if (ecbQuoted === 0) gaps.unshift("NO_ENTITY_IN_ECB_PART_A_EXTRACT");
  if (nationalQuoted === 0) gaps.unshift("NATIONAL_REGISTER_NOT_IMPORTED");
  else gaps.push("NATIONAL_REGISTER_PARTIAL");
  if (countryCode === "DK") gaps.push("HISTORICAL_ANNEX_NOT_A_CURRENT_REGISTER");
  return gaps;
}

function assertNotVerified(row) {
  if (!row) return { ok: false, code: "UNKNOWN_ENTITY" };
  if (row.verificationStatus === "VERIFIED" || row.connectorStatus === "LIVE_VERIFIED" || row.endpoint) {
    return { ok: false, code: "FALSE_VERIFICATION" };
  }
  return { ok: true, code: "UNVERIFIED_FOR_LIVE_USE", live: false };
}

module.exports = {
  INSTITUTION_TYPES,
  NATIONAL_REGISTER_POINTERS,
  REGISTER_CATEGORY_SLOTS,
  snapshot,
  eu27Countries,
  entities,
  entitiesByCountry,
  coverage,
  registryComplete,
  assertNotVerified,
};

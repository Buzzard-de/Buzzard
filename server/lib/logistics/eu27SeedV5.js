/**
 * Carrier master v5. Extends v4. Stats ≠ carriers. Mock engines only.
 */
const fs = require("fs");
const path = require("path");
const v4mod = require("./eu27SeedV4");
const { dedupe, isLikelyNaturalPerson, classifyLetterVsParcel } = require("./v5/identityResolver");
const { priorityCatalog } = require("./v5/adapterFramework");
const { countryCoverageMatrix } = require("./v5/coverageEngine");
const { engineStatus, costModel, performanceModel } = require("./v5/integrationEngine");

const RETRIEVED = "2026-11-06";

function src(id, title, url, extra = {}) {
  return { id, title, url, retrievedAt: RETRIEVED, ...extra };
}

function slug(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function row(id, legal, brand, iso, cls, reliability, sources, notes, extra = {}) {
  return {
    id,
    legalName: legal,
    brand,
    hqCountry: iso,
    class: cls,
    reliability,
    legalNameStatus: extra.legalNameStatus || "LEGAL_NAME_VERIFIED",
    companyStatus: extra.companyStatus || "COMPANY_STATUS_UNKNOWN",
    activityVerified: extra.activityVerified === true,
    parcel_service_verified: extra.parcel_service_verified || "UNKNOWN",
    letter_service_verified: extra.letter_service_verified || "UNKNOWN",
    own_fleet_status: extra.own_fleet_status || "UNKNOWN",
    subcontractor_status: extra.subcontractor_status || "UNKNOWN",
    coverageVerified: false,
    coverageMode: extra.coverageMode || "UNKNOWN",
    postalCodeCoverage: "UNKNOWN",
    apiStatus: extra.apiStatus || "NOT_VERIFIED",
    apiLevel: extra.apiLevel || 0,
    sandboxVerified: false,
    liveVerified: false,
    sources,
    notes,
    website: extra.website || "NOT_PUBLISHED",
    parent: extra.parent || "NOT_VERIFIED",
    companyNumber: extra.companyNumber || "NOT_PUBLISHED",
    VAT_ID: extra.VAT_ID || "UNKNOWN",
    EUID: extra.EUID || "UNKNOWN",
  };
}

const SOURCES_V5 = Object.freeze({
  eurostatH53: src(
    "eurostat-sbs-ovw-act-h53-ent-nr",
    "Eurostat sbs_ovw_act ENT_NR H53, updated 2026-09-30. EU27_2020: 2021=186813, 2022=200000, 2023=206964, 2024=224523. 197424 not in this pull.",
    "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sbs_ovw_act?format=JSON&lang=EN&nace_r2=H53&indic_sbs=ENT_NR&freq=A"
  ),
  ela2024: src(
    "ela-eures-h53-2024",
    "ELA (2025) EURES shortages 2024 sector analysis: approximately 60 000 enterprises in 2024. Not SBS. Do not merge.",
    "https://www.ela.europa.eu/sites/default/files/2025-06/Sector_analysis_on_postal_and_courier_activities.pdf"
  ),
  hakom: src(
    "hakom-davatelji-2026-11-06",
    "HAKOM davatelji poštanskih usluga: 24 providers on page; unique legal names extracted from table",
    "https://www.hakom.hr/hr/davatelji-usluga/288"
  ),
  rtrPev: src(
    "rtr-pev-2026-02-16",
    "RTR Liste der PEV-Betreiber, Stand 16. Februar 2026, 16 names. Not the full §25 Anzeige list. Do not use 138.",
    "https://www.rtr.at/TKP/was_wir_tun/post/betreiberservice/liste_der_pev-betreiber.de.html"
  ),
  nmhhExcel: src(
    "nmhh-excel-still-unfetched",
    "NMHH Excel advertised on HTML without a fetchable href. Import BLOCKED.",
    "https://nmhh.hu/posta/nyilvantartas",
    { fetchStatus: "NO_HREF_IN_HTML" }
  ),
  anacom403: src(
    "anacom-403-persists",
    "ANACOM render.jsp lists remain HTTP 403. digital.anacom.pt portal found, bulk unique postal count still DATA_INCOMPLETE.",
    "https://digital.anacom.pt/pt-PT/Servicos/servicos-postais/"
  ),
  rrtPbi: src(
    "rrt-powerbi-blocked",
    "RRT provider list remains Power BI embed. Bulk export not performed.",
    "https://rrt.lt/veiklos-sritys/pastas/pasto-paslauga/pasto-paslaugu-teikejai"
  ),
  ancomSsl: src(
    "ancom-ssl-failed",
    "ANCOM authorised-provider HTML fetch failed TLS verify in this environment. First-page names from prior research kept.",
    "https://www.ancom.ro/reglementare-ro/servicii-postale/furnizori-servicii-postale/furnizori-servicii-postale-autorizati/"
  ),
});

const HR_HAKOM_UNIQUE = [
  { legal: "HP-HRVATSKA POŠTA d.d.", cls: "NATIONAL_POST_NAMED_ALIAS", parcel: "USP_INCLUDES_PARCEL_UP_TO_10KG" },
  { legal: "LIDER EXPRESS d.o.o.", cls: "SUBSTITUTABLE_POSTAL", parcel: "REGISTER_INCLUDES_PARCEL_UP_TO_10KG" },
  { legal: "POŠTA EXPRESS j.d.o.o.", cls: "SUBSTITUTABLE_POSTAL", parcel: "REGIONAL_PARCEL_LETTER" },
  { legal: "FUMA PRINT d.o.o.", cls: "SUBSTITUTABLE_POSTAL", parcel: "LETTER_REGIONS_NAMED" },
  { legal: "ELEKTROMODUL THORAX d.o.o.", cls: "SUBSTITUTABLE_POSTAL", parcel: "LETTER" },
  { legal: "A2B EXPRESS LOGISTIKA d.o.o.", cls: "OTHER_POSTAL_SERVICES", parcel: "UNKNOWN" },
  { legal: "BOX NOW d.o.o.", cls: "PUDO_LOCKER", parcel: "UNKNOWN" },
  { legal: "DHL INTERNATIONAL d.o.o.", cls: "PRIVATE_EXPRESS", parcel: "UNKNOWN" },
  { legal: "DPD CROATIA d.o.o.", cls: "PRIVATE_PARCEL", parcel: "UNKNOWN" },
  { legal: "GEBRÜDER WEISS d.o.o.", cls: "FREIGHT", parcel: "UNKNOWN" },
  { legal: "GENERAL LOGISTICS SYSTEMS CROATIA d.o.o.", cls: "PRIVATE_PARCEL", parcel: "UNKNOWN" },
  { legal: "GORDOM LOGISTIKA j.d.o.o.", cls: "OTHER_POSTAL_SERVICES", parcel: "UNKNOWN" },
  { legal: "INTEREUROPA d.o.o.", cls: "FREIGHT", parcel: "UNKNOWN" },
  { legal: "IN TIME d.o.o.", cls: "OTHER_POSTAL_SERVICES", parcel: "UNKNOWN" },
  { legal: "KATALOGIST d.o.o.", cls: "OTHER_POSTAL_SERVICES", parcel: "UNKNOWN" },
  { legal: "LAGERMAX LOGISTICS CROATIA d.o.o.", cls: "FREIGHT", parcel: "UNKNOWN" },
  { legal: "LIDER EXPRESS GRUPA d.o.o.", cls: "OTHER_POSTAL_SERVICES", parcel: "UNKNOWN" },
  { legal: "LSC LOGISTIKA d.o.o.", cls: "OTHER_POSTAL_SERVICES", parcel: "UNKNOWN" },
  { legal: "M SAN LOGISTIKA d.o.o.", cls: "OTHER_POSTAL_SERVICES", parcel: "UNKNOWN" },
  { legal: "OVERSEAS TRADE Co Ltd d.o.o.", cls: "OTHER_POSTAL_SERVICES", parcel: "UNKNOWN" },
  { legal: "RHEA d.o.o.", cls: "OTHER_POSTAL_SERVICES", parcel: "UNKNOWN" },
  { legal: "ROUTE MTM d.o.o.", cls: "OTHER_POSTAL_SERVICES", parcel: "UNKNOWN" },
];

const AT_PEV = [
  "Albatros FB Express GmbH",
  "Amazon Transport Austria GmbH",
  "Bss-Logistik GmbH",
  "DeliGee Parcel GmbH",
  "DHL Express (Austria) GmbH",
  "DPD Direct Parcel Distribution Austria GmbH",
  "FedEx Express Austria GmbH",
  "feibra GmbH",
  "General Logistics Systems Austria GmbH",
  "KEP Logistic GmbH",
  "MUNJA Trans GmbH",
  "Österreichische Post AG",
  "Rain Transport GmbH",
  "redmail Logistik & Zustellservice GmbH",
  "SparTrans GmbH",
  "United Parcel Service Speditionsgesellschaft m.b.H.",
];

const INTL_BRANDS = [
  "DHL Express","DHL Parcel","Deutsche Post","UPS","FedEx","TNT","DPD","GLS","Hermes / Evri",
  "Amazon Logistics","InPost","Geis","Rhenus","DB Schenker","DSV","Kuehne+Nagel","Raben Group",
  "Aramex","Bring","PostNord","Packeta","Zásilkovna","Sameday","FAN Courier","Econt","Speedy",
  "Venipak","CTT Expresso","SEUR","MRW","Nacex","Chronopost","Colissimo","BRT / Bartolini",
  "Mondial Relay","Relais Colis","Colis Privé","DAO","Matkahuolto",
];

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "../../../", rel), "utf8"));
}

function extrasV5() {
  const out = [];
  for (const r of HR_HAKOM_UNIQUE) {
    out.push(
      row(
        `hr-hakom-${slug(r.legal)}`,
        r.legal,
        r.legal,
        "HR",
        r.cls,
        "SOURCE_VERIFIED",
        ["hakom-davatelji-2026-11-06"],
        "HAKOM public provider table 2026-11-06. Page states 24 providers; unique legal names extracted (address duplicates collapsed). Not all parcel last-mile.",
        { parcel_service_verified: r.parcel, letter_service_verified: "UNKNOWN" }
      )
    );
  }
  for (const name of AT_PEV) {
    if (name === "Österreichische Post AG") continue;
    out.push(
      row(
        `at-pev-${slug(name)}`,
        name,
        name,
        "AT",
        "PEV_REPORTER",
        "SOURCE_VERIFIED",
        ["rtr-pev-2026-02-16"],
        "PEV reporter (>50 postal employees). Not the full §25 Anzeige register. Austria 138 remains unverified.",
        { parcel_service_verified: "UNKNOWN", own_fleet_status: "UNKNOWN" }
      )
    );
  }
  return out;
}

function internationalMatrix(entities) {
  const found = new Set();
  for (const e of entities) {
    const blob = `${e.legalName} ${e.brand}`;
    for (const b of INTL_BRANDS) {
      const token = b.split("/")[0].trim();
      if (blob.toLowerCase().includes(token.toLowerCase())) found.add(`${b}|${e.hqCountry}|${e.id}`);
    }
  }
  const rows = [];
  const isos = ["DE","FR","IT","ES","NL","BE","AT","PL","CZ","SK","HU","RO","BG","EL","PT","IE","DK","SE","FI","EE","LV","LT","LU","MT","CY","SI","HR"];
  for (const b of INTL_BRANDS) {
    for (const iso of isos) {
      const hits = [...found].filter((k) => k.startsWith(`${b}|${iso}|`));
      rows.push({
        brand: b,
        country: iso,
        activityType: hits.length ? "REGISTERED_OR_NAMED_LOCAL_ENTITY" : "UNKNOWN",
        own_fleet_status: "UNKNOWN",
        evidenceEntityIds: hits.map((k) => k.split("|")[2]),
        note: hits.length
          ? "Named local legal on a register is not own last-mile fleet."
          : "Absence of a named row is not proof of no service.",
      });
    }
  }
  return rows;
}

function researchStatus(counts) {
  const map = {};
  for (const c of counts) {
    let st = "PARTIALLY_VERIFIED";
    if (c.verification === "DATA_INCOMPLETE") st = "SOURCE_FOUND";
    if (["HU", "PT", "LT"].includes(c.iso)) st = "SOURCE_FOUND";
    if (c.iso === "AT") st = "CARRIER_NAMES_VERIFIED";
    if (c.iso === "HR") st = "CARRIER_NAMES_VERIFIED";
    if (c.iso === "NL") st = "LEGAL_ENTITIES_VERIFIED";
    if (c.iso === "PL") st = "LEGAL_ENTITIES_VERIFIED";
    if (c.iso === "EL") st = "LEGAL_ENTITIES_VERIFIED";
    map[c.iso] = {
      iso: c.iso,
      status: st,
      completeVerified: false,
      postcodeCoverageVerified: false,
      sandboxVerified: false,
      register: c.verification,
    };
  }
  return map;
}

function derived(entities) {
  const nlPakket = entities.filter((e) => e.class === "ACM_PAKKETBEZORGDIENST");
  const nlPost = entities.filter((e) => e.class === "ACM_POSTVERVOERDIENST");
  const el = entities.filter((e) => String(e.id).startsWith("el-eett-"));
  const elPersons = el.filter((e) => isLikelyNaturalPerson(e.legalName));
  return {
    nlAcmPakketRegisterClass: nlPakket.length,
    nlAcmPostRegisterClass: nlPost.length,
    nlPostNotRegionalCourier: true,
    elEettRows: el.length,
    elLikelyNaturalPersonHeuristic: elPersons.length,
    elNotAllRegionalCarriers: true,
    note: "Heuristics are not parcel-service verification.",
  };
}

function overlayRegister(c, patch) {
  return { ...c, register: { ...c.register, ...patch }, verification: patch.status || c.verification };
}

function buildMasterV5() {
  const base = v4mod.buildMasterV4();
  const add = extrasV5();
  const seen = new Set(base.entities.map((e) => e.id));
  const entities = [...base.entities];
  for (const e of add) {
    if (!seen.has(e.id)) {
      entities.push(e);
      seen.add(e.id);
    }
  }
  for (const e of entities) {
    const lp = classifyLetterVsParcel(e);
    if (!e.parcel_service_verified) e.parcel_service_verified = lp.parcel_service_verified;
    if (!e.letter_service_verified) e.letter_service_verified = lp.letter_service_verified;
    if (e.own_fleet_status == null) e.own_fleet_status = "UNKNOWN";
  }

  const euro = loadJson("data/logistics/sources/eurostat_sbs_ovw_act_h53_ent_nr.v5.json");
  const ela = loadJson("data/logistics/sources/ela_h53_labour_2024.v5.json");

  const counts = base.counts.map((c) => {
    if (c.iso === "HR") {
      return overlayRegister(c, {
        records: 24,
        uniqueLegal: HR_HAKOM_UNIQUE.length,
        status: "PARTIALLY_VERIFIED",
        method: "hakom_public_table_2026_11_06",
        source: "hakom-davatelji-2026-11-06",
        note: "Page total 24 providers. Unique legal names extracted: " + HR_HAKOM_UNIQUE.length + ". Address duplicates collapsed. Letter vs parcel mixed.",
      });
    }
    if (c.iso === "AT") {
      return overlayRegister(c, {
        records: 16,
        uniqueLegal: 16,
        status: "PARTIALLY_VERIFIED",
        method: "rtr_pev_named_list_2026_02_16",
        source: "rtr-pev-2026-02-16",
        note: "16 named PEV reporters. Full §25 Anzeige list not downloaded. Do not use 138.",
      });
    }
    if (c.iso === "HU") {
      return overlayRegister(c, {
        status: "DATA_INCOMPLETE",
        method: "nmhh_excel_href_absent",
        source: "nmhh-excel-still-unfetched",
        note: "Excel still not imported. Locker/PUDO Q1 2026 remains in locker tables.",
      });
    }
    if (c.iso === "PT") {
      return overlayRegister(c, {
        status: "DATA_INCOMPLETE",
        method: "anacom_403_digital_portal_no_bulk",
        source: "anacom-403-persists",
        note: "HTTP 403 on alphabetical list. Digital portal exists. Unique postal-only count unknown.",
      });
    }
    if (c.iso === "LT") {
      return overlayRegister(c, {
        status: "DATA_INCOMPLETE",
        method: "rrt_powerbi_no_export",
        source: "rrt-powerbi-blocked",
        note: "Power BI embed; bulk export not obtained.",
      });
    }
    if (c.iso === "RO") {
      return overlayRegister(c, {
        status: "DATA_INCOMPLETE",
        method: "ancom_tls_failed_this_environment",
        source: "ancom-ssl-failed",
        note: "Searchable register exists. Full unique authorised-provider count not extracted here.",
      });
    }
    return c;
  });

  const sourceVerified = entities.filter(
    (e) => String(e.reliability).startsWith("VERIFIED") || e.reliability === "SOURCE_VERIFIED"
  );
  const keys = dedupe(sourceVerified);
  const lockers = base.lockers || [];
  const pudo = base.pudo || [];

  return {
    schema: "buzzard.eu27-carrier-master.v5",
    previousSchema: base.schema,
    previousVerifiedLegalCount: base.previousVerifiedLegalCount,
    retrievedAt: RETRIEVED,
    salesEnabled: false,
    liveShipment: false,
    completeVerifiedCountries: 0,
    technicallyUsableLiveCarriers: 0,
    sandboxVerifiedCarriers: 0,
    sources: [...base.sources, ...Object.values(SOURCES_V5)],
    countries: base.countries,
    entities,
    counts,
    lockers,
    pudo,
    internationalOperations: base.internationalOperations,
    internationalBrandCountryMatrix: internationalMatrix(entities),
    apiDocs: base.apiDocs,
    apiCatalog: priorityCatalog(),
    naceStatistics: {
      eurostatSbs: euro,
      elaLabour2024: ela,
      doNotUseAsActiveParcelCarriers: true,
      historical197424: {
        value: 197424,
        reproducedInEurostatPull2026_09_30: false,
        status: "NOT_REPRODUCED",
        note: "Do not present 197424 as the current official EU-27 H53 enterprise total.",
      },
    },
    coverage: countryCoverageMatrix(),
    researchStatus: researchStatus(counts),
    derivedClassifications: derived(entities),
    identity: { uniqueLegalKeys: keys.unique, collisions: keys.collisions.length },
    integrationEngine: engineStatus(),
    costModel: costModel(),
    performanceModel: performanceModel(),
    uniqueSourceVerified: sourceVerified.length,
    uniqueV1VerifiedPreserved: base.uniqueV1VerifiedPreserved,
    uniqueNamedLegalInDatabase: entities.length,
    uniqueLegalByCompanyKey: keys.unique,
    activityVerifiedCount: entities.filter((e) => e.activityVerified).length,
    candidates: entities.filter((e) => e.reliability === "RESEARCH_CANDIDATE").length,
    austria138: base.austria138,
    notes: [
      "v1–v4 preserved. v5 adds engines, HAKOM names, PEV names, Eurostat/ELA stats split.",
      "Eurostat H53 ENT_NR is not a parcel-carrier census.",
      "ELA ~60 000 (2024) is not merged with Eurostat 224523 (2024).",
      "197424 was not present in the 2026-09-30 Eurostat pull.",
      "COMPLETE_VERIFIED countries: 0. Live carriers: 0.",
      "NL ACM postvervoer rows are not regional parcel companies.",
      "EL EETT rows are not all regional last-mile companies.",
    ],
  };
}

module.exports = {
  buildMasterV5,
  HR_HAKOM_UNIQUE,
  AT_PEV,
  INTL_BRANDS,
  SOURCES_V5,
};

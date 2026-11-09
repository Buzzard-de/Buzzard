/**
 * Carrier master v4. Extends v3. Register rows are not last-mile companies.
 */
const fs = require("fs");
const path = require("path");
const v3mod = require("./eu27SeedV3");

const RETRIEVED = "2026-11-06";

function src(id, title, url, extra = {}) {
  return { id, title, url, retrievedAt: RETRIEVED, ...extra };
}

const SOURCES_V4 = Object.freeze({
  acmCsv: src(
    "acm-registraties-csv",
    "ACM registers CSV zip: postvervoerdiensten 93 + pakketbezorgdiensten 19 = 105 unique KVK (telecom excluded)",
    "https://www.acm.nl/sites/default/files/registers/registraties_csv.zip"
  ),
  ukeRop: src(
    "uke-rejestr-operatorow-pocztowych",
    "UKE BIP Rejestr operatorów pocztowych, 12 pages, B-00018–B-00841, 234 unique register numbers",
    "https://bip.uke.gov.pl/rop/rejestr-operatorow-pocztowych/"
  ),
  eettApi: src(
    "eett-eregistry-licenses-v2",
    "EETT eRegistry GET /api/v2/licenses: 2111 mixed; 804 POST_* licences; 795 unique companies",
    "https://eregistry.eett.gr/api/v2/licenses",
    { openapi: "https://eregistry.eett.gr/api/openapi.json", totalMixed: 2111 }
  ),
  eePost2025: src(
    "ee-konkurentsiamet-postside-2025",
    "Konkurentsiamet Postside aruanne 2025: 51 MTR postal providers; 50 courier registrations; 19 actually provided courier",
    "https://www.konkurentsiamet.ee"
  ),
  sprk2025: src(
    "sprk-pasta-2025",
    "SPRK 2025 postal year: 61 active merchants; 1869 lockers; named parcel/locker operators",
    "https://www.sprk.gov.lv/lv/jaunums/2025-gada-vairak-neka-pusi-no-visiem-sutijumiem-iedzivotaji-sanemusi-pakomatos"
  ),
  nmhhLockerQ1: src(
    "nmhh-csomagautomata-2026-q1",
    "NMHH Q1 2026 locker and pickup point counts (Excel operator register still not imported)",
    "https://nmhh.hu/cikk/249762/Csomagautomatak_es_kezbesitesi_pontok_megoszlasa_a_leginkabb_igenybe_vett_postai_szolgaltatoknal_2026_I_negyedev"
  ),
  rrtPowerbi: src(
    "rrt-teikejai-powerbi",
    "RRT postal provider list is an embedded Power BI (names not bulk-extracted). Named USP-capable: AB Lietuvos paštas, UAB Omniva LT (15 Dec 2025 news).",
    "https://rrt.lt/veiklos-sritys/pastas/pasto-paslauga/pasto-paslaugu-teikejai",
    { method: "POWER_BI_EMBED_NOT_BULK_EXPORTED" }
  ),
  anacom403: src(
    "anacom-lista-alfabetica",
    "ANACOM alphabetical operator list (mixed electronic+postal). Direct fetch HTTP 403; named postal extract incomplete.",
    "https://www.anacom.pt/render.jsp?categoryId=278775",
    { fetchStatus: "HTTP_403" }
  ),
});

function loadRegister(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "../../../data/logistics/registers", file), "utf8"));
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
    coverageVerified: false,
    coverageMode: extra.coverageMode || "UNKNOWN",
    coverageLevel: extra.coverageLevel || "COUNTRY_UNKNOWN",
    postalCodeCoverage: extra.postalCodeCoverage || "UNKNOWN",
    apiStatus: extra.apiStatus || "NOT_VERIFIED",
    sandboxVerified: false,
    liveVerified: false,
    sources,
    notes,
    website: extra.website || "NOT_PUBLISHED",
    parent: extra.parent || "NOT_VERIFIED",
    companyNumber: extra.companyNumber || "NOT_PUBLISHED",
    registerNumber: extra.registerNumber || "NOT_PUBLISHED",
  };
}

const EE_COURIER_ACTIVE_2025 = [
  "AS Eesti Post",
  "A-Kuller & Partnerid OÜ",
  "Balti Logistika AS",
  "Bentte OÜ",
  "Bolt Operations OÜ",
  "DHL Express Estonia AS",
  "DK LOGISTICS OÜ",
  "DPD Eesti AS",
  "FamLogistics OÜ",
  "FedEx Express Estonia OÜ",
  "SmartPosti AS",
  "Jet Express OÜ",
  "K Security OÜ",
  "Nova Post Estonia OÜ",
  "EKLT OÜ",
  "OSC Transport OÜ",
  "T grupp OÜ",
  "Venipak Eesti OÜ",
  "Unisend Eesti OÜ",
];

const LV_NAMED = [
  { legal: "VAS Latvijas Pasts", brand: "Latvijas Pasts", cls: "NATIONAL_POST_NAMED_ALIAS" },
  { legal: "Omniva SIA", brand: "Omniva", cls: "PRIVATE_PARCEL" },
  { legal: "SIA DPD Latvija", brand: "DPD", cls: "PRIVATE_PARCEL" },
  { legal: "SIA VENIPAK LATVIJA", brand: "Venipak", cls: "PRIVATE_PARCEL" },
  { legal: "SmartPosti SIA", brand: "SmartPosti", cls: "PRIVATE_PARCEL" },
  { legal: "Unisend Latvija SIA", brand: "Unisend", cls: "PRIVATE_PARCEL" },
];

const PT_NAMED = [
  "A Sua Pressa, Lda.",
  "Activos 24 - Distribuição, Eventos e Logística, Unipessoal Lda.",
  "Alfa Lisbon - Gestão de Processos de Expedição, Lda.",
  "ALFAGOLD - Gestão de Soluções Integradas de Transporte, Lda.",
  "ALFALOC - Transportes, Lda.",
  "ALFAPRATA - Gestão de Soluções Integradas de Transporte, Lda.",
  "ALFARIO - Gestão de Soluções Integradas de Transporte, Lda.",
  "ANDRÁCIA, Unipessoal, Lda.",
  "Ansiltrans, Lda.",
  "ANTÓNIO MOREIRA UNIPESSOAL, LDA.",
  "Dragontriumphs Group, Lda.",
  "Sopostal, Lda.",
  "Post by Me, Lda.",
  "CTT – Correios de Portugal, S.A.",
  "Chronopost Portugal, S.A.",
];

const LT_NAMED = [
  { legal: "AB Lietuvos paštas", brand: "Lietuvos paštas", cls: "NATIONAL_POST_NAMED_ALIAS" },
  { legal: "UAB Omniva LT", brand: "Omniva", cls: "PRIVATE_PARCEL" },
];

const HU_LOCKERS = [
  { brand: "Foxpost-Packeta", lockers: 4041, pudo: 1420, legal: "LEGAL_ENTITY_UNKNOWN" },
  { brand: "GLS", lockers: 2861, pudo: 1142, legal: "LEGAL_ENTITY_UNKNOWN" },
  { brand: "Magyar Posta Zrt.", lockers: 698, pudo: 1058, legal: "Magyar Posta Zrt." },
  { brand: "Sameday", lockers: 1096, pudo: 469, legal: "LEGAL_ENTITY_UNKNOWN" },
  { brand: "Express One", lockers: 905, pudo: 157, legal: "LEGAL_ENTITY_UNKNOWN" },
  { brand: "DPD", lockers: 323, pudo: 682, legal: "LEGAL_ENTITY_UNKNOWN" },
  { brand: "DHL", lockers: 29, pudo: 0, legal: "LEGAL_ENTITY_UNKNOWN" },
];

function overlayRegister(records, uniqueLegal, status, method, source, note, extra = {}) {
  return { records, uniqueLegal, status, method, source, note, ...extra };
}

function extrasFromRegisters() {
  const out = [];
  const acm = loadRegister("nl_acm_post_pakket.v4.json");
  for (const r of acm.rows) {
    const parcel = (r.categories || []).includes("PARCEL");
    const post = (r.categories || []).includes("POST");
    const cls = parcel ? "ACM_PAKKETBEZORGDIENST" : "ACM_POSTVERVOERDIENST";
    const legalStatus = /\b(B\.V\.|N\.V\.|Ltd|Limited)\b/i.test(r.legalName)
      ? "LEGAL_NAME_VERIFIED"
      : r.legalName === "Mondial Relay"
        ? "BRAND_ONLY"
        : "LEGAL_NAME_VERIFIED";
    out.push(
      row(
        `nl-acm-${r.kvk}`,
        r.legalName,
        r.legalName,
        "NL",
        cls,
        "SOURCE_VERIFIED",
        ["acm-registraties-csv"],
        "ACM post/parcel register row. Category is authorisation class, not proven last-mile activity.",
        {
          companyNumber: String(r.kvk),
          legalNameStatus: legalStatus,
          companyStatus: "COMPANY_STATUS_UNKNOWN",
          coverageMode: parcel ? "UNKNOWN" : "LETTER_OR_POST_NOT_PARCEL",
        }
      )
    );
    if (post && parcel) out[out.length - 1].notes += " Dual POST+PARCEL categories on same KVK.";
  }

  const uke = loadRegister("pl_uke_rop.v4.json");
  for (const r of uke.rows) {
    out.push(
      row(
        `pl-uke-${r.registerNumber.toLowerCase()}`,
        r.legalName,
        r.legalName,
        "PL",
        "UKE_POSTAL_OPERATOR",
        "SOURCE_VERIFIED",
        ["uke-rejestr-operatorow-pocztowych"],
        "UKE ROP inscription. Sole traders included. Not an active last-mile census.",
        {
          companyNumber: r.companyRegister || r.nip || "NOT_PUBLISHED",
          registerNumber: r.registerNumber,
          legalNameStatus: "LEGAL_NAME_VERIFIED",
        }
      )
    );
  }

  const el = loadRegister("el_eett_postal.v4.json");
  for (const r of el.rows) {
    out.push(
      row(
        `el-eett-${String(r.id || slug(r.legalName)).slice(0, 36)}`,
        r.legalName,
        r.legalName,
        "EL",
        r.licenseType === "POST_SPECIAL_LICENSE" ? "EETT_POST_SPECIAL" : "EETT_POST_GENERAL",
        "SOURCE_VERIFIED",
        ["eett-eregistry-licenses-v2"],
        "EETT public licence. Many are local sole traders. Active licence ≠ nationwide parcel network.",
        {
          companyNumber: r.registrationNumber || r.id || "NOT_PUBLISHED",
          legalNameStatus: "LEGAL_NAME_VERIFIED",
          companyStatus: r.activeLicense ? "COMPANY_STATUS_UNKNOWN" : "COMPANY_INACTIVE",
        }
      )
    );
  }

  for (const name of EE_COURIER_ACTIVE_2025) {
    out.push(
      row(
        `ee-mtr-active-${slug(name)}`,
        name,
        name,
        "EE",
        "COURIER_PROVIDED_2025",
        "SOURCE_VERIFIED",
        ["ee-konkurentsiamet-postside-2025"],
        "Named among 19 providers that actually provided courier services in 2025. 51 MTR postal providers overall.",
        { activityVerified: true, companyStatus: "COMPANY_ACTIVE_VERIFIED", coverageMode: "NATIONAL_UNKNOWN_POSTCODE" }
      )
    );
  }

  for (const r of LV_NAMED) {
    out.push(
      row(
        `lv-sprk-${slug(r.legal)}`,
        r.legal,
        r.brand,
        "LV",
        r.cls,
        "SOURCE_VERIFIED",
        ["sprk-pasta-2025"],
        "Named in SPRK 2025 parcel/locker statistics. 61 active postal merchants; names of the other merchants not enumerated here.",
        { activityVerified: true, companyStatus: "COMPANY_ACTIVE_VERIFIED", coverageMode: "NATIONAL_UNKNOWN_POSTCODE" }
      )
    );
  }

  for (const r of LT_NAMED) {
    out.push(
      row(
        `lt-rrt-${slug(r.legal)}`,
        r.legal,
        r.brand,
        "LT",
        r.cls,
        "SOURCE_VERIFIED",
        ["rrt-teikejai-powerbi"],
        "Named in RRT 15 Dec 2025 USP-capability news. Full provider list is Power BI, not bulk-exported.",
        { companyStatus: "COMPANY_STATUS_UNKNOWN", coverageMode: "UNKNOWN" }
      )
    );
  }

  for (const name of PT_NAMED) {
    out.push(
      row(
        `pt-anacom-${slug(name)}`,
        name,
        name,
        "PT",
        "ANACOM_POSTAL_NAMED_EXTRACT",
        "SOURCE_VERIFIED",
        ["anacom-lista-alfabetica"],
        "Named postal activity on ANACOM pages. Full unique postal-only census blocked (HTTP 403 / mixed electronic list).",
        { legalNameStatus: "LEGAL_NAME_VERIFIED", companyStatus: "COMPANY_STATUS_UNKNOWN" }
      )
    );
  }

  return out;
}

function lockerPudo() {
  const lockers = [];
  const pudo = [];
  lockers.push({
    id: "locker-lv-national-2025",
    operator: "MULTI",
    country: "LV",
    networkName: "Latvia pakomāti (SPRK year-end 2025)",
    pointCount: 1869,
    pointCountStatus: "SOURCE_VERIFIED",
    postalCodeCoverage: "UNKNOWN",
    hours: "UNKNOWN",
    apiStatus: "NOT_VERIFIED",
    sources: ["sprk-pasta-2025"],
  });
  lockers.push({
    id: "locker-lv-latvijas-pasts",
    operator: "VAS Latvijas Pasts",
    country: "LV",
    networkName: "Latvijas Pasts pakomāti",
    pointCount: 440,
    pointCountStatus: "SOURCE_VERIFIED",
    shareOfNational: "24%",
    postalCodeCoverage: "UNKNOWN",
    hours: "UNKNOWN",
    apiStatus: "NOT_VERIFIED",
    sources: ["sprk-pasta-2025"],
  });
  for (const [id, op, share] of [
    ["locker-lv-omniva", "Omniva SIA", "21%"],
    ["locker-lv-dpd", "SIA DPD Latvija", "21%"],
    ["locker-lv-smartposti", "SmartPosti SIA", "13%"],
    ["locker-lv-venipak", "SIA VENIPAK LATVIJA", "11%"],
    ["locker-lv-unisend", "Unisend Latvija SIA", "11%"],
  ]) {
    lockers.push({
      id,
      operator: op,
      country: "LV",
      networkName: `${op} pakomāti`,
      pointCount: null,
      pointCountStatus: "SHARE_ONLY_NOT_ABSOLUTE",
      shareOfNational: share,
      postalCodeCoverage: "UNKNOWN",
      hours: "UNKNOWN",
      apiStatus: "NOT_VERIFIED",
      sources: ["sprk-pasta-2025"],
    });
  }
  for (const h of HU_LOCKERS) {
    lockers.push({
      id: `locker-hu-${slug(h.brand)}`,
      operator: h.legal === "LEGAL_ENTITY_UNKNOWN" ? h.brand : h.legal,
      legalNameStatus: h.legal === "LEGAL_ENTITY_UNKNOWN" ? "BRAND_ONLY" : "LEGAL_NAME_VERIFIED",
      country: "HU",
      networkName: `${h.brand} csomagautomata`,
      pointCount: h.lockers,
      pointCountStatus: "SOURCE_VERIFIED",
      period: "2026-Q1",
      postalCodeCoverage: "UNKNOWN",
      hours: "UNKNOWN",
      apiStatus: "NOT_VERIFIED",
      sources: ["nmhh-csomagautomata-2026-q1"],
    });
    if (h.pudo > 0) {
      pudo.push({
        id: `pudo-hu-${slug(h.brand)}`,
        operator: h.legal === "LEGAL_ENTITY_UNKNOWN" ? h.brand : h.legal,
        country: "HU",
        networkName: `${h.brand} alternatív csomagpont`,
        pointCount: h.pudo,
        pointCountStatus: "SOURCE_VERIFIED",
        period: "2026-Q1",
        postalCodeCoverage: "UNKNOWN",
        hours: "UNKNOWN",
        apiStatus: "NOT_VERIFIED",
        sources: ["nmhh-csomagautomata-2026-q1"],
      });
    }
  }
  return { lockers, pudo };
}

function internationalOps(entities) {
  const brands = [
    "DHL Express",
    "DHL Parcel",
    "DHL eCommerce",
    "UPS",
    "DPD",
    "GLS",
    "FedEx",
    "Mondial Relay",
    "Nova Post",
    "InPost",
    "Venipak",
    "SmartPosti",
    "Omniva",
    "Jingdong",
    "PostNL",
  ];
  const byIso = {};
  for (const e of entities) {
    const blob = `${e.legalName} ${e.brand}`;
    for (const b of brands) {
      if (new RegExp(b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(blob)) {
        byIso[`${b}|${e.hqCountry}`] = {
          id: `ops-${slug(b)}-${String(e.hqCountry).toLowerCase()}`,
          brand: b,
          country: e.hqCountry,
          legalName: e.legalName,
          legalEntityId: e.id,
          activityType: "OWN_AFFILIATE_OR_REGISTERED_LOCAL_ENTITY",
          ownDistributionNetwork: "UNKNOWN",
          ownBranches: "UNKNOWN",
          contractLocalCarrier: "UNKNOWN",
          acceptShipmentsOnly: "UNKNOWN",
          evidence: e.sources,
          note: "Local legal name on a postal register is not proof of own last-mile fleet.",
        };
      }
    }
  }
  return Object.values(byIso);
}

function buildMasterV4() {
  const base = v3mod.buildMasterV3();
  const add = extrasFromRegisters();
  const seen = new Set(base.entities.map((e) => e.id));
  const entities = [...base.entities];
  const skippedDuplicateId = [];
  for (const e of add) {
    if (seen.has(e.id)) {
      skippedDuplicateId.push(e.id);
      continue;
    }
    entities.push(e);
    seen.add(e.id);
  }

  const acm = loadRegister("nl_acm_post_pakket.v4.json");
  const uke = loadRegister("pl_uke_rop.v4.json");
  const el = loadRegister("el_eett_postal.v4.json");
  const { lockers, pudo } = lockerPudo();

  const overlays = {
    NL: overlayRegister(
      acm.uniqueKvk,
      acm.uniqueKvk,
      "PARTIALLY_VERIFIED",
      "acm_csv_post_and_pakket_unique_kvk",
      "acm-registraties-csv",
      "105 unique KVK after excluding telecom. 93 postvervoer + 19 pakket (overlap). Mixed CSV had 2622 rows. Pakket category ≠ activityVerified last-mile.",
      { postvervoer: acm.postvervoerdiensten, pakket: acm.pakketbezorgdiensten, mixedCsvRows: 2622 }
    ),
    PL: overlayRegister(
      uke.registerRows,
      uke.uniqueLegalNames,
      "PARTIALLY_VERIFIED",
      "uke_bip_pages_1_12",
      "uke-rejestr-operatorow-pocztowych",
      "234 unique B-numbers B-00018–B-00841 fetched 2026-11-06. Includes sole traders and letter operators. dane.gov.pl dataset 1065 not imported (page fetch empty)."
    ),
    EL: overlayRegister(
      el.postalLicenses,
      el.uniqueCompanies,
      "PARTIALLY_VERIFIED",
      "eett_eregistry_api_v2_all_212_pages",
      "eett-eregistry-licenses-v2",
      "804 POST_* licences / 795 unique companies. 794 general + 10 special. Active licence is not a last-mile parcel census. GR aliased as EL."
    ),
    EE: overlayRegister(
      51,
      51,
      "PARTIALLY_VERIFIED",
      "konkurentsiamet_postside_aruanne_2025",
      "ee-konkurentsiamet-postside-2025",
      "51 MTR postal providers. 50 courier registrations of which 19 actually provided courier in 2025. Named 19 ingested. Remaining 32 names not fully listed here."
    ),
    LV: overlayRegister(
      61,
      61,
      "PARTIALLY_VERIFIED",
      "sprk_active_merchants_end_2025",
      "sprk-pasta-2025",
      "61 active postal merchants end 2025. Six locker/parcel operators named. Remaining names in Power BI / unpublished table. 1869 lockers."
    ),
    LT: overlayRegister(
      null,
      null,
      "DATA_INCOMPLETE",
      "rrt_powerbi_embed",
      "rrt-teikejai-powerbi",
      "Public list is Power BI. Bulk unique count NOT_ENUMERATED. Named: AB Lietuvos paštas, UAB Omniva LT."
    ),
    HU: overlayRegister(
      null,
      null,
      "DATA_INCOMPLETE",
      "nmhh_excel_not_imported_locker_q1_imported",
      "nmhh-csomagautomata-2026-q1",
      "Operator Excel advertised without a fetchable href in HTML. Q1 2026 locker/PUDO counts ingested as locker/PUDO, not as carrier census."
    ),
    PT: overlayRegister(
      null,
      null,
      "DATA_INCOMPLETE",
      "anacom_named_extract_http_403_on_full_list",
      "anacom-lista-alfabetica",
      "Full postal-only unique count not extracted (403 / mixed electronic+postal list). Named postal extract ingested."
    ),
  };

  const counts = base.counts.map((c) => {
    const o = overlays[c.iso];
    if (!o) return { ...c, verification: c.verification === "COMPLETE_VERIFIED" ? "PARTIALLY_VERIFIED" : c.verification };
    return { ...c, register: o, verification: o.status };
  });

  const sourceVerified = entities.filter(
    (e) => String(e.reliability).startsWith("VERIFIED") || e.reliability === "SOURCE_VERIFIED"
  );

  const legalKeys = new Map();
  for (const e of sourceVerified) {
    const key =
      e.companyNumber && e.companyNumber !== "NOT_PUBLISHED"
        ? `${e.hqCountry}:${e.companyNumber}`
        : `${e.hqCountry}:${String(e.legalName).toLowerCase()}`;
    if (!legalKeys.has(key)) legalKeys.set(key, e);
  }

  const nameIso = new Map();
  const duplicates = [];
  for (const e of entities) {
    const k = `${e.hqCountry}|${String(e.legalName).toLowerCase()}`;
    if (nameIso.has(k)) duplicates.push({ a: nameIso.get(k), b: e.id, legalName: e.legalName, iso: e.hqCountry });
    else nameIso.set(k, e.id);
  }

  const apiDocs = [
    ...base.apiDocs,
    {
      id: "api-eett-eregistry",
      party: "EETT eRegistry",
      country: "EL",
      status: "OFFICIAL_API_DOCUMENTED",
      sandboxVerified: false,
      liveVerified: false,
      note: "Public register API, not a shipping-label API.",
      url: "https://eregistry.eett.gr/api/openapi.json",
    },
  ];

  return {
    schema: "buzzard.eu27-carrier-master.v4",
    previousSchema: base.schema,
    previousVerifiedLegalCount: base.previousVerifiedLegalCount,
    retrievedAt: RETRIEVED,
    salesEnabled: false,
    liveShipment: false,
    completeVerifiedCountries: 0,
    sources: [...base.sources, ...Object.values(SOURCES_V4)],
    countries: base.countries,
    entities,
    counts,
    lockers,
    pudo,
    internationalOperations: internationalOps(entities),
    apiDocs,
    uniqueSourceVerified: sourceVerified.length,
    uniqueV1VerifiedPreserved: base.uniqueV1VerifiedPreserved,
    uniqueNamedLegalInDatabase: entities.length,
    uniqueLegalByCompanyKey: legalKeys.size,
    candidates: entities.filter((e) => e.reliability === "RESEARCH_CANDIDATE").length,
    activityVerifiedCount: entities.filter((e) => e.activityVerified).length,
    skippedDuplicateId,
    duplicateLegalNameCountry: duplicates,
    austria138: base.austria138,
    notes: [
      "v1 43, v2 and v3 layers are preserved.",
      "Register totals are not unique EU-27 last-mile companies.",
      "NL 105, PL 234, EL 795 are unique register legal names/KVK/UUIDs, not proven parcel fleets.",
      "COMPLETE_VERIFIED countries: 0.",
      "Postal-code coverage remains UNKNOWN except incidental register addresses (not used as service coverage).",
      "No live shipment, label, payment or sales enablement.",
    ],
  };
}

module.exports = {
  buildMasterV4,
  EE_COURIER_ACTIVE_2025,
  LV_NAMED,
  PT_NAMED,
  LT_NAMED,
  HU_LOCKERS,
  SOURCES_V4,
};

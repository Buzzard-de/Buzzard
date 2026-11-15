/**
 * Carrier master v2. Extends v1. Does not treat register rows as active last-mile.
 */
const v1 = require("./eu27Seed");

const RETRIEVED = "2026-11-05";

function src(id, title, url, extra = {}) {
  return { id, title, url, retrievedAt: RETRIEVED, ...extra };
}

const SOURCES_V2 = Object.freeze({
  ...v1.SOURCES,
  traficomReg: src(
    "traficom-postitoimintarekisteri-2026-08",
    "Traficom postitoimintarekisteri (kirjelähetykset), päivitetty elokuussa 2026",
    "https://www.traficom.fi/fi/postitoiminta-ja-jakelu/postitoimintarekisteri",
    { scope: "LETTER_NOTIFICATION_ONLY_NOT_PARCEL_MARKET" }
  ),
  arcep: src(
    "arcep-operateurs-2026-07-24",
    "ARCEP opérateurs de services postaux autorisés, mis à jour le 24 juillet 2026",
    "https://www.arcep.fr/mes-demarches-et-services/acteurs-regules/operateurs-postaux/les-operateurs-de-services-postaux-autorises-par-larcep.html",
    { scope: "CORRESPONDENCE_AUTHORISATIONS_NOT_FULL_PARCEL_MARKET" }
  ),
  ptsList: src(
    "pts-postoperatorer",
    "PTS lista / Trafikanalys Postverksamhet 2025: 19 tillstånd",
    "https://pts.se/tillstand-och-anmalan/post/postverksamhet/",
    { scope: "LETTER_PERMIT_NOT_FULL_PARCEL_MARKET", listPageUpdated: "2024-05-14", statYear: 2025 }
  ),
  bipt: src(
    "bipt-licences-2025-12-22",
    "IBPT communication 22 décembre 2025 licences individuelles",
    "https://www.bipt.be/file/cc73d96153bbd5448a56f19d925d05b1379c7f21/fb4b9cce7648566741ad4ec4ccf92202c01ce658/communication-liste-prestataires-services-postaux-titulaires-licence-individuelle-2025.pdf",
    { scope: "INDIVIDUAL_LICENCE_CORRESPONDENCE_USO" }
  ),
  comreg: src(
    "comreg-authorised-postal-providers",
    "ComReg Register of Authorised Postal Providers (search extract; page 307 on direct fetch)",
    "https://www.comreg.ie/industry/postal-regulation/authorised-postal-providers/authorised-postal-providers-register/",
    { fetchStatus: "HTTP_307_ON_DIRECT_FETCH" }
  ),
  dhlDev: src("dhl-developer", "DHL Parcel DE Shipping API docs", "https://developer.dhl.com/api-reference/parcel-de-shipping-post-parcel-germany-v2"),
  upsDev: src("ups-developer", "UPS Developer Portal", "https://developer.ups.com/api/reference/shipping"),
  glsDev: src("gls-shipit", "GLS ShipIT REST samples", "https://shipit.gls-group.com/documentation/webservices/5_2_5/WS-REST-API/rest_web_service_requests_samples.html"),
  rtrPev: src(
    "rtr-pev-2026-02-16",
    "RTR Liste der PEV-Betreiber, Stand 16. Februar 2026",
    "https://www.rtr.at/TKP/was_wir_tun/post/betreiberservice/liste_der_pev-betreiber.de.html",
    { scope: "PEV_REPORTING_OPERATORS_NOT_FULL_ANZEIGE_LIST" }
  ),
  cnmc2025: src(
    "cnmc-sector-postal-2025",
    "CNMC Informe anual del sector postal 2025, 21/07/2026",
    "https://www.cnmc.es/sites/default/files/6749773.pdf",
    { sectionA: 4494, sectionB: 240, asOf: "2025-12-31" }
  ),
  esMin: src(
    "es-registro-postal-2025-05-31",
    "Registro general de empresas prestadoras de servicios postales, listado 31/05/2025",
    "https://www.transportes.gob.es/el-ministerio/servicios-postales/registro-general-de-empresas-prestadoras-de-servicios-postales"
  ),
  mimit: src(
    "mimit-operatori-settembre-2026",
    "MIMIT Elenco operatori postali LIC/AUG/AEI, aggiornamento 16 settembre 2026",
    "https://www.mimit.gov.it/images/stories/documenti/Elenco_operatori_postali_titolari_di_LIC-AUG-_AEI_Settembre_2026.pdf",
    { lastSequentialNumberObserved: 3722 }
  ),
  ancom: src(
    "ancom-furnizori-autorizati",
    "ANCOM furnizori de servicii poștale autorizați (searchable; first page named)",
    "https://www.ancom.ro/reglementare-ro/servicii-postale/furnizori-servicii-postale/furnizori-servicii-postale-autorizati/",
    { total: "NOT_ENUMERATED" }
  ),
});

const FI_LETTER = [
  "Botnia Print Oy Ab",
  "Dilicon Oy",
  "Hilla Group Oyj",
  "Hilla Logistiikka Oy",
  "HSS Media - Bolagen Ab",
  "Jakeluyhtiö Suomi Oy",
  "Kaakon Viestintä Oy",
  "Lounais-Suomen Tietojakelu Oy",
  "PISA Jakelu Oy",
  "PKS Jakelu Oy",
  "Posti Jakelu Oy",
  "PPP Finland Oy",
  "Rauman Suorajakelu Oy",
  "Varsinais-Suomen Tietojakelu Oy",
];

const FR_ARCEP = [
  "Althus",
  "La Poste",
  "bpost",
  "G3 Worldwide (Spring)",
  "Deutsche Post Global Mail (France)",
  "Courrier Plus",
  "3L (Distriplis)",
  "STEP / STEP-POST",
  "Optimail Solutions",
  "Mediapost",
  "Colis Privé",
  "NOVEA",
  "XPERT FRANCE NORD",
  "SOLGECO 25",
  "PRO MEDICAL SERVICES",
  "NOT COURRIER SERVICE",
  "TRANS EXAMS",
  "TCS",
  "COURRIERS XPRESS",
  "POSTAL STOCK EXCHANGE",
  "NOT COURRIER FRANCE",
  "L'ATELIER DU COURRIER",
  "TRANS MEDICAL 49",
  "COURRIER PRO 03",
  "ROUTE EXPRESS",
  "TALE FRANCE",
  "XPOST",
  "BIKE IN THE CITY",
  "CHRISTIN Pascal (Chris Express)",
  "FACILY POST",
  "SERVITRANS",
  "PORTAGE POSTAL",
  "RCA PRESTA (ECOPOST)",
  "SALLÉ Bruno (Azur Courrier 83)",
  "CLEVIA",
  "POSTALIA FRANCE (EasyPost)",
  "MESSAGERIES LE DISSEZ",
  "LIAISON SANTÉ",
  "TRANSPORT INTER-REGIONAL",
  "PROXIMY",
  "LEBON TRANSPORTEUR",
  "DANSMABAL",
  "AMTM (ELITE COURRIER)",
  "Eole Santé",
  "Landmark Global France",
];

const BE_LICENCES = [
  { legal: "bpost", brand: "bpost", active: true, scope: "national" },
  { legal: "Glejor BV", brand: "Glejor", active: true, scope: "local" },
  { legal: "SPAN Diffusion", brand: "SPAN Diffusion", active: true, scope: "regional" },
  { legal: "SRL Net Express", brand: "TBC-Post", active: true, scope: "national" },
  { legal: "SRL Postalia Belgium Logistics", brand: "EasyPost", active: false, scope: "national_inactive" },
  { legal: "SRL WEELDY", brand: "URBIPOST", active: true, scope: "local" },
  { legal: "ViaVelo S Comm", brand: "ViaVelo", active: true, scope: "regional" },
];

const IE_COMREG = [
  "An Post",
  "Budget Parcel",
  "Corrigan Business Services",
  "DCK / DC Kavanagh",
  "DX Ireland",
  "General Logistics Systems Ireland",
  "Lettershop Postal",
  "Mail Metrics",
  "Paragon Customer Communications Ireland Ltd.",
  "PrintPost Ltd",
  "Shanahan Direct Marketing Ltd.",
  "Sooner Than Later Solutions Ltd.",
  "Tico Mail Works",
  "RW Pierce (Ireland) Limited",
  "Leaflet Broker Ltd",
  "Azure Communications Ltd",
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

const RO_ANCOM_PAGE1 = [
  "FAN COURIER EXPRESS S.R.L.",
  "EURO CURIER MARIO S.R.L.",
  "GLS GENERAL LOGISTICS SYSTEMS ROMANIA S.R.L.",
  "GLOBAL EXPRESS MAIL S.R.L.",
  "DYNAMIC PARCEL DISTRIBUTION S.A.",
  "PAM INTERNATIONAL TRANSPORT S.R.L.",
  "DHL INTERNATIONAL ROMÂNIA S.R.L.",
  "AMBIANȚA TRANS S.R.L.",
  "SEMPRE DRITTO TOUR S.R.L.",
  "MATY EXPRESS S.R.L.",
];

const PRIVATE_CANDIDATES = [
  ["DHL", "PRIVATE_PARCEL"],
  ["DPD", "PRIVATE_PARCEL"],
  ["GLS", "PRIVATE_PARCEL"],
  ["UPS", "PRIVATE_EXPRESS"],
  ["FedEx", "PRIVATE_EXPRESS"],
  ["TNT", "PRIVATE_EXPRESS"],
  ["Hermes", "PRIVATE_PARCEL"],
  ["Amazon Logistics", "LAST_MILE"],
  ["InPost", "PUDO_LOCKER"],
  ["Geis", "FREIGHT"],
  ["Rhenus", "FREIGHT"],
  ["DB Schenker", "FREIGHT"],
  ["Aramex", "PRIVATE_EXPRESS"],
  ["Bring", "PRIVATE_PARCEL"],
  ["PostNord", "NATIONAL_PARCEL_LETTER"],
  ["Packeta", "PUDO_LOCKER"],
  ["Sameday", "PRIVATE_PARCEL"],
  ["Fan Courier", "PRIVATE_PARCEL"],
  ["Econt", "PRIVATE_PARCEL"],
  ["Speedy", "PRIVATE_PARCEL"],
  ["Venipak", "PRIVATE_PARCEL"],
  ["CTT Expresso", "PRIVATE_PARCEL"],
  ["SEUR", "PRIVATE_PARCEL"],
  ["MRW", "PRIVATE_PARCEL"],
  ["Nacex", "PRIVATE_PARCEL"],
  ["Chronopost", "PRIVATE_PARCEL"],
  ["Colissimo", "NATIONAL_PARCEL_LETTER"],
  ["BRT", "PRIVATE_PARCEL"],
  ["Mondial Relay", "PUDO_LOCKER"],
  ["Relais Colis", "PUDO_LOCKER"],
  ["Colis Privé", "PRIVATE_PARCEL"],
  ["dao", "NATIONAL_PARCEL_LETTER"],
  ["Matkahuolto", "PRIVATE_PARCEL"],
];

const SE_PTS_PAGE = [
  "B J Distribution AB",
  "Bonway AB",
  "Citymail Sweden AB",
  "Erna Logistik AB",
  "Georgsson Mail AB",
  "Lysekils Lokalpost",
  "Mail Company Sweden AB",
  "Mailworld Office AB",
  "Mariestads Brev och Paketservice",
  "Mediakonsult i Göteborg AB",
  "Point Logistik Gota Media AB",
  "Postmästaren i Hälsingland AB",
  "Postnord Sverige AB",
  "Pressens Morgontjänst KB",
  "SDR Svensk Direktreklam AB",
  "Sundsvalls Citypost AB",
  "Svensk Hemleverans HB",
  "Svensk Hemleverans Norr KB",
  "Västsvensk Tidningsdistribution AB",
];

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function extraEntities() {
  const fi = FI_LETTER.filter((n) => n !== "Posti Jakelu Oy").map((name) => ({
    id: `fi-${slug(name)}`,
    legalName: name,
    brand: name,
    hqCountry: "FI",
    class: "LETTER_NOTIFICATION",
    reliability: "SOURCE_VERIFIED",
    activityVerified: false,
    coverageVerified: false,
    apiStatus: "NOT_VERIFIED",
    sources: ["traficom-postitoimintarekisteri-2026-08"],
    notes: "Traficom letter-post notification. Not a parcel last-mile proof. Matkahuolto is not on this letter register.",
  }));
  const fr = FR_ARCEP.filter((n) => n !== "La Poste").map((name) => ({
    id: `fr-${slug(name)}`,
    legalName: name,
    brand: name,
    hqCountry: "FR",
    class: "CORRESPONDENCE_AUTHORISATION",
    reliability: "SOURCE_VERIFIED",
    activityVerified: false,
    coverageVerified: false,
    apiStatus: "NOT_VERIFIED",
    sources: ["arcep-operateurs-2026-07-24"],
    notes: "ARCEP correspondence authorisation. Not automatically a national parcel carrier.",
  }));
  const be = BE_LICENCES.filter((r) => r.legal !== "bpost").map((r) => ({
    id: `be-${slug(r.legal)}`,
    legalName: r.legal,
    brand: r.brand,
    hqCountry: "BE",
    class: "INDIVIDUAL_LICENCE",
    reliability: "SOURCE_VERIFIED",
    activityVerified: r.active,
    coverageVerified: false,
    apiStatus: "NOT_VERIFIED",
    sources: ["bipt-licences-2025-12-22"],
    notes: r.active ? `Scope ${r.scope}` : "Licence inactive per IBPT 10/09/2025 letter note",
  }));
  const ie = IE_COMREG.filter((n) => n !== "An Post").map((name) => ({
    id: `ie-${slug(name)}`,
    legalName: name,
    brand: name,
    hqCountry: "IE",
    class: "AUTHORISED_POSTAL_PROVIDER",
    reliability: "SOURCE_VERIFIED",
    activityVerified: false,
    coverageVerified: false,
    apiStatus: "NOT_VERIFIED",
    sources: ["comreg-authorised-postal-providers"],
    notes: "ComReg register extract. Direct fetch returned HTTP 307.",
  }));
  const se = SE_PTS_PAGE.filter((n) => !/^Postnord/i.test(n)).map((name) => ({
    id: `se-${slug(name)}`,
    legalName: name,
    brand: name,
    hqCountry: "SE",
    class: "LETTER_PERMIT",
    reliability: "SOURCE_VERIFIED",
    activityVerified: false,
    coverageVerified: false,
    apiStatus: "NOT_VERIFIED",
    sources: ["pts-postoperatorer"],
    notes: "PTS web list (page updated 2024-05-14). Trafikanalys 2025 count is 19 permits, not this name-list length.",
  }));
  const at = AT_PEV.filter((n) => n !== "Österreichische Post AG").map((name) => ({
    id: `at-${slug(name)}`,
    legalName: name,
    brand: name,
    hqCountry: "AT",
    class: "PEV_OPERATOR",
    reliability: "SOURCE_VERIFIED",
    activityVerified: false,
    coverageVerified: false,
    apiStatus: "NOT_VERIFIED",
    sources: ["rtr-pev-2026-02-16"],
    notes: "Named on RTR PEV operator list 16 Feb 2026. This is not the full §25 Anzeige list.",
  }));
  const ro = RO_ANCOM_PAGE1.map((name) => ({
    id: `ro-${slug(name)}`,
    legalName: name,
    brand: name,
    hqCountry: "RO",
    class: "AUTHORISED_POSTAL_PROVIDER",
    reliability: "SOURCE_VERIFIED",
    activityVerified: false,
    coverageVerified: false,
    apiStatus: "NOT_VERIFIED",
    sources: ["ancom-furnizori-autorizati"],
    notes: "First ANCOM authorised-provider page only. Register total not enumerated.",
  }));
  const privateCands = PRIVATE_CANDIDATES.map(([brand, cls]) => ({
    id: `cand-v2-${slug(brand)}`,
    legalName: `${brand} (group / local affiliates)`,
    brand,
    hqCountry: "NOT_VERIFIED",
    class: cls,
    reliability: "RESEARCH_CANDIDATE",
    activityVerified: false,
    coverageVerified: false,
    apiStatus: "NOT_VERIFIED",
    sources: [],
    notes: "Shortlist name. Country-by-country last-mile and legal entity NOT_VERIFIED. Not counted as active.",
  }));
  return [...fi, ...fr, ...be, ...ie, ...se, ...at, ...ro, ...privateCands];
}

function apiDocs() {
  return [
    {
      brand: "DHL",
      apiStatus: "OFFICIAL_API_DOCUMENTED",
      contractRequired: true,
      sandboxVerified: false,
      liveVerified: false,
      source: "dhl-developer",
    },
    {
      brand: "UPS",
      apiStatus: "OFFICIAL_API_DOCUMENTED",
      contractRequired: true,
      sandboxVerified: false,
      liveVerified: false,
      source: "ups-developer",
    },
    {
      brand: "GLS",
      apiStatus: "OFFICIAL_API_DOCUMENTED",
      contractRequired: true,
      sandboxVerified: false,
      liveVerified: false,
      source: "gls-shipit",
    },
  ];
}

function countryStats(v1Master, extras) {
  return v1.COUNTRIES.map((c) => {
    const prev = v1Master.counts.find((x) => x.iso === c.iso);
    const extraHere = extras.filter((e) => e.hqCountry === c.iso);
    let register = {
      records: null,
      uniqueLegal: null,
      status: "OFFICIAL_REGISTER_UNAVAILABLE",
      method: "not_downloaded",
      source: null,
    };
    if (c.iso === "DE") {
      register = {
        records: 7183,
        uniqueLegal: null,
        status: "PARTIAL_REGISTER_FETCH",
        method: "unique_stammnummer_on_fetched_listing",
        source: "bnetza-anbieterverzeichnis",
        note: "Stammnummer rows, not active nationwide parcel companies. Landing count blank.",
      };
    }
    if (c.iso === "DK") {
      register = {
        records: 18,
        uniqueLegal: 18,
        status: "PARTIALLY_VERIFIED",
        method: "trafikstyrelsen_tabel_3_permits",
        source: "trafikstyrelsen-2025-redegoerelse",
        note: "6 nationwide + 12 local permits. Letter vs parcel split in report text.",
      };
    }
    if (c.iso === "FI") {
      register = {
        records: FI_LETTER.length,
        uniqueLegal: FI_LETTER.length,
        status: "PARTIALLY_VERIFIED",
        method: "traficom_letter_notification_page_2026_08",
        source: "traficom-postitoimintarekisteri-2026-08",
        note: "Letter notifications only. Parcel operators such as Matkahuolto are out of scope of this register.",
      };
    }
    if (c.iso === "FR") {
      register = {
        records: FR_ARCEP.length,
        uniqueLegal: FR_ARCEP.length,
        status: "PARTIALLY_VERIFIED",
        method: "named_operators_on_arcep_page_2026_07_24",
        source: "arcep-operateurs-2026-07-24",
        note: "Correspondence authorisations. DPD/GLS/UPS parcel last-mile not this list.",
      };
    }
    if (c.iso === "SE") {
      register = {
        records: 19,
        uniqueLegal: 19,
        status: "PARTIALLY_VERIFIED",
        method: "trafikanalys_2025_permit_count",
        source: "pts-postoperatorer",
        note: "Official statistic 19 permits in 2025. PTS HTML name list is older (2024-05-14) and not used as the count.",
      };
    }
    if (c.iso === "BE") {
      register = {
        records: 7,
        uniqueLegal: 7,
        status: "PARTIALLY_VERIFIED",
        method: "bipt_individual_licence_table_2025_12_22",
        source: "bipt-licences-2025-12-22",
        note: "Correspondence USO individual licences. 1 inactive. Parcel networks not this table.",
      };
    }
    if (c.iso === "IE") {
      register = {
        records: IE_COMREG.length,
        uniqueLegal: IE_COMREG.length,
        status: "PARTIALLY_VERIFIED",
        method: "comreg_register_search_extract",
        source: "comreg-authorised-postal-providers",
        note: "Authorised postal providers table from search extract. Direct fetch 307.",
      };
    }
    if (c.iso === "ES") {
      register = {
        records: 4494 + 240,
        uniqueLegal: null,
        status: "PARTIALLY_VERIFIED",
        method: "cnmc_annual_report_2025_section_counts",
        source: "cnmc-sector-postal-2025",
        note: "Section A 4,494 + Section B 240 inscriptions at 31 Dec 2025. Not active nationwide last-mile. CEP survey sample was 26 operators.",
      };
    }
    if (c.iso === "IT") {
      register = {
        records: 3722,
        uniqueLegal: null,
        status: "PARTIALLY_VERIFIED",
        method: "last_sequential_number_on_mimit_sep_2026_pdf",
        source: "mimit-operatori-settembre-2026",
        note: "LIC/AUG/AEI authorisations, including sole traders. Not an active last-mile count. Deduplication not completed.",
      };
    }
    if (c.iso === "AT") {
      register = {
        records: AT_PEV.length,
        uniqueLegal: AT_PEV.length,
        status: "DATA_INCOMPLETE",
        method: "rtr_pev_named_list_only",
        source: "rtr-pev-2026-02-16",
        note: "PEV reporting operators. Full RTR §25 Anzeige list is published separately and was not downloaded.",
      };
    }
    if (c.iso === "RO") {
      register = {
        records: null,
        uniqueLegal: null,
        status: "DATA_INCOMPLETE",
        method: "ancom_searchable_first_page",
        source: "ancom-furnizori-autorizati",
        note: "Search UI exists. Total not published on first page. 10 names recorded from first page only.",
      };
    }
    if (c.iso === "NL") {
      register = {
        records: null,
        uniqueLegal: null,
        status: "DATA_INCOMPLETE",
        method: "acm_csv_advertised_not_imported",
        source: "acm.nl",
        note: "ACM advertises a mixed telecom+post CSV. Postal-only unique count not extracted.",
      };
    }
    if (c.iso === "PL") {
      register = {
        records: null,
        uniqueLegal: null,
        status: "DATA_INCOMPLETE",
        method: "uke_search_form_no_bulk",
        source: "uke.gov.pl",
        note: "UKE searchable register exists. Bulk postal-only count not retrieved.",
      };
    }
    if (c.iso === "PT") {
      register = {
        records: null,
        uniqueLegal: null,
        status: "DATA_INCOMPLETE",
        method: "anacom_mixed_electronic_postal_list",
        source: "anacom.pt",
        note: "ANACOM public list mixes electronic and postal. Postal-only unique count not extracted.",
      };
    }
    return {
      iso: c.iso,
      name: c.name,
      nra: c.nra,
      register,
      previousVerifiedLegal: prev.activeVerifiedLegalEntities,
      newSourceVerifiedRows: extraHere.length,
      nationalPost: 1,
      activeCarrierVerified: extras.filter((e) => e.hqCountry === c.iso && e.activityVerified).length,
      lockerPudoVerified: extras.filter((e) => e.hqCountry === c.iso && e.class === "PUDO_LOCKER").length,
      apiDirectVerified: 0,
      verification: register.status,
    };
  });
}

function buildMasterV2() {
  const base = v1.buildMaster();
  const extras = extraEntities();
  const entities = [
    ...base.entities.map((e) => ({
      ...e,
      activityVerified: false,
      coverageVerified: false,
      apiStatus: e.sandbox === "BLOCKED" ? "CONTRACT_REQUIRED" : "NOT_VERIFIED",
    })),
    ...extras,
  ];
  return {
    schema: "buzzard.eu27-carrier-master.v2",
    previousSchema: "buzzard.eu27-carrier-master.v1",
    previousVerifiedLegalCount: base.uniqueVerifiedLegal,
    retrievedAt: RETRIEVED,
    salesEnabled: false,
    liveShipment: false,
    sources: Object.values(SOURCES_V2),
    countries: v1.COUNTRIES,
    entities,
    counts: countryStats(base, extras),
    apiDocs: apiDocs(),
    uniqueSourceVerified: entities.filter(
      (e) => String(e.reliability).startsWith("VERIFIED") || e.reliability === "SOURCE_VERIFIED"
    ).length,
    uniqueV1VerifiedPreserved: base.uniqueVerifiedLegal,
    uniqueNamedLegalInDatabase: new Set(entities.map((e) => e.id)).size,
    candidates: entities.filter((e) => e.reliability === "RESEARCH_CANDIDATE").length,
    notes: [
      "43 is the v1 verified snapshot, not an EU-27 population total.",
      "7183 is observed BNetzA Stammnummer rows, not active companies.",
      "Official letter registers exclude most parcel last-mile brands.",
    ],
  };
}

module.exports = {
  buildMasterV2,
  FI_LETTER,
  FR_ARCEP,
  BE_LICENCES,
  IE_COMREG,
  AT_PEV,
  RO_ANCOM_PAGE1,
  SOURCES_V2,
};

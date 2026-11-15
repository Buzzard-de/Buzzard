/**
 * Carrier master v3. Extends v2. Register layers stay separate from active last-mile.
 */
const v2mod = require("./eu27SeedV2");

const RETRIEVED = "2026-11-05";

function src(id, title, url, extra = {}) {
  return { id, title, url, retrievedAt: RETRIEVED, ...extra };
}

const SOURCES_V3 = Object.freeze({
  ctu: src(
    "ctu-evidence-2026-10-21",
    "ČTÚ evidence provozovatelů poštovních služeb od 1.1.2024, aktualizace 21.10.2026",
    "https://ctu.gov.cz/vyhledavaci-databaze/evidence-provozovatelu-poskytujicich-nebo-zajistujicich-postovni-sluzby-od-2024",
    { scope: "POSTAL_NOTIFICATION_NOT_FULL_PARCEL_MARKET" }
  ),
  crc: src(
    "crc-annual-post-2025",
    "CRC Annual Report Post 2025: 218 licensed/registered, 87 actually provided services",
    "https://crc.bg/files/%D0%92%D0%9E%D0%9F/Annual%20Report%20Post%202025%20CRC_eng.pdf"
  ),
  skReg: src(
    "teleoff-register-postovych-podnikov",
    "Úrad SK Register poštových podnikov PDF (last sequential no. 47 observed)",
    "https://www.teleoff.gov.sk/files/urad/odbory-oddelenia/odbor-regulacie-postovych-sluzieb/registracia-poskytovanie-postovych-sluzieb/register-postovych-podnikov/register-postovych-podnikov.pdf"
  ),
  akos: src(
    "akos-2024-annual",
    "AKOS letno poročilo poštni trg 2024: 29 inscribed 31.12.2024",
    "https://www.akos-rs.si/fileadmin/user_upload/dokumenti/Posta/Novice_2024_in_2025/Letno_porocilo_o_stanju_na_trgu_postnih_storitev_za_leto_2024.pdf"
  ),
  hakom: src(
    "hakom-2024-hina",
    "HAKOM via HINA: 23 licensed operators end 2024",
    "https://www.hina.hr/news/11891401",
    { names: "NOT_ENUMERATED" }
  ),
  ilr2025: src(
    "ilr-stat-2025",
    "ILR Les services postaux au Luxembourg, données 2025: 43 inscrits au 31.12.2025",
    "https://www.ilr.lu/wp-content/uploads/statistiques/ilr-pos-stat-rapport-statistique-2025.pdf"
  ),
  mca: src(
    "mca-postal-2026-09-02",
    "MCA Register of Authorised Undertakings Postal, last updated 02/09/2026",
    "https://www.mca.org.mt/sites/default/files/pageattachments/2026.09.02%20Register%20-%20Postal.pdf"
  ),
  ocecpr: src(
    "ocecpr-postal-records",
    "OCECPR postal licence register (named extract)",
    "https://ocecpr.ee.cy/en/postal-records"
  ),
  rtr2024: src(
    "rtr-post-monitor-2024",
    "RTR Post Monitor Jahresbericht 2024: 16 PEV reporters. 138 Anzeige figure not found in this report.",
    "https://www.rtr.at/TKP/aktuelles/publikationen/publikationen/m/pm/RTR_Post_Monitor_Jahresbericht-2024.pdf"
  ),
  nmhh: src(
    "nmhh-posta-nyilvantartas",
    "NMHH postai szolgáltatók nyilvántartása (Excel advertised, not imported)",
    "https://nmhh.hu/posta/nyilvantartas",
    { total: "NOT_ENUMERATED" }
  ),
});

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42);
}

const CZ_CTU = [
  { legal: "Česká pošta, s.p.", active: true, ico: "47114983" },
  { legal: "Česká distribuční k.s.", active: false, ico: "26791692", note: "činnost přerušena 01.03.2026" },
  { legal: "Mechanika Prostějov 97, družstvo", active: true, ico: "25344731" },
];

const BG_UPS = [
  "Bulgarian Posts EAD",
  "Econt Express AD",
  "M&BM Express OOD",
  "Star Post OOD",
  "Speedy AD",
  "Fasto Courier EOOD",
  "Tavex EOOD",
  "Toyota-Tixim EOOD",
  "A1 Trade EOOD",
  "Arii EOOD",
  "GT Logistics OOD",
  "DV Post EOOD",
];

const SK_NAMED = [
  "Slovenská pošta, a.s.",
  "Direct Parcel Distribution SK s.r.o.",
  "GO4, s.r.o.",
  "Slovak Parcel Service s.r.o.",
  "GLS General Logistics Systems Slovakia s.r.o.",
  "DHL Express (Slovakia), spol. s r.o.",
  "DHL Parcel Slovensko spol. s r.o.",
  "FedEx Express Slovakia s.r.o.",
  "UPS Slovakia s. r. o.",
  "Packeta Slovakia s. r. o.",
  "Express One Slovakia s.r.o.",
  "DER KURIER Slovakia spol. s r.o.",
  "Geis Parcel SK s.r.o. / DPD SK s.r.o.",
  "Nova Post SK s.r.o.",
  "PaletExpress, s.r.o.",
  "Pack4you, s.r.o.",
  "U POST s. r. o.",
  "GTPost s. r. o.",
  "Meest International sp. z o.o. organizačná zložka",
  "SDS - Smart Delivery Service SK, s.r.o.",
];

const SI_AKOS = [
  { legal: "POŠTA SLOVENIJE d.o.o.", cls: "NATIONAL_POST_USP" },
  { legal: "Cetis-Zg d.o.o.", cls: "SUBSTITUTABLE_POSTAL" },
  { legal: "DGistic, d.o.o.", cls: "SUBSTITUTABLE_POSTAL" },
  { legal: "EPPS, d.o.o.", cls: "SUBSTITUTABLE_POSTAL" },
  { legal: "IZBERI d.o.o.", cls: "SUBSTITUTABLE_POSTAL" },
  { legal: "KRO, d.o.o.", cls: "SUBSTITUTABLE_POSTAL" },
  { legal: "MAKSMAIL d.o.o.", cls: "SUBSTITUTABLE_POSTAL" },
  { legal: "Damir Vidan s. p.", cls: "LOCAL_COURIER" },
  { legal: "DHL Ekspres (Slovenija) d.o.o.", cls: "PRIVATE_EXPRESS" },
  { legal: "DPD d.o.o.", cls: "PRIVATE_PARCEL" },
  { legal: "Express One SI d.o.o.", cls: "PRIVATE_EXPRESS" },
  { legal: "FedEx Express Slovenija d.o.o.", cls: "PRIVATE_EXPRESS" },
  { legal: "GENERAL LOGISTICS SYSTEMS d.o.o.", cls: "PRIVATE_PARCEL" },
  { legal: "GOLD EKSPRES d.o.o.", cls: "PRIVATE_EXPRESS" },
  { legal: "NOVAKORP d.o.o.", cls: "LOCAL_COURIER" },
  { legal: "NP KURIRČEK d.o.o.", cls: "LOCAL_COURIER" },
  { legal: "P PROJEKT, Pavel Pučnik, s. p.", cls: "LOCAL_COURIER" },
  { legal: "Packeta Adriatic d.o.o.", cls: "PUDO_LOCKER" },
  { legal: "PREISKOVALNO VARNOSTNA AGENCIJA, d.o.o.", cls: "LOCAL_COURIER" },
  { legal: "SPLETNO d.o.o.", cls: "LOCAL_COURIER" },
  { legal: "UPS Adria (S) Ekspres d.o.o.", cls: "PRIVATE_EXPRESS" },
];

const LU_ILR = [
  "Amazon Deutschland W11 Transport GmbH",
  "Bpost",
  "BML Solutions",
  "Cbxse",
  "CitEx",
  "Colis Privé Belgique",
  "De Coursier",
  "Défi Express",
  "Dextram",
  "DFD Transport",
  "DG LUX",
  "DHL Express (Luxembourg)",
  "Distral",
  "DPD (Luxembourg)",
  "DSHT GmbH",
  "FedEx Express Luxembourg",
  "General Logistics Systems Belgium (Luxembourg)",
  "GERIC Transport",
  "Go! Express & Logistics",
  "Inflow",
  "Interoute",
  "KG Transport",
  "LocaLuxe",
  "Lux Top Transport",
  "Mondial Relay",
  "MSM Logistik GmbH",
  "M.Z. - Transport",
  "New Fast Mail",
  "OT LUX",
  "Poney Express",
  "POST Luxembourg",
  "Postex",
  "Rahmani",
  "Raid Time Transport UG",
  "S&S Multiservices",
  "Société d’Acheminement et de Distribution",
  "Trans Ideal Lux",
  "Transport Monfort",
  "United Parcel Service Luxembourg",
  "V&D Translux",
  "Xpress Logistics",
  "7 Days Luxembourg GmbH (anc. MPK Luxembourg GmbH)",
  "9 Bar Solutions GmbH",
];

const MT_MCA = [
  "Agius Trading Ltd",
  "Air Cargo Logistics Ltd",
  "Airswift Couriers Ltd",
  "AMG Logistics Ltd (FastDrop)",
  "Arrow Express Ltd",
  "Black Tie Concierge Ltd",
  "Buzzz Electric Limited",
  "C & C Express Ltd",
  "Connect Express Couriers",
  "Courier Express Ltd",
  "Decima Trade Ltd",
  "DHL International Ltd",
  "Express Trailers Ltd (ShipLowCost)",
  "Ezee Transportation Limited",
  "Fabrizio Ferruggia",
  "Fastdrop International Ltd",
  "Ferruggia Fleet Ltd",
  "Galea Moving and Transport Ltd",
  "Louis Abela Borg",
  "Maltapost Plc",
  "Manna EV Ltd",
  "Manna Consultancy Ltd",
  "Marvic Refalo",
  "Mihai Group Ltd",
  "Miles Express Cargo Systems Ltd",
  "Pony Express Couriers",
  "Premiere Post Ltd.",
  "Quick Turtle Sp zo.o",
  "Security Services Malta Ltd",
  "SKY Mobility (Malta) Ltd",
  "Thomas Smith & Co. Ltd",
  "Tubeline Limited",
  "Twenty 17",
  "United Human Resources Ltd",
  "WFDM Ltd",
  "WT Global Ltd",
  "Xpress Logistics Ltd",
];

const CY_OCECPR = [
  "4A Express Ltd",
  "ACS Air Courier Services (Cyprus) Ltd.",
  "AIRTRANS GROUP LTD",
  "Aramex Cyprus Ltd.",
  "Ariel Express Ltd",
  "DHL (Cyprus) Ltd.",
  "G.A.P VASSILOPOULOS EXPRESS COURIER LIMITED",
  "GAP AKIS Express Ltd.",
  "KRONOS EXPRESS LIMITED",
  "Primewell Courier",
  "Servall Ltd.",
  "TIME GLOBAL EXPRESS LTD",
  "FedEx Express (Cyprus) Ltd",
  "Γενική Ταχυδρομική Ελλάδος (Κύπρου)",
  "Παγκύπρια Εταιρεία Μεταφορών Δεμάτων Λτδ Travel & Express",
  "Τμήμα Ταχυδρομικών Υπηρεσιών",
  "PP PAPHOS PROPERTY PROFESSIONALS LTD",
  "BOX NOW CYPRUS LTD",
  "SVELTA COURIER (CYPRUS) LTD",
  "ELENI PAVLOU (APELIA MAILBOXES)",
  "CS WINGS LTD",
  "Skroutz Delivery Services Limited",
  "EUROFREIGHT LOGISTICS LTD",
];

const LOCAL_CANDIDATES = [
  ["DE", "nox Night Time Express", "REGIONAL_SPECIALIST"],
  ["DE", "General Overnight", "REGIONAL_COURIER"],
  ["DE", "City-Courier", "LOCAL_COURIER"],
  ["FR", "Stuart", "SAME_DAY"],
  ["FR", "Coursier.fr", "LOCAL_COURIER"],
  ["FR", "Relais Colis", "PUDO_LOCKER"],
  ["ES", "Sending", "PRIVATE_PARCEL"],
  ["ES", "Tipsa", "PRIVATE_PARCEL"],
  ["ES", "Zeleris", "PRIVATE_PARCEL"],
  ["ES", "Halcourier", "PRIVATE_PARCEL"],
  ["ES", "Envialia", "PRIVATE_PARCEL"],
  ["ES", "Tourline", "PRIVATE_PARCEL"],
  ["IT", "BRT / Bartolini", "PRIVATE_PARCEL"],
  ["IT", "SDA", "NATIONAL_PARCEL_LETTER"],
  ["IT", "Nexive", "PRIVATE_PARCEL"],
  ["PL", "InPost", "PUDO_LOCKER"],
  ["PL", "Orlen Paczka", "PUDO_LOCKER"],
  ["PL", "Pocztex", "NATIONAL_PARCEL_LETTER"],
  ["PL", "Ambro Express", "PRIVATE_PARCEL"],
  ["PL", "Speedmail", "PRIVATE_PARCEL"],
  ["RO", "Sameday", "PRIVATE_PARCEL"],
  ["RO", "Cargus", "PRIVATE_PARCEL"],
  ["RO", "Nemo Express", "PRIVATE_PARCEL"],
  ["RO", "Sprint Curier", "PRIVATE_PARCEL"],
  ["BG", "Tip Top Courier", "LOCAL_COURIER"],
  ["CZ", "Zásilkovna", "PUDO_LOCKER"],
  ["CZ", "PPL", "PRIVATE_PARCEL"],
  ["CZ", "Balíkovna", "PUDO_LOCKER"],
  ["CZ", "WE|DO", "PRIVATE_PARCEL"],
  ["SK", "ReMax Courier Service", "LOCAL_COURIER"],
  ["SK", "IN TIME", "PRIVATE_PARCEL"],
  ["PT", "Rangel", "FREIGHT"],
  ["PT", "Torrestir", "FREIGHT"],
  ["PT", "CTT Expresso", "PRIVATE_PARCEL"],
  ["FI", "Matkahuolto", "PRIVATE_PARCEL"],
];

function row(id, legal, brand, iso, cls, reliability, sources, notes, extra = {}) {
  return {
    id,
    legalName: legal,
    brand,
    hqCountry: iso,
    class: cls,
    reliability,
    activityVerified: extra.activityVerified === true,
    coverageVerified: false,
    coverageMode: extra.coverageMode || "UNKNOWN",
    apiStatus: "NOT_VERIFIED",
    sandboxVerified: false,
    liveVerified: false,
    sources,
    notes,
    website: extra.website || "NOT_PUBLISHED",
    parent: extra.parent || "NOT_VERIFIED",
    companyNumber: extra.companyNumber || "NOT_PUBLISHED",
  };
}

function extras() {
  const out = [];
  for (const r of CZ_CTU.filter((x) => x.legal !== "Česká pošta, s.p.")) {
    out.push(
      row(
        `cz-${slug(r.legal)}`,
        r.legal,
        r.legal,
        "CZ",
        "LETTER_NOTIFICATION",
        "SOURCE_VERIFIED",
        ["ctu-evidence-2026-10-21"],
        r.note || "ČTÚ postal notification. Not a parcel last-mile census.",
        { activityVerified: r.active, companyNumber: r.ico }
      )
    );
  }
  for (const name of BG_UPS.filter((n) => n !== "Bulgarian Posts EAD")) {
    out.push(
      row(
        `bg-${slug(name)}`,
        name,
        name,
        "BG",
        "UPS_LICENCE",
        "SOURCE_VERIFIED",
        ["crc-annual-post-2025"],
        "CRC 2025 UPS/in-scope licence table. 218 total operators not all named here."
      )
    );
  }
  for (const name of SK_NAMED.filter((n) => n !== "Slovenská pošta, a.s.")) {
    out.push(
      row(
        `sk-${slug(name)}`,
        name,
        name,
        "SK",
        "POSTAL_REGISTER",
        "SOURCE_VERIFIED",
        ["teleoff-register-postovych-podnikov"],
        "Named on fetched SK register PDF. Last sequential number observed: 47. Dedup of expired rows incomplete."
      )
    );
  }
  for (const r of SI_AKOS.filter((x) => x.legal !== "POŠTA SLOVENIJE d.o.o.")) {
    out.push(
      row(
        `si-${slug(r.legal)}`,
        r.legal,
        r.legal,
        "SI",
        r.cls,
        "SOURCE_VERIFIED",
        ["akos-2024-annual"],
        "AKOS 2024 annual report named operator. Register total 29; this is the named subset."
      )
    );
  }
  for (const name of LU_ILR.filter((n) => n !== "POST Luxembourg")) {
    out.push(
      row(
        `lu-${slug(name)}`,
        name,
        name,
        "LU",
        "POSTAL_REGISTER",
        "SOURCE_VERIFIED",
        ["ilr-stat-2025"],
        "ILR public register annex 31.12.2025. Subcontractors included; not automatically independent last-mile."
      )
    );
  }
  for (const name of MT_MCA.filter((n) => n !== "Maltapost Plc")) {
    out.push(
      row(
        `mt-${slug(name)}`,
        name,
        name,
        "MT",
        "AUTHORISED_POSTAL_PROVIDER",
        "SOURCE_VERIFIED",
        ["mca-postal-2026-09-02"],
        "MCA authorised undertakings 02/09/2026. Authorisation ≠ nationwide last-mile."
      )
    );
  }
  for (const name of CY_OCECPR.filter((n) => !/Ταχυδρομικών Υπηρεσιών/.test(n))) {
    out.push(
      row(
        `cy-${slug(name)}`,
        name,
        name,
        "CY",
        "POSTAL_LICENCE",
        "SOURCE_VERIFIED",
        ["ocecpr-postal-records"],
        "OCECPR licence register extract."
      )
    );
  }
  for (const [iso, name, cls] of LOCAL_CANDIDATES) {
    out.push(
      row(
        `cand-v3-${iso.toLowerCase()}-${slug(name)}`,
        `${name} (legal title NOT_VERIFIED)`,
        name,
        iso,
        cls,
        "RESEARCH_CANDIDATE",
        [],
        "Discovery-brief example. Not treated as register-verified or active."
      )
    );
  }
  return out;
}

function overlayRegister(iso, records, uniqueLegal, status, method, source, note) {
  return { records, uniqueLegal, status, method, source, note };
}

function buildMasterV3() {
  const base = v2mod.buildMasterV2();
  const add = extras();
  const seen = new Set(base.entities.map((e) => e.id));
  const entities = [...base.entities];
  for (const e of add) {
    if (!seen.has(e.id)) {
      entities.push(e);
      seen.add(e.id);
    }
  }

  const overlays = {
    CZ: overlayRegister(
      "CZ",
      3,
      3,
      "PARTIALLY_VERIFIED",
      "ctu_notification_table_2026_10_21",
      "ctu-evidence-2026-10-21",
      "Three notified postal operators. Česká distribuční interrupted 01.03.2026. PPL/Zásilkovna are outside this letter-style register."
    ),
    BG: overlayRegister(
      "BG",
      218,
      null,
      "PARTIALLY_VERIFIED",
      "crc_annual_2025_unique_operators",
      "crc-annual-post-2025",
      "218 licensed/registered at end 2025; 87 actually provided services. 205 NPU registrations. Named UPS table is a subset."
    ),
    SK: overlayRegister(
      "SK",
      47,
      null,
      "PARTIALLY_VERIFIED",
      "last_sequential_number_on_teleoff_pdf",
      "teleoff-register-postovych-podnikov",
      "Last sequential number 47 including expired/revoked rows. Unique active legal not completed."
    ),
    SI: overlayRegister(
      "SI",
      29,
      29,
      "PARTIALLY_VERIFIED",
      "akos_inscribed_2024_12_31",
      "akos-2024-annual",
      "29 inscribed. Report analysed 1 USP + 6 substitutable + 14 active without decision. Eight inscribed did not operate in 2024."
    ),
    HR: overlayRegister(
      "HR",
      23,
      null,
      "PARTIALLY_VERIFIED",
      "hakom_end_2024_via_hina",
      "hakom-2024-hina",
      "23 licensed operators end 2024. Names not enumerated in the fetched news summary."
    ),
    LU: overlayRegister(
      "LU",
      43,
      43,
      "PARTIALLY_VERIFIED",
      "ilr_public_register_2025_12_31",
      "ilr-stat-2025",
      "43 inscribed. 41 supplied 2025 statistics. Includes subcontractors."
    ),
    MT: overlayRegister(
      "MT",
      MT_MCA.length,
      MT_MCA.length,
      "PARTIALLY_VERIFIED",
      "mca_pdf_2026_09_02",
      "mca-postal-2026-09-02",
      "Authorised undertakings PDF. USP is MaltaPost. Premiere Post and FastDrop also hold USO-scope licences."
    ),
    CY: overlayRegister(
      "CY",
      CY_OCECPR.length,
      CY_OCECPR.length,
      "PARTIALLY_VERIFIED",
      "ocecpr_named_licence_extract",
      "ocecpr-postal-records",
      "Named licence extract. Completeness of the HTML table vs unpublished rows NOT_VERIFIED."
    ),
    AT: overlayRegister(
      "AT",
      16,
      16,
      "DATA_INCOMPLETE",
      "rtr_pev_2026_and_2024_monitor",
      "rtr-post-monitor-2024",
      "PEV reporters: 16 in Feb 2026 list / 16 in 2024 annual (appendix lists more names historically). Claimed 138 Anzeige operators was not found in the fetched 2024 report. Full §25 list not downloaded."
    ),
    HU: overlayRegister(
      "HU",
      null,
      null,
      "DATA_INCOMPLETE",
      "nmhh_excel_advertised_not_imported",
      "nmhh-posta-nyilvantartas",
      "Searchable register and Excel exist. Count not extracted."
    ),
    EL: overlayRegister(
      "EL",
      null,
      null,
      "DATA_INCOMPLETE",
      "eett_eregistry_searchable",
      null,
      "EETT eRegistry and data.gov.gr dataset exist. Bulk postal-only count not extracted."
    ),
    EE: overlayRegister("EE", null, null, "DATA_INCOMPLETE", "mtr_register_referenced", null, "Konkurentsiamet points to MTR. Bulk list not extracted."),
    LV: overlayRegister("LV", null, null, "DATA_INCOMPLETE", "sprk_register_powerbi", null, "SPRK register exists (Power BI). Count not extracted."),
    LT: overlayRegister("LT", null, null, "DATA_INCOMPLETE", "rrt_page_http_500", null, "RRT provider page returned HTTP 500 on fetch."),
  };

  const counts = base.counts.map((c) => {
    const o = overlays[c.iso];
    if (!o) return c;
    return { ...c, register: o, verification: o.status };
  });

  const sourceVerified = entities.filter(
    (e) => String(e.reliability).startsWith("VERIFIED") || e.reliability === "SOURCE_VERIFIED"
  );

  return {
    schema: "buzzard.eu27-carrier-master.v3",
    previousSchema: base.schema,
    previousVerifiedLegalCount: base.previousVerifiedLegalCount,
    retrievedAt: RETRIEVED,
    salesEnabled: false,
    liveShipment: false,
    sources: [...base.sources, ...Object.values(SOURCES_V3)],
    countries: base.countries,
    entities,
    counts,
    apiDocs: base.apiDocs,
    uniqueSourceVerified: sourceVerified.length,
    uniqueV1VerifiedPreserved: base.uniqueV1VerifiedPreserved,
    uniqueNamedLegalInDatabase: entities.length,
    candidates: entities.filter((e) => e.reliability === "RESEARCH_CANDIDATE").length,
    austria138: {
      status: "NOT_FOUND_IN_FETCHED_RTR_2024_REPORT",
      pevReporters2024: 16,
      note: "Do not use 138 as a 2026 official unique-company count.",
    },
    notes: [
      "v1 43 and v2 named layers are preserved.",
      "Register totals are not unique EU-27 last-mile companies.",
      "Austria 138 remains unverified against fetched RTR documents.",
      "COMPLETE_VERIFIED countries: 0.",
    ],
  };
}

module.exports = {
  buildMasterV3,
  CZ_CTU,
  BG_UPS,
  SK_NAMED,
  SI_AKOS,
  LU_ILR,
  MT_MCA,
  CY_OCECPR,
  SOURCES_V3,
};

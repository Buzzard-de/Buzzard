/**
 * AB-27 carrier seed. Only sourced facts. Unknown = NOT_VERIFIED / NOT_ACCESSED.
 * Schema: buzzard.eu27-carrier-master.v1
 */
const RETRIEVED = "2026-11-05";

const SOURCES = Object.freeze({
  upu2025: {
    id: "upu-designated-2025-02-15",
    title: "UPU designated operators, position 15 February 2025",
    url: "https://www.upu.int/UPU/media/upu/PostalEntitiesFiles/statusOfPostalEntities/20250312dPRMAnListOfEntitiesEN.pdf",
    retrievedAt: RETRIEVED,
  },
  ergpec: {
    id: "ec-ergp",
    title: "European Commission ERGP page",
    url: "https://single-market-economy.ec.europa.eu/sectors/postal-services/european-regulators-group-postal-services_en",
    retrievedAt: RETRIEVED,
  },
  ecstats: {
    id: "ec-postal-statistics",
    title: "EU Postal Survey statistics (latest published set referenced as 2022 on DG GROW page)",
    url: "https://single-market-economy.ec.europa.eu/sectors/postal-services/statistics_en",
    retrievedAt: RETRIEVED,
    note: "Not a 2026 operator register. Do not treat as current licensed-count.",
  },
  bnetza: {
    id: "bnetza-anbieterverzeichnis",
    title: "Bundesnetzagentur Anbieterverzeichnis Post (fetched listing)",
    url: "https://www.bundesnetzagentur.de/DE/Fachthemen/Post/Anbieterverzeichnis/PostAnbieterverzeichnis.html",
    retrievedAt: RETRIEVED,
    observedUniqueIds: 7183,
    landingPublishedCount: "NOT_PUBLISHED",
  },
  trafik: {
    id: "trafikstyrelsen-2025-redegoerelse",
    title: "Trafikstyrelsen redegørelse for 2025 om det danske postmarked",
    url: "https://www.trafikstyrelsen.dk/publikationsliste/post-og-koerekort-publikationer/2026/jul/redegoerelse-for-2025-om-det-danske-postmarkeds-tilstand-og-udvikling",
    retrievedAt: RETRIEVED,
  },
  traficom: {
    id: "traficom-usp-posti",
    title: "Traficom designated Posti Ltd as USP",
    url: "https://traficom.fi/en/postal-services-and-delivery/provision-postal-services-and-development-postal-markets",
    retrievedAt: RETRIEVED,
  },
});

const COUNTRIES = Object.freeze([
  { iso: "DE", name: "Germany", nra: "Bundesnetzagentur (BNetzA)", nraUrl: "https://www.bundesnetzagentur.de" },
  { iso: "FR", name: "France", nra: "ARCEP", nraUrl: "https://www.arcep.fr" },
  { iso: "IT", name: "Italy", nra: "AGCOM", nraUrl: "https://www.agcom.it" },
  { iso: "ES", name: "Spain", nra: "CNMC", nraUrl: "https://www.cnmc.es" },
  { iso: "NL", name: "Netherlands", nra: "ACM", nraUrl: "https://www.acm.nl" },
  { iso: "BE", name: "Belgium", nra: "BIPT / IBPT", nraUrl: "https://www.bipt.be" },
  { iso: "AT", name: "Austria", nra: "RTR", nraUrl: "https://www.rtr.at" },
  { iso: "PL", name: "Poland", nra: "UKE", nraUrl: "https://www.uke.gov.pl" },
  { iso: "CZ", name: "Czechia", nra: "ČTÚ", nraUrl: "https://www.ctu.cz" },
  { iso: "SK", name: "Slovakia", nra: "Regulatory Authority for Electronic and Postal Services", nraUrl: "https://www.teleoff.gov.sk" },
  { iso: "HU", name: "Hungary", nra: "NMHH", nraUrl: "https://nmhh.hu" },
  { iso: "RO", name: "Romania", nra: "ANCOM", nraUrl: "https://www.ancom.ro" },
  { iso: "BG", name: "Bulgaria", nra: "Communications Regulation Commission", nraUrl: "https://www.crc.bg" },
  { iso: "EL", name: "Greece", nra: "EETT", nraUrl: "https://www.eett.gr" },
  { iso: "PT", name: "Portugal", nra: "ANACOM", nraUrl: "https://www.anacom.pt" },
  { iso: "IE", name: "Ireland", nra: "ComReg", nraUrl: "https://www.comreg.ie" },
  { iso: "DK", name: "Denmark", nra: "Trafikstyrelsen", nraUrl: "https://www.trafikstyrelsen.dk" },
  { iso: "SE", name: "Sweden", nra: "PTS", nraUrl: "https://www.pts.se" },
  { iso: "FI", name: "Finland", nra: "Traficom", nraUrl: "https://www.traficom.fi" },
  { iso: "EE", name: "Estonia", nra: "Konkurentsiamet", nraUrl: "https://www.konkurentsiamet.ee" },
  { iso: "LV", name: "Latvia", nra: "SPRK", nraUrl: "https://www.sprk.gov.lv" },
  { iso: "LT", name: "Lithuania", nra: "RRT", nraUrl: "https://www.rrt.lt" },
  { iso: "LU", name: "Luxembourg", nra: "ILR", nraUrl: "https://web.ilr.lu" },
  { iso: "MT", name: "Malta", nra: "MCA", nraUrl: "https://www.mca.org.mt" },
  { iso: "CY", name: "Cyprus", nra: "OCECPR", nraUrl: "https://ocecpr.ee.cy" },
  { iso: "SI", name: "Slovenia", nra: "AKOS", nraUrl: "https://www.akos-rs.si" },
  { iso: "HR", name: "Croatia", nra: "HAKOM", nraUrl: "https://www.hakom.hr" },
]);

const USP = Object.freeze([
  ["AT", "Österreichische Post AG", "Österreichische Post", "https://www.post.at"],
  ["BE", "bpost", "bpost", "https://www.bpost.be"],
  ["BG", "Bulgarian Posts", "Bulgarian Posts", "https://www.bgpost.bg"],
  ["HR", "Croatian Post Inc.", "Hrvatska pošta", "https://www.posta.hr"],
  ["CY", "Department of Postal Services (Cyprus Post)", "Cyprus Post", "https://www.cypruspost.post"],
  ["CZ", "Česká pošta, s.p.", "Česká pošta", "https://www.ceskaposta.cz"],
  ["DK", "Post Danmark A/S", "PostNord Danmark", "https://www.postnord.dk"],
  ["EE", "Estonian Post Ltd", "Omniva", "https://www.omniva.ee"],
  ["FI", "Posti Jakelu Ltd / Posti Ltd", "Posti", "https://www.posti.fi"],
  ["FR", "La Poste", "La Poste", "https://www.laposte.fr"],
  ["DE", "Deutsche Post AG", "Deutsche Post / DHL", "https://www.deutschepost.de"],
  ["EL", "Hellenic Post S.A. (ELTA)", "ELTA", "https://www.elta.gr"],
  ["HU", "Magyar Posta", "Magyar Posta", "https://www.posta.hu"],
  ["IE", "An Post", "An Post", "https://www.anpost.com"],
  ["IT", "Poste Italiane S.p.A.", "Poste Italiane", "https://www.poste.it"],
  ["LV", "SJSC Latvijas Pasts", "Latvijas Pasts", "https://www.pasts.lv"],
  ["LT", "AB Lietuvos paštas", "Lietuvos paštas", "https://www.post.lt"],
  ["LU", "POST Luxembourg", "POST Luxembourg", "https://www.post.lu"],
  ["MT", "Maltapost plc", "MaltaPost", "https://www.maltapost.com"],
  ["NL", "PostNL", "PostNL", "https://www.postnl.nl"],
  ["PL", "Polish Post Ltd / Poczta Polska", "Poczta Polska", "https://www.poczta-polska.pl"],
  ["PT", "CTT – Correios de Portugal S.A.", "CTT", "https://www.ctt.pt"],
  ["RO", "Compania Națională Poșta Română S.A.", "Poșta Română", "https://www.posta-romana.ro"],
  ["SK", "Slovenská pošta, a.s.", "Slovenská pošta", "https://www.posta.sk"],
  ["SI", "Pošta Slovenije d.o.o.", "Pošta Slovenije", "https://www.posta.si"],
  ["ES", "Sociedad Estatal Correos y Telégrafos", "Correos", "https://www.correos.es"],
  ["SE", "PostNord Group AB", "PostNord", "https://www.postnord.se"],
]);

function emptyCaps() {
  return {
    b2c: "NOT_VERIFIED",
    b2b: "NOT_VERIFIED",
    c2c: "NOT_VERIFIED",
    parcel: "NOT_VERIFIED",
    letter: "NOT_VERIFIED",
    pallet: "NOT_VERIFIED",
    sameDay: "NOT_VERIFIED",
    nextDay: "NOT_VERIFIED",
    locker: "NOT_VERIFIED",
    pudo: "NOT_VERIFIED",
    returns: "NOT_VERIFIED",
    tracking: "NOT_VERIFIED",
    insurance: "NOT_VERIFIED",
    maxWeightKg: "NOT_PUBLISHED",
    volumetricRule: "NOT_PUBLISHED",
    api: "NOT_VERIFIED",
    xml: "NOT_VERIFIED",
    edi: "NOT_VERIFIED",
    csv: "NOT_VERIFIED",
    webhook: "NOT_VERIFIED",
    labelApi: "NOT_VERIFIED",
    quoteApi: "NOT_VERIFIED",
    sandbox: "BLOCKED",
    contractRequired: "NOT_VERIFIED",
  };
}

function entity(partial) {
  return {
    legalName: "UNKNOWN",
    brand: "UNKNOWN",
    parent: "NOT_VERIFIED",
    ownership: "NOT_VERIFIED",
    companyNumber: "NOT_PUBLISHED",
    vat: "NOT_PUBLISHED",
    website: "NOT_PUBLISHED",
    hqCountry: "NOT_VERIFIED",
    class: "UNKNOWN",
    reliability: "NOT_VERIFIED",
    ...emptyCaps(),
    ...partial,
  };
}

function buildEntities() {
  const rows = USP.map(([iso, legal, brand, website]) =>
    entity({
      id: `usp-${iso.toLowerCase()}`,
      legalName: legal,
      brand,
      website,
      hqCountry: iso,
      class: "NATIONAL_POST_USP",
      ownership: iso === "DE" || iso === "FR" || iso === "IT" || iso === "ES" || iso === "NL" ? "NOT_VERIFIED" : "NOT_VERIFIED",
      parcel: "NOT_VERIFIED",
      letter: "YES_USP_DESIGNATION_UPU_2025",
      reliability: "VERIFIED_USP_UPU_2025",
      sources: ["upu-designated-2025-02-15"],
      notes:
        iso === "DK"
          ? "UPU still lists Post Danmark A/S (Feb 2025). Trafikstyrelsen: USO ended 1 Jan 2024; from 2026 only dao delivers nationwide ordinary letters."
          : iso === "FI"
            ? "Traficom designates Posti Ltd as USP for correspondence (except Åland) and outbound parcels."
            : null,
    })
  );

  const deExtras = [
    ["de-hermes", "Hermes Germany GmbH", "Hermes / Evri", "400010", "PRIVATE_PARCEL"],
    ["de-dpd", "DPD Deutschland GmbH", "DPD", "401980", "PRIVATE_PARCEL"],
    ["de-gls", "General Logistics Systems Germany GmbH & Co. OHG", "GLS", "400286", "PRIVATE_PARCEL"],
    ["de-dhl-express", "DHL Express Germany GmbH", "DHL Express", "400889", "PRIVATE_EXPRESS"],
    ["de-ups", "UPS Management LLC", "UPS", "400038", "PRIVATE_EXPRESS"],
    ["de-tof", "trans-o-flex Express GmbH & Co. KGaA", "trans-o-flex", "704045", "REGIONAL_SPECIALIST"],
    ["de-go", "GO! Express & Logistics GmbH", "GO!", "401307", "REGIONAL_COURIER"],
  ].map(([id, legal, brand, companyNumber, cls]) =>
    entity({
      id,
      legalName: legal,
      brand,
      companyNumber,
      hqCountry: "DE",
      class: cls,
      reliability: "VERIFIED_BNETZA_REGISTER_ROW",
      sources: ["bnetza-anbieterverzeichnis"],
      notes: "Present in fetched BNetzA Anbieterverzeichnis. Registration ≠ nationwide last-mile proof.",
    })
  );

  const dkLicensed = [
    ["dk-dao", "Dansk Avis Omdeling A/S", "dao", "26063892", "NATIONAL_PARCEL_LETTER", "nationwide"],
    ["dk-gls", "General Logistics Systems Denmark A/S", "GLS Denmark", "10549744", "PRIVATE_PARCEL", "nationwide"],
    ["dk-bring", "Bring E-commerce & Logistics A/S", "Bring", "29390142", "PRIVATE_PARCEL", "nationwide"],
    ["dk-fedex", "FedEx Express Danmark ApS", "FedEx", "76562512", "PRIVATE_EXPRESS", "nationwide"],
    ["dk-webrinq", "WebrinQ A/S", "WebrinQ", "41356367", "PRIVATE_PARCEL", "nationwide"],
    ["dk-ups", "U.P.S Danmark A/S", "UPS", "14553800", "PRIVATE_EXPRESS", "local_permit"],
    ["dk-dhl", "DHL Express (Denmark) A/S", "DHL Express", "10154596", "PRIVATE_EXPRESS", "local_permit"],
    ["dk-instabox", "Instabox Denmark ApS", "Instabox", "40850732", "PUDO_LOCKER", "local_permit"],
    ["dk-budbee", "Budbee Denmark ApS", "Budbee", "39772361", "PUDO_LOCKER", "local_permit"],
  ].map(([id, legal, brand, companyNumber, cls, scope]) =>
    entity({
      id,
      legalName: legal,
      brand,
      companyNumber,
      hqCountry: "DK",
      class: cls,
      reliability: "VERIFIED_DK_NRA_LICENSE_TABLE",
      sources: ["trafikstyrelsen-2025-redegoerelse"],
      notes: `Trafikstyrelsen permit class: ${scope}. Not a live Buzzard contract.`,
    })
  );

  const candidates = [
    ["cand-inpost", "InPost S.A. / local affiliates", "InPost", "PUDO_LOCKER"],
    ["cand-packeta", "Packeta / Zásilkovna", "Packeta", "PUDO_LOCKER"],
    ["cand-amazon", "Amazon Logistics (local affiliates)", "Amazon Logistics", "LAST_MILE"],
    ["cand-fedex-group", "FedEx / TNT", "FedEx", "PRIVATE_EXPRESS"],
    ["cand-mondial", "Mondial Relay", "Mondial Relay", "PUDO_LOCKER"],
  ].map(([id, legal, brand, cls]) =>
    entity({
      id,
      legalName: legal,
      brand,
      class: cls,
      reliability: "RESEARCH_CANDIDATE",
      sources: [],
      notes: "Name from research shortlist. Country-by-country last-mile NOT_VERIFIED. Not counted as active.",
    })
  );

  return [...rows, ...deExtras, ...dkLicensed, ...candidates];
}

function countryCounts(entities) {
  return COUNTRIES.map((c) => {
    const usp = entities.find((e) => e.id === `usp-${c.iso.toLowerCase()}`);
    const verifiedHere = entities.filter(
      (e) =>
        (e.hqCountry === c.iso && e.reliability.startsWith("VERIFIED")) ||
        (e.id === usp?.id && e.reliability.startsWith("VERIFIED"))
    );
    let official = { value: null, status: "OFFICIAL_REGISTER_NOT_ACCESSED" };
    if (c.iso === "DE") {
      official = {
        value: 7183,
        status: "PARTIAL_REGISTER_FETCH",
        note: "Unique Stammnr observed on fetched BNetzA listing. Landing page count blank. Not equal to active nationwide parcel carriers.",
      };
    }
    if (c.iso === "DK") {
      official = {
        value: 18,
        status: "REGISTER_TABLE_PUBLISHED",
        note: "Trafikstyrelsen Tabel 3: 6 nationwide + 12 local permits listed in 2025/26 redegørelse.",
      };
    }
    return {
      iso: c.iso,
      name: c.name,
      nra: c.nra,
      nraUrl: c.nraUrl,
      officialRegisterCount: official,
      activeVerifiedLegalEntities: verifiedHere.length,
      nationalPost: usp ? 1 : 0,
      privateVerified: verifiedHere.filter((e) => e.class !== "NATIONAL_POST_USP").length,
      regionalVerified: verifiedHere.filter((e) => String(e.class).includes("REGIONAL")).length,
      pudoVerified: verifiedHere.filter((e) => e.class === "PUDO_LOCKER").length,
      apiDirectVerified: 0,
      verification: official.status === "OFFICIAL_REGISTER_NOT_ACCESSED" ? "KISMEN_DOGRULANDI" : official.status,
    };
  });
}

function buildMaster() {
  const entities = buildEntities();
  return {
    schema: "buzzard.eu27-carrier-master.v1",
    retrievedAt: RETRIEVED,
    salesEnabled: false,
    liveShipment: false,
    sources: Object.values(SOURCES),
    countries: COUNTRIES,
    entities,
    counts: countryCounts(entities),
    uniqueVerifiedLegal: entities.filter((e) => String(e.reliability).startsWith("VERIFIED")).length,
    uniqueCandidates: entities.filter((e) => e.reliability === "RESEARCH_CANDIDATE").length,
  };
}

module.exports = { RETRIEVED, SOURCES, COUNTRIES, USP, buildMaster, emptyCaps };

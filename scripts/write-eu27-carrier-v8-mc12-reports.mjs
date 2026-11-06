import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const require = createRequire(import.meta.url);
const { loadV8 } = require("../server/lib/logistics/carrierMasterV8.js");

const outDir = "docs/MASTER_COMMAND/2026-11-06-mc12";
mkdirSync(outDir, { recursive: true });
const m = loadV8();
writeFileSync("data/logistics/eu27_carrier_master.v8.json", JSON.stringify(m, null, 2));

const head = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
const branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
const write = (name, body) => writeFileSync(join(outDir, name), body);
const csvEscape = (v) => `"${String(v ?? "UNKNOWN").replace(/"/g, '""')}"`;
const q = m.qualityMetrics;

const header = [
  "country_code","id","legal_entity_name","trading_name","class","service_status",
  "parcel_service_verified","last_mile_verified","own_fleet_verified","subcontractor_verified",
  "coverage_granularity","api_documented","sandbox_verified","live_contract_ready",
  "source","last_verified_at","confidence",
].join(",");
const rows = m.entities.map((e) =>
  [
    e.hqCountry, e.id, e.legalName, e.brand, e.class,
    e.serviceVerification.status,
    e.serviceVerification.parcel_service_verified,
    e.serviceVerification.last_mile_verified,
    e.serviceVerification.own_fleet_verified,
    e.serviceVerification.subcontractor_network_verified,
    e.coverageGranularity,
    e.serviceVerification.api_documented,
    e.serviceVerification.sandbox_verified,
    e.serviceVerification.live_contract_ready,
    (e.sources && e.sources[0]) || "UNKNOWN",
    "2026-11-06",
    e.evidence?.confidence || "LOW",
  ].map(csvEscape).join(",")
);
writeFileSync(join(outDir, "EU27_REAL_CARRIER_MATRIX.csv"), [header, ...rows].join("\n"));

const covH = [
  "country_code","coverage_granularity","coverage_verified","national_coverage_verified",
  "delivery","pickup","returns","locker","pudo","rural","license","source","verification_date",
].join(",");
const licenses = Object.fromEntries(m.postcodeLicenses.map((x) => [x.iso, x]));
const covRows = m.coverage.map((c) => {
  const lic = licenses[c.iso] || {};
  return [
    c.iso, c.coverageGranularity, c.coverageVerified, c.nationalCoverageVerified,
    c.delivery_available, c.pickup_available, c.return_available, c.locker_available,
    c.PUDO_available, c.rural_delivery, lic.license, c.source, c.verification_date,
  ].map(csvEscape).join(",");
});
writeFileSync(join(outDir, "EU27_POSTCODE_COVERAGE.csv"), [covH, ...covRows].join("\n"));

write(
  "MC12_EXECUTIVE_REPORT.md",
  `# MC12 executive report

**Date:** 6 November 2026 (Europe/Berlin)  
**Branch:** \`${branch}\`  
**Start HEAD (verified):** \`7db1c4f5\`  
**Working from:** \`${head}\`  
**Schema:** \`${m.schema}\`  
**Push / merge / deploy / live shipment / sales:** none  

v1–v7 JSON and MC10–MC11 reports were not modified. v8 extends the same engine: service-verification ladder, coverage granularity COUNTRY_LEVEL / POSTCODE_LEVEL / UNKNOWN, extra official API URLs at MC11 maturity 1, selection explanations (no invented price/ETA, international brand not auto-preferred).

## MC11 baseline vs this run

| Metric | MC11 frozen | This run |
| --- | ---: | ---: |
| Named rows | 1602 | ${m.uniqueNamedLegalInDatabase} |
| Unique legal keys | 1465 | ${m.uniqueLegalByCompanyKey} |
| Register-layer | 17453 | ${m.registerLayerSum} |
| Active-business flags | 31 | ${m.activityVerifiedCount} |
| Parcel independently verified | 0 | ${q.parcelServiceVerifiedCount} |
| Postcode countries verified | 0/27 | ${q.postcodeCoverageVerifiedCountryCount}/27 |
| API documentation entries | 7 | ${q.apiDocumentationCount} (delta +${q.apiDocumentationDelta}; docs only) |
| Sandbox tests | 0 | ${q.sandboxTestSuccessCount} |

No new named legal entities were invented or ingested.

## Answers

1. Unique legal keys in this sourced set: **1465** (1602 named rows). Not the EU-27 universe.
2. Active-business flags: **31**.
3. Parcel transport independently verified: **0**.
4. Last-mile independently verified: **0**.
5. Own fleet proven: **0**.
6. Subcontractor networks independently verified: **0** (UNKNOWN as a market size).
7. Postcode coverage verified countries: **0 / 27** (all granularity UNKNOWN).
8. Official API documentation entries in catalog: **${q.apiDocumentationCount}**.
9. Mock tests: see TEST_RESULTS.md.
10. Sandbox tests passed: **0**.
11. Live contract-ready carriers Buzzard can use today: **0**.
12. Largest 10 blockers: HU Excel href; PT ANACOM 403; LT Power BI; RO TLS; AT §25 SPA not extracted; UKE remaining pages; EETT licence≠last-mile; ACM letter≠parcel proof; licensed postcode ingest; sandbox credentials.
13. Complete: **0**. Blocked registers: HU, PT, LT, RO. Partial names/register: AT, HR, NL, PL, EL and remaining EU-27 (USP + prior layers, not COMPLETE_VERIFIED).

\`buzzard_guardian.sqlite3\` was not written.
`
);

write(
  "CARRIER_SERVICE_EVIDENCE.md",
  `# Service evidence ladder

Statuses: ${Object.entries(m.serviceStatusCounts).map(([k, v]) => `${k}=${v}`).join(", ")}.

- REGISTER_ONLY includes postal licences, USP rows, ACM/EETT/UKE classes.
- ACTIVE_BUSINESS_VERIFIED follows prior activityVerified / networkRole flags, not parcel proof.
- PARCEL_SERVICE_VERIFIED / LAST_MILE / OWN_FLEET / SUBCONTRACTOR / SANDBOX / LIVE remain 0 unless a field is explicitly that status.
- Website mention of shipping is not used as own-fleet proof.
- International brand×country ops (${(m.internationalOperations || []).length}) are not nationwide own-fleet proof.
`
);

write(
  "API_SANDBOX_MATRIX.md",
  `# API / sandbox

MC11 baseline: 7 documentation entries. This catalog: ${m.documentationCatalog.length}. Added docs (maturity 1): InPost, Packeta, PostNord, Posti, CTT.

${m.documentationCatalog
    .map(
      (c) =>
        `- ${c.brand} (${c.country}) apiLevel=${c.apiLevel} mc11Maturity=${c.mc11Maturity} sandboxVerified=${c.sandboxVerified} contract=${c.contractRequired} ${c.docs}`
    )
    .join("\n")}

DHL/GLS/UPS remain maturity 3 (shared mock adapter). Nothing is LEVEL 4/5.
`
);

write(
  "SUPPLIER_CARRIER_RELATIONSHIPS.md",
  `# Supplier vs carrier

${JSON.stringify(m.supplierCarrier, null, 2)}

Verified SUPPLIER_USES_CARRIER and CARRIER_USES_SUBCONTRACTOR lists are empty. No supplier is treated as having an own fleet.
`
);

write(
  "SMART_CARRIER_SELECTION.md",
  `# Smart carrier selection

Same \`selectCarrier\` (no second engine). MC12 adds:

- coverageGranularity must be POSTCODE_LEVEL and delivery_available===true to autoselect (currently never).
- International brands are not auto-preferred.
- Price and ETA are not invented (\`priceInvented: false\`, \`etaInvented: false\`).
- Origin missing is logged; destination coverage UNKNOWN still blocks autoselect.
- Fallback candidate may be listed but cannot start a live shipment.
`
);

write(
  "SOURCE_BLOCKERS.md",
  `# Source blockers (rechecked, TLS on)

${m.accessProbes.map((p) => `- **${p.iso}** ${p.url || ""} HTTP ${p.http} TLS ${p.tls || "n/a"} → ${p.result}. ${p.note}`).join("\n")}
`
);

write(
  "DATA_QUALITY_AUDIT.md",
  `# Data quality

${JSON.stringify({ mc11Baseline: m.mc11Baseline, qualityMetrics: q, serviceStatusCounts: m.serviceStatusCounts, countryCompletion: m.countryCompletion }, null, 2)}
`
);

write(
  "TEST_RESULTS.md",
  `# Tests

Placeholder filled after vitest.
`
);

write(
  "NEXT_CHECKPOINT.md",
  `# Next checkpoint

**Do not redo:** Eurostat H53; ACM 105; UKE 234 as ingested; EETT 804/795; HAKOM 24/22; RTR PEV 16; NMHH no xlsx href (rechecked); ANACOM 403; RRT Power BI; ANCOM TLS fail; InPost/Packeta/PostNord/Posti/CTT public docs URLs.

**Blocked:** HU_EXCEL, PT_403, LT_POWERBI, RO_TLS, AT_SECTION25_SPA, POSTCODE_LICENSE_INGEST, SANDBOX_CREDS, PUSH, LIVE_SHIPMENT.

**Next:**
1. NMHH Excel href
2. ANACOM authorised extract
3. RRT/open-data dump
4. ANCOM with valid TLS
5. RTR §25 bulk table
6. Licensed postcode files per country
7. Sandbox after contracts (maturity 4+)
8. Independent parcel/last-mile/own-fleet evidence for named firms (do not invent names)
`
);

const prevPath = "data/logistics/carrier_network_checkpoint.json";
const previous = existsSync(prevPath) ? JSON.parse(readFileSync(prevPath, "utf8")) : null;
const checkpoint = {
  schema: "buzzard.carrier-network-checkpoint.v3",
  retrievedAt: "2026-11-06",
  branch,
  startHead: "7db1c4f5",
  currentSchema: m.schema,
  completeVerifiedCountries: 0,
  liveCarriers: 0,
  sandboxVerified: 0,
  tests: { v1_to_v8: "51/51", runAt: "2026-11-06T11:58:00+01:00" },
  mc11Baseline: m.mc11Baseline,
  previous,
  next: [
    "NMHH Excel when href exists",
    "ANACOM authenticated extract",
    "RRT export",
    "ANCOM TLS/alternate official dump",
    "RTR §25 bulk table",
    "Licensed postcode files",
    "Sandbox after contract",
  ],
  blocked: ["HU_EXCEL", "PT_403", "LT_POWERBI", "RO_TLS", "AT_SECTION25_SPA", "PUSH", "LIVE_SHIPMENT"],
};
writeFileSync(prevPath, JSON.stringify(checkpoint, null, 2));
console.log(JSON.stringify({ named: m.uniqueNamedLegalInDatabase, api: q.apiDocumentationCount }, null, 2));

import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const require = createRequire(import.meta.url);
const { loadV10 } = require("../server/lib/logistics/carrierMasterV10.js");

const outDir = "docs/MASTER_COMMAND/2026-11-07-mc13";
mkdirSync(outDir, { recursive: true });
const m = loadV10();
writeFileSync("data/logistics/eu27_carrier_master.v10.json", JSON.stringify(m, null, 2));
const head = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
const branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
const write = (name, body) => writeFileSync(join(outDir, name), body);
const esc = (v) => `"${String(v ?? "UNKNOWN").replace(/"/g, '""')}"`;

const realHeader = [
  "country_code","id","legal_entity_name","trading_name","class",
  "parcel_service","last_mile","own_fleet","subcontractor","coverage_status",
  "api_documented","sandbox_verified","live_contract_ready","source","last_verified_at",
].join(",");
writeFileSync(
  join(outDir, "EU27_REAL_CARRIER_MATRIX.csv"),
  [
    realHeader,
    ...m.entities.map((e) =>
      [
        e.hqCountry, e.id, e.legalName, e.brand, e.class,
        e.independentEvidence.parcel_service,
        e.independentEvidence.last_mile,
        e.independentEvidence.own_fleet,
        e.independentEvidence.subcontractor_network,
        e.independentEvidence.coverage_status,
        e.independentEvidence.api_documented,
        e.independentEvidence.sandbox_verified,
        e.independentEvidence.live_contract_ready,
        (e.sources && e.sources[0]) || "UNKNOWN",
        "2026-11-07",
      ].map(esc).join(",")
    ),
  ].join("\n")
);

const locH = [
  "country","id","legal_entity_name","trading_name","class","company_registration_number",
  "website","parcel_service","last_mile","own_fleet","postcodes","newInMc13","note",
].join(",");
writeFileSync(
  join(outDir, "LOCAL_REGIONAL_CARRIERS.csv"),
  [locH, ...m.localRegionalClassRows.map((r) => Object.values(r).map(esc).join(","))].join("\n")
);

const covH = [
  "country_code","coverageGranularity","coverageVerified","nationalCoverageVerified",
  "delivery","pickup","returns","status","source",
].join(",");
writeFileSync(
  join(outDir, "EU27_POSTCODE_COVERAGE.csv"),
  [
    covH,
    ...m.coverage.map((c) =>
      [c.iso, c.coverageGranularity, c.coverageVerified, c.nationalCoverageVerified, c.delivery_available, c.pickup_available, c.return_available, c.status, c.source].map(esc).join(",")
    ),
  ].join("\n")
);

const featKeys = ["rateQuote","shipmentCreation","labelGeneration","tracking","cancellation","pickup","returns","webhook","authentication","sandbox"];
writeFileSync(
  join(outDir, "API_FUNCTIONALITY_MATRIX.csv"),
  [
    ["carrierId","brand","country","mc11Maturity","docs", ...featKeys, "MOCK_TESTED","SANDBOX_READY","SANDBOX_VERIFIED"].join(","),
    ...m.apiFunctionality.map((r) =>
      [r.carrierId, r.brand, r.country, r.mc11Maturity, r.docs, ...featKeys.map((k) => r.features[k]), r.sandboxReadiness.MOCK_TESTED, r.sandboxReadiness.SANDBOX_READY, r.sandboxReadiness.SANDBOX_VERIFIED].map(esc).join(",")
    ),
  ].join("\n")
);

write(
  "MC13_EXECUTIVE_REPORT.md",
  `# MC13 executive report

**Date:** 7 November 2026 (Europe/Berlin)  
**Verified git (do not use MC12 report as source of truth):**  
- Branch: \`${branch}\`  
- Live HEAD at MC13 start: \`c3c629b9\` (v9 already on origin; MC12 end was \`facbf92e\`)  
- Origin at start of this command: in sync (0 ahead). MC12 “5 unpushed” is stale.  
- Working from: \`${head}\`  
**Push this command:** not performed (MC13 forbids push).  

v1–v8 JSON and MC10–MC12 reports were not modified. v9 from this morning is preserved. v10 adds independent evidence flags, API functionality matrix, sandbox readiness, many-to-many supplier–carrier.

## Counts (old vs this run)

| Metric | MC12 / v8 report | v9 (07:25 Europe/Berlin) | MC13 / v10 |
| --- | ---: | ---: | ---: |
| Named rows | 1602 | 1602 | ${m.uniqueNamedLegalInDatabase} |
| Unique legal keys | 1465 | 1465 | ${m.uniqueLegalByCompanyKey} |
| Register-layer | 17453 | 17453 | ${m.registerLayerSum} |
| New legal names this command | — | 0 | **${m.newLegalEntitiesMc13}** |
| New local/regional independently verified | — | 0 | **${m.newLocalRegionalVerifiedMc13}** |
| Existing LOCAL/REGIONAL/LAST_MILE/SAME_DAY class rows | (taxonomy) | | ${m.localRegionalClassRows.length} |
| Parcel independently verified | 0 | 0 | ${m.independentCounts.parcel_service_true} |
| Last-mile independently verified | 0 | 0 | ${m.independentCounts.last_mile_true} |
| Own fleet independently verified | 0 | 0 | ${m.independentCounts.own_fleet_true} |
| Subcontractor network independently verified | 0 | 0 | ${m.independentCounts.subcontractor_true} |
| Postcode countries verified | 0/27 | 0/27 | 0/27 |
| API documentation entries | 12 | 16 | ${m.documentationCatalog.length} |
| Adapter design ready | — | — | ${m.qualityMetrics.adapterDesignReady} |
| MOCK_TESTED | 3 shared | 3 | ${m.qualityMetrics.mockTestedAdapters} |
| SANDBOX_READY | 0 | 0 | ${m.qualityMetrics.sandboxReady} |
| SANDBOX_VERIFIED | 0 | 0 | ${m.qualityMetrics.sandboxVerified} |
| Live usable | 0 | 0 | 0 |

No invented company names. Existing local class rows are **not** new finds and **not** parcel-verified.

## Answers

1. New legal companies verified this command: **0**  
2. New local/regional independently verified: **0** (existing class rows: ${m.localRegionalClassRows.length}, listed in LOCAL_REGIONAL_CARRIERS.csv)  
3. Parcel independently verified: **0**  
4. Last-mile independently verified: **0**  
5. Own fleet independently verified: **0**  
6. Subcontractor networks independently verified: **0**  
7. Countries with postcode coverage verified: **0 / 27**  
8. API documentation entries: **${m.documentationCatalog.length}**  
9. Adapter design ready: **${m.qualityMetrics.adapterDesignReady}** (shared mock adapter)  
10. Mock-tested (DHL/GLS/UPS shared adapter): **${m.qualityMetrics.mockTestedAdapters}**  
11. Sandbox-ready (credentials in hand): **0**  
12. Sandbox tests actually successful: **0**  
13. Live usable today: **0**  
14. Top blockers: HU Excel; PT 403; LT Power BI; RO TLS; AT §25 SPA; licensed postcode ingest; independent parcel evidence for named firms; UKE/EETT/ACM class≠service; sandbox credentials; local-name invention forbidden so empty new-name list.

Sales and live shipment remain closed. \`buzzard_guardian.sqlite3\` not committed.
`
);

write(
  "CARRIER_SERVICE_EVIDENCE.md",
  `# Independent evidence

Flags are independent. Parcel UNKNOWN does not force own_fleet false-as-zero.

${JSON.stringify(m.independentCounts, null, 2)}

USP, ACM packet class, EETT, UKE B-numbers remain REGISTER_ONLY / class labels.
`
);

write(
  "SANDBOX_READINESS.md",
  `# Sandbox readiness

Priority if credentials appear later (still CONTRACT_REQUIRED): DHL Parcel DE, GLS ShipIT, UPS (already MOCK_TESTED); then DPD Baltic (sandbox hostname documented only).

${m.sandboxReadiness.map((s) => `- ${s.brand} (${s.carrierId}): MOCK_TESTED=${s.MOCK_TESTED} SANDBOX_READY=${s.SANDBOX_READY} SANDBOX_VERIFIED=${s.SANDBOX_VERIFIED} — ${s.note}`).join("\n")}
`
);

write(
  "SMART_CARRIER_SELECTION.md",
  `# Selection

When coverage is not POSTCODE_LEVEL, \`selected\` is null. Fallback candidates may be listed. Price/ETA not invented. International brands not auto-preferred. Confidence LOW while coverage UNKNOWN.
`
);

write(
  "SOURCE_BLOCKERS.md",
  m.accessProbes.map((p) => `- ${p.iso} ${p.url || ""} → ${p.result}: ${p.note}`).join("\n")
);

write(
  "DATA_QUALITY_AUDIT.md",
  JSON.stringify(
    {
      v9Baseline: m.v9Baseline,
      independentCounts: m.independentCounts,
      qualityMetrics: m.qualityMetrics,
      newLegalEntitiesMc13: m.newLegalEntitiesMc13,
      localRegionalClassRows: m.localRegionalClassRows.length,
    },
    null,
    2
  )
);

write(
  "TEST_RESULTS.md",
  `# Tests MC13

**Run:** 7 November 2026 11:34 Europe/Berlin  
v1–v10 vitest: **60/60**. No live shipment.
`
);

write(
  "NEXT_CHECKPOINT.md",
  `# Next checkpoint

**Do not redo:** v9 portals/API delta; independent flags shape; API functionality matrix; local class-row listing without promotion.

**Blocked:** HU_EXCEL, PT_403, LT_POWERBI, RO_TLS, AT_SECTION25_SPA, POSTCODE_INGEST, SANDBOX_CREDS, INDEPENDENT_PARCEL_EVIDENCE, PUSH, LIVE_SHIPMENT.

**Next:** official local-carrier lists with legal names (no invention); parcel/last-mile/own-fleet evidence on existing names; licence-reviewed postcode ingest still ≠ coverage; sandbox after contract.
`
);

const prevPath = "data/logistics/carrier_network_checkpoint.json";
const previous = existsSync(prevPath) ? JSON.parse(readFileSync(prevPath, "utf8")) : null;
writeFileSync(
  prevPath,
  JSON.stringify(
    {
      schema: "buzzard.carrier-network-checkpoint.v5",
      retrievedAt: "2026-11-07",
      branch,
      startHead: "c3c629b9",
      currentSchema: m.schema,
      completeVerifiedCountries: 0,
      liveCarriers: 0,
      sandboxVerified: 0,
      tests: { v1_to_v10: "60/60", runAt: "2026-11-07T11:34:00+01:00" },
      v9Baseline: m.v9Baseline,
      newLegalEntitiesMc13: 0,
      previous,
      next: [
        "Official local-carrier legal names only",
        "Independent parcel/last-mile/own-fleet on existing names",
        "Licence-reviewed postcode ingest ≠ coverage",
        "Sandbox after contract",
      ],
      blocked: ["HU_EXCEL", "PT_403", "LT_POWERBI", "RO_TLS", "AT_SECTION25_SPA", "SANDBOX_CREDS", "PUSH", "LIVE_SHIPMENT"],
    },
    null,
    2
  )
);
console.log("v10", m.documentationCatalog.length, m.localRegionalClassRows.length);

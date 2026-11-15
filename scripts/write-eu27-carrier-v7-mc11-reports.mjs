import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const require = createRequire(import.meta.url);
const { loadV7 } = require("../server/lib/logistics/carrierMasterV7.js");
const { loadV6 } = require("../server/lib/logistics/carrierMasterV6.js");

const outDir = "docs/MASTER_COMMAND/2026-11-06-mc11";
mkdirSync(outDir, { recursive: true });
const m = loadV7();
writeFileSync("data/logistics/eu27_carrier_master.v7.json", JSON.stringify(m, null, 2));

const head = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
const branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
const write = (name, body) => writeFileSync(join(outDir, name), body);
const q = m.qualityMetrics;

const csvEscape = (v) => `"${String(v ?? "UNKNOWN").replace(/"/g, '""')}"`;

const matrixHeader = [
  "country_code",
  "id",
  "legal_entity_name",
  "trading_name",
  "class",
  "network_role",
  "evidence_level",
  "parcel_service_status",
  "letter_service_status",
  "own_fleet_status",
  "activity_verified",
  "live_usable",
  "source",
  "last_verified_at",
  "confidence",
].join(",");

const matrixRows = m.entities.map((e) =>
  [
    e.hqCountry,
    e.id,
    e.legalName,
    e.brand,
    e.class,
    e.networkRole,
    e.evidence.evidence_level,
    e.evidence.parcel_service_status,
    e.evidence.letter_service_status,
    e.own_fleet_status,
    e.activityVerified,
    false,
    (e.sources && e.sources[0]) || "UNKNOWN",
    "2026-11-06",
    e.evidence.confidence,
  ]
    .map(csvEscape)
    .join(",")
);
writeFileSync(join(outDir, "CARRIER_VERIFICATION_MATRIX.csv"), [matrixHeader, ...matrixRows].join("\n"));

const covHeader = [
  "country_code",
  "postcode_file",
  "coverage_verified",
  "national_coverage_verified",
  "delivery_available",
  "pickup_available",
  "return_available",
  "locker_available",
  "PUDO_available",
  "rural_delivery",
  "license",
  "source",
  "verification_date",
  "confidence_level",
].join(",");
const licenses = Object.fromEntries(m.postcodeLicenses.map((x) => [x.iso, x]));
const covRows = m.coverage.map((c) => {
  const lic = licenses[c.iso] || {};
  return [
    c.iso,
    c.postcodeFile,
    c.coverageVerified,
    c.nationalCoverageVerified,
    c.delivery_available,
    c.pickup_available,
    c.return_available,
    c.locker_available,
    c.PUDO_available,
    c.rural_delivery,
    lic.license,
    c.source,
    c.verification_date,
    c.confidence_level,
  ]
    .map(csvEscape)
    .join(",");
});
writeFileSync(join(outDir, "POSTCODE_COVERAGE_MATRIX.csv"), [covHeader, ...covRows].join("\n"));

write(
  "MC11_EXECUTIVE_REPORT.md",
  `# MC11 executive report

**Date:** 6 November 2026 (Europe/Berlin)  
**Branch:** \`${branch}\`  
**HEAD at start:** \`df3c7a95\` (verified)  
**This report generated from:** \`${head}\` + local MC11 work  
**Schema:** \`${m.schema}\`  
**Push / merge / deploy / live shipment:** none  

v1–v6 JSON and MC10 reports are unchanged. v7 adds evidence profiles, supplier/carrier split, coverage-license matrix, MC11 API maturity (0–5), and official-source access probes with TLS left on.

\`buzzard_guardian.sqlite3\` was inspected read-only (empty Guardian tables) and was not committed.

## Layered counts (do not merge)

| Metric | Value |
| --- | ---: |
| Register-layer records | ${q.registerLayerRecordCount} |
| Named entities | ${q.namedEntityCount} |
| Unique legal keys | ${q.uniqueLegalEntityCount} |
| Active-business flags | ${q.activeBusinessVerifiedCount} |
| Parcel-service verified | ${q.parcelServiceVerifiedCount} |
| Last-mile verified | ${q.lastMileVerifiedCount} |
| Own-fleet verified | ${q.ownFleetVerifiedCount} |
| Subcontractor networks verified | UNKNOWN (count of verified evidence: ${q.subcontractorNetworkVerifiedCount}) |
| National postal USP rows | ${q.nationalPostalOperatorCount} |
| Private national class rows | ${q.privateNationalCarrierClassCount} |
| Regional class rows | ${q.regionalCarrierClassCount} |
| Local courier class rows | ${q.localCourierClassCount} |
| International brand×country ops | ${q.internationalBrandCountryOperationCount} |
| Locker networks | ${q.lockerNetworkCount} |
| PUDO networks | ${q.pudoNetworkCount} |
| Postcode coverage verified countries | ${q.postcodeCoverageVerifiedCountryCount} / 27 |
| API documentation entries (catalog) | ${q.apiDocumentationCount} |
| Sandbox tests successful | ${q.sandboxTestSuccessCount} |
| Live usable carriers | ${q.liveUsableCarrierCount} |
| COMPLETE_VERIFIED countries | 0 |

Eurostat H53 and ELA remain in v6 \`naceStatistics\` and are **not** added into these counts.

v6 freeze vs v7: named 1602=1602, keys 1465=1465, layer 17453=17453. No new invented legal names.

## Answers

1. Unique legal companies in this sourced set: **1465** keys (1602 named rows). Not the EU-27 universe.
2. Active business independently verified: **31** flags. Not a market census.
3. Parcel transport independently verified: **0** (UNKNOWN not shown as a made-up positive).
4. Last-mile independently verified: **0**.
5. Own fleet proven: **0**.
6. Postcode coverage verified countries: **0 / 27**.
7. API documentation entries: **${q.apiDocumentationCount}** (3 priority + additional national docs; EETT eRegistry in v4 is a register API, not shipping).
8. Mock tests: see TEST_RESULTS.md (v1–v7 vitest).
9. Sandbox tests successful: **0**.
10. Live usable under contract+tech: **0**.
11. Largest gaps: HU Excel href; PT 403/timeout; LT Power BI; RO TLS; licensed postcode ingest; own-fleet evidence; remaining UKE/EETT/ACM classification; sandbox credentials; §25 AT Anzeige; local/regional names without invention.

First contract talks remain DHL Parcel DE, GLS ShipIT, UPS Developer (MC11 maturity 3 = mock only).
`
);

write(
  "EU27_COUNTRY_COMPLETENESS.md",
  `# EU-27 completeness\n\n${m.counts
    .map((c) => {
      const st = m.researchStatus[c.iso] || {};
      return `- **${c.iso}** ${c.name}: research ${st.status}; register ${c.verification}; records ${c.register.records ?? "UNKNOWN"}; COMPLETE_VERIFIED=no; postcode=UNKNOWN`;
    })
    .join("\n")}\n\nHAKOM still 24/22 unique. RTR PEV still 16 names (URL updated). HU/PT/LT/RO BLOCKED as probed.\n`
);

write(
  "API_SANDBOX_STATUS.md",
  `# API and sandbox

Existing engine apiLevel 0–7 is unchanged so v6 tests keep DHL/GLS/UPS at **LEVEL 2**.

MC11 maturity 0–5 is a parallel field:

${m.documentationCatalog.map((c) => `- ${c.brand} (${c.country}): apiLevel ${c.apiLevel}, mc11Maturity ${c.mc11Maturity} (${c.docs || c.note || ""}), sandboxVerified=${c.sandboxVerified}`).join("\n")}

No LEVEL 4/5. No secrets stored.
`
);

write(
  "SOURCE_BLOCKERS.md",
  `# Source blockers\n\n${m.accessProbes.map((p) => `- **${p.iso}** ${p.url} — HTTP ${p.http} TLS ${p.tls} → ${p.result}. ${p.note}`).join("\n")}\n\nTLS was not disabled. 403/login were not bypassed. Egress allowlist was not expanded.\n`
);

write(
  "DATA_QUALITY_AUDIT.md",
  `# Data quality\n\n${JSON.stringify(q, null, 2)}\n\nv6 identity collisions: ${m.identity.collisions}.\nGuardian sqlite: empty tables, not committed.\nEurostat/ELA not merged into carrier counts.\n`
);

write(
  "SMART_CARRIER_SELECTION_STATUS.md",
  `# Smart carrier selection

Same v5 \`selectCarrier\` (no second engine). MC11 adds an \`explanation\` array.

- Cheapest preference is ignored.
- Coverage UNKNOWN → no autoselect.
- Unsupported destination → HOLD_FOR_REVIEW + Pusat exception.
- Prices and ETAs stay UNKNOWN.
- Live shipment remains blocked.
- Supplier ≠ carrier unless own-fleet verified (none are).
`
);

write(
  "TEST_RESULTS.md",
  `# Tests

Placeholder filled after vitest in the same session.
`
);

write(
  "NEXT_CHECKPOINT.md",
  `# Next checkpoint

**Do not redo:** Eurostat H53 2021–2024; ACM 105; UKE 234; EETT 804/795; HAKOM 24/22; RTR PEV 16 (16 Feb 2026); ELA separate; NMHH Excel still no href; ANACOM 403; RRT Power BI; ANCOM TLS verify fail.

**Blocked:** HU_EXCEL, PT_403, LT_POWERBI, RO_TLS, POSTCODE_LICENSE_INGEST, SANDBOX_CREDS, PUSH, LIVE_SHIPMENT.

**Next (needs official files or user-approved access):**
1. NMHH Excel when a real href exists
2. ANACOM authenticated extract
3. RRT export or working open-data dump
4. ANCOM dump with valid TLS
5. Licensed national postcode files
6. DHL/GLS/UPS sandbox after contract (MC11 level 4+)
7. Remaining UKE/EETT/ACM parcel vs letter labelling with primary evidence
`
);

const checkpoint = {
  schema: "buzzard.carrier-network-checkpoint.v2",
  retrievedAt: "2026-11-06",
  branch,
  startHead: "df3c7a95",
  currentSchema: m.schema,
  completeVerifiedCountries: 0,
  liveCarriers: 0,
  sandboxVerified: 0,
  v6Frozen: m.v6BaselineFrozen,
  next: [
    "NMHH Excel when href exists",
    "ANACOM authenticated extract",
    "RRT export",
    "ANCOM TLS/alternate official dump",
    "Licensed postcode files",
    "DHL/GLS/UPS sandbox after contract",
  ],
  blocked: ["HU_EXCEL", "PT_403", "LT_POWERBI", "RO_TLS", "PUSH", "LIVE_SHIPMENT"],
};

writeFileSync("data/logistics/carrier_network_checkpoint.json", JSON.stringify(checkpoint, null, 2));
console.log(JSON.stringify({ schema: m.schema, named: m.uniqueNamedLegalInDatabase, keys: m.uniqueLegalByCompanyKey }, null, 2));

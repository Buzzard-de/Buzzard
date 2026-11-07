import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const require = createRequire(import.meta.url);
const { loadV9 } = require("../server/lib/logistics/carrierMasterV9.js");

const outDir = "docs/MASTER_COMMAND/2026-11-07-continuation";
mkdirSync(outDir, { recursive: true });
const m = loadV9();
writeFileSync("data/logistics/eu27_carrier_master.v9.json", JSON.stringify(m, null, 2));
const head = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
const branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
const write = (name, body) => writeFileSync(join(outDir, name), body);
const q = m.qualityMetrics;

write(
  "EXECUTIVE_REPORT.md",
  `# Continuation 2026-11-07 (Europe/Berlin)

**Start HEAD:** \`facbf92e\` (MC12 v8, verified)  
**Working from:** \`${head}\`  
**Branch:** \`${branch}\`  
**Schema:** \`${m.schema}\`  
**Sales / live shipment / sandbox e2e:** closed  

v1–v8 JSON and MC10–MC12 reports unchanged.

| Metric | MC12 frozen | This run |
| --- | ---: | ---: |
| Named rows | 1602 | ${m.uniqueNamedLegalInDatabase} |
| Unique legal keys | 1465 | ${m.uniqueLegalByCompanyKey} |
| Register-layer | 17453 | ${m.registerLayerSum} |
| Active-business flags | 31 | ${m.activityVerifiedCount} |
| Parcel independently verified | 0 | ${q.parcelServiceVerifiedCount} |
| Last-mile / own-fleet verified | 0 / 0 | ${m.namedFirmReview.lastMileVerified} / ${m.namedFirmReview.ownFleetVerified} |
| Postcode coverage countries | 0/27 | 0/27 |
| API documentation entries | 12 | ${q.apiDocumentationCount} (+${q.apiDocumentationDeltaFromMc12} docs only) |
| Sandbox tests | 0 | 0 |
| Live usable | 0 | 0 |

Added official docs (maturity 1): DPD eSolutions, DPD Baltic REST (sandbox hostname documented, **not** tested), Austrian Post Group developer, FAN Courier selfAWB PDF.

Postcode portals documented (not ingested, not carrier coverage): Eurostat GISCO CC-BY-SA-4.0; RTR AT PLZ; FR data.gouv codes postaux; DE GovData OSM-derived listing; NL BAG/PDOK note.

HU Excel href still absent (sha16 \`99d7bafe9497d404\`).

**Answers:** unique legal 1465; active flags 31; parcel 0; last-mile 0; own fleet 0; subcontractor 0; postcode countries 0/27; API docs ${q.apiDocumentationCount}; mock tests see TEST_RESULTS; sandbox 0; live 0; COMPLETE_VERIFIED 0; blocked HU/PT/LT/RO.
`
);

write(
  "POSTCODE_PORTALS.md",
  `# Postcode portals (not coverage)

${JSON.stringify(m.postcodePortals, null, 2)}
`
);

write(
  "API_DOCS_DELTA.md",
  `# API docs

MC12: 12. Now: ${m.documentationCatalog.length}.

${m.documentationCatalog.map((c) => `- ${c.brand} ${c.country} maturity ${c.mc11Maturity} sandboxVerified=${c.sandboxVerified} ${c.docs}`).join("\n")}
`
);

write(
  "NAMED_FIRM_REVIEW.md",
  `# Named-firm review (existing rows only)

${JSON.stringify(m.namedFirmReview, null, 2)}

USP 27 rows remain designation, not nationwide parcel last-mile proof.
PRIVATE_PARCEL/EXPRESS class rows (${m.namedFirmReview.privateParcelOrExpressClassRows}) are taxonomy labels.
`
);

write(
  "SOURCE_BLOCKERS.md",
  `${m.accessProbes.map((p) => `- ${p.iso} ${p.url || ""} → ${p.result}: ${p.note}`).join("\n")}
`
);

write(
  "TEST_RESULTS.md",
  `# Tests 2026-11-07 11:25 Europe/Berlin

v1–v9 vitest: **55/55** (v9 added 4). No live shipment.
`
);

write(
  "NEXT_CHECKPOINT.md",
  `# Next checkpoint

**Do not redo:** MC12 freeze; GISCO/RTR/FR/DE/NL portal URLs recorded; DPD/Austrian Post/FAN docs; HU still no xlsx href 2026-11-07.

**Still blocked:** HU_EXCEL, PT_403, LT_POWERBI, RO_TLS, AT_SECTION25_SPA, POSTCODE_FILE_INGEST (licence/share-alike not completed), SANDBOX_CREDS, LIVE_SHIPMENT.

**Next:**
1. NMHH Excel when a real href exists
2. ANACOM authorised extract
3. RRT export
4. ANCOM valid TLS dump
5. RTR §25 bulk table (SPA)
6. Licence-reviewed ingest of AT PLZ / GISCO if legal review allows — still not carrier coverage
7. Sandbox e2e after contracts (DPD Baltic URL is documentation only)
8. Independent parcel/last-mile/own-fleet evidence for existing named firms only
`
);

const prevPath = "data/logistics/carrier_network_checkpoint.json";
const previous = existsSync(prevPath) ? JSON.parse(readFileSync(prevPath, "utf8")) : null;
writeFileSync(
  prevPath,
  JSON.stringify(
    {
      schema: "buzzard.carrier-network-checkpoint.v4",
      retrievedAt: "2026-11-07",
      branch,
      startHead: "facbf92e",
      currentSchema: m.schema,
      completeVerifiedCountries: 0,
      liveCarriers: 0,
      sandboxVerified: 0,
      tests: { v1_to_v9: "55/55", runAt: "2026-11-07T11:25:00+01:00" },
      mc12Baseline: m.mc12Baseline,
      previous,
      next: [
        "NMHH Excel href",
        "ANACOM extract",
        "RRT export",
        "ANCOM TLS dump",
        "RTR §25 bulk",
        "Licence-reviewed postcode ingest (not coverage)",
        "Sandbox after contract",
        "Parcel/last-mile evidence on existing names only",
      ],
      blocked: ["HU_EXCEL", "PT_403", "LT_POWERBI", "RO_TLS", "AT_SECTION25_SPA", "SANDBOX_CREDS", "LIVE_SHIPMENT"],
    },
    null,
    2
  )
);
console.log("ok", m.schema, q.apiDocumentationCount);

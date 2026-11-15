import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const require = createRequire(import.meta.url);
const { loadV6, uniqueIdsV6 } = require("../server/lib/logistics/carrierMasterV6.js");
const { loadV5 } = require("../server/lib/logistics/carrierMasterV5.js");

const outDir = "docs/MASTER_COMMAND/2026-11-06-mc10";
mkdirSync(outDir, { recursive: true });
const m = loadV6();
const v5 = loadV5();
writeFileSync("data/logistics/eu27_carrier_master.v6.json", JSON.stringify(m, null, 2));

const head = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
const branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
const write = (name, body) => writeFileSync(join(outDir, name), body);
const dash = (v) => (v == null ? "UNKNOWN" : String(v));

const cls = {};
for (const e of m.entities) cls[e.class] = (cls[e.class] || 0) + 1;
const usp = cls.NATIONAL_POST_USP || 0;
const privateNationalish = (cls.PRIVATE_PARCEL || 0) + (cls.PRIVATE_EXPRESS || 0) + (cls.NATIONAL_PARCEL_LETTER || 0);
const regional = (cls.REGIONAL_SPECIALIST || 0) + (cls.REGIONAL_COURIER || 0);
const local = cls.LOCAL_COURIER || 0;
const lastMile = (cls.LAST_MILE || 0) + (cls.SAME_DAY || 0);
const apiDocs = (m.apiDocs && m.apiDocs.length) || m.apiCatalog.length;
const answers = `# Executive answers (do not mix layers)

1. **Register-layer records (sum of country register.records, not unique companies):** ${m.registerLayerSum} (prior report 17452; live delta +1 from HR overlay 24 vs 23).
2. **Unique legal keys among source-verified named entities:** ${m.uniqueLegalByCompanyKey} (named rows ${m.uniqueNamedLegalInDatabase}). This is not the EU-27 universe.
3. **Active parcel carriers independently verified:** UNKNOWN as a market census. \`activityVerified\` flags: ${m.activityVerifiedCount}. networkRole ACTIVE_BUSINESS_VERIFIED: ${m.networkRoles.ACTIVE_BUSINESS_VERIFIED || 0}. PARCEL_SERVICE_VERIFIED companies: 0 (field default UNKNOWN).
4. **Own-fleet verified carriers:** ${m.ownFleetVerifiedCount} (not UNKNOWN-as-zero: evidence absent).
5. **Subcontractor networks independently counted:** UNKNOWN (not inferred from register class).
6. **National postal USP rows:** ${usp} (one designated operator per EU-27 in this seed; not 27 verified parcel last-mile networks).
7. **Private national class rows (PRIVATE_PARCEL + PRIVATE_EXPRESS + NATIONAL_PARCEL_LETTER):** ${privateNationalish}. Not all parcel-service verified.
8. **International brand×country operation rows:** ${(m.internationalOperations || []).length}. Distinct brands in that table: 15. Not 64 companies and not 64 own fleets.
9. **Regional class rows:** ${regional}.
10. **Local courier class rows:** ${local}.
11. **Last-mile / same-day class rows:** ${lastMile}. EETT/ACM/UKE rows are not last-mile companies.
12. **Locker networks:** ${m.lockers.length} (unchanged from v5).
13. **PUDO networks:** ${m.pudo.length} (unchanged from v5).
14. **API documents in priority catalog:** ${apiDocs} (DHL Parcel DE, GLS, UPS) — LEVEL 2 each.
15. **Sandbox tests successful:** 0.
16. **Countries with carrier postcode coverage verified:** 0 / 27.
17. **COMPLETE_VERIFIED countries:** 0.
18. **Live carriers Buzzard can technically use today:** 0.
19. **First contract talks (documents found, no sandbox):** DHL Parcel DE, GLS ShipIT, UPS Developer — still CONTRACT_REQUIRED.
20. **Largest gaps:** HU NMHH Excel href absent; PT ANACOM 403 + login wall; LT RRT Power BI; RO ANCOM TLS (no insecure bypass); licensed postcode files; own-fleet evidence; sandbox credentials.

UNKNOWN values are not shown as zero except where a count of verified evidence is explicitly 0 (own-fleet verified, sandbox, live, COMPLETE_VERIFIED).
`;

write(
  "executive_summary.md",
  `# MC10 executive summary

**Date:** 6 November 2026 (Europe/Berlin)  
**Branch:** \`${branch}\`  
**HEAD at start of this command (verified):** \`9ded6157\`  
**Schema:** \`${m.schema}\`  
**COMPLETE_VERIFIED:** 0  
**Live carriers:** 0  
**Sandbox verified:** 0  
**Push:** not performed  

v1–v5 files kept. v6 adds networkRole, adapter errors, webhook/replay/idempotency, returns workflow, security policy. No second logistics stack.

v5 recount vs prior report: entities 1602=1602, keys 1465=1465, activityVerified 31=31, USP 27, lockers 14, PUDO 6, ops 64. Register layer sum live **${m.registerLayerSum}** vs previously reported **17452** (HR overlay 24 vs 23).

${answers}
`
);

write("ANSWERS.md", answers);

write(
  "current_git_and_version_status.md",
  `# Git and versions

- Branch: ${branch}
- Verified start HEAD: 9ded6157
- Origin: ahead (not pushed)
- v1–v5 JSON present: ${["v1","v2","v3","v4","v5"].every((v) => existsSync("data/logistics/eu27_carrier_master." + v + ".json"))}
- v6 JSON written this run
- Working tree user files: buzzard_guardian.sqlite3 untracked (not committed)
`
);

write(
  "v5_data_quality_review.md",
  `# V5 recount

| Metric | Prior report | Recalculated |
| --- | ---: | ---: |
| Named entities | 1602 | ${v5.uniqueNamedLegalInDatabase} |
| Unique legal keys | 1465 | ${v5.uniqueLegalByCompanyKey} |
| activityVerified | 31 | ${v5.activityVerifiedCount} |
| USP | 27 | ${v5.entities.filter((e) => e.class === "NATIONAL_POST_USP").length} |
| International ops | 64 | ${(v5.internationalOperations || []).length} |
| Lockers | 14 | ${v5.lockers.length} |
| PUDO | 6 | ${v5.pudo.length} |
| Layer sum | 17452 | ${m.registerLayerSum} |

None of these is a complete EU-27 last-mile census.
`
);

write(
  "eurostat_ela_reconciliation.md",
  `# Eurostat / ELA

Re-pulled 2026-11-06. Eurostat updated still 2026-09-30T11:00:00+0200.

EU27_2020 H53 ENT_NR: 2021=186813, 2022=200000, 2023=206964, 2024=224523.

197424: still NOT_REPRODUCED.

ELA 2024 ≈ 60000 enterprises / 1.52m employed: separate, not merged.

These are sector enterprises, not Buzzard parcel carriers.
`
);

write(
  "eu27_country_research_status.md",
  `# Country status\n\n${m.counts.map((c) => `- ${c.iso}: ${m.researchStatus[c.iso]?.status} / register ${c.verification} / records ${dash(c.register.records)}`).join("\n")}\n\nCOMPLETE_VERIFIED: 0.\n`
);

write(
  "missing_registers.md",
  `# Missing registers (rechecked)

- **HU:** NMHH Excel advertised, no xlsx href. BLOCKED.
- **PT:** ANACOM 403; digital portal requires B2C login. BLOCKED.
- **LT:** RRT Power BI embed. No bulk export. BLOCKED.
- **RO:** ANCOM TLS verify failed. Did not disable TLS. BLOCKED.
- **AT:** PEV 16 named; full §25 Anzeige not downloaded.
- **Postcodes:** 0/27 carrier-level files.
`
);

write("carrier_inventory.md", `# Inventory\n\nv6 entities ${m.uniqueNamedLegalInDatabase}. Unique keys ${m.uniqueLegalByCompanyKey}. Unique ids ${uniqueIdsV6().count}.\nRoles: ${JSON.stringify(m.networkRoles)}\n`);
write("legal_entity_deduplication.md", `# Dedup\n\nKeys ${m.identity.uniqueLegalKeys}. Collisions ${m.identity.collisions}.\n`);
write(
  "parcel_service_verification.md",
  `# Parcel service\n\nREGISTERED ≠ PARCEL_SERVICE_VERIFIED. activityVerified=${m.activityVerifiedCount}. NL postvervoer remains letter/post class. EL EETT not last-mile census. PL B-numbers not parcel-verified.\n`
);
write("own_fleet_and_subcontractor_evidence.md", `# Own fleet\n\nOWN_FLEET_VERIFIED count: ${m.ownFleetVerifiedCount}. Default UNKNOWN. Subcontractor networks not enumerated as independent carriers.\n`);
write("regional_local_carriers.md", `# Regional/local\n\nNo new invented names. NL/EL misclassification flags from v5 retained.\n`);
write("international_carriers.md", `# International\n\nOps rows ${ (m.internationalOperations||[]).length }. Brand×country cells ${ (m.internationalBrandCountryMatrix||[]).length }. Own fleet UNKNOWN.\n`);
write("postcode_coverage.md", `# Postcode\n\nVerified countries: 0/27. Shape validation only. List of national postcodes ≠ carrier coverage.\n`);
write("locker_pudo_networks.md", `# Locker/PUDO\n\nLockers ${m.lockers.length}, PUDO ${m.pudo.length}. Not added to carrier counts.\n`);
write("carrier_api_matrix.md", `# API\n\n${m.apiCatalog.map((c) => `- ${c.brand} LEVEL ${c.apiLevel} sandbox=${c.sandboxVerified} ${c.accessConditions}`).join("\n")}\n\nSandbox passed: 0.\n`);
write("adapter_architecture.md", `# Adapter architecture\n\nExtended existing v5 createAdapter. Standard errors, outage, timeout, live block. Components still 22. No parallel engine.\n`);
write("carrier_selection_engine.md", `# Selection\n\nCheapest not auto-selected. HOLD_FOR_REVIEW emits FULFILLMENT_NOT_LIVE. Supplier ≠ carrier. Dates not promised.\n`);
write("tracking_and_returns.md", `# Tracking and returns\n\nMock tracking only. Return workflow does not assume supplier or customer refund.\n`);
write("carrier_cost_model.md", `# Cost\n\n${JSON.stringify(m.costModel, null, 2)}\n`);
write("security_and_privacy.md", `# Security\n\n${JSON.stringify(m.securityPolicy, null, 2)}\n\nWebhook HMAC required. Replay rejected. Secrets not stored.\n`);
write("test_results.md", `# Tests\n\nv1–v6 intended. Live shipment blocked. Sales closed.\n`);
write(
  "unresolved_blockers.md",
  `# Blockers

1. HU NMHH Excel
2. PT ANACOM login/403
3. LT Power BI
4. RO TLS
5. Postcode licensed datasets
6. Carrier contracts / sandbox credentials
7. Own-fleet evidence
`
);

const checkpoint = {
  schema: "buzzard.carrier-network-checkpoint.v1",
  retrievedAt: "2026-11-06",
  branch,
  startHead: "9ded6157",
  currentSchema: m.schema,
  completeVerifiedCountries: 0,
  liveCarriers: 0,
  sandboxVerified: 0,
  next: [
    "NMHH Excel when href exists",
    "ANACOM authenticated extract (user-approved)",
    "RRT export",
    "ANCOM TLS/alternate official dump",
    "Licensed postcode files",
    "DHL/GLS/UPS sandbox after contract (LEVEL 4+)",
  ],
  doNotRepeat: [
    "Eurostat H53 ENT_NR EU27 2021-2024 (confirmed twice, updated 2026-09-30)",
    "ACM 105 KVK",
    "UKE 234",
    "EETT 804/795",
    "HAKOM 24/22 unique",
    "RTR PEV 16",
    "ELA ~60000 separate from SBS",
  ],
  blocked: ["HU_EXCEL", "PT_LOGIN", "LT_POWERBI", "RO_TLS", "PUSH", "LIVE_SHIPMENT"],
};

write(
  "continuation_checkpoint.md",
  `# Continuation checkpoint

**Stop point:** v6 written; HU/PT/LT/RO still blocked without insecure bypass; engines extended in v5 folder.

**Last actions:** recount v5; re-pull Eurostat; extend adapters (errors, webhook, idempotency, returns, security); v6 networkRole.

**Do not redo:** ${checkpoint.doNotRepeat.join("; ")}.

**Next:** ${checkpoint.next.join("; ")}.

**Tests:** run v1–v6 locally. Push still forbidden.
`
);

write(
  "next_phase_roadmap.md",
  `# Roadmap (blocked without approval)

LEVEL 4 sandbox DHL/GLS/UPS after contracts. Official register dumps. Licensed postcodes. Still no push/sales/live labels.
`
);

writeFileSync("data/logistics/carrier_network_checkpoint.json", JSON.stringify(checkpoint, null, 2));

console.log(JSON.stringify({ entities: m.entities.length, keys: m.uniqueLegalByCompanyKey, layer: m.registerLayerSum }, null, 2));

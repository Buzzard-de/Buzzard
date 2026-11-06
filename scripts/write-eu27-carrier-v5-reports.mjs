import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { loadV5, uniqueIdsV5 } = require("../server/lib/logistics/carrierMasterV5.js");
const { load } = require("../server/lib/logistics/carrierMaster.js");
const { loadV4 } = require("../server/lib/logistics/carrierMasterV4.js");

const TR = {
  DE: "Almanya", FR: "Fransa", IT: "İtalya", ES: "İspanya", NL: "Hollanda", BE: "Belçika", AT: "Avusturya",
  PL: "Polonya", CZ: "Çekya", SK: "Slovakya", HU: "Macaristan", RO: "Romanya", BG: "Bulgaristan", EL: "Yunanistan",
  PT: "Portekiz", IE: "İrlanda", DK: "Danimarka", SE: "İsveç", FI: "Finlandiya", EE: "Estonya", LV: "Letonya",
  LT: "Litvanya", LU: "Lüksemburg", MT: "Malta", CY: "Kıbrıs", SI: "Slovenya", HR: "Hırvatistan",
};

const outDir = "docs/MASTER_COMMAND/2026-11-06-mc9";
mkdirSync(outDir, { recursive: true });
mkdirSync("data/logistics/countries", { recursive: true });
mkdirSync("data/logistics/coverage", { recursive: true });
mkdirSync("data/logistics/lockers", { recursive: true });
mkdirSync("data/logistics/api_catalog", { recursive: true });
mkdirSync("data/logistics/contracts", { recursive: true });
mkdirSync("data/logistics/performance", { recursive: true });
mkdirSync("data/logistics/carriers", { recursive: true });

const m = loadV5();
writeFileSync("data/logistics/eu27_carrier_master.v5.json", JSON.stringify(m, null, 2));
writeFileSync("data/logistics/api_catalog/priority_adapters.v5.json", JSON.stringify(m.apiCatalog, null, 2));
writeFileSync("data/logistics/coverage/eu27_postcode_status.v5.json", JSON.stringify(m.coverage, null, 2));
writeFileSync("data/logistics/lockers/networks.v5.json", JSON.stringify({ lockers: m.lockers, pudo: m.pudo }, null, 2));
writeFileSync("data/logistics/contracts/registry.v5.json", JSON.stringify({ contracts: [], status: "NONE", live: false }, null, 2));
writeFileSync("data/logistics/performance/metrics.v5.json", JSON.stringify(m.performanceModel, null, 2));

const dash = (v) => (v == null ? "UNKNOWN" : String(v));
const write = (name, body) => writeFileSync(join(outDir, name), body);

for (const c of m.counts) {
  const named = m.entities.filter((e) => e.hqCountry === c.iso && (e.reliability === "SOURCE_VERIFIED" || String(e.reliability).startsWith("VERIFIED")));
  const rec = {
    iso: c.iso,
    nra: c.nra,
    register: c.register,
    verification: c.verification,
    researchStatus: m.researchStatus[c.iso],
    completeVerified: false,
    namedCount: named.length,
    postcodeCoverage: "UNKNOWN",
  };
  writeFileSync(join("data/logistics/countries", `${c.iso}.v5.json`), JSON.stringify(rec, null, 2));
}

const answers = {
  postalOperatorsNamedUsp: 27,
  uniqueLegalKeys: m.uniqueLegalByCompanyKey,
  activityVerified: m.activityVerifiedCount,
  nationalPost: 27,
  privateNationalHeuristic: m.entities.filter((e) => /PRIVATE_PARCEL|ACM_PAKKET|PEV_REPORTER/.test(e.class) && e.reliability !== "RESEARCH_CANDIDATE").length,
  internationalOps: (m.internationalOperations || []).length,
  internationalBrandCountryUnknownOrNamed: (m.internationalBrandCountryMatrix || []).length,
  regionalLocalHeuristic: "NOT_A_VERIFIED_COUNT",
  lastMileVerified: m.activityVerifiedCount,
  lockerNetworks: (m.lockers || []).length,
  pudoNetworks: (m.pudo || []).length,
  apiDocumented: (m.apiCatalog || []).length,
  sandboxPassed: 0,
  postcodeCountriesVerified: 0,
  missingRegisters: ["HU", "PT", "LT", "RO"],
  technicallyUsableLive: 0,
};

write(
  "executive_summary.md",
  `# MC9 executive summary

**Date:** 6 November 2026 (Europe/Berlin)  
**Branch:** \`cursor/ab27-carrier-inventory-c293\`  
**Start HEAD:** \`8c2415ea\`  
**Schema:** \`${m.schema}\`  
**COMPLETE_VERIFIED countries:** 0  
**Live usable carriers:** 0  
**Sales / live shipment:** false  
**Push:** not performed  

v1–v4 files exist: ${["v1", "v2", "v3", "v4"].every((v) => existsSync("data/logistics/eu27_carrier_master." + v + ".json"))}

Named DB rows: ${m.uniqueNamedLegalInDatabase}  
Unique legal keys: ${m.uniqueLegalByCompanyKey}  
activityVerified: ${m.activityVerifiedCount}  
USP rows: 27  

Eurostat H53 ENT_NR EU27_2020 (API 2026-09-30): 2021=${m.naceStatistics.eurostatSbs.eu27["2021"]}, 2022=${m.naceStatistics.eurostatSbs.eu27["2022"]}, 2023=${m.naceStatistics.eurostatSbs.eu27["2023"]}, 2024=${m.naceStatistics.eurostatSbs.eu27["2024"]}.  
**197424 was not reproduced** in this pull.  
ELA 2024 ≈ 60 000 enterprises is a separate labour-market figure. **Not merged.**

Postcode coverage verified: 0/27. API sandbox verified: 0. Austria 138 unused.
`
);

write(
  "source_methodology.md",
  `# Source methodology

- Register row ≠ company ≠ last-mile fleet.
- Brand ≠ legal entity.
- Eurostat SBS H53 ENT_NR counts enterprises in postal *and* courier NACE, including micro-firms and letter activities.
- ELA ~60 000 (2024) is approximate labour analysis. Different method from SBS 224 523 (2024).
- Historical 197 424: NOT_REPRODUCED against Eurostat API updated 2026-09-30.
- activityVerified is a strict flag (31 in v4; v5 may add HR/AT names without flipping the flag unless sourced as active).
- Own fleet defaults UNKNOWN.
- No live credentials in reports.
`
);

const table = [
  "| ISO | Ülke | Sicil | Unique legal | Verification | Research status | Postcode |",
  "| --- | --- | ---: | ---: | --- | --- | --- |",
  ...m.counts.map((c) => `| ${c.iso} | ${TR[c.iso]} | ${dash(c.register.records)} | ${dash(c.register.uniqueLegal)} | ${c.verification} | ${m.researchStatus[c.iso].status} | UNKNOWN |`),
].join("\n");

write("eu27_country_comparison.md", `# Country comparison\n\n${table}\n`);
write("carrier_master_inventory.md", `# Inventory\n\nEntities ${m.uniqueNamedLegalInDatabase}. Unique keys ${m.uniqueLegalByCompanyKey}. Unique ids ${uniqueIdsV5().count}.\n`);
write("legal_entity_deduplication.md", `# Dedup\n\nKeys: ${m.identity.uniqueLegalKeys}. Collisions recorded: ${m.identity.collisions}. Country+number, else VAT, else name.\n`);
write(
  "national_postal_operators.md",
  `# National postal operators\n\n${m.entities.filter((e) => e.class === "NATIONAL_POST_USP").map((e) => `- ${e.hqCountry}: ${e.legalName}`).join("\n")}\n\nParcel last-mile for each USP: UNKNOWN unless separately verified.\n`
);
write("private_national_carriers.md", `# Private national\n\nHeuristic class only. Not a census.\n`);
write(
  "international_carriers.md",
  `# International brands × 27\n\nMatrix rows: ${(m.internationalBrandCountryMatrix || []).length}. Named local entity ≠ own fleet.\nOps rows from registers: ${(m.internationalOperations || []).length}.\n`
);
write(
  "regional_local_carriers.md",
  `# Regional/local\n\nNL ACM postvervoer (${m.derivedClassifications.nlAcmPostRegisterClass}) is **not** counted as regional parcel. EL EETT ${m.derivedClassifications.elEettRows} licences; likely natural-person heuristic ${m.derivedClassifications.elLikelyNaturalPersonHeuristic}. Not last-mile verified.\n`
);
write("last_mile_carriers.md", `# Last mile\n\nactivityVerified count: ${m.activityVerifiedCount}. Not EU-27 complete.\n`);
write(
  "locker_pudo_networks.md",
  `# Locker/PUDO\n\nLockers: ${m.lockers.length}. PUDO: ${m.pudo.length}. Not added to carrier totals. LV national 1869 SOURCE_VERIFIED; LP 440 exact; other LV shares SHARE_ONLY. HU Q1 2026 NMHH table separate from operator Excel.\n`
);
write("postal_code_coverage.md", `# Postcode coverage\n\nVerified countries: 0/27. Shape validation exists; service availability UNKNOWN. No official files ingested; licenses UNKNOWN.\n`);
write(
  "api_integration_matrix.md",
  `# API matrix\n\n${m.apiCatalog.map((c) => `- ${c.brand} LEVEL ${c.apiLevel} ${c.apiType} sandbox=${c.sandboxVerified} live=${c.liveVerified}`).join("\n")}\n\nLEVEL 4–7 not reached. Secrets not stored.\n`
);
write("carrier_data_quality.md", `# Data quality\n\nCOMPLETE_VERIFIED=0. Own fleet UNKNOWN unless proven. 197424 unused. DE 7183 Stammnr ≠ companies.\n`);
write("missing_registers.md", `# Missing\n\n- HU NMHH Excel (no href)\n- PT ANACOM unique postal (403)\n- LT RRT Power BI (no export)\n- RO ANCOM TLS failed this environment\n- AT full §25 Anzeige\n- Postcode files all 27\n`);
write(
  "country_research_status.md",
  `# Research status\n\n${m.counts.map((c) => `- ${c.iso}: ${m.researchStatus[c.iso].status}`).join("\n")}\n`
);
write(
  "carrier_integration_architecture.md",
  `# Architecture\n\nComponents (${m.integrationEngine.components.length}):\n\n${m.integrationEngine.components.map((c) => `- ${c.name}: ${c.status}`).join("\n")}\n\nAll mock. Live shipment disabled.\n`
);
write(
  "carrier_selection_engine.md",
  `# Selection\n\nDoes not auto-pick cheapest. Fallback exists among documented adapters. Coverage UNKNOWN → no customer date. Unsupported destination → HOLD_FOR_REVIEW. Supplier ≠ carrier.\n`
);
write("carrier_cost_model.md", `# Cost model\n\nAll fee fields UNKNOWN. Estimates are not live prices.\n\n${JSON.stringify(m.costModel, null, 2)}\n`);
write(
  "unresolved_questions.md",
  `# Unresolved\n\n1. What was the exact Eurostat vintage of 197424?\n2. NMHH Excel URL?\n3. LT Power BI export method without credentials?\n4. ANACOM postal-only unique count?\n5. Official postcode-to-carrier files and licences?\n6. Own-fleet evidence per affiliate?\n`
);
write(
  "test_results.md",
  `# Tests\n\nv1–v5 suites intended. Unique ids: ${uniqueIdsV5().unique}. Live blocked. Sales closed.\n`
);
write(
  "next_phase_roadmap.md",
  `# Next (blocked without user approval)\n\n1. Contracts for DHL Parcel DE, GLS, UPS sandbox (LEVEL 4)\n2. NMHH Excel / ANACOM / RRT exports\n3. Licensed postcode datasets\n4. Still no push/deploy/sales/live labels unless explicitly approved\n`
);

write(
  "ANSWERS.md",
  `# Twenty answers (sourced; not a last-mile census)

1. **Postal operators (USP designated in this DB):** 27 (UPU/v1 layer). Source: v1 USP table. Not 27 proven parcel last-mile networks.
2. **Unique legal keys in v5 SOURCE_VERIFIED/VERIFIED:** ${answers.uniqueLegalKeys}. Source: country+company number/name. Not EU-27 universe.
3. **activityVerified parcel/courier flags:** ${answers.activityVerified}. Not “all active parcel carriers in EU-27”.
4. **National postal operators:** 27 USP rows.
5. **Private national:** heuristic class count ${answers.privateNationalHeuristic} — **not verified census**.
6. **International:** ${answers.internationalOps} named local ops rows; ${answers.internationalBrandCountryUnknownOrNamed} brand×country cells (mostly UNKNOWN).
7. **Regional:** not a verified count. NL postvervoer is not regional parcel.
8. **Local couriers:** not a verified count. EL EETT includes likely natural persons.
9. **Last-mile verified:** ${answers.lastMileVerified} activityVerified rows only.
10. **Locker networks:** ${answers.lockerNetworks}; PUDO: ${answers.pudoNetworks}. Separate from carriers.
11. **API docs (shipping):** ${answers.apiDocumented} (DHL Parcel DE, GLS, UPS) LEVEL 2.
12. **Sandbox passed:** ${answers.sandboxPassed}.
13. **Postcode coverage verified:** ${answers.postcodeCountriesVerified}/27.
14. **Registers still incomplete:** ${answers.missingRegisters.join(", ")} plus AT Anzeige, postcodes.
15. **Technically usable live carriers for Buzzard:** ${answers.technicallyUsableLive}.
16. **Countries with enough alternative carriers:** UNKNOWN (coverage unverified).
17. **Local integration needed:** all 27 after contracts; priority DE then documented APIs.
18. **Largest gaps:** postcodes; HU/PT/LT/RO bulk registers; own-fleet evidence; sandbox.
19. **First contract talks (not started):** DHL Parcel DE, GLS, UPS.
20. **Own last-mile network need:** UNKNOWN; cannot be decided without coverage and contracted capacity.

v1 uniqueVerifiedLegal remains ${load().uniqueVerifiedLegal}. v4 named rows were ${loadV4().uniqueNamedLegalInDatabase}.
`
);

console.log(JSON.stringify({ entities: m.entities.length, keys: m.uniqueLegalByCompanyKey, schema: m.schema }, null, 2));

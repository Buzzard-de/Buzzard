import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { loadV3, sourceVerified } = require("../server/lib/logistics/carrierMasterV3.js");

const TR = {
  DE: "Almanya",
  FR: "Fransa",
  IT: "İtalya",
  ES: "İspanya",
  NL: "Hollanda",
  BE: "Belçika",
  AT: "Avusturya",
  PL: "Polonya",
  CZ: "Çekya",
  SK: "Slovakya",
  HU: "Macaristan",
  RO: "Romanya",
  BG: "Bulgaristan",
  EL: "Yunanistan",
  PT: "Portekiz",
  IE: "İrlanda",
  DK: "Danimarka",
  SE: "İsveç",
  FI: "Finlandiya",
  EE: "Estonya",
  LV: "Letonya",
  LT: "Litvanya",
  LU: "Lüksemburg",
  MT: "Malta",
  CY: "Kıbrıs",
  SI: "Slovenya",
  HR: "Hırvatistan",
};

const outDir = "docs/MASTER_COMMAND/2026-11-05-mc4/logistics-v3";
mkdirSync(outDir, { recursive: true });
const m = loadV3();
writeFileSync("data/logistics/eu27_carrier_master.v3.json", JSON.stringify(m, null, 2));

const dash = (v) => (v == null ? "—" : String(v));
const write = (name, body) => writeFileSync(join(outDir, name), body);

function extras(iso) {
  return m.entities.filter((e) => e.hqCountry === iso);
}

function table() {
  const lines = [
    "| Ülke | Sicil kaydı | Benzersiz şirket | Aktif taşıyıcı | Özel ulusal | Uluslararası | Bölgesel/yerel | Locker/PUDO |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];
  for (const c of m.counts) {
    const xs = extras(c.iso);
    const named = xs.filter((e) => e.reliability === "SOURCE_VERIFIED" || String(e.reliability).startsWith("VERIFIED"));
    const active = xs.filter((e) => e.activityVerified);
    const priv = named.filter((e) => /PRIVATE|UPS_LICENCE|POSTAL_REGISTER|AUTHORISED/.test(e.class));
    const intl = named.filter((e) => /DHL|UPS|FedEx|GLS|DPD|Amazon|InPost|Packeta/i.test(`${e.brand} ${e.legalName}`));
    const loc = named.filter((e) => /LOCAL|REGIONAL|LETTER_|CORRESPONDENCE|PEV_|INDIVIDUAL|SUBSTITUTABLE/.test(e.class));
    const lock = named.filter((e) => e.class === "PUDO_LOCKER");
    lines.push(
      `| ${TR[c.iso]} | ${dash(c.register.records)} | ${dash(c.register.uniqueLegal)} | ${active.length} | ${priv.length} | ${intl.length} | ${loc.length} | ${lock.length} |`
    );
  }
  const known = m.counts.filter((c) => c.register.records != null).reduce((a, c) => a + c.register.records, 0);
  lines.push(
    `| AB-27 | ${known} (katman toplamı; tekil değil) | ${m.uniqueSourceVerified} (DB adlı SOURCE_VERIFIED/VERIFIED; sicil toplamı değil) | activityVerified ayrı | aday ayrı | aday ayrı | aday ayrı | locker ayrı |`
  );
  return lines.join("\n");
}

const named = sourceVerified(m.entities);
const locker = m.entities.filter((e) => e.class === "PUDO_LOCKER");
const intl = m.entities.filter((e) => /PRIVATE_EXPRESS|PRIVATE_PARCEL/.test(e.class) && /DHL|UPS|FedEx|GLS|DPD|TNT|Hermes|Amazon|Aramex/i.test(e.brand));
const local = m.entities.filter((e) => /LOCAL|REGIONAL|SAME_DAY/.test(e.class));
const usp = m.entities.filter((e) => e.class === "NATIONAL_POST_USP");

const csv =
  "iso,tr,register,unique_legal,verification,source\n" +
  m.counts.map((c) => [c.iso, TR[c.iso], dash(c.register.records), dash(c.register.uniqueLegal), c.verification, c.register.source || ""].join(",")).join("\n") +
  "\n";
write("EU27_COUNTRY_CARRIER_COUNTS.csv", csv);
write(
  "EU27_CARRIER_FULL_LEGAL_NAMES.csv",
  "id,legalName,brand,iso,class,reliability\n" +
    named.map((e) => [e.id, JSON.stringify(e.legalName), JSON.stringify(e.brand), e.hqCountry, e.class, e.reliability].join(",")).join("\n") +
    "\n"
);

write("EU27_ALL_CARRIERS_MASTER_REGISTER.md", `# All carriers master v3\n\nSchema \`${m.schema}\`. v1 43 preserved. COMPLETE_VERIFIED=0.\n\n${table()}\n`);
write("EU27_CARRIER_FULL_LEGAL_NAMES.md", `# Full legal names\n\n${named.map((e) => `- ${e.legalName} (\`${e.id}\`, ${e.hqCountry}, ${e.reliability})`).join("\n")}\n`);
write("EU27_COUNTRY_CARRIER_COUNTS.md", `# Country counts\n\n${table()}\n`);
write("EU27_NATIONAL_POSTAL_OPERATORS.md", `# National postal operators\n\n${usp.map((e) => `- ${e.hqCountry}: ${e.legalName} / ${e.brand}`).join("\n")}\n`);
write("EU27_INTERNATIONAL_CARRIERS.md", `# International carriers\n\nNamed international-looking rows (brand heuristic, not 27-country own-fleet proof):\n\n${intl.map((e) => `- ${e.brand} / ${e.legalName} / ${e.hqCountry} / ${e.reliability}`).join("\n")}\n`);
write(
  "EU27_PRIVATE_NATIONAL_CARRIERS.md",
  `# Private national\n\n${m.entities
    .filter((e) => /PRIVATE|UPS_LICENCE|AUTHORISED/.test(e.class) && e.reliability !== "RESEARCH_CANDIDATE")
    .map((e) => `- ${e.legalName} (${e.hqCountry})`)
    .join("\n")}\n`
);
write("EU27_REGIONAL_COURIER_COMPANIES.md", `# Regional\n\n${local.map((e) => `- ${e.brand} / ${e.legalName} / ${e.hqCountry} / ${e.reliability}`).join("\n")}\n`);
write("EU27_LOCAL_DELIVERY_COMPANIES.md", `# Local delivery\n\nSame as regional/local class plus RESEARCH_CANDIDATE city examples. Not activity-verified.\n`);
write(
  "EU27_EXPRESS_COURIERS.md",
  `# Express\n\n${m.entities
    .filter((e) => /EXPRESS|SAME_DAY/.test(e.class))
    .map((e) => `- ${e.brand} (${e.hqCountry}) ${e.reliability}`)
    .join("\n")}\n`
);
write("EU27_LOCKER_NETWORKS.md", `# Locker networks\n\nNot counted as carriers.\n\n${locker.map((e) => `- ${e.brand} / ${e.legalName} / ${e.reliability}`).join("\n")}\n`);
write("EU27_PUDO_NETWORKS.md", `# PUDO networks\n\nSame locker/PUDO class. Network ≠ carrier.\n`);
write(
  "EU27_COUNTRY_COVERAGE_MATRIX.md",
  `# Coverage\n\nOwn-fleet vs partner remains UNKNOWN unless a register stated a region.\n\n| id | iso | mode |\n| --- | --- | --- |\n${m.entities
    .filter((e) => e.hqCountry && e.hqCountry !== "NOT_VERIFIED")
    .map((e) => `| ${e.id} | ${e.hqCountry} | ${e.coverageMode || "UNKNOWN"} |`)
    .join("\n")}\n`
);
write(
  "EU27_CARRIER_API_MATRIX.md",
  `# API\n\n| Brand | status | contract | sandbox | live |\n| --- | --- | --- | --- | --- |\n${m.apiDocs.map((r) => `| ${r.brand} | ${r.apiStatus} | ${r.contractRequired} | ${r.sandboxVerified} | ${r.liveVerified} |`).join("\n")}\n`
);
write("EU27_UNIQUE_LEGAL_ENTITY_AUDIT.md", `# Unique legal\n\nv1: ${m.uniqueV1VerifiedPreserved}\nv3 named verified: ${m.uniqueSourceVerified}\nDo not add DE 7183 + ES 4734 + IT 3722 + BG 218.\n`);
write("EU27_DUPLICATE_AUDIT.md", `# Duplicates\n\nCountry affiliates keep separate legal ids. Brand collisions expected (GLS DE/DK/SK/SI, DHL local companies).\n`);
write("EU27_SOURCE_VERIFICATION_REPORT.md", `# Sources\n\n${m.sources.map((s) => `- ${s.id}: ${s.title} — ${s.url}`).join("\n")}\n`);
write(
  "EU27_MISSING_DATA_REPORT.md",
  `# Missing\n\n- HU NMHH Excel not imported\n- EL EETT bulk not extracted\n- EE/LV/LT registers referenced, counts missing (LT fetch 500)\n- NL ACM mixed CSV, PL UKE search, PT ANACOM mixed\n- AT full Anzeige; 138 not found in fetched 2024 report\n- HR names not listed\n- Postal-code coverage UNKNOWN\n- API sandbox credentials BLOCKED\n`
);
write(
  "BUZZARD_LOGISTICS_INTEGRATION_ROADMAP.md",
  `# Roadmap\n\n0 Research DB (this commit)\n1 BLOCKED: contracts + sandbox DHL/GLS/UPS\n2 One USP\n3 PUDO after locker split\nNo live label without user approval.\n`
);
write(
  "BUZZARD_LOGISTICS_TEST_REPORT.md",
  `# Tests\n\nv1 + v2 + v3 suites. Synthetic only.\n`
);
write(
  "BUZZARD_LOGISTICS_ACCEPTANCE_REPORT.md",
  `# Acceptance v3

**Date:** 5 November 2026 (Europe/Berlin)  
**Branch:** \`cursor/ab27-carrier-inventory-c293\`  
**COMPLETE_VERIFIED:** 0  
**Push/sales/live:** no  
**v1/v2 files kept.**

${table()}

## Thirteen answers

1. Named rows in v3 DB: ${m.entities.length} (${m.uniqueSourceVerified} SOURCE_VERIFIED/VERIFIED, ${m.candidates} candidates). Register-layer sum of known countries is not unique companies.
2. Unique named verified legal in DB: ${m.uniqueSourceVerified}. v1 43 preserved.
3. National posts: 27 (UPU 15 Feb 2025).
4. Private national: country register named rows; not a completed EU census.
5. International brands: docs for DHL/UPS/GLS only. Country presence is affiliate-row based, not 27-country own-fleet.
6. Regional/local: letter/correspondence/PEV/AKOS local classes + RESEARCH_CANDIDATE examples.
7. Locker/PUDO named rows: ${locker.length}. Separate table.
8. Largest official layers: DE Stammnr 7183, ES inscriptions 4734, IT sequential 3722, BG 218 registered / 87 active-in-year. Those are not ranked last-mile quality.
9. Coverage gap: postal-code UNKNOWN in all 27. EE/LV/LT/HU/EL/NL/PL/PT bulk still incomplete.
10. API-ready only after contract: DHL Parcel DE, UPS, GLS ShipIT — OFFICIAL_API_DOCUMENTED.
11. Contract required: all of the above. SANDBOX_VERIFIED false.
12. First order after contracts: DHL Parcel DE, GLS, UPS, one USP.
13. Still unverified: Austria 138, most local example names, parcel markets outside letter registers, live rates.

Austria 138: ${m.austria138.status}.
`
);

console.log(JSON.stringify({ entities: m.entities.length, verified: m.uniqueSourceVerified, candidates: m.candidates }, null, 2));

import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const { loadV2, brandCompanySplit, sourceVerified } = require("../server/lib/logistics/carrierMasterV2.js");

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

const outDir = "docs/MASTER_COMMAND/2026-11-05-mc4/logistics-v2";
mkdirSync(outDir, { recursive: true });
mkdirSync("data/logistics", { recursive: true });

const m = loadV2();
writeFileSync("data/logistics/eu27_carrier_master.v2.json", JSON.stringify(m, null, 2));

function dash(v) {
  return v == null ? "—" : String(v);
}

function write(name, body) {
  const p = join(outDir, name);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, body);
}

const named = sourceVerified(m.entities);
const candidates = m.entities.filter((e) => e.reliability === "RESEARCH_CANDIDATE");
const usp = m.entities.filter((e) => e.class === "NATIONAL_POST_USP");
const locker = m.entities.filter((e) => e.class === "PUDO_LOCKER");
const letterish = m.entities.filter((e) =>
  ["LETTER_NOTIFICATION", "CORRESPONDENCE_AUTHORISATION", "LETTER_PERMIT", "INDIVIDUAL_LICENCE"].includes(e.class)
);
const privateVerified = named.filter((e) => !["NATIONAL_POST_USP", ...letterish.map((x) => x.class)].includes(e.class));
const activity = m.entities.filter((e) => e.activityVerified);
const knownReg = m.counts.filter((c) => c.register.records != null);
const unknownReg = m.counts.filter((c) => c.register.records == null);
const collisions = brandCompanySplit(m.entities);

const csvHeader =
  "iso,tr,en,register_records,unique_legal,active_carrier,national_post,private_or_other_named,regional_local_named,locker_pudo,verification,source\n";
const csvRows = m.counts
  .map((c) => {
    const extra = m.entities.filter((e) => e.hqCountry === c.iso);
    const namedHere = extra.filter((e) => e.reliability === "SOURCE_VERIFIED" || String(e.reliability).startsWith("VERIFIED"));
    const loc = extra.filter((e) => /REGIONAL|LOCAL|LETTER_|CORRESPONDENCE|PEV_|INDIVIDUAL/.test(e.class));
    const lock = extra.filter((e) => e.class === "PUDO_LOCKER");
    const priv = extra.filter((e) => /PRIVATE|LAST_MILE|FREIGHT|PEV_/.test(e.class));
    return [
      c.iso,
      TR[c.iso],
      c.name,
      dash(c.register.records),
      dash(c.register.uniqueLegal),
      extra.filter((e) => e.activityVerified).length,
      1,
      priv.length,
      loc.length,
      lock.length,
      c.verification,
      c.register.source || "",
    ].join(",");
  })
  .join("\n");
write("EU27_POSTAL_PROVIDER_COUNTS.csv", csvHeader + csvRows + "\n");
write("EU27_ACTIVE_CARRIER_COUNTS.csv", csvHeader + csvRows + "\n");

function tableMd() {
  const lines = [
    "| Ülke | Sicil kayıtları | Benzersiz tüzel | Aktif taşıyıcı | Ulusal posta | Özel / diğer adlı | Bölgesel/yerel adlı | Locker/PUDO adlı | Doğrulama |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
  ];
  for (const c of m.counts) {
    const extra = m.entities.filter((e) => e.hqCountry === c.iso);
    const loc = extra.filter((e) => /REGIONAL|LOCAL|LETTER_|CORRESPONDENCE|PEV_|INDIVIDUAL/.test(e.class));
    const lock = extra.filter((e) => e.class === "PUDO_LOCKER");
    const priv = extra.filter((e) => /PRIVATE|LAST_MILE|FREIGHT|PEV_/.test(e.class));
    lines.push(
      `| ${TR[c.iso]} | ${dash(c.register.records)} | ${dash(c.register.uniqueLegal)} | ${extra.filter((e) => e.activityVerified).length} | 1 | ${priv.length} | ${loc.length} | ${lock.length} | ${c.verification} |`
    );
  }
  lines.push(
    `| AB-27 | ${knownReg.reduce((a, c) => a + c.register.records, 0)} (yalnızca sayımı bilinen ülkeler; tekil değil) | ${m.uniqueSourceVerified} (veritabanı adlı kayıt; sicil toplamı değil) | ${activity.length} (yalnızca activityVerified) | 27 | aday ayrı | aday ayrı | ${locker.length} adlı satır | COMPLETE_VERIFIED yok |`
  );
  return lines.join("\n");
}

write(
  "EU27_CARRIER_MASTER_REGISTER_V2.md",
  `# EU-27 carrier master register v2

**Date:** 5 November 2026 (Europe/Berlin)  
**Schema:** \`${m.schema}\`  
**Previous schema:** \`${m.previousSchema}\`  
**v1 verified legal preserved:** ${m.previousVerifiedLegalCount} (not an EU-27 population)  
**Named SOURCE_VERIFIED + VERIFIED_* rows in v2 DB:** ${m.uniqueSourceVerified}  
**Research candidates:** ${m.candidates}  
**Sales / live shipment:** false

${m.notes.map((n) => `- ${n}`).join("\n")}

${tableMd()}
`
);

write(
  "EU27_OFFICIAL_REGULATOR_REGISTER.md",
  `# Official regulator register

| ISO | NRA | Register status | Count method | Source |
| --- | --- | --- | --- | --- |
${m.counts.map((c) => `| ${c.iso} | ${c.nra} | ${c.register.status} | ${c.register.method} | ${c.register.source || "—"} |`).join("\n")}

## Notes
- DE 7,183 = unique Stammnummer on a fetched BNetzA listing. Landing published count blank. Not active companies.
- DK 18 = Trafikstyrelsen Tabel 3 permits (6 nationwide + 12 local).
- FI = Traficom letter-notification page August 2026 (${m.counts.find((c) => c.iso === "FI").register.records} names).
- FR = ARCEP correspondence authorisations 24 Jul 2026.
- SE = Trafikanalys 2025: 19 letter permits. PTS HTML name list is older.
- BE = IBPT individual licences 22 Dec 2025 (7, 1 inactive).
- ES = CNMC 2025 report: Section A 4,494 + Section B 240 at 31 Dec 2025.
- IT = last sequential number 3,722 on MIMIT Sep 2026 PDF; not deduplicated.
- AT = 16 PEV operators 16 Feb 2026; full Anzeige list not downloaded.
- RO/NL/PL/PT = register UI or mixed file exists; totals not extracted.
`
);

write("EU27_POSTAL_PROVIDER_COUNTS.md", `# Postal provider counts\n\n${tableMd()}\n`);
write(
  "EU27_ACTIVE_CARRIER_COUNTS.md",
  `# Active carrier counts

activityVerified is independent of SOURCE_VERIFIED.

Verified active in this snapshot: **${activity.length}** (Belgian individual licences marked active).  
No country is COMPLETE_VERIFIED. No LIVE_VERIFIED carrier.
`
);

write(
  "EU27_UNIQUE_LEGAL_ENTITY_REGISTER.md",
  `# Unique legal entity register

v1 VERIFIED_* rows: ${m.uniqueV1VerifiedPreserved}  
v2 SOURCE_VERIFIED + VERIFIED_* named rows: ${m.uniqueSourceVerified}  
Do not add ES 4,734 or IT 3,722 or DE 7,183 into this unique total.

${named.map((e) => `- \`${e.id}\` — ${e.legalName} / ${e.brand} / ${e.hqCountry} / ${e.reliability}`).join("\n")}
`
);

write(
  "EU27_PRIVATE_CARRIER_REGISTER.md",
  `# Private carrier register

Verified BNetzA / DK named private rows remain from v1.  
v2 private shortlist is RESEARCH_CANDIDATE unless a national register named the legal entity.

${m.entities
  .filter((e) => /PRIVATE|LAST_MILE|FREIGHT|EXPRESS/.test(e.class))
  .map((e) => `- ${e.brand} (${e.legalName}) — ${e.reliability} — ${e.hqCountry}`)
  .join("\n")}
`
);

write(
  "EU27_REGIONAL_LOCAL_CARRIER_REGISTER.md",
  `# Regional / local register

Letter and correspondence authorisations are not automatically parcel last-mile.

${letterish.map((e) => `- ${e.legalName} (${e.hqCountry}) — ${e.class}`).join("\n")}
`
);

write(
  "EU27_LOCKER_PUDO_NETWORK_REGISTER.md",
  `# Locker / PUDO

Locker operators are not added to carrier totals unless they also operate as carriers.

${locker.map((e) => `- ${e.brand} — ${e.reliability} — ${e.notes || ""}`).join("\n")}
`
);

write(
  "EU27_CARRIER_COVERAGE_MATRIX.md",
  `# Coverage matrix

Postal-code coverage is UNKNOWN except where a register states a region.

| id | country | coverage | mode |
| --- | --- | --- | --- |
${m.entities
  .filter((e) => e.hqCountry && e.hqCountry !== "NOT_VERIFIED")
  .map((e) => `| ${e.id} | ${e.hqCountry} | UNKNOWN | NOT_VERIFIED |`)
  .join("\n")}
`
);

write(
  "EU27_CARRIER_API_CAPABILITY_MATRIX.md",
  `# API capability matrix

Official docs ≠ sandbox access ≠ live integration.

| Brand | apiStatus | contractRequired | sandboxVerified | liveVerified | source |
| --- | --- | --- | --- | --- | --- |
${m.apiDocs.map((r) => `| ${r.brand} | ${r.apiStatus} | ${r.contractRequired} | ${r.sandboxVerified} | ${r.liveVerified} | ${r.source} |`).join("\n")}

All other entities: NOT_VERIFIED / CONTRACT_REQUIRED on USP sandbox field. apiDirectVerified = 0.
`
);

write(
  "EU27_DUPLICATE_AND_LEGAL_ENTITY_AUDIT.md",
  `# Duplicate and legal-entity audit

Brand collisions (same brand, multiple ids; expected for country affiliates and candidate rows):

${collisions.map(([b, ids]) => `- ${b}: ${ids.join(", ")}`).join("\n")}

Parent/affiliate: USP and local affiliate rows are separate legal ids when registers name them separately (example: usp-be vs fr-bpost).
`
);

write(
  "EU27_SOURCE_AND_VERIFICATION_AUDIT.md",
  `# Source and verification audit

Retrieved: ${m.retrievedAt}

${m.sources.map((s) => `- ${s.id} — ${s.title} — ${s.url}`).join("\n")}
`
);

write(
  "EU27_UNVERIFIED_AND_MISSING_DATA.md",
  `# Unverified and missing data

Countries without a retrieved official count (${unknownReg.length}): ${unknownReg.map((c) => c.iso).join(", ")}

Missing for every named row unless stated: VAT, company number (except DE/DK v1 rows), postal-code coverage, live API, sandbox credentials, damage rates, contracted prices.

BLOCKED without commercial contract: sandbox, labels, payments, production connect.
`
);

write(
  "BUZZARD_LOGISTICS_GAP_ANALYSIS.md",
  `# Gap analysis

1. 13 countries still OFFICIAL_REGISTER_UNAVAILABLE for a usable count.
2. NL/PL/PT/RO/AT full lists not imported.
3. Parcel last-mile outside letter registers is mostly RESEARCH_CANDIDATE.
4. API: docs only for DHL, UPS, GLS. No SANDBOX_VERIFIED.
5. Selection engine remains dry-run.
6. Pusat cannot start a live shipment.
`
);

write(
  "BUZZARD_LOGISTICS_INTEGRATION_ROADMAP.md",
  `# Integration roadmap

Phase 0 (this snapshot): research DB only.  
Phase 1 (blocked): commercial contracts + sandbox keys for DHL Parcel DE, UPS, GLS ShipIT, then one national post (DHL/Deutsche Post or PostNL or La Poste).  
Phase 2: InPost / Packeta / Mondial Relay PUDO after locker ≠ carrier split.  
Phase 3: regional last-mile only after coverage files exist.

No phase starts a live label without explicit user approval.
`
);

write(
  "BUZZARD_LOGISTICS_TEST_REPORT.md",
  `# Test report

Suite: \`server/__tests__/eu27CarrierMaster.test.mjs\` (v1 preserved)  
Suite: \`server/__tests__/eu27CarrierMasterV2.test.mjs\`

Synthetic only. No live label, payment, or production call.
`
);

write(
  "BUZZARD_LOGISTICS_ACCEPTANCE_REPORT_V2.md",
  `# Buzzard logistics acceptance v2

**Date:** 5 November 2026 (Europe/Berlin)  
**Branch:** \`cursor/ab27-carrier-inventory-c293\`  
**Does not delete v1 reports.**  
**COMPLETE_VERIFIED countries:** 0  
**LIVE_VERIFIED carriers:** 0  
**Push / merge / deploy / sales:** no

## Executive table

${tableMd()}

## Thirteen questions

1. **Registered postal operators found (named in DB, not register-sum):** ${m.uniqueSourceVerified} SOURCE_VERIFIED/VERIFIED rows. Country register records that were counted: DE 7183 Stammnr, DK 18 permits, FI ${m.counts.find((c) => c.iso === "FI").register.records} letter notifications, FR ${m.counts.find((c) => c.iso === "FR").register.records} ARCEP names, SE 19 permits, BE 7 licences, IE ComReg extract, ES 4734 inscriptions, IT 3722 sequential, AT 16 PEV. These layers must not be added together as unique companies.
2. **Unique legal entities verified in this DB:** ${m.uniqueSourceVerified}. v1 snapshot 43 is preserved and is not the EU-27 population.
3. **Active national/international carriers with activityVerified:** ${activity.length}. USP designations: ${usp.length} (UPU 15 Feb 2025). That is designation, not last-mile activity proof.
4. **Regional/local named rows:** ${letterish.length} letter/correspondence/licence classes. Not automatically parcel last-mile.
5. **Locker/PUDO named rows:** ${locker.length}. Not added to carrier totals.
6. **Registers examined in substance:** DE (partial listing), DK (table), FI (full letter page), FR (ARCEP page), SE (stat + older name list), BE (licence table), IE (search extract, HTTP 307 on direct fetch), ES (CNMC 2025 + ministry PDF), IT (MIMIT PDF), AT (PEV list only), RO (first page).
7. **Still incomplete:** HU, CZ, SK, BG, EL, EE, LV, LT, LU, MT, CY, SI, HR (no usable count). NL ACM CSV, PL UKE search, PT ANACOM mixed list, AT full Anzeige, RO full ANCOM, IE redirect.
8. **Official API docs:** DHL Parcel DE Shipping v2, UPS Shipping, GLS ShipIT REST — OFFICIAL_API_DOCUMENTED + CONTRACT_REQUIRED.
9. **Contract + sandbox required:** all of the above. SANDBOX_VERIFIED = false. LIVE_VERIFIED = false.
10. **First integration priority after contracts:** DHL Parcel DE, GLS, UPS, then one USP. Not letter-notification printers.
11. **Coverage gaps:** postal-code coverage UNKNOWN for all 27. Do not infer own-fleet from accept-to-27-countries marketing.
12. **Corrections vs 43:** 43 remains v1 verified named rows. DE 7183 is Stammnummer rows. DK 18 is permits. FI letter list added. FR/SE/BE/IE/ES/IT/AT counts documented as register layers. New named SOURCE_VERIFIED rows added; register millions are not unique-legal.
13. **External access still required:** NRA bulk downloads, commercial API contracts, sandbox accounts, egress allow for those hosts, human approval for any live label. BLOCKED until then.
`
);

console.log(JSON.stringify({ outDir, entities: m.entities.length, uniqueSourceVerified: m.uniqueSourceVerified }, null, 2));

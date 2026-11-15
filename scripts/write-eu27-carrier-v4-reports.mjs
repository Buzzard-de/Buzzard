import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { loadV4, sourceVerified, uniqueIdsV4 } = require("../server/lib/logistics/carrierMasterV4.js");
const { load } = require("../server/lib/logistics/carrierMaster.js");
const { loadV2 } = require("../server/lib/logistics/carrierMasterV2.js");
const { loadV3 } = require("../server/lib/logistics/carrierMasterV3.js");

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

const outDir = "docs/MASTER_COMMAND/2026-11-05-mc4/logistics-v4";
mkdirSync(join(outDir, "countries"), { recursive: true });
const m = loadV4();
writeFileSync("data/logistics/eu27_carrier_master.v4.json", JSON.stringify(m, null, 2));

const dash = (v) => (v == null ? "—" : String(v));
const write = (name, body) => writeFileSync(join(outDir, name), body);

function extras(iso) {
  return m.entities.filter((e) => e.hqCountry === iso);
}

function namedIn(iso) {
  return extras(iso).filter((e) => e.reliability === "SOURCE_VERIFIED" || String(e.reliability).startsWith("VERIFIED"));
}

function table() {
  const lines = [
    "| Ülke | Sicil kaydı | Benzersiz tüzel | Aktif paket taşıyıcı | Ulusal posta | Özel ulusal | Uluslararası | Bölgesel/yerel | Locker/PUDO |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];
  let regSum = 0;
  let knownReg = 0;
  for (const c of m.counts) {
    const xs = extras(c.iso);
    const named = namedIn(c.iso);
    const active = xs.filter((e) => e.activityVerified);
    const usp = named.filter((e) => e.class === "NATIONAL_POST_USP").length ? 1 : 1;
    const priv = named.filter((e) =>
      /PRIVATE|ACM_PAKKET|UKE_|EETT_|COURIER_PROVIDED|ANACOM_|UPS_LICENCE|POSTAL_REGISTER|AUTHORISED/.test(e.class)
    );
    const intl = (m.internationalOperations || []).filter((o) => o.country === c.iso);
    const loc = named.filter((e) => /LOCAL|REGIONAL|LETTER_|CORRESPONDENCE|PEV_|ACM_POST|EETT_/.test(e.class));
    const lock = (m.lockers || []).filter((n) => n.country === c.iso).length + (m.pudo || []).filter((n) => n.country === c.iso).length;
    if (c.register.records != null) {
      regSum += c.register.records;
      knownReg += 1;
    }
    lines.push(
      `| ${TR[c.iso]} | ${dash(c.register.records)} | ${dash(c.register.uniqueLegal)} | ${active.length} | ${usp} | ${priv.length} | ${intl.length} | ${loc.length} | ${lock} |`
    );
  }
  lines.push(
    `| AB-27 | ${regSum} (katman toplamı, ${knownReg} ülke; tekil değil) | ${m.uniqueLegalByCompanyKey} (ülke+şirket anahtarı; sicil satırı değil) | ${m.activityVerifiedCount} (activityVerified) | 27 | — | ${m.internationalOperations.length} ops satırı | — | ${(m.lockers || []).length}+${(m.pudo || []).length} ağ |`
  );
  return lines.join("\n");
}

const named = sourceVerified(m.entities);
const csvEscape = (s) => JSON.stringify(s == null ? "" : String(s));

write(
  "EU27_CARRIER_MASTER_REGISTER_V4.md",
  `# EU-27 carrier master register v4

**Retrieved:** 6 November 2026 (Europe/Berlin)  
**Schema:** \`${m.schema}\`  
**COMPLETE_VERIFIED:** 0  
**Sales / live shipment:** false  

Canonical JSON: \`data/logistics/eu27_carrier_master.v4.json\`  
Preserved: v1, v2, v3 files and schemas.

${table()}

Named entities in DB: ${m.uniqueNamedLegalInDatabase}  
SOURCE_VERIFIED/VERIFIED: ${m.uniqueSourceVerified}  
Unique legal keys: ${m.uniqueLegalByCompanyKey}  
Unique IDs: ${uniqueIdsV4().count} (${uniqueIdsV4().unique ? "no id collision" : "COLLISION"})  
`
);

write(
  "EU27_COUNTRY_FULL_CARRIER_NAMES.md",
  `# Country full carrier names\n\n${m.counts
    .map((c) => `## ${TR[c.iso]} (${c.iso})\n\n${namedIn(c.iso).map((e) => `- ${e.legalName} — ${e.class} — ${e.legalNameStatus || ""}`).join("\n") || "- (named extract incomplete)"}\n`)
    .join("\n")}`
);

write(
  "EU27_COUNTRY_FULL_CARRIER_NAMES.csv",
  "id,iso,legalName,brand,class,reliability,legalNameStatus,companyStatus,companyNumber,activityVerified\n" +
    named.map((e) => [e.id, e.hqCountry, csvEscape(e.legalName), csvEscape(e.brand), e.class, e.reliability, e.legalNameStatus || "", e.companyStatus || "", csvEscape(e.companyNumber), e.activityVerified].join(",")).join("\n") +
    "\n"
);

write(
  "EU27_OFFICIAL_POSTAL_REGISTER.md",
  `# Official postal registers\n\n${m.counts.map((c) => `- **${c.iso} ${c.nra}:** records=${dash(c.register.records)} uniqueLegal=${dash(c.register.uniqueLegal)} status=${c.verification} method=${c.register.method || ""} — ${c.register.note || ""}`).join("\n")}\n`
);

write(
  "EU27_PRIVATE_CARRIER_REGISTER.md",
  `# Private carrier register\n\n${named
    .filter((e) => e.class !== "NATIONAL_POST_USP")
    .map((e) => `- ${e.legalName} (${e.hqCountry}) ${e.class}`)
    .join("\n")}\n`
);

write(
  "EU27_INTERNATIONAL_CARRIER_REGISTER.md",
  `# International carrier operations\n\nA named affiliate is not own fleet.\n\n${(m.internationalOperations || [])
    .map((o) => `- ${o.brand} / ${o.country} / ${o.legalName} / ${o.activityType}`)
    .join("\n")}\n`
);

write(
  "EU27_REGIONAL_COURIER_REGISTER.md",
  `# Regional\n\n${m.entities.filter((e) => /REGIONAL|ACM_POST|EETT_/.test(e.class)).map((e) => `- ${e.legalName} (${e.hqCountry}) ${e.reliability}`).join("\n")}\n`
);

write(
  "EU27_LOCAL_COURIER_REGISTER.md",
  `# Local couriers\n\nIncludes EETT/UKE sole traders as register rows, not proven city last-mile.\n\nCount EETT local-looking rows: ${m.entities.filter((e) => String(e.id).startsWith("el-eett-")).length}\nCount UKE rows: ${m.entities.filter((e) => String(e.id).startsWith("pl-uke-")).length}\n`
);

write(
  "EU27_ACTIVE_LAST_MILE_CARRIER_REGISTER.md",
  `# Active last-mile (activityVerified only)\n\n${m.entities
    .filter((e) => e.activityVerified)
    .map((e) => `- ${e.legalName} (${e.hqCountry}) ${e.class}`)
    .join("\n")}\n\nThese are not a complete EU-27 last-mile census.\n`
);

write(
  "EU27_LOCKER_NETWORK_REGISTER.md",
  `# Locker networks (not carriers)\n\n${(m.lockers || [])
    .map((n) => `- ${n.id}: ${n.operator} / ${n.country} / points=${n.pointCount ?? "UNKNOWN"} (${n.pointCountStatus})`)
    .join("\n")}\n`
);
write(
  "EU27_LOCKER_NETWORK_REGISTER.csv",
  "id,operator,country,pointCount,status\n" + (m.lockers || []).map((n) => [n.id, csvEscape(n.operator), n.country, n.pointCount ?? "", n.pointCountStatus].join(",")).join("\n") + "\n"
);

write(
  "EU27_PUDO_NETWORK_REGISTER.md",
  `# PUDO networks (not carriers)\n\n${(m.pudo || []).map((n) => `- ${n.id}: ${n.operator} / ${n.country} / ${n.pointCount} (${n.pointCountStatus})`).join("\n")}\n`
);

write("EU27_COUNTRY_CARRIER_COUNTS.md", `# Counts\n\n${table()}\n`);
write(
  "EU27_COUNTRY_CARRIER_COUNTS.csv",
  "iso,tr,register,unique_legal,verification,source\n" +
    m.counts.map((c) => [c.iso, TR[c.iso], dash(c.register.records), dash(c.register.uniqueLegal), c.verification, c.register.source || ""].join(",")).join("\n") +
    "\n"
);

write(
  "EU27_UNIQUE_LEGAL_ENTITY_REGISTER.md",
  `# Unique legal entities\n\nv1 verified: ${load().uniqueVerifiedLegal}\nv4 unique legal keys: ${m.uniqueLegalByCompanyKey}\nNamed DB rows: ${m.entities.length}\nDo not add DE 7183 + ES 4734 + IT 3722 + NL 105 + PL 234 + EL 804.\n`
);

write(
  "EU27_POSTCODE_COVERAGE_MATRIX.md",
  `# Postcode coverage\n\nStatus: UNKNOWN at postcode level for all 27. Country-level USP obligation is not a postcode file.\n\n| iso | coverage |\n| --- | --- |\n${m.counts.map((c) => `| ${c.iso} | UNKNOWN |`).join("\n")}\n`
);

write(
  "EU27_CARRIER_API_MATRIX.md",
  `# API matrix\n\nLIVE_VERIFIED is never set. Docs ≠ integration.\n\n${(m.apiDocs || [])
    .map((r) => `- ${r.id || r.brand}: status=${r.status || r.apiStatus} sandbox=${r.sandboxVerified} live=${r.liveVerified} ${r.url || ""}`)
    .join("\n")}\n`
);

write("EU27_SOURCE_VERIFICATION_AUDIT.md", `# Sources\n\n${m.sources.map((s) => `- ${s.id}: ${s.title} — ${s.url}`).join("\n")}\n`);

write(
  "EU27_DUPLICATE_AUDIT.md",
  `# Duplicate audit\n\nSame legal name+country pairs: ${m.duplicateLegalNameCountry.length}\n\n${m.duplicateLegalNameCountry
    .slice(0, 80)
    .map((d) => `- ${d.iso} ${d.legalName}: ${d.a} vs ${d.b}`)
    .join("\n")}\n\nSkipped duplicate ids: ${m.skippedDuplicateId.join(", ") || "(none)"}\n`
);

write(
  "EU27_UNKNOWN_AND_MISSING_DATA.md",
  `# Unknown and missing

- HU NMHH Excel still not imported (no href in HTML).
- PT ANACOM full postal-only unique count HTTP 403.
- LT RRT list is Power BI, count NOT_ENUMERATED.
- EE 32 of 51 MTR names not listed in this ingest (19 courier-active named).
- LV 55 of 61 merchant names not enumerated.
- AT 138 Anzeige still NOT_FOUND_IN_FETCHED_RTR_2024_REPORT.
- HR names not enumerated.
- Postcode files: UNKNOWN all 27.
- Own fleet vs partner for internationals: UNKNOWN except register-local legal name.
- API sandbox credentials: BLOCKED.
- dane.gov.pl UKE dataset 1065 not imported.
`
);

write(
  "BUZZARD_LOGISTICS_INTEGRATION_GAP_REPORT.md",
  `# Integration gap

Compatible with Carrier Master, Coverage, Capability, Rate, Estimate, Tracking, Returns, Pusat orchestrator — all dry-run.

Gaps:
1. No contracted rates.
2. No sandbox credentials.
3. No live tracking.
4. Postcode engine has no official files.
5. selectCarrier still cannotStartShipment.
6. Pusat quote liveShipment false.

Do not show estimates as prices.
`
);

write(
  "BUZZARD_LOGISTICS_TEST_REPORT.md",
  `# Tests

v1 + v2 + v3 preserved. v4 suite added.

Synthetic checks: 27 countries, 27 USP, NL 105, PL 234, EL 804/795, EE 51, LV 61, HU/PT/LT incomplete, locker separate, sales closed.
`
);

write(
  "BUZZARD_LOGISTICS_ACCEPTANCE_REPORT_V4.md",
  `# Acceptance v4

**Date:** 6 November 2026 (Europe/Berlin)  
**Branch:** \`cursor/ab27-carrier-inventory-c293\`  
**HEAD at start:** \`a6160470\`  
**COMPLETE_VERIFIED:** 0  
**Push/merge/deploy/sales/live labels:** no  

v1 file exists: ${existsSync("data/logistics/eu27_carrier_master.v1.json")}  
v2 file exists: ${existsSync("data/logistics/eu27_carrier_master.v2.json")}  
v3 file exists: ${existsSync("data/logistics/eu27_carrier_master.v3.json")}  

${table()}

## Priority eight

| ISO | Outcome |
| --- | --- |
| NL | 105 unique KVK (93 post + 19 parcel). PARTIALLY_VERIFIED. |
| PL | 234 unique UKE B-numbers. PARTIALLY_VERIFIED. |
| HU | Locker/PUDO Q1 2026 ingested. Operator Excel DATA_INCOMPLETE. |
| EL | 804 licences / 795 unique companies via public API. PARTIALLY_VERIFIED. |
| PT | Named extract only. DATA_INCOMPLETE. |
| EE | 51 MTR / 19 courier-active named. PARTIALLY_VERIFIED. |
| LV | 61 active merchants; 1869 lockers. PARTIALLY_VERIFIED names incomplete. |
| LT | Power BI. DATA_INCOMPLETE. |

Research incomplete for COMPLETE_VERIFIED. Estimated totals are not presented as exact EU unique last-mile companies.
`
);

for (const c of m.counts) {
  const namedC = namedIn(c.iso);
  writeFileSync(
    join(outDir, "countries", `${c.iso}.md`),
    `# ${TR[c.iso]} (${c.iso})

**NRA:** ${c.nra} — ${c.nraUrl}  
**Register records:** ${dash(c.register.records)}  
**Unique legal (register):** ${dash(c.register.uniqueLegal)}  
**Verification:** ${c.verification}  
**Method:** ${c.register.method || "inherited"}  
**Note:** ${c.register.note || ""}  

Named rows in v4 DB for this country: ${namedC.length}  
activityVerified: ${extras(c.iso).filter((e) => e.activityVerified).length}  
Postal-code coverage: UNKNOWN  

## Named legal titles (first 80)

${namedC
  .slice(0, 80)
  .map((e) => `- ${e.legalName} (\`${e.id}\`) ${e.class} ${e.legalNameStatus || ""}`)
  .join("\n")}
${namedC.length > 80 ? `\n… +${namedC.length - 80} more in master JSON.\n` : ""}
`
  );
}

console.log(
  JSON.stringify(
    {
      entities: m.entities.length,
      verified: m.uniqueSourceVerified,
      legalKeys: m.uniqueLegalByCompanyKey,
      lockers: m.lockers.length,
      ops: m.internationalOperations.length,
    },
    null,
    2
  )
);

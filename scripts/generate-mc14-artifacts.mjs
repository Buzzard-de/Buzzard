import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";

const require = createRequire(import.meta.url);
const { loadV11 } = require("../server/lib/logistics/carrierMasterV11.js");
const { germanyPilot, commercialPrep } = require("../server/lib/logistics/v5/germanyPilot.js");
const { countryConfigs } = require("../server/lib/logistics/v5/countryConfig.js");
const { functionalityMatrix } = require("../server/lib/logistics/v5/apiFunctionality.js");
const { documentationCatalog } = require("../server/lib/logistics/v5/adapterFramework.js");
const { countryCoverageMatrix, postcodeLicenseMatrix, postcodePortalRegistry } = require("../server/lib/logistics/v5/coverageEngine.js");

const DIR = "docs/MASTER_COMMAND/2026-11-07-mc14";
const HEAD = process.env.MC14_HEAD || "UNKNOWN";

function csvEscape(v) {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function csv(headers, rows) {
  return [headers.join(","), ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(","))].join("\n") + "\n";
}

function write(path, body) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
}

const m = loadV11();
const catalog = documentationCatalog();
const matrix = functionalityMatrix(catalog);
const pilot = germanyPilot();
const coverage = countryCoverageMatrix();
const licenses = postcodeLicenseMatrix();
const portals = postcodePortalRegistry();
const configs = countryConfigs();

write("data/logistics/eu27_carrier_master.v11.json", JSON.stringify(m, null, 2) + "\n");

write(
  `${DIR}/REAL_CARRIER_VERIFICATION.csv`,
  csv(
    [
      "country_code",
      "id",
      "legal_entity_name",
      "trading_name",
      "class",
      "parcel_service",
      "last_mile",
      "own_fleet",
      "subcontractor",
      "coverage_status",
      "api_documented",
      "sandbox_verified",
      "live_contract_ready",
      "source",
      "last_verified_at",
    ],
    m.entities.map((e) => ({
      country_code: e.hqCountry,
      id: e.id,
      legal_entity_name: e.legalName,
      trading_name: e.brand,
      class: e.class,
      parcel_service: e.independentEvidence?.parcel_service,
      last_mile: e.independentEvidence?.last_mile,
      own_fleet: e.independentEvidence?.own_fleet,
      subcontractor: e.independentEvidence?.subcontractor_network,
      coverage_status: e.independentEvidence?.coverage_status,
      api_documented: e.independentEvidence?.api_documented,
      sandbox_verified: e.independentEvidence?.sandbox_verified,
      live_contract_ready: e.independentEvidence?.live_contract_ready,
      source: e.source || "UNKNOWN",
      last_verified_at: "2026-11-07",
    })),
  ),
);

write(
  `${DIR}/LOCAL_REGIONAL_CARRIERS.csv`,
  csv(
    [
      "id",
      "country",
      "legal_entity_name",
      "trading_name",
      "class",
      "company_registration_number",
      "website",
      "parcel_service",
      "last_mile",
      "own_fleet",
      "postcodes",
      "newInMc14",
      "note",
    ],
    m.localRegionalClassRows.map((r) => ({ ...r, newInMc14: false })),
  ),
);

write(
  `${DIR}/EU27_POSTCODE_COVERAGE.csv`,
  csv(
    ["iso", "formatShapeKnown", "fileIngested", "license", "coverageGranularity", "carrierCoverageVerified", "level", "sourceUrl"],
    coverage.map((c) => {
      const lic = licenses.find((l) => l.iso === c.iso) || {};
      const p = portals.countries?.find((x) => x.iso === c.iso) || {};
      return {
        iso: c.iso,
        formatShapeKnown: true,
        fileIngested: p.fileIngested === true,
        license: p.licenseFromPublicPage || lic.license || "UNKNOWN",
        coverageGranularity: c.coverageGranularity || "UNKNOWN",
        carrierCoverageVerified: false,
        level: "UNKNOWN",
        sourceUrl: p.url || "UNKNOWN",
      };
    }),
  ),
);

write(
  `${DIR}/API_INTEGRATION_MATRIX.csv`,
  csv(
    [
      "carrierId",
      "brand",
      "country",
      "docs",
      "mc11Maturity",
      "rateQuote",
      "shipmentCreation",
      "labelGeneration",
      "tracking",
      "cancellation",
      "pickup",
      "returns",
      "webhook",
      "authentication",
      "sandbox",
      "MOCK_TESTED",
      "SANDBOX_VERIFIED",
      "LIVE_AUTHORIZED",
    ],
    matrix.map((r) => ({
      carrierId: r.carrierId,
      brand: r.brand,
      country: r.country,
      docs: r.docs,
      mc11Maturity: r.mc11Maturity,
      ...r.features,
      MOCK_TESTED: r.sandboxReadiness.MOCK_TESTED,
      SANDBOX_VERIFIED: r.sandboxReadiness.SANDBOX_VERIFIED,
      LIVE_AUTHORIZED: false,
    })),
  ),
);

const md = {};

md.MC14_EXECUTIVE_REPORT = `# MC14 executive report

**Date:** 7 November 2026 (Europe/Berlin)  
**Branch:** \`cursor/ab27-carrier-inventory-c293\`  
**Start HEAD:** \`${HEAD}\` (MC13 v10, local; MC13 forbade push)  
**This command:** local commit only. **No push, merge, deploy, live shipment, sales, or production writes.**

v1–v10 JSON and MC10–MC13 reports were not modified. v11 wraps v10 on the **existing v5 logistics engine** (no second stack). Hermes Germany HSI public docs added (maturity 1). No new legal names.

## What actually runs vs mock

| Surface | Status |
| --- | --- |
| Named census load (1602 / 1465 keys) | WORKS (frozen inventory) |
| Shared adapter mock ops (validate, track mock, coverage UNKNOWN) | MOCK_READY |
| Live createShipment / generateLabel / pickup | BLOCKED (CODE_READY_MOCK) |
| Selection | WORKS as HOLD: no autoselect if coverage ≠ POSTCODE_LEVEL |
| Webhook HMAC + replay window | WORKS in unit tests (no live intake) |
| Returns | MOCK; supplier refund never assumed |
| Germany pilot | MOCK/CODE_READY; **not** SANDBOX_READY |
| Postcode files | Shape rules only; **0/27 ingested** |
| Sandbox HTTP | **0** |
| Live usable carriers | **0** |

## Counts (MC13 freeze vs MC14)

| Metric | MC13 / v10 | MC14 / v11 |
| --- | ---: | ---: |
| Named rows | 1602 | 1602 |
| Unique legal keys | 1465 | 1465 |
| Register-layer | 17453 | 17453 |
| New legal names this command | 0 | **0** |
| Parcel independently verified | 0 | 0 |
| Last-mile independently verified | 0 | 0 |
| Own fleet independently verified | 0 | 0 |
| Subcontractor independently verified | 0 | 0 |
| Postcode countries verified | 0/27 | **0/27** |
| API documentation entries | 16 | **17** (Hermes HSI added) |
| Adapter design ready | 16 | 17 |
| MOCK_TESTED | 3 | **3** (DHL/GLS/UPS shared adapter) |
| SANDBOX_READY | 0 | 0 |
| SANDBOX_VERIFIED | 0 | 0 |
| Live usable | 0 | **0** |

Hermes docs ≠ mock test ≠ sandbox. DPD eSolutions remains maturity 1.

## First sandbox after contract (not obtained)

**DHL Parcel DE** — public Parcel DE Shipping API + existing MOCK_TESTED adapter. Still \`CONTRACT_AND_DEVELOPER_ACCOUNT_REQUIRED\`. No application filed.

## Sales / live

Sales closed. Live shipment disabled. No customer notifications sent. \`buzzard_guardian.sqlite3\` not committed.
`;

md.EU27_CARRIER_MASTER_STATUS = `# EU27 carrier master status (v11)

Schema: \`buzzard.eu27-carrier-master.v11\` wrapping v10.  
Countries: 27 configured; **only DE enabled for pilot simulation**; all \`liveShipment=false\`.

National USP rows remain REGISTER_ONLY / activity flags from prior waves — **not** independently parcel-verified.

Local/regional class rows: ${m.localRegionalClassRows.length} existing taxonomy rows, **0** independently parcel-verified, **0** new in MC14.

COMPLETE_VERIFIED countries: **0**.
`;

md.SANDBOX_READINESS = `# Sandbox readiness

No sandbox credentials exist in this environment. No official sandbox calls were made.

| Carrier | Docs | MOCK_TESTED | SANDBOX_READY | SANDBOX_VERIFIED | Notes |
| --- | --- | --- | --- | --- | --- |
| DHL Parcel DE | yes | yes | no | no | First candidate after contract |
| GLS ShipIT | yes | yes | no | no | Contract required |
| UPS Developer | yes | yes | no | no | Contract required |
| DPD eSolutions | yes | no | no | no | Docs only |
| Hermes HSI | yes | no | no | no | Test logins only via supervised integration project (public docs). Not obtained |
| DPD Baltic | yes | no | no | no | Hostname documented ≠ verified |
| Others in catalog | yes | no | no | no | Maturity 1 |

**Successful sandbox tests: 0.**
`;

md.GERMANY_PILOT_READINESS = `# Germany pilot readiness

Pilot country: **DE**. Sales and live shipment: **off**.

Recommended first sandbox **after** contract: **dhl-parcel-de**.

## Function status

${Object.entries(pilot.functions)
  .map(([k, v]) => `- ${k}: **${v}**`)
  .join("\n")}

## Carriers

${pilot.carriers
  .map(
    (c) =>
      `- **${c.brand}** (\`${c.carrierId}\`) docs=${c.docs} MOCK_TESTED=${c.MOCK_TESTED} SANDBOX_READY=${c.SANDBOX_READY} LIVE_AUTHORIZED=${c.LIVE_AUTHORIZED} postcode=${c.postcodeCoverage}`,
  )
  .join("\n")}

Regional/local independently parcel-verified for DE this command: **0**.

## Missing for first real integration

1. Business customer / developer contract (user, not agent).
2. Sandbox credentials issued by the carrier.
3. Signed commercial terms (UNKNOWN volume/minimums — not guessed).
4. Postcode coverage file for DE (GISCO/Deutsche Post licensed ingest not completed).
5. Human approval gate before any live label.
`;

md.SMART_CARRIER_SELECTION = `# Smart carrier selection

Engine: \`server/lib/logistics/v5/selectionEngine.js\` (existing, not a fork).

**Autoselect allowed only if** coverageGranularity === POSTCODE_LEVEL **and** delivery_available === true. Today both fail for all 27 countries → \`selected = null\`, \`confidence = LOW\`.

Unknown inputs (weight, dimensions, origin, price, ETA, success rate) **lower confidence**; they are **not invented**.

Local carriers are **not** auto-outranked by international brands. Fallback is listed; **auto-transfer of a live shipment is false**.

Output fields: recommended (null), alternative (catalog fallback if apiLevel≥2), price UNKNOWN, ETA UNKNOWN, coverage UNKNOWN, score (rank only), confidence LOW, reasons, missingInformation.
`;

md.SUPPLIER_CARRIER_INTEGRATION = `# Supplier / carrier integration

Roles remain split: SUPPLIER supplies goods; CARRIER transports. Many-to-many edges supported; **edges in inventory: 0** (no invented supplier–carrier links).

Order simulation (\`orderLogisticsSim.js\`) records a logistics **plan** only: \`boundToRealOrders=false\`, \`stockPurchased=false\`, \`cannotStartShipment=true\`.

Dropshipping: Buzzard does not purchase stock. AI will not pre-buy inventory.
`;

md.TRACKING_AND_RETURNS = `# Tracking and returns

Buzzard event set: ORDER_CONFIRMED … DELIVERY_EXCEPTION (\`trackingNormalize.js\`). Unmapped carrier codes → customerVisible **NO_VERIFIED_TRACKING**.

Webhook: HMAC-SHA256 over \`timestamp.rawBody\`, 5-minute skew, replay map, timing-safe compare. Accepted events are still \`live:false\`. **No customer email/SMS sent in MC14.**

Returns: \`returnsEngine.startReturn\` — supplierRefundReceived and customerRefundIssued stay false. Label live path blocked.
`;

md.LOGISTICS_FINANCIAL_MODEL = `# Logistics financial model

\`costEngine.quoteCost\` returns UNKNOWN for every surcharge and total unless \`liveRate===true\` (never set). \`estimateIsNotPrice=true\`.

Invoice variance, average shipping cost, cost per country/carrier/category: **structure only**, not live metrics.

No production financial writes.
`;

md.CUSTOMS_TAX_INTEGRATION = `# Customs / Tax AI integration

\`customsTaxBridge.assessCustoms\`: \`liveDeclaration=false\`, \`autoApprove=false\`. Missing origin, dest, product class, or party → \`hold=true\`. Verified share to Tax AI is design-only; uncertain share is blocked.

No live customs filing. TR→DE and extra-EU remain holds without a complete verified dossier.
`;

md.AI_LOGISTICS_COUNCIL = `# AI logistics council

Roles: logistics_ai, price_assistant, stock_assistant, customer_assistant, sales_analysis_assistant, customs_ai, tax_ai, esat_bey (soleDefense=false), dogu_bey, pusat.

All \`canCommit=false\`. Restricted classification is not shared from logistics_ai. Pusat routes tasks only (\`pusatLogistics.js\` dry-run).
`;

md.SECURITY_AND_RESILIENCE = `# Security and resilience

Existing: least privilege policy names, webhook HMAC, replay, idempotency module, audit log, TLS not disabled, egress allowlist not expanded, secrets names-only.

Adapter: retry metadata CODE_READY_MOCK; circuit OPEN on injected outage; external payloads untrusted.

Not production-proven: encryption-at-rest for logistics PII, backup of logistics volumes, live rate-limit against carrier APIs.

Guardian sqlite not touched.
`;

md.PERFORMANCE_AND_SCALABILITY = `# Performance and scalability

No load test of 27-country live traffic was run. Prior vitest suite remains the evidence.

Design: adapter isolation per call, country configs in-memory, webhook Map (process-local — not clustered). Do **not** infer production QPS from mock tests.

Catalog size 1602 named + 17 API docs is trivial in-process. Register-layer 17453 is census, not a live query path.
`;

md.LOGISTICS_DASHBOARD_STATUS = `# Logistics dashboard status

Data shape: \`dashboardSnapshot\` — black-gold theme, no new brand, sales toggle false.

Shows named/legal counts, parcel verified (0), API docs (17), sandbox (0), live usable (0), postcode countries (0). Delays and costs: UNKNOWN.

No new public UI route enabled. Sales/live shipment controls stay off.
`;

md.EU27_COUNTRY_COMPLETENESS = `# EU27 country completeness

| iso | completion | postcode | liveShipment | pilot enabled |
| --- | --- | --- | --- | --- |
${m.countryCompletion
  .map((c) => {
    const cfg = configs.find((x) => x.iso === c.iso) || {};
    return `| ${c.iso} | ${c.completion} | UNKNOWN | ${cfg.liveShipment} | ${cfg.enabled} |`;
  })
  .join("\n")}

COMPLETE_VERIFIED: **0 / 27**.  
BLOCKED registers: HU, PT, LT, RO.  
PARTIAL names/register: AT, HR, NL, PL, EL.
`;

md.SOURCE_BLOCKERS = `# Source blockers (MC14 — unchanged unless noted)

- HU NMHH Excel: advertised, **no xlsx href** (sha16 \`99d7bafe9497d404\` on 2026-11-07).
- PT ANACOM: HTTP **403**. Login not attempted.
- LT RRT: Power BI embed; bulk export not performed.
- RO ANCOM: **TLS verify fail**. Certificate checks not disabled.
- AT RTR §25: SPA shell; PEV 16 remains named set.
- Postcode **file ingest**: GISCO CC-BY-SA / national portals documented, **not ingested**, **not carrier coverage**.
- Hermes: public docs found; sandbox only via **supervised integration** — no application.
- Commercial volume/minimums for DE carriers: **UNKNOWN** (not guessed).
`;

md.DATA_QUALITY_AUDIT = `# Data quality audit

Do not mix:

- Register-layer **17453** ≠ unique legal **1465** ≠ named rows **1602**.
- Class LOCAL_COURIER ≠ PARCEL_SERVICE_VERIFIED.
- API document **17** ≠ MOCK_TESTED **3** ≠ SANDBOX **0** ≠ LIVE **0**.
- Country postcode **shape** ≠ carrier coverage.
- Hermes docs added in MC14: **documentation only**.

Independent true counts: parcel 0, last-mile 0, own-fleet 0, subcontractor 0.

newLegalEntitiesMc14 = **0**.
`;

md.TEST_RESULTS = `# Tests MC14

See vitest output recorded after generation. Target: **v1–v11**. Failed tests are not deleted.

No live shipment in tests. Mock is not counted as sandbox.
`;

md.ACCEPTANCE_GATES = `# Acceptance gates (MC14)

1. Working: census load, mock adapter, selection HOLD, webhook unit, returns mock, DE country flag.  
2. Mock-only: rates, tracking events, returns labels, order sim.  
3. Parcel independently verified: **0**.  
4. Local/regional independently verified: **0** (class rows exist).  
5. Last-mile independently verified: **0**.  
6. Own fleet independently verified: **0**.  
7. Subcontractor independently verified: **0**.  
8. Postcode data acquired (ingested): **0/27**.  
9. Real carrier coverage verified countries: **0**.  
10. Official API docs: **17**.  
11. Adapters implemented (shared mock): **1** framework covering catalog; MOCK_TESTED brands **3**.  
12. Mock-tested adapters: **3**.  
13. Sandbox tests successful: **0**.  
14. Germany pilot: MOCK/CODE_READY, not SANDBOX, not LIVE.  
15. Missing: contracts, sandbox creds, licensed postcode ingest, human approval.  
16. Smart selection: HOLD with UNKNOWN coverage/price/ETA.  
17. Supplier/carrier split: code ready; edges empty.  
18. Tracking/returns: mock + mapping; no live notify.  
19. Customs/Tax: hold design; no live declaration.  
20. Security: HMAC webhook, TLS on, no secret values, sales lock.  
21. Completed countries: **0**.  
22. Partial: USP named + register layers (most).  
23. Blocked: HU, PT, LT, RO (+ AT SPA, postcode ingest).  
24. Live usable carriers today: **0**.  
25. Remaining: contracts, sandbox, independent service evidence, postcode ingest, licensed coverage, human-gated live.
`;

md.NEXT_CHECKPOINT = `# Next checkpoint (after MC14)

**Do not redo:** v1–v11 JSON freeze; Hermes HSI URL; MC10–MC14 reports; GISCO/RTR portal URLs; DPD Baltic hostname-as-docs-only.

**Still blocked:** HU_EXCEL, PT_403, LT_POWERBI, RO_TLS, AT_SECTION25_SPA, POSTCODE_FILE_INGEST, SANDBOX_CREDS, LIVE_SHIPMENT, INDEPENDENT_PARCEL_EVIDENCE.

**Next:**
1. User-led DHL (then GLS/UPS) contract + supervised sandbox — agent does not apply.
2. Licensed DE postcode ingest if legal review allows — still not carrier coverage until mapped.
3. Independent parcel/last-mile/own-fleet evidence on **existing** named firms only.
4. NMHH/ANACOM/RRT/ANCOM/RTR when sources unblock.
5. Do not enable sales or live labels.
`;

for (const [name, body] of Object.entries(md)) {
  write(`${DIR}/${name}.md`, body);
}

write("docs/MASTER_COMMAND/2026-11-07-continuation/NEXT_CHECKPOINT.md", md.NEXT_CHECKPOINT);

const prev = existsSync("data/logistics/carrier_network_checkpoint.json")
  ? JSON.parse(readFileSync("data/logistics/carrier_network_checkpoint.json", "utf8"))
  : {};

const checkpoint = {
  schema: "buzzard.carrier-network-checkpoint.v6",
  retrievedAt: "2026-11-07",
  branch: "cursor/ab27-carrier-inventory-c293",
  startHead: HEAD,
  currentSchema: "buzzard.eu27-carrier-master.v11",
  completeVerifiedCountries: 0,
  liveCarriers: 0,
  sandboxVerified: 0,
  apiDocumentationEntries: 17,
  mockTested: 3,
  tests: { v1_to_v11: "PENDING", runAt: "2026-11-07T12:00:00+01:00" },
  v10Baseline: m.v10Baseline,
  newLegalEntitiesMc14: 0,
  previous: prev,
};

write("data/logistics/carrier_network_checkpoint.json", JSON.stringify(checkpoint, null, 2) + "\n");

console.log(
  JSON.stringify({
    named: m.uniqueNamedLegalInDatabase,
    keys: m.uniqueLegalByCompanyKey,
    docs: catalog.length,
    mock: m.qualityMetrics.mockTestedAdapters,
    dir: DIR,
  }),
);

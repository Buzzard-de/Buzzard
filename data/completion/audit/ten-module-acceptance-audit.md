# Ten-module independent acceptance audit

Recorded 16:41 Berlin (UTC+1) on `cursor/buzzard-eu27-fiat-engine-4be7` at `607f42b6`.

Audit only. Application code was not changed.

## Protection

- Egress file default `DENY`, byte-identical with the workspace copy.
- `BUZZARD_SALES_ENABLED=0`. Sales `CLOSED`.
- Development database mtime `1794331370`.
- Development database SHA-256 `416f163a105efa648722cc011fbe2b02590bee8cd7de68017fc2d444a048973b`.
- The audit process did not open that database.
- No commit, push, merge, or deploy. Pull request 501 was not changed.

## Command and result

```
node --test server/__tests__/tenModuleProgram.test.mjs
```

1 passed, 0 failed, 0 skipped, 152.4 ms.

A separate import of `server/lib/platform/tenModuleProgram.js` loaded 81 modules. `db.js`, `orderService.js`, `checkoutService.js`, and `coreEngineChain.js` were absent. File descriptors did not include `buzzard.db`. The import did open `/tmp/buzzard-wa-default-<pid>.sqlite` because `workflowChain.js` loads `banuDesk.js`, which loads `whatsappSandbox.js`, and that file creates a default sandbox at import.

## Evidence matrix

| Module | Claimed | Audit status |
|---|---|---|
| Core | CODE_COMPLETE, TEST_COMPLETE, INTEGRATION_COMPLETE, SECURITY_VERIFIED, PERFORMANCE_TESTED | VERIFIED_PARTIAL |
| E-commerce | CODE_COMPLETE, TEST_COMPLETE, INTEGRATION_COMPLETE | VERIFIED_PARTIAL |
| Council | CODE_COMPLETE, TEST_COMPLETE, INTEGRATION_COMPLETE | VERIFIED_PARTIAL |
| Catalog | CODE_COMPLETE, TEST_COMPLETE, INTEGRATION_COMPLETE | VERIFIED_PARTIAL |
| EU27 | CODE_COMPLETE, TEST_COMPLETE, INTEGRATION_COMPLETE | VERIFIED_PARTIAL |
| Pricing | CODE_COMPLETE, TEST_COMPLETE, INTEGRATION_COMPLETE | VERIFIED_PARTIAL |
| Logistics | CODE_COMPLETE, TEST_COMPLETE, INTEGRATION_COMPLETE | VERIFIED_PARTIAL |
| Security | CODE_COMPLETE, TEST_COMPLETE, INTEGRATION_COMPLETE, SECURITY_VERIFIED | VERIFIED_PARTIAL |
| Voice | CODE_COMPLETE, TEST_COMPLETE, INTEGRATION_COMPLETE | VERIFIED_PARTIAL |
| Live operations | CODE_READY, TEST_COMPLETE, INTEGRATION_COMPLETE | BLOCKED_APPROVAL |

No module receives `VERIFIED_COMPLETE`.

## False-positive completion claims

`TEST_COMPLETE` is written as a literal on every module. The single test then checks that none of those statuses is `FAILED`, so the test passes when the producer agrees with itself.

`INTEGRATION_COMPLETE` depends on `journey.steps`. The customer, notification, and returns steps set `ok: true` in the object literal. The order step assigns `orderCreated: false` in that same literal. `openedDevDb`, `egressDefault`, `moneyMoved`, `shipmentCreated`, and `supplierPurchased` on the report are also literals.

`SECURITY_VERIFIED` and `PERFORMANCE_TESTED` are literals on the core module. The timer runs 50 snapshot searches and 50 fixture quotes. It does not measure the queue, the registry, or a concurrent load.

`inventedCatalogPrice: false` is a literal. The following call still evaluates a 20 EUR fixture. The test asserts the literal.

`buyStock()` always returns `HUMAN_GATE_REQUIRED`. It does not ask the approval center.

`crashIsolation()` throws and catches `Error` in the same function, then calls `dispatch` for Esat. That is a local control-flow check.

`assessVoice()` sets `webrtcCode: true` without a signaling room. `server/lib/voice/signaling.js` is not in the import set.

Live operations receives `TEST_COMPLETE` and `INTEGRATION_COMPLETE` from constants. Its only executed evidence in this contract is `liveVerified: false`.

`evaluateOffer()` returns `salesEnabled: false` as a constant. Process sales state comes from `isSalesEnabled()`, which is a different check.

## Module findings

### Core — VERIFIED_PARTIAL

The registry in `server/lib/commerce/engineRegistry.js` is an 11-row frozen list with `anyLive: false`. The durable queue in the temp directory accepts a task, rejects a second insert of the same idempotency key, stores a quoted key as data, and returns the task after close and reopen.

The registry does not implement the engines. Logging, retry, and the database-backed commerce path are outside this contract. Importing the contract opens the temp WhatsApp sqlite described above.

### E-commerce — VERIFIED_PARTIAL

The snapshot search for `brems` and the refund helper are real calls. The customer, order, notification, and returns steps are literals. `orderService.js` and `checkoutService.js` are not loaded. Sales activation and payment activation remain approval items.

### Council — VERIFIED_PARTIAL

`SEED_IDS` has 17 entries. Personal memory in `server/lib/pusat/memory.js` denies a cross-owner read. `STOCK_BUY` stays out of `APPROVED`. Assigning Sinan's voice to Mira returns a refusal.

`createApprovalCenter()` auto-approves a low-risk action when the action is absent from `NEVER_AUTO`. Pusat's enqueue path skips the `ASSIGN_TASK` check when `ownerId` is `pusat`. The crash helper does not stop an agent runtime.

### Catalog — VERIFIED_PARTIAL

`pimReadOnlyAdapter.js` reads the isolated JSON snapshot and requires `fs` and `path`. The mapped search result used by the contract has price `UNKNOWN` and does not contain `12.34`. `validateHierarchy()` reads the 50-category master and returns `TAXONOMY_DATA_REQUIRED`.

The value `../buzzard.db` is used as a snapshot key. This audit did not execute the storefront browser, SEO, or responsive suites.

### EU27 — VERIFIED_PARTIAL

`EU_COUNTRY_CODES` has 27 members. `registryComplete()` returns `EU27_REGISTRY_INCOMPLETE` for all 27 codes. Germany 0.19 and France 0.20 are values already stored in `data/global/market_country_overlay.json`. Customs, sanctions, holidays, and local payment methods are not called by this contract. Official register rows are still required.

### Pricing — VERIFIED_PARTIAL

`decideAsset()` accepts EUR and rejects BTC, ETH, USDT, USDC, CBDC, `digital_euro`, and `ZZZ`. `quoteRate()` returns `FX_RATE_UNKNOWN` for EUR/PLN and does not invent a rate. The minimum net constant is 0.50 EUR. An AI policy-change request is denied.

The accepted 20 EUR quote is a fixture. `categoryMargin: 0.12` is passed by the caller. A sourced FX feed is absent.

### Logistics — VERIFIED_PARTIAL

`supplierSnapshot()` keeps quantity 4 on timeout and returns `UNKNOWN` for an empty payload. `foldTracking()` ignores a delivered event that arrives before pickup and sets `live: false`. `buyStock()` is the constant refusal above.

`carrierContract.js` is loaded through the require chain and is not called by the journey. No shipment is created. Carrier credentials and supplier order channels remain external. Stock purchase and supplier payment remain approval items.

### Security — VERIFIED_PARTIAL

`evaluateEgress()` denies `https://api.openai.com/v1/models`. The policy file default is `DENY`. One idempotency key containing SQL text is stored through a bound parameter, and the queue still reopens.

The locale value `<script>` misses a snapshot key. CSRF, session, rate-limit, and SSRF suites were not executed in this audit. The module-wide `SECURITY_VERIFIED` claim is not earned by these checks. A security-policy change remains an approval item.

### Voice — VERIFIED_PARTIAL

The identity records for Sinan, Mira, Leon, Amelia, Adrian, and Zeynep exist, with `cloneAuthorized: false`. Cross-identity voice assignment is refused. `assessVoice().liveCalls` is false.

`signaling.js` documents in-process signaling with `liveMedia: false`, and this contract does not load it. SIP, STT, TTS, TURN/STUN, lip sync, and a 3D body are absent. A live call and an official character change remain approval items.

### Live operations — BLOCKED_APPROVAL

The contract records `liveVerified: false` and `productionReady: false`. It makes no banking, tax, monitoring, or marketplace call for this module. Deployment, a live connector, a bank transfer, and payment activation are in the human-approval set. Banks, carriers, suppliers, and tax systems are external.

## Prioritized remaining work

1. Replace the literal customer, order, notification, and returns steps with the existing closed engines.
2. Stop emitting `TEST_COMPLETE`, `INTEGRATION_COMPLETE`, `SECURITY_VERIFIED`, and `PERFORMANCE_TESTED` from the producer.
3. Make the acceptance test recompute fiat, memory, and registry results.
4. Remove the import-time WhatsApp sqlite on the `workflowChain.js` require chain.
5. Call the existing carrier adapters from the logistics step without creating a shipment.
6. Obtain official EU27 register rows before any complete-registry claim.
7. Leave live PIM, voice media, payments, supplier purchases, and shipments blocked.

# BUZZARD — Missing / Partial Features Master List

Evidence-first inventory. Class: **B** partial · **C** placeholder · **D** missing · **E** blocked external · **F** broken.

## Commerce core

| ID | Feature | Class | Evidence |
|----|---------|-------|----------|
| MF-ORD-01 | Unified order management (single SoT) | B/F | `orderManagementOrchestrator.js` only imported by `phase6OrderManagement.js`; checkout uses `ordersPlugin.js` / `orderService` |
| MF-ORD-02 | Idempotent production order pipeline | B | Dry journey only; no cross-engine idempotency test across DB + JSON |
| MF-ORD-03 | Partial cancellation | G | Not traced in audit |
| MF-ORD-04 | Supplier order forward (live) | E | `forwardDrySupplierOrder`; dev-list #20 LIVE_BLOCKED |
| MF-PAY-01 | Payment capture | E | `paymentSandbox.capture()` always refuses; dev-list #28 |
| MF-PAY-02 | Money refund | E | `refundMoney()` sandbox; dev-list #30 |
| MF-PAY-03 | Banking reconciliation (live) | E | `financeOpsSnapshot` reports `filingLive: false` |
| MF-SUP-01 | Live supplier API / TecDoc | E | dev-list #19, #20 |
| MF-SUP-02 | `supplierOrderOrchestrator` integration | D | **Zero** `require()` references in repo (grep) |
| MF-INV-01 | Single inventory SoT | B | `inventoryIntegration`, `wmsInventory`, `fulfillmentStore` parallel |
| MF-PRI-01 | Live price publish to storefront | B/E | Loss block in dry-run; live write `PRICE_LIVE_WRITE` blocked in phase 5 |

## Product & catalog

| ID | Feature | Class | Evidence |
|----|---------|-------|----------|
| MF-PIM-01 | Product SoT consolidation | B | `productSot.js` → `productCore`; legacy `productStore`, `productCatalogPim` plugins remain |
| MF-PIM-02 | Live search index | B | `catalogSearchSort` — `liveIndex: false` in phase 20 check |
| MF-PIM-03 | Variant matrix (all categories) | G | L2 profiles exist; per-category live SKU matrix not fully audited |
| MF-CAT-01 | Filters on live catalog DB | B | In-memory sort tests; storefront bridge not exhaustively audited |

## Logistics

| ID | Feature | Class | Evidence |
|----|---------|-------|----------|
| MF-LOG-01 | Live carrier rates | E | dev-list #41 |
| MF-LOG-02 | Label generation (live) | B | `carrierContract.createShipment` → `HUMAN_GATE_REQUIRED` |
| MF-LOG-03 | Lost-shipment automation | G | Timeline states `UNKNOWN` in `returnsEngine.startReturn` sample |

## Marketplace

| ID | Feature | Class | Evidence |
|----|---------|-------|----------|
| MF-MKT-01 | OAuth token refresh (live) | E | Connectors `configured: false, live: false` in `shippingConnectorRegistry` pattern |
| MF-MKT-02 | Stock/price sync (live) | E | Dry `publishListing` in `preflightListing` |
| MF-MKT-03 | Order import from marketplaces | G | Not verified end-to-end |
| MF-MKT-04 | Duplicate hub stacks | B | `marketplaceHub.js`, `marketplaceV35.js`, `marketplaceSandboxPlugin` |

## Textile AI

| ID | Feature | Class | Evidence |
|----|---------|-------|----------|
| MF-TEX-01 | Real virtual try-on / vision model | C/E | `textileProgram.js` “skeleton”; `demoTryOn` only |
| MF-TEX-02 | Mobile camera pipeline | D/G | Not found as production path |

## Customer service

| ID | Feature | Class | Evidence |
|----|---------|-------|----------|
| MF-CS-01 | Production inbound email (IMAP) | E | `incomingEmailProcessor` — unit-level only |
| MF-CS-02 | Verified-sender order disclosure policy | B | `verifySender()` exists; full abuse matrix not audited |
| MF-CS-03 | Auto-send without approval | B | `draftEmail` sets `autoSendAuthorized: false` |

## Pusat / AI

| ID | Feature | Class | Evidence |
|----|---------|-------|----------|
| MF-AI-01 | Live voice / telephony | E | `automationHealth`: `liveCallsBlocked` |
| MF-AI-02 | 17 agents executing delegated tasks on live data | B | Inventory passes; orchestrator execution not E2E HTTP verified |
| MF-AI-03 | Central memory live write | E | User rule: no Pusat memory modification |

## Storefront & locale

| ID | Feature | Class | Evidence |
|----|---------|-------|----------|
| MF-SF-01 | 30-locale professional translation | B | `productContentI18n` — 29 machine strings per envelope in sample |
| MF-SF-02 | Device attestation (BitLocker/MFA) | C | `deviceStandard.js` — `completeClaim: false` |
| MF-SF-03 | CDN / cache warm | E | Phase 15 `SF_LIVE_CDN` blocked |

## Tax & compliance

| ID | Feature | Class | Evidence |
|----|---------|-------|----------|
| MF-TAX-01 | Tax Connect filing | E | `assessTaxConnect().missing` env keys; dev-list #37 |
| MF-TAX-02 | Live ELSTER | E | `submitElster` dry |

## Security (committed tree)

| ID | Feature | Class | Evidence |
|----|---------|-------|----------|
| MF-SEC-01 | Strong JWT secret enforced at runtime | F/B | `HEAD:dbAuth.js` fallback `DEV_ONLY_CHANGE_ME` |
| MF-SEC-02 | Token revocation on password change | B | Implemented in **uncommitted** `dbAuth.js` only |
| MF-SEC-03 | Production disk JSON migration applied | B/F | `jsonStoreIntegrity.test.mjs` — **6 failing** migration tests on worktree |
| MF-SEC-04 | Admin route matrix completeness | F | `adminRouteMatrix.test.mjs` failure on worktree |

## Marketing

| ID | Feature | Class | Evidence |
|----|---------|-------|----------|
| MF-MKTG-01 | Google/Facebook/TikTok/YouTube adapters | D | No matches in `server/lib/marketing` |
| MF-MKTG-02 | Campaign spend / budgets | D | `campaignDraft` only |

## Performance & ops

| ID | Feature | Class | Evidence |
|----|---------|-------|----------|
| MF-PERF-01 | Load / concurrency certification | E | Phase 20 excludes `PERF_LOAD_TEST` |
| MF-PERF-02 | Dead-letter / retry storm controls | G | Not exhaustively audited |

## Reporting

| ID | Feature | Class | Evidence |
|----|---------|-------|----------|
| MF-REP-01 | Live BI warehouse | E | Phase 19 `ADM_LIVE_BI` |
| MF-REP-02 | Dashboards vs backend truth | B | Integration snapshots are dry |

## Architecture dead / low-use modules (sample)

| Module | Class | Evidence |
|--------|-------|----------|
| `server/lib/adminGuard.js` | D | Zero importers (explore audit) |
| `server/lib/commerce/coreEngineChain.js` | C | Tests only |
| `server/lib/supplier/supplierOrderOrchestrator.js` | D | Zero importers |
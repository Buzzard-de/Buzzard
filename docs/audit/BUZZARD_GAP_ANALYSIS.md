# Buzzard — Gap Analysis

**Audit date:** 2026-10-11  
**Rule:** Architecture ≠ production. Connector file ≠ live integration.  
**Classes:** A implemented+tested · B implemented not prod-verified · C partial · D planned · E not started · F blocked · G N/A · H needs verification.

Each GAP is unique. Dependencies are linked; do not clone the same work under a new name in the roadmap.

---

## GAP-01 — Empty sellable Product SoT

| Field | Value |
|-------|-------|
| Feature | Production-ready product catalog (ACTIVE PIM) |
| Rakip örneği | Every HIGH-confidence marketplace requires a product/offer object before orders |
| Kaynak | Live `catalog.productCount=0`; `docs/PIM.md` |
| Buzzard | C / F — PIM schema yes; 0 active products; 15 JSON / 26 legacy rows |
| Kanıt | `server/lib/pim/productCore.js`; `GET /api/health/production` catalog |
| Eksik | Quality-gated ACTIVE SKUs, single SoT, images, identifiers |
| Müşteri etkisi | Browse taxonomy only; no real assortment |
| Gelir / maliyet | No sellable SKUs → no revenue |
| Otomasyon | High once supplier feed exists |
| Karmaşıklık | L |
| Bağımlılıklar | GAP-02, GAP-03 |
| Güvenlik | Demo SKU leak if published |
| Öncelik | P1 |
| Tamamlanma | Storefront productCount > 0 from PIM; demo guard on; sales still off until P4 |
| Doğrulama | `GET /api/health/production` catalog + listing page vs PIM SKU |

## GAP-02 — No live supplier API/XML/CSV

| Field | Value |
|-------|-------|
| Feature | Real supplier catalog/stock/cost ingest |
| Rakip örneği | Galaxus XML/CSV; Kaufland import-files; Octopia packages |
| Kaynak | Live `supplierIntegration.connected=false` |
| Buzzard | C / F — adapters + dry-run |
| Kanıt | `realSupplierConnector.js`, `.env.example` `REAL_SUPPLIER_*` |
| Eksik | Contract, credentials, mapping, GTIN match at volume |
| Müşteri etkisi | No real stock/price |
| Gelir / maliyet | Manual product entry does not scale |
| Otomasyon | High |
| Karmaşıklık | L–XL (per supplier) |
| Bağımlılıklar | Human supplier access (B-04) |
| Güvenlik | Secret handling; dry-run must stay default |
| Öncelik | P2 |
| Tamamlanma | One non-demo supplier dry-run validated, then live import still gated |
| Doğrulama | Admin dry-run report; no live HTTP until flag + review |

## GAP-03 — Pricing rules not enforced on the sale path

| Field | Value |
|-------|-------|
| Feature | €0.50 min net profit + (optional) €0.10 undercut |
| Rakip örneği | bol offer price/stock; Allegro price-change commands — competitors optimize price; they do **not** publish Buzzard’s €0.10 rule |
| Kaynak | `intelligence/buzzard_intelligence/profit.py`; `server/lib/pricing.js` |
| Buzzard | C — Python CLI enforces €0.50; Node uses 38%/12%; **€0.10 undercut E** |
| Kanıt | `cartService` uses PIM price; no undercut symbol in repo |
| Eksik | Single pricing service used by PIM publish + checkout |
| Müşteri etkisi | Wrong/uncompetitive/unprofitable prices if sales opened |
| Gelir / maliyet | Loss-making SKUs possible |
| Otomasyon | High |
| Karmaşıklık | M |
| Bağımlılıklar | GAP-01, competitor feed (GAP-04) for undercut |
| Güvenlik | Low |
| Öncelik | P3 |
| Tamamlanma | Publish rejected if net < €0.50; undercut only if comparable price source exists |
| Doğrulama | Unit tests on shared pricing module (**currently NOT RUN / missing for undercut**) |

## GAP-04 — No comparable-price feed

| Field | Value |
|-------|-------|
| Feature | Lowest comparable price observation |
| Rakip örneği | Skroutz comparison nature; idealo-style feeds (**DOĞRULANAMADI** as Buzzard integration) |
| Kaynak | Intelligence parsers only |
| Buzzard | E for enforcement |
| Kanıt | No Node/Python guard for €0.10 |
| Eksik | Legal comparable source + refresh |
| Müşteri etkisi | Cannot promise “€0.10 cheaper” |
| Gelir / maliyet | Strategy unexecutable |
| Otomasyon | Medium (once feed exists) |
| Karmaşıklık | L (legal + connectors) |
| Bağımlılıklar | Legal review of scraping vs official APIs |
| Güvenlik / legal | High if unofficial scraping |
| Öncelik | P3 after a lawful source exists; otherwise keep rule **unclaimed** |
| Tamamlanma | Documented source + stored comparable + audit |
| Doğrulama | Golden fixtures from that source |

## GAP-05 — Checkout / payment / order not commercially live

| Field | Value |
|-------|-------|
| Feature | Paid order with idempotent payment + stock check |
| Rakip örneği | All HIGH-confidence marketplaces |
| Kaynak | Live `mockPaymentOnly: true`, orders=0 |
| Buzzard | C / F |
| Kanıt | `checkoutService.js`, `paymentService.js`, `docs/PAYMENTS.md` |
| Eksik | PSP live, webhook verify, reservation, sales flag after human approval |
| Müşteri etkisi | Cannot buy |
| Gelir / maliyet | Direct |
| Otomasyon | Medium |
| Karmaşıklık | L |
| Bağımlılıklar | GAP-01, GAP-03, B-01, B-05 |
| Güvenlik | PCI — never store PAN; webhook signatures |
| Öncelik | P4 |
| Tamamlanma | Test charge + webhook + order row + sales still can stay off until approved |
| Doğrulama | Sandbox E2E (suite exists, **NOT RUN**) |

## GAP-06 — Supplier order forward / dropship

| Field | Value |
|-------|-------|
| Feature | Route paid order to supplier, track ack/fail |
| Rakip örneği | Octopia/OTTO order+shipment; Galaxus XML orders |
| Kaynak | `submitSupplierOrder` blocked; worker `supplierOrdersBlocked: true` |
| Buzzard | C / F |
| Kanıt | `orderService.js`, `fulfillmentPipeline.js` DEMO refs |
| Eksik | Real supplier order API, retry, idempotency across supplier |
| Müşteri etkisi | Order cannot be fulfilled |
| Gelir / maliyet | Cancel/refund cost |
| Otomasyon | High |
| Karmaşıklık | L |
| Bağımlılıklar | GAP-02, GAP-05 |
| Güvenlik | Duplicate order risk |
| Öncelik | P4 |
| Tamamlanma | One dry-run then one controlled live order with human watch |
| Doğrulama | Idempotency replay test |

## GAP-07 — Returns + supplier recovery not closed-loop

| Field | Value |
|-------|-------|
| Feature | Customer refund vs supplier credit vs actual profit |
| Rakip örneği | Skroutz Returns API; Zalando announced-returns; Galaxus returns XML |
| Kaynak | `returnsRma.js`; missing `/api/admin/returns` |
| Buzzard | C / E |
| Kanıt | `lib/returnRecovery/client.ts` |
| Eksik | Storefront UI, real refund, supplier recovery confirmation (**never auto-assume**) |
| Müşteri etkisi | Cannot return; finance wrong |
| Gelir / maliyet | Hidden loss if supplier never pays |
| Otomasyon | Medium; human mandatory on disputes |
| Karmaşıklık | L |
| Bağımlılıklar | GAP-05, GAP-06 |
| Güvenlik | Refund fraud |
| Öncelik | P4 |
| Tamamlanma | Recovery states Expected vs Confirmed; unrecoveredAmount visible |
| Doğrulama | Fixture: customer refunded, supplier not credited |

## GAP-08 — EU marketplace connectors

| Field | Value |
|-------|-------|
| Feature | Channel listing/stock/price/order for DE/NL/PL/FR/RO/GR |
| Rakip örneği | Allegro, OTTO, Kaufland, bol, Octopia, eMAG, Skroutz (see matrix) |
| Kaynak | `marketplaceHub.js` Amazon/eBay/Google/TikTok rows only |
| Buzzard | D / E |
| Kanıt | No Kaufland/Allegro/bol/OTTO/eMAG/Skroutz clients |
| Eksik | Per-channel auth, sandbox, listing, sync, orders, returns |
| Müşteri etkisi | Buzzard is a single shop, not a multi-channel seller OS |
| Gelir / maliyet | Missed channel GMV; **not** required to open own-shop catalog |
| Otomasyon | High after first connector pattern |
| Karmaşıklık | XL |
| Bağımlılıklar | GAP-01–07 (own path first) |
| Güvenlik | OAuth secret store |
| Öncelik | P5 — after own-shop order path |
| Tamamlanma | One channel sandbox: list, stock, price, ingest order, cancel |
| Doğrulama | Channel playground (e.g. Kaufland) |

## GAP-09 — Real carrier tracking (not GPS unless provided)

| Field | Value |
|-------|-------|
| Feature | Label + tracking number + carrier status events + customer notify |
| Rakip örneği | Allegro Ship with Allegro; Skroutz Last Mile voucher; OTTO shipments |
| Kaynak | Live carriers all false |
| Buzzard | C — simulated DEMO tracking |
| Kanıt | `commercialIntegrations.js`, `logisticsFulfillment.js` |
| Eksik | Carrier API, webhooks, delay/lost flows |
| Müşteri etkisi | No trustworthy tracking |
| Gelir / maliyet | Support load |
| Otomasyon | High for status; **GPS G** unless carrier offers it |
| Karmaşıklık | M per carrier |
| Bağımlılıklar | GAP-06 |
| Güvenlik | PII in addresses |
| Öncelik | P6 |
| Tamamlanma | One carrier: label + public tracking URL + event log (no fake GPS) |
| Doğrulama | Sandbox shipment |

## GAP-10 — AI / orchestrator not bound to real SoT

| Field | Value |
|-------|-------|
| Feature | Specialist agents that read/write real catalog, price, orders with approval |
| Rakip örneği | Competitor internal AI **DOĞRULANAMADI**; buyer-facing chat is common marketing |
| Kaynak | Python `mode: simulation`; live `/tmp` DBs; LLM NOT_CONFIGURED |
| Buzzard | C |
| Kanıt | `buzzard_orchestrator.py`, `aiOrchestrator.js`, live health |
| Eksik | Durable memory, tool bindings, Pusat-on-main (name unused) |
| Müşteri etkisi | Chat is FAQ/rules only |
| Gelir / maliyet | Manual ops stay manual |
| Otomasyon | High **after** GAP-01–07 |
| Karmaşıklık | L |
| Bağımlılıklar | SoT, approvals, persist orchestrator disk |
| Güvenlik | AI must not enable sales or spend without approval |
| Öncelik | P7 |
| Tamamlanma | One agent reads live PIM count and cannot mutate without approval log |
| Doğrulama | Audit log row + no `/tmp` loss after restart |

## GAP-11 — Voice / digital human

| Field | Value |
|-------|-------|
| Feature | STT/TTS/phone/WebRTC avatar |
| Rakip örneği | Not a core Allegro/OTTO/bol seller capability — **not required to compete on catalog** |
| Kaynak | Not on `main`; PRs #386–#392 open |
| Buzzard | E on production |
| Kanıt | `phone_production.json` enabled false |
| Eksik | Entire realtime stack |
| Müşteri etkisi | None for first sales |
| Gelir / maliyet | Costly; early = düşük |
| Otomasyon | CS deflection later |
| Karmaşıklık | XL |
| Bağımlılıklar | Telephony contract, TURN, privacy |
| Güvenlik | Call recording GDPR |
| Öncelik | P9 (after P8) |
| Tamamlanma | Separate production review; sales remain locked |
| Doğrulama | Live call test — not done |

## GAP-12 — Search / filter / personalization depth

| Field | Value |
|-------|-------|
| Feature | Brand/price facets, relevance, personalized ranking |
| Rakip örneği | Allegro listing filters; bol offer search — consumer UX |
| Kaynak | `ProductsFilterSidebar` category-centric |
| Buzzard | C / E |
| Kanıt | `lib/products/service.ts` |
| Eksik | Facets, personalization (**DOĞRULANAMADI** that competitors’ ranking is AI) |
| Müşteri etkisi | Hard to shop large catalogs |
| Gelir / maliyet | Conversion |
| Otomasyon | Medium |
| Karmaşıklık | M |
| Bağımlılıklar | GAP-01 (need products first) |
| Güvenlik | Low |
| Öncelik | P9 after catalog volume |
| Tamamlanma | Brand + price facets on PLP with tests |
| Doğrulama | Playwright mobile+desktop **NOT RUN** today |

## GAP-13 — Observability, CI tests, fraud

| Field | Value |
|-------|-------|
| Feature | E2E in CI, APM, fraud/rate-limit durability |
| Rakip örneği | Official seller APIs all rate-limit; fraud internals **DOĞRULANAMADI** |
| Kaynak | CI has no unit/e2e; redis NOT_CONFIGURED; DSN empty |
| Buzzard | C |
| Kanıt | `.github/workflows/ci.yml`; live redis |
| Eksik | Test gate, alerting, fraud rules beyond lockout |
| Müşteri etkisi | Silent breakage |
| Gelir / maliyet | Incident cost |
| Otomasyon | Medium |
| Karmaşıklık | M |
| Bağımlılıklar | None for adding tests |
| Güvenlik | Medium |
| Öncelik | P8 (can start in parallel) |
| Tamamlanma | CI runs `test:unit` + a smoke e2e; error DSN set |
| Doğrulama | Green CI on those jobs |

## GAP-14 — Multi-country operational VAT / IOSS / invoices

| Field | Value |
|-------|-------|
| Feature | Charge/collect/report VAT per market for real orders |
| Rakip örneği | eMAG VAT fields; Zalando ZFS intra-community reports; Octopia VAT on offers |
| Kaynak | Display VAT in `market-engine`; tax provider unset |
| Buzzard | C |
| Kanıt | `.env.example` `TAX_PROVIDER_*` empty; live `tax: false` |
| Eksik | Fiscal representative / IOSS / invoice provider |
| Müşteri etkisi | Illegal or incorrect invoices if sales open EU-wide |
| Gelir / maliyet | Compliance fines |
| Otomasyon | High after provider |
| Karmaşıklık | L (legal + provider) |
| Bağımlılıklar | Legal entity; GAP-05 |
| Güvenlik / legal | High |
| Öncelik | P4 for DE-first; P8 before 27-country sales |
| Tamamlanma | DE B2C invoice correct; other markets flagged `testing` until ready |
| Doğrulama | Accountant review — not a unit test |

## Features that are **not** gaps for first competition

| ID | Feature | Why G or late |
|----|---------|---------------|
| GAP-G1 | Own warehouse / FBB / ZFS / FBS | Buzzard dropship model |
| GAP-G2 | Native iOS/Android apps | Responsive web sufficient initially |
| GAP-G3 | Zalando fashion partner stack | Category mismatch |
| GAP-G4 | Competitor-scale 50M SKU marketing claims | Not a technical requirement |

---

## Priority roll-up (see roadmap)

P1 SoT → P2 Supplier → P3 Price/stock rules → P4 Order/pay/return → P5 Marketplaces → P6 Carriers → P7 AI bind → P8 Hardening → P9 UX/voice extras.

P8 test/observability may run **in parallel** from P1 (reason: no dependency on sales).

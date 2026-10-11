# Buzzard — Not Started

**Audit date:** 2026-10-11  
**Definition:** Features with no meaningful implementation on `main` (`84166bb`), or only a name/plan/unmerged PR.  
**Related:** `BUZZARD_PARTIAL_AND_BLOCKED.md` (partial/blocked), `BUZZARD_CURRENT_STATE.md` (inventory).

This list does **not** repeat partial engines. If a skeleton or dry-run path exists, it is Partial, not Not Started.

---

## Customer storefront

| ID | Feature | Evidence | Notes |
|----|---------|----------|-------|
| NS-01 | Customer account return-request UI | No `app/konto` return form; only admin RMA | Customers cannot file a return on the live site |
| NS-02 | Brand facet UI (checkbox / brand list) | `filterProducts()` matches brand text; no facet component | `?q=marken` is a search, not a filter |
| NS-03 | Price-range filter UI | Sort `price-asc` / `price-desc` only | Prices hidden while sales locked anyway |
| NS-04 | Dedicated storefront search results page / typeahead engine | Header `q` → `/products/` | Advanced-search API is admin/API, not a shop search UX |
| NS-05 | Live map / GPS parcel tracking | No map component; no carrier GPS client | Cannot be built unless a carrier supplies location; today even status events are simulated |
| NS-06 | Accessibility audit / WCAG evidence | Skip link only | No axe/Lighthouse a11y gate in CI |

## Pricing and competition

| ID | Feature | Evidence | Notes |
|----|---------|----------|-------|
| NS-07 | **€0.10 under lowest comparable price** | Repo-wide search: no calculator, no guard, no test | Not documented in Node pricing; not in `profit.py` |
| NS-08 | Checkout-time net-profit floor (€0.50) | `MIN_NET_PROFIT` exists only in Python intelligence CLI | Cart uses stored PIM price (`cartService`) |
| NS-09 | Automated competitor-price → PIM update loop | Intelligence CLI / parsers only | Not connected to `priceSync.js` (dry-run) |

## Returns and finance

| ID | Feature | Evidence | Notes |
|----|---------|----------|-------|
| NS-10 | Return Recovery engine (supplier credit vs customer refund) | Types + `AdminReturnsPanel` → `/api/admin/returns` **missing** | Do not auto-assume supplier refund |
| NS-11 | Return-abuse detection | No module in `returnsRma.js` | |
| NS-12 | Actual vs estimated profit on a return | Profit engine not linked to RMA | |
| NS-13 | Live PSP reconciliation / settlement import | Finance tables only | Stripe/PayPal live path off |
| NS-14 | Customer-facing invoice / VAT document generation for real orders | Templates/data exist; 0 orders | No proven invoice pipeline |

## Marketplace connectors (EU set requested)

| ID | Channel | On `main` | Classification |
|----|---------|-----------|----------------|
| NS-15 | Kaufland Seller API | Market metadata only | NOT_STARTED as connector |
| NS-16 | Allegro REST API | Market metadata only | NOT_STARTED as connector |
| NS-17 | bol.com Retailer API | Market metadata only | NOT_STARTED as connector |
| NS-18 | Cdiscount / Octopia Seller API | Market metadata only | NOT_STARTED as connector |
| NS-19 | OTTO Market API | Market metadata only | NOT_STARTED as connector |
| NS-20 | eMAG Marketplace API | **Not** in `market_engine_extensions.json` | NOT_STARTED |
| NS-21 | Skroutz Smart Cart / FBS API | Not listed | NOT_STARTED |
| NS-22 | Amazon SP-API / eBay Sell API (real) | Hub **rows + job queue**, no API client | Treat hub as D (planned); **live connector NOT_STARTED** |

Amazon/eBay hub code is a local DB queue (`marketplaceHub.js`). That is **not** a started SP-API/Sell integration.

## Logistics

| ID | Feature | Evidence |
|----|---------|----------|
| NS-23 | Real DHL / DPD / GLS / Hermes / UPS label API | `.env.example` keys empty; live carrier flags false; stubs return null tracking |
| NS-24 | Carrier webhook / event sync | Tracking rows inserted locally on label update |
| NS-25 | Delay / lost-package customer workflow | Not implemented |
| NS-26 | Return-shipment carrier label (non-DEMO) | RMA prints `DEMO-` tracking |

## Voice and digital human (on `main`)

| ID | Feature | Evidence |
|----|---------|----------|
| NS-27 | Twilio telephony on production path | Not in `app/` / `server/` |
| NS-28 | OpenAI Realtime | Open PR #392 only — **not merged** |
| NS-29 | WebRTC signaling / media / ICE / TURN / STUN | Not on `main` |
| NS-30 | Digital-human avatar / live video | Open PRs #389–#391 only |
| NS-31 | Call recording + customer verification + live handoff | Config `enabled: false`; demo stubs |

## AI actions (not prompts)

| ID | Feature | Evidence |
|----|---------|----------|
| NS-32 | AI role that mutates live price/stock/order against production SoT | Python agents `mode: simulation`; Node `AI_PROVIDER=rules` |
| NS-33 | Durable Pusat / orchestrator memory | Live orchestrator DB is `/tmp/buzzard_orchestrator.db` |
| NS-34 | Durable Guardian memory | Live guardian DB is `/tmp/buzzard_guardian.sqlite3` |

## Test and operations

| ID | Feature | Evidence |
|----|---------|----------|
| NS-35 | Unit + Playwright in CI | `.github/workflows/ci.yml` has no `test:unit` / `test:e2e` |
| NS-36 | Load / performance test suite | No k6/locust/JMeter project |
| NS-37 | Scheduled production DB backup cron | Backup **files** exist; `schedulerEnv: null` |
| NS-38 | APM / error tracking wired | `ERROR_TRACKING_DSN` empty |
| NS-39 | Redis / Upstash rate-limit store | Live `redis.status=NOT_CONFIGURED` |
| NS-40 | Email translations for all 30 locales | `lib/email/templates.ts` samples de/en/tr/ar |

## Explicitly not applicable (do not start as “warehouse”)

| ID | Feature | Why G |
|----|---------|-------|
| NS-G1 | Buzzard-owned physical stock purchase / WMS go-live | Business model: no own warehouse. `wmsInventory.js` is optional and must stay unused unless the model changes. |

---

## Unmerged work that must not be counted as started on production

PRs #368, #378, #386–#392 mention Pusat, Realtime, digital human. Until merged to `main` and proven live, they remain **not started in production**.

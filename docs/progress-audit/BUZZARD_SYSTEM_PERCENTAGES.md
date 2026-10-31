# Buzzard System Percentages

Timestamp: 2026-10-11T10:24:35Z. Application `84166bb`.

## Weighting (A–M = 100%)

| ID | System | Weight | Impl % | Ops % | Remaining impl % |
|----|--------|--------|--------|-------|------------------|
| A | Storefront and customer experience | 10% | 78.2% | 53.2% | 21.8% |
| B | Internationalization and markets | 7% | 83.3% | 50.9% | 16.7% |
| C | Product and catalog | 12% | 49.3% | 8.6% | 50.7% |
| D | Supplier and inventory | 12% | 38.7% | 1.8% | 61.3% |
| E | Pricing and financial logic | 10% | 33.8% | 5.9% | 66.2% |
| F | Orders, payments, and returns | 12% | 43.2% | 0.0% | 56.8% |
| G | Marketplaces | 8% | 15.2% | 1.0% | 84.8% |
| H | Shipping and tracking | 6% | 27.6% | 1.9% | 72.4% |
| I | AI and automation | 8% | 33.0% | 10.8% | 67.0% |
| J | Voice and digital human | 2% | 6.2% | 0.0% | 93.8% |
| K | Administration and analytics | 4% | 65.0% | 14.2% | 35.0% |
| L | Infrastructure and security | 5% | 61.4% | 46.2% | 38.6% |
| M | Software quality and release readiness | 4% | 61.0% | 39.7% | 39.0% |
| | **Weighted totals** | **100%** | **46.5%** | **16.2%** | **53.5%** |

Sales readiness N is excluded from the 100% weights: impl 20.6%, ops 8.1%.

## A. Storefront and customer experience

- Implementation: **78.2%** (`24.25` / `31` × 100)
- Operational: **53.2%** (`16.5` / `31` × 100)
- Remaining (implementation): **21.8%**
- Status: PARTIALLY OPERATIONAL
- Blockers: BUZZARD_SALES_ENABLED=0
- Notes: Customer-visible shell is live. Commerce surfaces are dry-run.

| Requirement | W | Impl frac | Ops frac | Status | Evidence |
|---|---:|---:|---:|---|---|
| A01 Homepage | 3 | 1.0 | 1.0 | VERIFIED | app/page.tsx HomePageContent.tsx; https://buzzard24.de HTTP 200 2026-10-11 |
| A02 Desktop UI | 2 | 1.0 | 0.75 | PARTIALLY VERIFIED | Header Navbar HomeLayout; live site; e2e homepage-viewports.spec.ts NOT RUN |
| A03 Mobile UI | 3 | 1.0 | 0.75 | PARTIALLY VERIFIED | components/mobile/* styles/buzzard-mobile.css; live CSS; e2e mobile-category-overlay NOT RUN |
| A04 Tablet / responsive | 2 | 0.75 | 0.5 | PARTIALLY VERIFIED | storefront-responsive.css PHONE_MEDIA_QUERY; tablet e2e NOT RUN |
| A05 Header / nav / bottom nav | 2 | 1.0 | 0.75 | PARTIALLY VERIFIED | MobileHeader CategorySidebar MegaMenuOverlay; live |
| A06 Search | 2 | 0.5 | 0.5 | CODE ONLY | Header q → /products/; no dedicated search engine page |
| A07 Category navigation | 3 | 1.0 | 0.75 | PARTIALLY VERIFIED | getVisibleMainCategories() 50 L1; live mega menu / phone drawer |
| A08 Product detail pages | 2 | 0.75 | 0.25 | CODE ONLY | app/produkt/[slug]; catalog.productCount=0 live |
| A09 Cart | 2 | 0.75 | 0.5 | PARTIALLY VERIFIED | app/warenkorb; UI live; no sellable SKUs |
| A10 Customer account | 2 | 0.75 | 0.25 | NOT TESTED | app/konto/*; production login NOT attempted |
| A11 Checkout | 3 | 0.5 | 0.0 | BLOCKED | app/checkout + checkoutService dry-run |
| A12 Legal pages | 2 | 1.0 | 1.0 | VERIFIED | impressum datenschutz agb routes live |
| A13 Customer notifications | 2 | 0.25 | 0.0 | CODE ONLY | lib/email/templates.ts samples; SMTP not verified live |
| A14 Accessibility / UX quality | 1 | 0.25 | 0.0 | NOT TESTED | SkipLink + some aria-*; no a11y CI |

## B. Internationalization and markets

- Implementation: **83.3%** (`22.5` / `27` × 100)
- Operational: **50.9%** (`13.75` / `27` × 100)
- Remaining (implementation): **16.7%**
- Status: PARTIALLY OPERATIONAL

| Requirement | W | Impl frac | Ops frac | Status | Evidence |
|---|---:|---:|---:|---|---|
| B15 30-locale infrastructure | 3 | 1.0 | 0.75 | PARTIALLY VERIFIED | lib/i18n/supported-locales.json 30 locales; live selector |
| B16 Translation completeness | 3 | 0.75 | 0.5 | PARTIALLY VERIFIED | 30 TS modules; email/product not all 30; tests NOT RUN |
| B17 Language selector | 2 | 1.0 | 0.75 | PARTIALLY VERIFIED | i18n context; live UI |
| B18 Market / country selector | 2 | 1.0 | 0.75 | PARTIALLY VERIFIED | 35 countries global_countries_35.json; live UI |
| B19 Language-market independence | 3 | 1.0 | 0.5 | NOT TESTED | languageIndependence.test.ts exists NOT RUN |
| B20 Arabic RTL | 2 | 1.0 | 0.5 | NOT TESTED | styles/rtl.css applyDocumentDirection; e2e NOT RUN |
| B21 Currency / price presentation | 2 | 0.75 | 0.5 | CODE ONLY | market-engine/price.ts; prices hidden while sales off |
| B22 EU + 35 market config | 3 | 1.0 | 0.75 | PARTIALLY VERIFIED | 27 EU + TR + GCC + EG in JSON |
| B23 VAT engine | 3 | 0.75 | 0.25 | CODE ONLY | vat.ts display; live tax:false; no invoices |
| B24 Shipping rules by market | 2 | 0.5 | 0.25 | CODE ONLY | buzzard_europe_shipping.json; not carrier-backed |
| B25 Market legal / operational rules | 2 | 0.25 | 0.0 | NOT IMPLEMENTED | DE legal pages only; IOSS/multi-market ops absent |

## C. Product and catalog

- Implementation: **49.3%** (`17.25` / `35` × 100)
- Operational: **8.6%** (`3.0` / `35` × 100)
- Remaining (implementation): **50.7%**
- Status: CODE ONLY / BLOCKED
- Blockers: empty ACTIVE catalog, empty catalog

| Requirement | W | Impl frac | Ops frac | Status | Evidence |
|---|---:|---:|---:|---|---|
| C26 Product Source of Truth | 3 | 0.5 | 0.0 | CODE ONLY | PIM Core + JSON + products table dual SoT; live productCount=0 |
| C27 PIM | 3 | 0.75 | 0.25 | PARTIALLY VERIFIED | server/lib/pim/productCore.js; pim_core tables present in integrity |
| C28 Canonical product model | 3 | 0.75 | 0.25 | CODE ONLY | SKU EAN GTIN brand category variants media schema |
| C29 Product creation automation | 2 | 0.25 | 0.0 | CODE ONLY | importPipeline dry-run; productAi stub |
| C30 Normalization | 2 | 0.5 | 0.0 | CODE ONLY | normalizedModels.js supplier import |
| C31 Deduplication | 2 | 0.5 | 0.0 | CODE ONLY | productDuplicateDetector.js |
| C32 Validation | 3 | 0.75 | 0.0 | NOT TESTED | productValidationPipeline.js; part22 NOT RUN |
| C33 Category mapping | 3 | 0.75 | 0.5 | PARTIALLY VERIFIED | 53 L1 JSON / 50 visible; live taxonomy.count=53 |
| C34 Attributes | 2 | 0.5 | 0.0 | CODE ONLY | attributes JSON on PIM row |
| C35 Variants | 2 | 0.5 | 0.0 | CODE ONLY | variant tables; unpopulated live |
| C36 Images / media | 2 | 0.25 | 0.0 | CODE ONLY | media schema; health images=0 |
| C37 Multilingual product content | 2 | 0.5 | 0.0 | CODE ONLY | i18nCatalog.js productTranslation.ts |
| C38 Catalog quality / completeness | 3 | 0.25 | 0.0 | BLOCKED | quality readiness modules; 0 ACTIVE |
| C39 Sellable catalog readiness | 3 | 0.0 | 0.0 | BLOCKED | live catalog.productCount=0 |

## D. Supplier and inventory

- Implementation: **38.7%** (`16.25` / `42` × 100)
- Operational: **1.8%** (`0.75` / `42` × 100)
- Remaining (implementation): **61.3%**
- Status: CODE ONLY / BLOCKED
- Blockers: REAL_SUPPLIER_DRY_RUN=1 / no credentials, sales/supplier flags, supplierOrdersBlocked

| Requirement | W | Impl frac | Ops frac | Status | Evidence |
|---|---:|---:|---:|---|---|
| D40 Supplier integration framework | 3 | 0.75 | 0.25 | PARTIALLY VERIFIED | server/lib/supplier/* registry adapters safety; live adapterMode=MOCK |
| D41 Live supplier connectors | 3 | 0.25 | 0.0 | BLOCKED | realSupplierConnector.js gated |
| D42 API integrations | 3 | 0.5 | 0.0 | CODE ONLY | apiSupplierAdapter.js networkBlocked:true |
| D43 XML integrations | 2 | 0.5 | 0.0 | CODE ONLY | xmlSupplierAdapter.js |
| D44 CSV imports | 2 | 0.5 | 0.0 | CODE ONLY | csvSupplierAdapter.js |
| D45 Manual supplier imports | 2 | 0.5 | 0.0 | CODE ONLY | pim import scripts dry-run |
| D46 Supplier stock sync | 3 | 0.5 | 0.0 | CODE ONLY | stockSync.js simulated when dryRun |
| D47 Supplier price sync | 3 | 0.5 | 0.0 | CODE ONLY | priceSync.js simulated |
| D48 Availability validation | 2 | 0.25 | 0.0 | CODE ONLY | supplierHealth capability matrix |
| D49 Supplier selection logic | 2 | 0.5 | 0.0 | CODE ONLY | supplierHub.searchSourcing |
| D50 Dropshipping workflow | 3 | 0.25 | 0.0 | BLOCKED | flags on rows; submit blocked |
| D51 Supplier PO generation | 3 | 0.25 | 0.0 | BLOCKED | orderService.submitSupplierOrder 403 |
| D52 Supplier order confirmation | 3 | 0.0 | 0.0 | NOT IMPLEMENTED | no live ack path |
| D53 Cancel / failure handling | 2 | 0.25 | 0.0 | CODE ONLY | error types; not live |
| D54 Inventory consistency | 3 | 0.25 | 0.0 | CODE ONLY | PIM stock field; no reservation |
| D55 Fail-closed stock validation | 3 | 0.5 | 0.0 | CODE ONLY | cartService.validateStockForCheckout reservation:false |

## E. Pricing and financial logic

- Implementation: **33.8%** (`11.5` / `34` × 100)
- Operational: **5.9%** (`2.0` / `34` × 100)
- Remaining (implementation): **66.2%**
- Status: PARTIAL
- Notes: Do not score a rule complete unless checkout uses it. Checkout uses PIM product.price.

| Requirement | W | Impl frac | Ops frac | Status | Evidence |
|---|---:|---:|---:|---|---|
| E56 Central pricing engine | 3 | 0.5 | 0.25 | CODE ONLY | pricing.js 38%/12% vs profit.py; not unified |
| E57 Supplier cost calculation | 3 | 0.5 | 0.0 | CODE ONLY | priceEngine.js cost+margin; cart uses stored PIM price |
| E58 Shipping cost calculation | 3 | 0.5 | 0.0 | CODE ONLY | static shipping JSON / DB rates |
| E59 Marketplace commission | 2 | 0.25 | 0.0 | CODE ONLY | Python profit marketplace_fee; not Node checkout |
| E60 VAT calculation | 3 | 0.75 | 0.25 | CODE ONLY | lib/market-engine/vat.ts display |
| E61 Return / refund reserve | 2 | 0.0 | 0.0 | NOT IMPLEMENTED | no reserve in pricing.js or cart |
| E62 €0.50 minimum net profit | 3 | 0.5 | 0.0 | CODE ONLY | intelligence/buzzard_intelligence/profit.py MIN_NET_PROFIT; NOT in cartService.resolveAuthoritativePrice |
| E63 €0.10 undercut rule | 3 | 0.0 | 0.0 | NOT IMPLEMENTED | no symbol in Node/Python pricing calculators |
| E64 Category margin rules | 2 | 0.25 | 0.0 | CODE ONLY | DEFAULT_MARGIN=0.30 MIN_MARGIN=0.12 global only |
| E65 Price consistency storefront/marketplaces | 3 | 0.0 | 0.0 | NOT IMPLEMENTED | no channel price publish |
| E66 Rounding / FX | 2 | 0.5 | 0.25 | CODE ONLY | money.ts rounding; FX_PROVIDER unset live tax/fx false |
| E67 Loss-making sale prevention | 3 | 0.25 | 0.0 | CODE ONLY | meetsMinimumMargin 12%; not €0.50; not on checkout |
| E68 Financial reconciliation | 2 | 0.25 | 0.0 | CODE ONLY | paymentsFinance tables; no PSP settlement |

## F. Orders, payments, and returns

- Implementation: **43.2%** (`19.0` / `44` × 100)
- Operational: **0.0%** (`0.0` / `44` × 100)
- Remaining (implementation): **56.8%**
- Status: CODE ONLY / BLOCKED
- Blockers: mockPaymentOnly, sales lock, supplierOrdersBlocked

| Requirement | W | Impl frac | Ops frac | Status | Evidence |
|---|---:|---:|---:|---|---|
| F69 Order engine | 3 | 0.75 | 0.0 | CODE ONLY | orderService.js checkoutService.js; live orders=0 |
| F70 Order lifecycle | 3 | 0.75 | 0.0 | CODE ONLY | commerceConstants status transitions |
| F71 Order validation | 2 | 0.5 | 0.0 | CODE ONLY | checkout validation; dry-run |
| F72 Payment provider integration | 3 | 0.5 | 0.0 | BLOCKED | Stripe/PayPal classes return disabled; mock default |
| F73 Payment sandbox tests | 3 | 0.25 | 0.0 | NOT TESTED | part8 + e2e exist NOT RUN |
| F74 Real payment readiness | 3 | 0.25 | 0.0 | BLOCKED | commerce.stripeEnabled=false paypalEnabled=false |
| F75 Payment confirmation / webhooks | 3 | 0.5 | 0.0 | CODE ONLY | webhookFoundation.js; blocked while sales=0 |
| F76 Failed-payment handling | 2 | 0.5 | 0.0 | CODE ONLY | mock path statuses |
| F77 Supplier PO workflow | 3 | 0.25 | 0.0 | BLOCKED | submitSupplierOrder blocked |
| F78 Order cancellation | 2 | 0.5 | 0.0 | CODE ONLY | status machine; 0 live orders |
| F79 Refund processing | 3 | 0.25 | 0.0 | CODE ONLY | RMA processRefund DB-only |
| F80 Returns management | 3 | 0.5 | 0.0 | CODE ONLY | returnsRma.js; no storefront form |
| F81 Supplier reimbursement tracking | 3 | 0.25 | 0.0 | CODE ONLY | returnRecovery types only; /api/admin/returns missing |
| F82 Customer refund vs supplier recovery | 3 | 0.0 | 0.0 | NOT IMPLEMENTED | no Confirmed vs Expected engine |
| F83 Order exception handling | 2 | 0.5 | 0.0 | CODE ONLY | readiness/error codes |
| F84 Idempotency / duplicate prevention | 3 | 0.75 | 0.0 | NOT TESTED | commerce/idempotency.js; not proven under load |

## G. Marketplaces

- Implementation: **15.2%** (`7.75` / `51` × 100)
- Operational: **1.0%** (`0.5` / `51` × 100)
- Remaining (implementation): **84.8%**
- Status: PARTIAL

| Requirement | W | Impl frac | Ops frac | Status | Evidence |
|---|---:|---:|---:|---|---|
| G85 Marketplace integration foundation | 2 | 0.5 | 0.25 | CODE ONLY | marketplaceHub.js DB channels |
| G86 Connector architecture | 3 | 0.25 | 0.0 | CODE ONLY | generic jobs; marketplaceV35 CRUD skeleton |
| G87 Product feed generation | 2 | 0.5 | 0.0 | CODE ONLY | merchantFeedService / seo feeds empty until products |
| G88 Listing creation | 3 | 0.25 | 0.0 | CODE ONLY | marketplace_listings table manual/seed |
| G89 Listing updates | 2 | 0.25 | 0.0 | CODE ONLY | local DB update |
| G90 Stock synchronization | 3 | 0.25 | 0.0 | CODE ONLY | queueStockSync no channel HTTP |
| G91 Price synchronization | 3 | 0.25 | 0.0 | CODE ONLY | queuePriceSync no channel HTTP |
| G92 Marketplace order ingestion | 3 | 0.25 | 0.0 | CODE ONLY | queueOrderSync local only |
| G93 Cancel / returns sync | 3 | 0.0 | 0.0 | NOT IMPLEMENTED | no channel return API |
| G94 Marketplace error handling | 2 | 0.25 | 0.0 | CODE ONLY | job status fields |
| G95 Marketplace monitoring | 2 | 0.25 | 0.0 | CODE ONLY | intel ebay/amazon NOT_CONFIGURED |
| G96c Kaufland Seller API | 3 | 0.0 | 0.0 | NOT IMPLEMENTED | metadata only; no client |
| G97c Allegro REST API | 3 | 0.0 | 0.0 | NOT IMPLEMENTED | metadata only; no client |
| G98c bol.com Retailer API | 3 | 0.0 | 0.0 | NOT IMPLEMENTED | metadata only; no client |
| G99c OTTO Market API | 3 | 0.0 | 0.0 | NOT IMPLEMENTED | metadata only; no client |
| G100c Cdiscount / Octopia API | 3 | 0.0 | 0.0 | NOT IMPLEMENTED | metadata only; no client |
| G101c eMAG Marketplace API | 3 | 0.0 | 0.0 | NOT IMPLEMENTED | not in market_engine_extensions |
| G102c Skroutz Smart Cart API | 3 | 0.0 | 0.0 | NOT IMPLEMENTED | not listed |
| G103c Amazon / eBay live API | 2 | 0.25 | 0.0 | CODE ONLY | hub rows; intel NOT_CONFIGURED |

## H. Shipping and tracking

- Implementation: **27.6%** (`10.75` / `39` × 100)
- Operational: **1.9%** (`0.75` / `39` × 100)
- Remaining (implementation): **72.4%**
- Status: PARTIAL

| Requirement | W | Impl frac | Ops frac | Status | Evidence |
|---|---:|---:|---:|---|---|
| H96 Shipping rate calculation | 3 | 0.5 | 0.25 | CODE ONLY | DB-seeded static rates; live carriers all false |
| H97 Carrier integration architecture | 2 | 0.5 | 0.0 | CODE ONLY | commercialIntegrations.js stubs |
| H98 DHL integration | 3 | 0.25 | 0.0 | CODE ONLY | seeded + DHL_API_KEY empty; live dhl:false |
| H99 DPD integration | 3 | 0.25 | 0.0 | CODE ONLY | seeded; live dpd:false |
| H100 GLS integration | 3 | 0.25 | 0.0 | CODE ONLY | seeded; live gls:false |
| H101 Hermes / Evri integration | 3 | 0.25 | 0.0 | CODE ONLY | seeded Evri/Hermes; no live flag true |
| H102 UPS integration | 3 | 0.25 | 0.0 | CODE ONLY | seeded; live ups:false |
| H103 Label creation | 3 | 0.25 | 0.0 | CODE ONLY | stubs return null labelUrl |
| H104 Tracking number ingestion | 3 | 0.25 | 0.0 | CODE ONLY | DEMO- prefixes in RMA/fulfillment |
| H105 Tracking event synchronization | 3 | 0.25 | 0.0 | CODE ONLY | local rows on label update; not carrier webhooks |
| H106 Customer tracking page | 2 | 0.25 | 0.0 | CODE ONLY | account order detail; 0 orders |
| H107 Delivery status notifications | 2 | 0.25 | 0.0 | CODE ONLY | notificationEngine; not carrier-driven |
| H108 Returns shipping workflow | 3 | 0.25 | 0.0 | CODE ONLY | RMA DEMO labels |
| H109 Carrier failure handling | 2 | 0.25 | 0.0 | CODE ONLY | stub errors |
| H109b Live GPS tracking | 1 | 0.0 | 0.0 | NOT APPLICABLE | No carrier geo feed; must not invent GPS |

## I. AI and automation

- Implementation: **33.0%** (`17.5` / `53` × 100)
- Operational: **10.8%** (`5.75` / `53` × 100)
- Remaining (implementation): **67.0%**
- Status: PARTIAL
- Blockers: ephemeral /tmp

| Requirement | W | Impl frac | Ops frac | Status | Evidence |
|---|---:|---:|---:|---|---|
| I110 Central AI architecture | 3 | 0.5 | 0.25 | PARTIALLY VERIFIED | aiOrchestrator.js + Python orchestrator reachable |
| I111 Pusat Orchestrator | 3 | 0.0 | 0.0 | NOT IMPLEMENTED | no pusat module on main; name only on unmerged PRs |
| I112 Task orchestration | 3 | 0.5 | 0.25 | CODE ONLY | core_ai_tasks; live employees=0 pendingTasks=0 |
| I113 Central AI memory | 3 | 0.25 | 0.0 | BLOCKED | orchestrator /tmp DB |
| I114 AI agent registry | 2 | 0.5 | 0.25 | PARTIALLY VERIFIED | 7 python agents + 3 bey; simulation |
| I115 Price Assistant | 2 | 0.25 | 0.0 | CODE ONLY | pricing_ai generic_agent_handler simulation |
| I116 Stock Assistant | 2 | 0.25 | 0.0 | CODE ONLY | no dedicated live stock agent bound to PIM |
| I117 SEO Assistant | 2 | 0.25 | 0.0 | CODE ONLY | seo modules / stub AI |
| I118 Customer Assistant | 2 | 0.5 | 0.25 | CODE ONLY | aiChatService.js rule/intent; not LLM |
| I119 Sales Analysis Assistant | 2 | 0.25 | 0.0 | CODE ONLY | analytics plugins; 0 commerce orders |
| I120 Category Assistant | 2 | 0.25 | 0.0 | CODE ONLY | categoryIntelligence bridge optional |
| I121 Customs AI | 2 | 0.25 | 0.0 | CODE ONLY | customs_ai simulation |
| I122 Supplier API/XML automation | 2 | 0.25 | 0.0 | CODE ONLY | supplier_ai simulation |
| I123 Product creation AI | 2 | 0.25 | 0.0 | CODE ONLY | productAi.js demo adapter |
| I124 Customer service AI | 2 | 0.5 | 0.25 | CODE ONLY | storefront chat rules |
| I125 AI reporting | 1 | 0.25 | 0.0 | CODE ONLY | control center surfaces |
| I126 Human Approval Center | 3 | 0.5 | 0.25 | CODE ONLY | commerce_go_live + guardian pending; approve does not enable sales |
| I127 Exception management | 2 | 0.25 | 0.0 | CODE ONLY | escalations tables |
| I128 Guardian / Esat Bey | 3 | 0.5 | 0.25 | PARTIALLY VERIFIED | guardian HTTP 200; /tmp DB; sales_enabled false |
| I129 Anomaly detection | 2 | 0.25 | 0.0 | CODE ONLY | guardian costs/incidents; no live volume |
| I130 Persistent AI state | 3 | 0.0 | 0.0 | BLOCKED | /tmp/buzzard_orchestrator.db /tmp/buzzard_guardian.sqlite3 |
| I131 AI audit logs | 2 | 0.5 | 0.25 | CODE ONLY | core_system_events securityLog |
| I132 AI permissions / safety | 3 | 0.5 | 0.25 | PARTIALLY VERIFIED | rbac ai.execute; AI_PROVIDER=rules; cannot self-enable sales |

## J. Voice and digital human

- Implementation: **6.2%** (`1.75` / `28` × 100)
- Operational: **0.0%** (`0.0` / `28` × 100)
- Remaining (implementation): **93.8%**
- Status: CODE ONLY

| Requirement | W | Impl frac | Ops frac | Status | Evidence |
|---|---:|---:|---:|---|---|
| J133 Speech-to-text | 2 | 0.25 | 0.0 | CODE ONLY | intelligence realtime_adapter NotImplementedError |
| J134 Text-to-speech | 2 | 0.25 | 0.0 | CODE ONLY | same stub package |
| J135 Live voice conversations | 3 | 0.0 | 0.0 | NOT IMPLEMENTED | not on main |
| J136 Phone integration | 3 | 0.25 | 0.0 | CODE ONLY | phone_production.json enabled:false |
| J137 WebRTC signaling | 3 | 0.0 | 0.0 | NOT IMPLEMENTED | not in app/server on main |
| J138 WebRTC media | 3 | 0.0 | 0.0 | NOT IMPLEMENTED | not on main |
| J139 STUN / TURN | 3 | 0.0 | 0.0 | NOT IMPLEMENTED | not on main |
| J140 Real-time video | 3 | 0.0 | 0.0 | NOT IMPLEMENTED | open PRs only |
| J141 Digital human / avatar | 3 | 0.0 | 0.0 | NOT IMPLEMENTED | open PRs #389-#391 not merged |
| J142 Provider connectivity | 3 | 0.0 | 0.0 | NOT IMPLEMENTED | Twilio/OpenAI Realtime not on main |

## K. Administration and analytics

- Implementation: **65.0%** (`19.5` / `30` × 100)
- Operational: **14.2%** (`4.25` / `30` × 100)
- Remaining (implementation): **35.0%**
- Status: PARTIAL

| Requirement | W | Impl frac | Ops frac | Status | Evidence |
|---|---:|---:|---:|---|---|
| K143 Admin dashboard | 2 | 0.75 | 0.25 | NOT TESTED | ~50 admin routes; login not exercised |
| K144 Product administration | 3 | 0.75 | 0.25 | CODE ONLY | admin/pim-core products; empty ACTIVE |
| K145 Supplier administration | 2 | 0.75 | 0.25 | CODE ONLY | admin/supplier-hub; dry-run |
| K146 Order administration | 2 | 0.75 | 0.0 | CODE ONLY | admin/orders; 0 orders |
| K147 Customer administration | 2 | 0.5 | 0.0 | CODE ONLY | CRM plugins |
| K148 Pricing administration | 2 | 0.5 | 0.0 | CODE ONLY | ops priceEngine screens |
| K149 Marketplace administration | 2 | 0.5 | 0.0 | CODE ONLY | admin/marketplace-hub |
| K150 Returns administration | 2 | 0.5 | 0.0 | CODE ONLY | returns-rma vs /api/admin/returns mismatch |
| K151 AI administration | 2 | 0.5 | 0.25 | CODE ONLY | admin/ai-center control-center |
| K152 Reporting / analytics | 2 | 0.5 | 0.25 | CODE ONLY | analytics totals not commerce SoT |
| K153 Audit logs | 3 | 0.75 | 0.25 | CODE ONLY | securityLog identity_security_audit |
| K154 RBAC | 3 | 0.75 | 0.25 | CODE ONLY | rbac.js routePermissions.js |
| K155 Admin authentication | 3 | 0.75 | 0.0 | NOT TESTED | auth.js scrypt sessions; live login not attempted |

## L. Infrastructure and security

- Implementation: **61.4%** (`28.25` / `46` × 100)
- Operational: **46.2%** (`21.25` / `46` × 100)
- Remaining (implementation): **38.6%**
- Status: PARTIAL

| Requirement | W | Impl frac | Ops frac | Status | Evidence |
|---|---:|---:|---:|---|---|
| L156 Production deployment | 3 | 1.0 | 1.0 | VERIFIED | Pages + Render SYNCED 84166bb |
| L157 API availability | 3 | 1.0 | 1.0 | VERIFIED | GET /api/health 200 |
| L158 Persistent database | 3 | 1.0 | 1.0 | VERIFIED | /var/data/buzzard.db persistent:true |
| L159 Database backup | 3 | 0.75 | 0.5 | PARTIALLY VERIFIED | latestValid true; schedulerEnv null |
| L160 Restore verification | 3 | 0.25 | 0.0 | NOT TESTED | restore-db.mjs --dry-run exists; not proven live |
| L161 Background workers | 3 | 0.75 | 0.75 | VERIFIED | worker RUNNING; 0 jobs; supplier blocked |
| L162 Scheduled jobs | 2 | 0.25 | 0.0 | CODE ONLY | scheduler enabledCount=0 |
| L163 Monitoring / alerting | 2 | 0.5 | 0.5 | PARTIALLY VERIFIED | uptime workflow SUCCESS; no APM |
| L164 Error tracking | 2 | 0.0 | 0.0 | NOT IMPLEMENTED | ERROR_TRACKING_DSN empty |
| L165 Secrets management | 3 | 0.5 | 0.5 | PARTIALLY VERIFIED | Render sync:false secrets; values not inspected |
| L166 Authentication security | 3 | 0.75 | 0.5 | CODE ONLY | scrypt lockout CSRF; live login NOT TESTED |
| L167 Authorization security | 3 | 0.75 | 0.5 | CODE ONLY | RBAC middleware |
| L168 Rate limiting | 2 | 0.75 | 0.5 | PARTIALLY VERIFIED | implemented; redis NOT_CONFIGURED memory store |
| L169 Input validation | 2 | 0.5 | 0.25 | CODE ONLY | product/payment validators |
| L170 Data protection | 2 | 0.5 | 0.25 | CODE ONLY | sanitize payment; no PAN storage |
| L171 GDPR access / deletion | 3 | 0.5 | 0.0 | NOT TESTED | privacy request API; fulfillment depth unknown |
| L172 Disaster recovery | 2 | 0.25 | 0.0 | CODE ONLY | runbooks; restore unproven |
| L173 Logging / traceability | 2 | 0.5 | 0.5 | PARTIALLY VERIFIED | health + security logs; no APM traces |

## M. Software quality and release readiness

- Implementation: **61.0%** (`20.75` / `34` × 100)
- Operational: **39.7%** (`13.5` / `34` × 100)
- Remaining (implementation): **39.0%**
- Status: PARTIAL

| Requirement | W | Impl frac | Ops frac | Status | Evidence |
|---|---:|---:|---:|---|---|
| M174 Unit tests | 3 | 0.75 | 0.0 | NOT TESTED | vitest + server/__tests__; NOT RUN this audit; not in CI |
| M175 Integration tests | 2 | 0.5 | 0.0 | NOT TESTED | part* smoke scripts; NOT RUN |
| M176 End-to-end tests | 3 | 0.75 | 0.0 | NOT TESTED | e2e/*.spec.ts 9 files; NOT RUN |
| M177 CI test gates | 3 | 0.0 | 0.0 | NOT IMPLEMENTED | .github/workflows/ci.yml has no test:unit/e2e |
| M178 Lint | 2 | 1.0 | 1.0 | VERIFIED | CI lint SUCCESS on 84166bb |
| M179 Type checking | 2 | 1.0 | 1.0 | VERIFIED | CI typecheck SUCCESS |
| M180 Build | 3 | 1.0 | 1.0 | VERIFIED | CI build SUCCESS; Pages deploy SUCCESS |
| M181 Regression tests | 2 | 0.25 | 0.0 | NOT TESTED | suites exist; not gated |
| M182 API contract tests | 2 | 0.25 | 0.0 | NOT TESTED | health probes only |
| M183 Production smoke tests | 2 | 0.5 | 0.5 | PARTIALLY VERIFIED | verify-go-live + uptime SUCCESS 2026-10-11 |
| M184 Security tests | 2 | 0.5 | 0.5 | PARTIALLY VERIFIED | CI security:check SUCCESS; npm audit not in CI |
| M185 Dependency health | 1 | 0.25 | 0.0 | NOT TESTED | npm run security:audit not default CI |
| M186 Deployment verification | 2 | 0.75 | 0.75 | VERIFIED | deployment.status=SYNCED |
| M187 Feature-flag safety | 3 | 1.0 | 1.0 | VERIFIED | salesEnabled false goLiveLock true |
| M188 Rollback readiness | 2 | 0.25 | 0.0 | CODE ONLY | Render redeploy; no automated rollback workflow |

## N. Sales readiness (separate)

- Implementation: **20.6%**
- Operational: **8.1%**
- Launch-critical operational: **0.0%**

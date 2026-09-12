# Buzzard Analytics & Tracking Foundation

## Overview

Buzzard Analytics is a **privacy-first, provider-independent, first-party analytics foundation**. It measures traffic, engagement, funnel progression, and revenue without duplicating authoritative business data from Order, Product, Market, Marketplace, or Returns engines.

```
Website / Marketplace / Ads / Search
              ↓
        Consent Layer
              ↓
       Analytics Collector
              ↓
       Event Validation
              ↓
       Event Normalization
              ↓
       Analytics Event Store
              ↓
      Session / Visitor Metrics
              ↓
      Funnel / Conversion Metrics
              ↓
       Revenue Attribution
              ↓
       Buzzard Analytics Dashboard
```

**Critical principle:** Order Engine is the source of truth for revenue. Product Engine IDs are canonical for product analytics. Market Engine is the source of truth for country/market/language. Analytics mirrors and aggregates — it never replaces business engines.

## Module: `lib/analytics/`

| File | Purpose |
|------|---------|
| `types.ts` | Canonical event, session, consent, metrics types |
| `constants.ts` | Event types, GA4 map, retention defaults, AI task stubs |
| `registry.ts` | In-memory event store, consent, idempotency |
| `consent.ts` | Consent model and tracking permission checks |
| `privacy.ts` | PII stripping, search sanitization, export/delete hooks |
| `eventSchema.ts` | Schema validation (market, language, product IDs) |
| `eventNormalizer.ts` | Canonical event normalization |
| `eventCollector.ts` | Event ingestion and authoritative order/refund ingest |
| `visitor.ts` | Anonymous visitor identifiers |
| `session.ts` | Session abstraction (30-minute timeout) |
| `trafficSource.ts` | UTM/referrer classification |
| `device.ts` | Device type classification |
| `geo.ts` | Market Engine integration |
| `funnel.ts` | E-commerce funnel metrics |
| `conversion.ts` | Deterministic conversion formulas |
| `revenue.ts` | Authoritative revenue from Order/Returns engines |
| `attribution.ts` | First/last/session touch foundation |
| `productAnalytics.ts` | Product-level metrics by `productId` |
| `marketAnalytics.ts` | Market/country/language breakdown |
| `channelAnalytics.ts` | Traffic channel reporting |
| `metrics.ts` | Dashboard overview aggregation |
| `dashboard.ts` | Admin-protected dashboard API |
| `retention.ts` | New vs returning visitor metrics |
| `anomaly.ts` | Safe anomaly detection hooks |
| `security.ts` | Injection rejection, admin access, cross-customer guard |
| `audit.ts` | Admin analytics audit log |
| `provider.ts` | `AnalyticsProvider` adapter + `MOCK_ANALYTICS_PROVIDER` |
| `searchConsoleAdapter.ts` | Search Console adapter foundation (no credentials) |
| `fixtures.ts` | Deterministic test fixtures |
| `adminClient.ts` / `adminTypes.ts` | Legacy admin dashboard client (preserved) |

## Privacy Model

Analytics does **not** store unnecessary PII:

- No names, emails, phones, passwords, payment details
- No full IP addresses, auth tokens, or supplier credentials
- No browser fingerprinting or invasive identity reconstruction

Search terms are sanitized; obvious PII patterns are redacted. Sensitive metadata keys (`email`, `token`, `apiKey`, etc.) are rejected at ingestion.

## Consent Model

Categories: `ANALYTICS`, `MARKETING`, `PERSONALIZATION`

States: `UNKNOWN`, `GRANTED`, `DENIED`, `WITHDRAWN`

Each consent record tracks:

- `consentRequired` — derived from Market Engine (EU markets require consent)
- `consentStatus`, `consentTimestamp`, `consentVersion`

Non-essential events are blocked when consent is denied or withdrawn. Essential consent events (`CONSENT_GRANTED`, `CONSENT_DENIED`, `CONSENT_WITHDRAWN`) always pass.

**Server-side authoritative business events** (Order Engine purchases, Returns Engine refunds) bypass visitor consent because they are business-record mirroring, not invasive client tracking.

## Event Model

Canonical fields (only relevant fields per event):

`eventId`, `eventType`, `timestamp`, `sessionId`, `anonymousVisitorId`, `customerIdReference`, `market`, `country`, `language`, `currency`, `deviceType`, `trafficSource`, `trafficMedium`, `trafficCampaign`, `landingPage`, `pagePath`, `productId`, `categoryId`, `orderIdReference`, `cartIdReference`, `value`, `quantity`, `metadata`, `consentState`, `correlationId`, `revenueAuthority`

Foundation event types include: `PAGE_VIEW`, `SESSION_START`, `PRODUCT_VIEW`, `ADD_TO_CART`, `CHECKOUT_START`, `PURCHASE`, `REFUND`, `MARKETPLACE_ORDER`, `SEARCH`, `CONSENT_*`, and more (see `constants.ts`).

## Visitor & Session Model

- **Visitor:** random `bv_*` identifier — no email/phone-derived IDs, no fingerprinting
- **Session:** 30-minute inactivity timeout (`SESSION_TIMEOUT_MS`)
- Tracks: landing/exit pages, page views, product views, cart/checkout flags, traffic source, market, language, device

## Traffic Sources

Supported types: `DIRECT`, `ORGANIC_SEARCH`, `PAID_SEARCH`, `SOCIAL`, `EMAIL`, `REFERRAL`, `MARKETPLACE`, `OTHER`

UTM-style parameters: `source`, `medium`, `campaign`, `content`, `term`

Search engines: Google, Bing, DuckDuckGo, Yahoo (via referrer host classification)

Social: Facebook, Instagram, TikTok, YouTube (via referrer host)

## Device Analytics

Types: `DESKTOP`, `MOBILE`, `TABLET`, `OTHER`

Optional privacy-safe browser/OS family — no device fingerprints.

## Market & Language

Uses **International Market Engine** (`getMarket`, `getMarketLanguages`, `isEuCountry`). No duplicate country registry. Supports all configured Buzzard markets including Arabic/RTL locales.

## Product Analytics

References canonical `productId` from Product Engine. Tracks views, add-to-cart, purchases, returns — does not duplicate product catalog data.

## Funnel & Conversion

Main funnel:

```
VISITOR → SESSION → PRODUCT_VIEW → ADD_TO_CART → CHECKOUT_START → CHECKOUT_COMPLETED → PURCHASE
```

Formulas (deterministic, percentage with 2 decimal places):

| Metric | Formula |
|--------|---------|
| `productViewRate` | productViews / sessions × 100 |
| `addToCartRate` | addToCart / productViews × 100 |
| `checkoutStartRate` | checkoutStart / addToCart × 100 |
| `checkoutCompletionRate` | checkoutCompleted / checkoutStart × 100 |
| `purchaseConversionRate` | purchases / checkoutStart × 100 |
| `overallConversionRate` | purchases / sessions × 100 |
| `purchaseConversion` | authoritative purchases / eligible sessions × 100 |

## Revenue Model

**Order Engine is authoritative.** Client-side purchase values are provisional unless backed by a valid order reference.

Flow:

```
Order Engine → authoritative order amount → analytics PURCHASE event → revenue metrics
```

Eligible orders: captured payment or post-payment statuses (`SUPPLIER_PENDING`, `DELIVERED`, etc.)

Metrics: `grossRevenueCents`, `refundAmountCents`, `netRevenueCents`, `orderCount`, `averageOrderValueCents`

Integer-cent arithmetic via `toCents()` / `fromCents()`.

## Returns & Refunds

Refund amounts come from **Returns Engine** via `resolveAuthoritativeRefundAmount()`. Client refund claims without return references are rejected when marked authoritative.

## Marketplace Analytics

Channels: `AMAZON`, `EBAY`, `KAUFLAND`, `ALLEGRO`, `BOL`, `CDISCOUNT`, `OTTO`

Marketplace order/revenue events use `MARKETPLACE_ORDER` type with authoritative sources from Marketplace/Order engines.

## Attribution

Foundation models: `firstTouch`, `lastTouch`, `sessionTouch`

Documented limitation: perfect attribution is not claimed. Multi-touch extension point exists in `attribution.ts`.

## Dashboard API

Admin-protected endpoints (`adminAuthorized: true` required):

- `getOverview()`, `getTraffic()`, `getFunnel()`, `getProducts()`
- `getMarkets()`, `getChannels()`, `getCampaigns()`, `getRevenue()`
- `getReturns()`, `getMarketplace()`

Data freshness labels: `CURRENT`, `NEAR_REAL_TIME`, `REPORTING_DELAYED`

## External Provider Adapters

```typescript
AnalyticsProvider
├── initialize()
├── track()
├── identify()
├── page()
└── consent()
```

- **`MOCK_ANALYTICS_PROVIDER`** — test foundation (no credentials)
- **`GoogleAnalytics4Provider`** — future adapter (not implemented)
- GA4 name mapping via `mapToGa4Event()` — internal events remain source of truth

## Search Console Adapter

`SearchConsoleAdapterFoundation` provides interface for future integration:

- `queries`, `clicks`, `impressions`, `CTR`, `averagePosition`
- Returns empty data when not configured — no fabricated reports

## Security

Protections against:

- Event injection and arbitrary metadata
- Fake revenue / fake orders
- Invalid product IDs
- Cross-customer access
- Admin privilege escalation
- Duplicate purchase events (idempotency)
- Sensitive data leakage

## Idempotency

Idempotent event types: `PURCHASE`, `REFUND`, `RETURN`, `CHECKOUT_COMPLETED`, `MARKETPLACE_ORDER`

Keys: `eventId`, `orderIdReference`, `correlationId`

## Retention & Privacy Requests

Configurable retention by consent category (defaults in `constants.ts`).

Hooks (analytics data only — does not modify Order/financial records):

- `exportAnalyticsData(visitorId)`
- `deleteAnalyticsData(visitorId)`
- `anonymizeAnalyticsData(visitorId)`

## Audit

Administrative operations logged: dashboard access, config changes, export/deletion, provider changes. No unnecessary PII in audit entries.

## AI Compatibility

Future AI Orchestrator task types declared in `FUTURE_ANALYTICS_AI_TASK_TYPES`:

- `ANALYTICS_ANALYSIS`, `TRAFFIC_ANOMALY`, `CONVERSION_ANOMALY`
- `PRODUCT_PERFORMANCE_ANALYSIS`, `MARKET_PERFORMANCE_ANALYSIS`
- `CAMPAIGN_ANALYSIS`, `REVENUE_ANOMALY`

**Not implemented** — AI must never become the source of truth for financial numbers.

## Testing

```bash
npm run test:analytics
```

31 tests covering schema validation, consent, privacy, funnel, revenue, idempotency, security, fixtures 1–16, provider adapters, and AI compatibility stubs.

## Extension Points

- Wire storefront/cart/checkout to `collectAnalyticsEvent()`
- Subscribe Order Engine events to `ingestAuthoritativeOrderPurchase()`
- Subscribe Returns Engine to `ingestAuthoritativeRefund()`
- Add `GoogleAnalytics4Provider` as optional adapter
- Connect Search Console credentials to adapter foundation
- Persist registry to database when production storage is ready
- Enable Analytics AI tasks through AI Orchestrator (analysis only, not financial authority)

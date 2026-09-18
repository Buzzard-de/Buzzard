# Trade Route, Customs & Shipping Integration Report

**Branch:** `cursor/trade-route-customs-shipping-c293`  
**Date:** 2026-09-18  
**Scope:** Integration layer only — no new SSOT engines, no production side effects

---

## Summary

Existing Buzzard engines (Market, Order, Supplier, Inventory, Pricing, Customs product data, Carrier Production, Tracking Fulfillment) are orchestrated into a single server-authoritative pipeline:

```
Order → Target Country → Fulfillment Origin → Trade Route → Customs Gate
     → Shipping Quote → Carrier Selection → Supplier Fulfillment → Tracking
```

Production flags remain unchanged. No real supplier orders, payments, shipments, labels, or marketplace actions are triggered.

---

## Target Country Resolution

**Module:** `lib/trade-route-fulfillment/targetCountry.ts`  
**Function:** `resolveTargetCountry(order)`

| Priority | Source |
|----------|--------|
| 1 | `shippingAddress.country` |
| 2 | `validatedCheckoutCountry` |
| 3 | `marketId` (only when shipping not provided) |

Rules:
- Country codes normalized to uppercase and validated against Market Engine SSOT (35 markets)
- Invalid shipping country → `INVALID_COUNTRY` (no silent fallback to DE)
- `marketId ≠ shippingAddress.country` → `TRADE_ROUTE_COUNTRY_MISMATCH`

---

## Fulfillment Origin

**Module:** `lib/trade-route-fulfillment/fulfillmentOrigin.ts`  
**Function:** `resolveFulfillmentOrigin({ supplier, supplierOffer, order })`

Priority: `shippingOrigin` → `warehouseCountry` → `fulfillmentCountry` → `supplierCountry` → `supplier.country`

When origin cannot be determined reliably → `ORIGIN_UNKNOWN` (never defaults to DE).

---

## Trade Route Classification

**Module:** `lib/trade-route-fulfillment/tradeRoute.ts`  
**Function:** `classifyTradeRoute({ originCountry, destinationCountry })`

Uses Market Engine SSOT: `isEuCountry()`, `getShippingRegion()`.

| Route | Customs Precheck |
|-------|------------------|
| `SAME_COUNTRY` | No |
| `EU_TO_EU` | No (bypass) |
| `EU_TO_NON_EU` | Yes |
| `NON_EU_TO_EU` | Yes |
| `NON_EU_TO_NON_EU` | Yes |
| `UNKNOWN` | Hold |

Flags: `requiresExportProcess`, `requiresImportProcess`, `requiresCustomsPrecheck`, `requiresCustomsDocuments`, `requiresDutyAssessment`, `requiresVatAssessment`.

---

## EU Routing

```
Order → resolveTargetCountry → resolveFulfillmentOrigin → classifyTradeRoute
     → EU_TO_EU → customs bypass → quoteShipping → selectCarrier → supplier prep
```

No unnecessary `CUSTOMS_HOLD` for intra-EU routes.

---

## NON-EU Routing

```
Order → ... → NON-EU route → runCustomsPrecheck → gate decision
     → CUSTOMS_READY → shipping → carrier → supplier prep
     → CUSTOMS_REVIEW_REQUIRED / CUSTOMS_BLOCKED → CUSTOMS_HOLD (no supplier dispatch)
```

---

## Customs Gate

**Module:** `lib/customs-fulfillment-gate/` (orchestration layer, not a new engine)

**Function:** `runCustomsPrecheck({ order, tradeRoute, supplierOrigin })`

Per line checks: `hsCode`, `originCountry`, `customsValue`, `commodityDescription`, `restrictedGoods`, `documentationRequired`.

Uses existing product customs data via `getRawProductById()` — never invents HS codes or values.

| Decision | Meaning |
|----------|---------|
| `CUSTOMS_NOT_REQUIRED` | EU routes |
| `CUSTOMS_READY` | All required data present |
| `CUSTOMS_REVIEW_REQUIRED` | Missing data, manual review possible |
| `CUSTOMS_BLOCKED` | Restricted goods or unknown route |

Hold state: `CUSTOMS_HOLD` — blocks supplier order prep, shipment, carrier API, tracking.

---

## Shipping Quote

**Module:** `lib/trade-route-fulfillment/shippingQuote.ts`  
**Function:** `quoteShipping(...)`

Reuses Pricing Engine `resolveShippingCost()` — no second shipping engine.

---

## Carrier Selection

**Module:** `lib/trade-route-fulfillment/carrierSelection.ts`  
**Function:** `selectCarrier(...)`

Profiles: DHL, DPD, GLS, UPS, DHL_EXPRESS. Validates via Carrier Production `validateParcel()` (dry-run only).

Checks: route support, weight, dimensions, service level, customs, international/tracking support.

No carrier → `SHIPPING_HOLD`.

---

## Supplier Routing

Supplier Selection Engine remains SSOT. Trade route pipeline runs **after** payment, **before** `prepareSupplierOrders()`. Supplier orders are not prepared when customs or shipping holds are active.

---

## Tracking

**Module:** `lib/trade-route-fulfillment/trackingAttach.ts`  
**Function:** `attachTrackingToOrder(...)`

Integrates with `tracking-fulfillment` sandbox classification. Tracking is never marked present without a valid identifier. Live unknown IDs → `BLOCKED`.

---

## Order Engine Integration

**File:** `lib/order-engine/createOrder.ts`

Integration point (post-payment, pre-supplier-prep):

```
PAYMENT CAPTURED → CONFIRMED → PROCESSING
  → runTradeRouteFulfillmentPipeline()
  → [hold?] save order, return error
  → prepareSupplierOrders() → SUPPLIER_PENDING
```

Order snapshot field: `tradeRouteFulfillment`  
New fulfillment statuses: `CUSTOMS_HOLD`, `SHIPPING_HOLD`

---

## Admin

**File:** `lib/order-engine/admin.ts`

Admin rows expose: origin, destination, trade route, customs status, missing fields, carrier options, selected carrier, shipping status, tracking status, hold reason. No supplier credentials or internal scoring exposed.

---

## Customer Visibility

**File:** `lib/order-engine/customerView.ts`

Customer-safe: shipping method, carrier, estimated delivery, tracking number/status.  
Hidden: supplier credentials, internal costs, AI context, customs risk data.

---

## Audit Events

Emitted via Order Engine events (`trade-route-fulfillment` source):

`TARGET_COUNTRY_RESOLVED`, `COUNTRY_MISMATCH`, `FULFILLMENT_ORIGIN_RESOLVED`, `TRADE_ROUTE_CLASSIFIED`, `CUSTOMS_PRECHECK_STARTED`, `CUSTOMS_NOT_REQUIRED`, `CUSTOMS_READY`, `CUSTOMS_REVIEW_REQUIRED`, `CUSTOMS_BLOCKED`, `CUSTOMS_HOLD`, `SHIPPING_QUOTED`, `CARRIER_SELECTED`, `SHIPPING_HOLD`, `TRACKING_ATTACHED`

No secrets or unnecessary PII logged.

---

## Security

- Invalid countries rejected (no default-to-DE)
- Prototype pollution safe country parsing
- No secret leakage in pipeline events/metadata
- Customer isolation preserved (existing RBAC)
- Idempotent pipeline steps (no duplicate side effects)

---

## Failure Recovery

| Scenario | Safe State |
|----------|------------|
| Country mismatch | `TRADE_ROUTE_COUNTRY_MISMATCH` — no dispatch |
| Unknown origin | `ORIGIN_UNKNOWN` hold |
| Missing HS code | `CUSTOMS_REVIEW_REQUIRED` / `CUSTOMS_HOLD` |
| Restricted product | `CUSTOMS_BLOCKED` |
| No carrier | `SHIPPING_HOLD` |
| Unknown route | Hold — never auto-dispatch |

---

## Tests

| Suite | File | Tests |
|-------|------|-------|
| Trade Route | `lib/trade-route-fulfillment/tradeRouteFulfillment.test.ts` | 32 |
| Customs Gate | `lib/customs-fulfillment-gate/customsFulfillmentGate.test.ts` | 6 |
| Order Integration | `lib/order-engine/orderEngine.test.ts` | +4 trade route cases |

Run: `npm run test:trade-route-fulfillment` and `npm run test:order-engine`

---

## Production Safety

| Flag | Value |
|------|-------|
| `SALES_ENABLED` | 0 |
| `SUPPLIER_NETWORK_ENABLED` | 0 |
| `SUPPLIER_ORDER_NETWORK_ENABLED` | 0 |
| `CARRIER_PRODUCTION_ENABLED` | 0 |
| `PAYMENT_PRODUCTION_ENABLED` | 0 |

| Counter | Value |
|---------|-------|
| Real supplier orders | 0 |
| Real shipments | 0 |
| Real labels | 0 |
| Real payments | 0 |
| Fake evidence | 0 |

---

## Gate Results

| Gate | Result |
|------|--------|
| EU_TO_EU | **PASS** |
| EU_TO_NON_EU | **PASS** |
| NON_EU_TO_EU | **PASS** |
| NON_EU_TO_NON_EU | **PASS** |
| CUSTOMS_GATE | **PASS** |
| CARRIER_ROUTING | **PASS** |
| TRACKING_INTEGRATION | **PASS** |
| ORDER_ENGINE_INTEGRATION | **PASS** |
| typecheck | **PASS** |
| lint | **PASS** |
| build | **PASS** |

---

## Files Added/Modified

**New:**
- `lib/trade-route-fulfillment/*`
- `lib/customs-fulfillment-gate/*`
- `docs/TRADE_ROUTE_CUSTOMS_SHIPPING_INTEGRATION_REPORT.md`

**Modified:**
- `lib/order-engine/createOrder.ts`
- `lib/order-engine/types.ts`
- `lib/order-engine/customerView.ts`
- `lib/order-engine/admin.ts`
- `lib/order-engine/orderEngine.test.ts`
- `data/global/test_supplier_feeds.json` (test markets for NON-EU scenarios)
- `vitest.config.ts`, `package.json`

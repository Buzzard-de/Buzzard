# BUZZARD — Integration Readiness Matrix

**No external API calls were made.** Classifications are from adapter source + env gates + tests.

## Scale

1. Not started · 2. Adapter only · 3. Sandbox tested · 4. Credential configured · 5. Connected · 6. E2E verified · 7. Production blocked

## Marketplaces

| Integration | Class | Evidence | Blocker |
|-------------|-------|----------|---------|
| Amazon | 3 | `marketplaceConnectorRegistry.js` `amazon` | OAuth env, SALES, publish flag |
| eBay | 3 | same | same |
| Kaufland | 3 | same | same |
| Allegro | 3 | same | same |
| bol.com | 3 | same | same |
| Cdiscount | 3 | same | same |
| OTTO | 3 | same | same |
| eMAG | 3 | same | same |
| Skroutz | 3 | same | same |
| Google Shopping | 3 | same | same |

## Carriers

| Integration | Class | Evidence |
|-------------|-------|----------|
| DHL, DPD, GLS, Hermes, UPS, Amazon Logistics | 2–3 | `shippingConnectorRegistry.js`, `carrierAdapters.js`, dry quotes |
| Live label/rate | 7 | `liveCarrier: false` in engine registry |

## Suppliers

| Integration | Class | Evidence |
|-------------|-------|----------|
| XML/CSV/manual dry | 3 | `dryRunSupplierAdapter.js`, `supplierHubPlugin.js` |
| Inter Cars / live API | 1–2 | env `REAL_SUPPLIER_*` |
| TecDoc | 3 | `tecdocSandboxService.js` |
| TecDoc live | 1 | credentials BLOCKED |

## Payments

| Integration | Class | Evidence |
|-------------|-------|----------|
| Stripe/PayPal adapters | 2–3 | `paymentConnectorRegistry.js`, `paymentSandbox.js` |
| Deutsche Bank | 2 | `bankingAdapter.js` fixture |
| Capture/refund live | 7 | `BUZZARD_STRIPE_ENABLED=0`, SALES locked |

## Tax

| Integration | Class | Evidence |
|-------------|-------|----------|
| EU27 VAT dry | 3 | `ab27Tax.js`, `germanyTaxPath.js` |
| Tax Connect | 2–3 | `taxConnect.js`, `compliance/taxConnect.js` |
| Live filing | 7 | external |

## Email

| Integration | Class | Evidence |
|-------------|-------|----------|
| Inbound classify/draft | 3 | `incomingEmailProcessor.js` |
| SMTP outbound live | 1 | no credentials in audit |

## AI providers

| Integration | Class | Evidence |
|-------------|-------|----------|
| `aiProviders.js` | 2 | configurable, egress deny |
| OpenAI/realtime | 2 | native stack stubs |
| Voice | 1–2 | `buzzardNative/speech` |

## Counts

| Class | Count (approx.) |
|-------|----------------:|
| Not started | 4 |
| Adapter only | 6 |
| Sandbox tested | 28 |
| Credential configured | 0 (no live env on VM) |
| Connected (live) | 0 |
| E2E verified (live) | 0 |
| Production blocked | **all live paths** |

## Live integration readiness

**≈24%** — sandbox + adapter coverage high; credentials, egress, and SALES lock block classes 4–6.
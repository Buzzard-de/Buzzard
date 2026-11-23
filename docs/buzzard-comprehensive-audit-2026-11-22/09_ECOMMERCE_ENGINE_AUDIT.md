# Ecommerce engines

Date: 22 November 2026. No product was published, no supplier was paid, and no price was sent to a live channel.

## Product

Local create and update go through `productService.recordCanonicalProduct` and `pimCatalog.createProduct`. SKU is required. EAN checksum code exists. Images and categories are fields in the catalog record. TecDoc `fetchCatalog` is a mock. Live TecDoc is BLOCKED_EXTERNAL.

STATUS: COMPLETE_WITH_LIMITATIONS for the local writer. LIVE_VERIFICATION_REQUIRED for TecDoc.

## Supplier

API, XML, and CSV adapters are dry. `baseAdapter.submitOrder` throws. `forwardDrySupplierOrder` returns `live: false`. Stock and price feeds do not call a supplier. Selection scoring is local. The AI cannot buy stock: `engineRegistry.buyStock` returns `HUMAN_GATE_REQUIRED`.

STATUS: COMPLETE_WITH_LIMITATIONS for the dry path. BLOCKED_EXTERNAL for a live supplier.

## Inventory

Reservation and safety stock exist locally. Client-supplied stock is rejected on the canonical path. Update cadence for a live feed was not measured. Oversell protection is local and unproven against a live warehouse.

STATUS: PARTIAL.

## Pricing

`pricingPolicy.js` sets `MIN_NET_PROFIT_EUR` to 0.50 and `MARKET_UNDERCUT_EUR` to 0.10. `pricingEngine.quote` returns `MISSING_COST` and `publish: false` when cost is absent. Shipping, marketplace fee, payment fee, VAT, and return reserve are inputs to the local quote. Competitor prices are not a live feed. Country prices use the VAT table, not a live rate card.

The engine does not let an AI buy stock, and it does not publish a price from an incomplete cost.

STATUS: COMPLETE_WITH_LIMITATIONS locally. BLOCKED_EXTERNAL for live publish.

## Order

Create, validate, reserve, full cancel, idempotency, and a dry supplier handoff exist. Partial cancellation does not. See `05_MISSING_FEATURES_REPORT.md`.

STATUS: PARTIAL.

## Customer

Accounts, addresses, and order history exist locally. Address verification does not call a postal API. GDPR export exists. Deletion is human-gated. Live customer mail is blocked.

STATUS: PARTIAL. Legal completion is HUMAN_REVIEW_REQUIRED.

CONFIDENCE: High for the locks. Medium for untested edge cases of the local writers, because this pass did not rerun the full catalog suite.

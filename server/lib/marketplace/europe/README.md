# Europe marketplace adapters

This folder is a separate registry. It does not modify `marketplaceConnectorRegistry.js`, the Trendyol adapter, or the Amazon, eBay, Kaufland, Allegro, bol, Cdiscount, OTTO, eMAG, and Skroutz connectors.

Those existing channels are recorded here as `EXISTING_UNTOUCHED`. Calling them returns `EXISTING_CONNECTOR_UNTOUCHED` and does not load their modules.

Verified HTTP paths come from the official documents cited on each family. An operation whose path was not copied returns a closed error and does not call a transport. There is no default `fetch`. `live`, `network`, and `productionReady` stay false. `EUROPE_MARKETPLACE_LIVE=1` is refused.

Price and stock pass through the existing pricing, pricing-policy, stock, and VAT engines. A missing commission or other cost returns `PRICING_NOT_VERIFIED`. Returns pass through `startReturn`. No second logistics engine is created.

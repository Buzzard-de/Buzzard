# Smart carrier selection

Same `selectCarrier` (no second engine). MC12 adds:

- coverageGranularity must be POSTCODE_LEVEL and delivery_available===true to autoselect (currently never).
- International brands are not auto-preferred.
- Price and ETA are not invented (`priceInvented: false`, `etaInvented: false`).
- Origin missing is logged; destination coverage UNKNOWN still blocks autoselect.
- Fallback candidate may be listed but cannot start a live shipment.

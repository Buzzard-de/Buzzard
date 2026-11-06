# Smart carrier selection

Same v5 `selectCarrier` (no second engine). MC11 adds an `explanation` array.

- Cheapest preference is ignored.
- Coverage UNKNOWN → no autoselect.
- Unsupported destination → HOLD_FOR_REVIEW + Pusat exception.
- Prices and ETAs stay UNKNOWN.
- Live shipment remains blocked.
- Supplier ≠ carrier unless own-fleet verified (none are).

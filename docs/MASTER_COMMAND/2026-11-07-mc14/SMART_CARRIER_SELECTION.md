# Smart carrier selection

Engine: `server/lib/logistics/v5/selectionEngine.js` (existing, not a fork).

**Autoselect allowed only if** coverageGranularity === POSTCODE_LEVEL **and** delivery_available === true. Today both fail for all 27 countries → `selected = null`, `confidence = LOW`.

Unknown inputs (weight, dimensions, origin, price, ETA, success rate) **lower confidence**; they are **not invented**.

Local carriers are **not** auto-outranked by international brands. Fallback is listed; **auto-transfer of a live shipment is false**.

Output fields: recommended (null), alternative (catalog fallback if apiLevel≥2), price UNKNOWN, ETA UNKNOWN, coverage UNKNOWN, score (rank only), confidence LOW, reasons, missingInformation.

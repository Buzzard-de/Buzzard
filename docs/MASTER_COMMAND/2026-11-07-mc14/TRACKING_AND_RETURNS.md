# Tracking and returns

Buzzard event set: ORDER_CONFIRMED … DELIVERY_EXCEPTION (`trackingNormalize.js`). Unmapped carrier codes → customerVisible **NO_VERIFIED_TRACKING**.

Webhook: HMAC-SHA256 over `timestamp.rawBody`, 5-minute skew, replay map, timing-safe compare. Accepted events are still `live:false`. **No customer email/SMS sent in MC14.**

Returns: `returnsEngine.startReturn` — supplierRefundReceived and customerRefundIssued stay false. Label live path blocked.

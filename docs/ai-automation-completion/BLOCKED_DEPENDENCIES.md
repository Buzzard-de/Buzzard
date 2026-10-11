# Blocked Dependencies

Presence was checked **without printing secret values**.

| Dependency | Status | Classification |
| --- | --- | --- |
| OPENAI_API_KEY | missing | BLOCKED — adapter returns `provider_not_configured` |
| ANTHROPIC_API_KEY | missing | BLOCKED |
| GOOGLE_AI_API_KEY | missing | BLOCKED |
| BUZZARD_AI_PROVIDER | missing (defaults to stub) | Stub only; not LIVE |
| BUZZARD_AI_LIVE_PROBE | missing | Live HTTP disabled even if a key appeared |
| BUZZARD_GUARDIAN_URL | missing | Remote Guardian BLOCKED; local Guardian TESTED |
| BUZZARD_ORCHESTRATOR_URL | missing | Remote orchestrator BLOCKED; Pusat local TESTED |
| Live supplier credentials | not present | Mock adapter only |
| STRIPE_SECRET_KEY | missing | Live payment BLOCKED |
| Twilio | missing | Live SMS BLOCKED |
| Email provider | not configured here | Live email BLOCKED |
| Carrier APIs | stub only (`shippingProvider`) | Live shipment BLOCKED |
| Marketplace credentials | not configured | Live publish BLOCKED |
| Production probe access | not used | Production verification 0.0% |

Mock vs live supplier: `getAdapter("mock")` is a sample connector (`ordersEnabled: false`). Tests assert `live: false`. That is not a live integration.

No accounts were created and no fake keys were invented.

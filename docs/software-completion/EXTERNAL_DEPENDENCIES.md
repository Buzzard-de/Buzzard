# External Dependencies

Classification: **code present** vs **credentials present** vs **live verified**.

Canonical machine-readable list: `EXTERNAL_CONFIGURATION_CHECKLIST.json` (from `software.externalIntegrations`).

No fake keys were generated. Env presence is boolean only; values are never printed.

## LLM

| Provider | Code | Key in this env | Live verified |
| --- | --- | --- | --- |
| Stub | yes | n/a | no (intentional) |
| OpenAI | adapter | no | BLOCKED |
| Anthropic | adapter | no | BLOCKED |
| Google AI | adapter | no | BLOCKED |

Live probe requires key **and** `BUZZARD_AI_LIVE_PROBE=1`. Neither was used.

## Payments / commerce

| Service | Code | Live |
| --- | --- | --- |
| Mock payment provider | yes | no money movement |
| Stripe | stub deny | BLOCKED (`STRIPE_SECRET_KEY` absent; health `live.stripe:false`) |
| PayPal | stub deny | BLOCKED |

## Voice / phone

| Adapter | Code interface | Live |
| --- | --- | --- |
| Twilio | `software.voice` | NOT_CONFIGURED / BLOCKED |
| STT / TTS | interface | BLOCKED |
| WebRTC / realtime | interface | BLOCKED |
| Digital human | interface | BLOCKED |

Legacy Python under `gizli/` and `intelligence/` was not treated as a live Node path.

## Suppliers

| Adapter | Status |
| --- | --- |
| `mock` | mock_connector, tested |
| Live Inter-Cars / TecDoc / etc. | BLOCKED — no credentials exercised |

## Marketplaces

See classification in `server/lib/software/marketplace.js`. All `liveVerified: false`, `published: false`.

## Carriers

`shippingProvider` lists DHL/DPD/Hermes adapter **stubs**. `software.tracking` stores events. No shipment was created at a carrier API.

## Other

| Item | Status |
| --- | --- |
| Production Render API | not called |
| Production database | not opened |
| Customer email/SMS | `customerSend` blocked |
| GitHub Actions `quality` + `e2e-storefront` + `e2e-admin` | SUCCESS on `a26b51d` run 38153709074 |
| GitHub Actions later HEAD | pending until the gap-close/docs SHA is observed |

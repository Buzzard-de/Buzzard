# Provider Readiness Matrix

Derived from `software.externalIntegrations` + `software.providerDiagnostics`.  
No secret values. No network probe executed.

Columns: code / unit-tested / locally configured / credentials present / auth verified / non-prod health / e2e / production.

| Provider | Code | Unit | Local cfg | Creds | Auth | Health | E2E live | Prod |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OpenAI | yes | fail-closed | no | no | no | no | no | no |
| Anthropic | yes | fail-closed | no | no | no | no | no | no |
| Google AI | yes | fail-closed | no | no | no | no | no | no |
| Stripe | yes | UNCERTAIN/webhook deny | no | no | no | no | no | no |
| PayPal | yes | blocked draft | no | no | no | no | no | no |
| SMTP | yes | send BLOCKED | no | no | no | no | no | no |
| Twilio | yes | voice BLOCKED | no | no | no | no | no | no |
| STT/TTS/WebRTC/Realtime | interface | dry-run | no | no | no | no | no | no |
| Supplier API / TecDoc | yes | feed preview | no | no | no | no | no | no |
| DHL/DPD/GLS/Hermes/UPS | stubs | outage/malformed | no | no | no | no | no | no |
| Amazon/eBay/Kaufland/Allegro | classification + hub | draft only | no | no | no | no | no | no |
| OTTO/eMAG/Skroutz/bol/Cdiscount | classification only | adapterExists=false | no | no | no | no | no | no |

Diagnostics CLI: `configured=false` for all 31, `attempted=false`, `authenticated=false`, `reachable=false`, `live=0`.

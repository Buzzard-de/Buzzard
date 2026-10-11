# Provider Readiness Matrix

Derived from `software.externalIntegrations` + `software.providerDiagnostics`.  
No secret values. No network probe executed in this task.

Status vocabulary: IMPLEMENTED / PARTIAL / NOT_IMPLEMENTED / NOT_CONFIGURED / CONFIGURED_NOT_VERIFIED / AUTHENTICATION_NOT_VERIFIED / NON_PRODUCTION_VERIFIED / BLOCKED_EXTERNAL_ACCESS / BLOCKED_HUMAN_APPROVAL / PRODUCTION_NOT_VERIFIED.

Columns: adapter / unit / configured / creds present / auth / reachable / sandbox e2e / production.

| Provider | Adapter | Unit | Cfg | Creds | Auth | Reach | E2E | Prod | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OpenAI | `server/lib/aiProviders.js` | fail-closed | no | no | no | no | no | no | NOT_CONFIGURED |
| Anthropic | `server/lib/aiProviders.js` | fail-closed | no | no | no | no | no | no | NOT_CONFIGURED |
| Google AI | `server/lib/aiProviders.js` | fail-closed | no | no | no | no | no | no | NOT_CONFIGURED |
| Stripe | `paymentService` + `software/payments` | UNCERTAIN / webhook deny | no | no | no | no | no | no | NOT_CONFIGURED |
| PayPal | `paymentService` | blocked draft | no | no | no | no | no | no | NOT_CONFIGURED |
| SMTP | `software/communications` | send BLOCKED | no | no | no | no | no | no | NOT_CONFIGURED |
| Twilio | `software/voice` | BLOCKED | no | no | no | no | no | no | NOT_CONFIGURED |
| STT/TTS/WebRTC/Realtime/digital human | `software/voice` | interface | no | no | no | no | no | no | NOT_CONFIGURED |
| Supplier API / TecDoc | `software/supplierFeeds` | preview + URL reject | no | no | no | no | no | no | NOT_CONFIGURED |
| DHL/DPD/GLS/Hermes/UPS | `software/carriers` | outage/malformed | no | no | no | no | no | no | NOT_CONFIGURED |
| Amazon/eBay/Kaufland/Allegro | marketplace hub + drafts | unpublished | no | no | no | no | no | no | NOT_CONFIGURED |
| OTTO/eMAG/Skroutz/bol/Cdiscount | safe draft/publish-block interface; no vendor contract | `adapterExists=false`, `safeInterface=true` | no | no | no | no | no | no | NOT_IMPLEMENTED vendor adapter / safe interface TESTED |

Diagnostics: `configured=false` for all 31, `attempted=false`, `authenticated=false`, `reachable=false`, `endToEndVerified=false`, `productionVerified=false`, `live=0`.  
HTTP reachability is never treated as authentication. Not attempted is not failed authentication.

# External dependencies

Date: 22 November 2026. None of these services were called.

| Dependency | Code present | Credential in this audit | Live result |
|---|---|---|---|
| TecDoc | Mock adapter | Not used | BLOCKED_EXTERNAL |
| Supplier HTTP API | Dry adapter, network blocked | Not used | BLOCKED_EXTERNAL |
| Stripe / PayPal / SEPA | Sandbox refuse path | Not used | BLOCKED_EXTERNAL |
| Tax connect / ELSTER | Gate | Not used | BLOCKED_EXTERNAL |
| DHL, DPD, GLS, Hermes, UPS | Contract names and a human gate | Not used | LIVE_VERIFICATION_REQUIRED |
| Amazon, eBay, Kaufland, Allegro, bol.com, Cdiscount, OTTO, eMAG, Skroutz, Google Shopping | Registry and `LIVE_CONNECTION_BLOCKED` | Not used | BLOCKED_EXTERNAL |
| Google, Facebook, TikTok, YouTube ads | Local payload, no network | Not used | BLOCKED_EXTERNAL |
| Twilio / SIP | Env probe, outbound refused | Not used | BLOCKED_EXTERNAL |
| STT / TTS endpoints | Env names | Not used | BLOCKED_EXTERNAL |
| OpenAI Realtime | No client. Egress denies the host. | Not used | BLOCKED_EXTERNAL |
| STUN / TURN | Flag only | Not used | BLOCKED_EXTERNAL |
| Vision model | Call returns `VISION_MODEL_BLOCKED` | Not used | BLOCKED_EXTERNAL |
| Render deploy and persistent disk | Docs and gates | Not opened | BLOCKED_EXTERNAL |
| Sanctions list provider | Fail-closed without a feed | Not used | BLOCKED_EXTERNAL |
| Postal address API | Local verifier header says no live API | Not used | LIVE_VERIFICATION_REQUIRED |

STATUS: BLOCKED_EXTERNAL for every row.
RECOMMENDED ACTION: A human adds a credential only in a secret store, then a sandbox test is run. This audit must not be that test.
CONFIDENCE: High that this pass made no external call.

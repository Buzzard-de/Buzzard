# AI council

Date: 22 November 2026. No live model was called. `llmCouncil` is false in the specialist inventory.

An agent name, a PNG, or a voice profile is not a finished AI. The shared engine is `specialistDispatch.js` plus the Pusat queue. The roles are not 14 separate model runtimes.

| Role | Engine | Stops at a human gate | Voice | Memory | Test seen |
|---|---|---|---|---|---|
| Pusat | Orchestrator | Yes for stock buy and live actions | Not configured | SQLite plus an in-memory store | Passed today |
| Esat Bey | Security kinds | Holds a suspicious event | Not configured | `memory/esat/` | `esatBey.test.mjs` exists. Not rerun today. |
| Doğu Bey | Research request | Unsourced research stays UNVERIFIED | Not configured | `memory/dogu/` | Council test passed today |
| Sinan Bey | Code analysis kind | Factory gates | Reference file registered, not a live voice | `memory/sinan/` | Test file exists. Not rerun today. |
| Price | `PRICE_CALCULATE` | Cannot set a live price | Not configured | Namespace | Passed inside the orchestrator test today |
| Stock | `STOCK_READ` / `STOCK_BUY` | Buy returns `HUMAN_GATE_REQUIRED` | Not configured | Namespace | Passed today |
| SEO | `SEO_DRAFT` | Cannot live-publish | Not configured | Namespace | No dedicated dispatch test was rerun |
| Customer | Customer kinds | Refund is gated | Not configured | `memory/banu/` | Not rerun today |
| Sales analysis | `SALES_REPORT` | Read only | Not configured | Namespace | Not rerun today |
| Category | `CATEGORY_READ` | Read only | Not configured | Namespace | Not rerun today |
| Customs | Tuncay Bey, `SANCTIONS_SCREEN` | Unknown list result is not a clearance | Not configured | `memory/tuncay/` | Not rerun today |
| Supplier | No `supplier_ai` persona | Submit is blocked in the supplier adapter | None | None as a persona | Dry forward passed today |
| Marketing | Mira and Leon kinds | Approval request | Not configured | Namespaces | Not rerun today |
| Textile | Council role plus `textileProgram.js` | Video and try-on stay blocked | Not configured | Council memory | Surface test passed today |

Peer messages and meetings exist in local code. They do not call another company's model.

STATUS: COMPLETE_WITH_LIMITATIONS for the local rule council. BLOCKED_EXTERNAL for any live model or voice.
RISK LEVEL: P2.
RECOMMENDED ACTION: Do not add another orchestrator beside Pusat.
CONFIDENCE: High for the shared-engine finding. Medium for roles whose tests were not rerun today.

# Module-by-module status

Date: 22 November 2026. HEAD `63e55af5`. Read-only.

A module is "running" here only when local code executes a closed path. A connector name is not a live API. A document is not a module.

## A. Core commerce

| Module | Class | Evidence |
|---|---|---|
| Product Engine, PIM, catalog, product creation | Code, limited | Canonical writer and product gates exist. Live publish ids stay blocked. |
| Category Engine | Partial | 330 L2 nodes. 9 reviewed labels in every supported locale. 321 labels unreviewed. |
| Search Engine | Code, limited | Local search code exists. No live search-index proof in this pass. |
| Pricing Engine | Code, locked | Dry price path exists. `PRICE_LIVE_WRITE` stays blocked. |
| Inventory Engine | Code, limited | Local stock logic exists. Live supplier stock is not verified. |
| Order Engine | Code, locked | Dry order path exists. `ORD_LIVE_SUBMIT` stays blocked. No real order was created. |
| Customer Engine | Code, limited | Local customer records exist. No live customer contact was started. |
| Returns Engine | Code, locked | Refund issue returns 403 while sales are locked. |

## B. International commerce

| Module | Class | Evidence |
|---|---|---|
| EU-27 and 35-market configuration | Code and data | Country and locale tables exist. Live tax filing does not. |
| VAT, tax, country tax pools | Partial | Local rules exist. `TAX_CONNECT_LIVE` stays blocked. |
| Multilingual system | Partial | 30 locales are declared, including Turkish, German, English, and Arabic. Reviewed L2 coverage is 9 of 330 in each locale. RTL is declared for Arabic and is not a reviewed-copy proof. |
| Currency | Code, limited | Local currency fields exist. No live FX feed was verified. |
| Customs, sanctions | Partial | `P21-T-16.1` now requires a listed-party or human review. Live filing stays blocked. |
| National days | Partial | 27 sourced days and a local draft. Homepage publish stays unapproved. Not a full legal calendar. |

## C. Supplier system

| Module | Class | Evidence |
|---|---|---|
| Connectors, API, XML, CSV, manual | Code, dry | Adapter code exists. Live supplier API ids stay blocked. |
| Stock feed | Code, dry | No live stock feed was called. |
| Supplier selection AI | Code, local | Local scoring exists. No live purchasing decision was executed. |
| Supplier Order Orchestrator | Partial | `supplierOrderOrchestrator.js` forwards a dry order with `live: false`. The base adapter refuses a real submit. |
| Dropshipping automation | Code, locked | No supplier purchase was made. |

## D. Marketplace

`marketplaceConnectorRegistry.js` names Amazon, eBay, Kaufland, Allegro, bol.com, Cdiscount, OTTO, eMAG, Skroutz, and Google Shopping. `decidePublish` returns `LIVE_CONNECTION_BLOCKED` unless a publish flag and a credential are both present. This environment did not set those flags and did not call a marketplace.

| Check | Result |
|---|---|
| Code present | Yes, for the ten named channels. |
| Sandbox running | Local decision only. No sandbox session was opened. |
| Real API connection | Not verified. |
| Authentication | Environment names exist. No credential was read or proven. |
| Live data exchange | Not verified. |

## E. Payment and finance

| Module | Class | Evidence |
|---|---|---|
| Payment engine, providers, PayPal, Deutsche Bank, SEPA, instant payments | Code, locked | Intent, confirm, invoice, and signed finance webhooks return 403 while sales are locked. No capture was made. |
| Refund system | Code, locked | Refund returns 403. `refundIssued` is false. |
| Commission, profit, tax reserves, country tax pools | Code, local | Calculation modules exist. No live settlement was verified. |

## F. Logistics

DHL, DPD, GLS, Hermes, UPS, and Amazon Logistics have local carrier code. Shipment creation, tracking, returns logistics, international shipping, and GCC shipping stay behind human or live gates. No label was bought and no carrier API was called in this pass.

## G. AI ecosystem

Pusat, the AI council, price, stock, SEO, customer, sales, category, and customs assistants, Esat Bey, Doğu Bey, Sinan, central memory, the task orchestrator, human approval, exceptions, and reporting have local modules or documents. Live voice, live council, and live assistant actions stay blocked. This pass did not start a live model call.

## H. Voice and digital humans

STT, TTS, WebRTC signaling, WebRTC media, TURN/STUN, OpenAI Realtime, phone integration, digital human, real avatar, real-time video, voice communication, and the AI meeting system are present as local designs, gates, or documents. `PUSAT_LIVE_VOICE` stays blocked. No live media session was opened.

## I. Special features

| Module | Class | Evidence |
|---|---|---|
| Textile AI | Partial | Product-scope gates exist. Licensed promo video is blocked. |
| Virtual try-on | Partial | Consent and angle checks return `VISION_MODEL_BLOCKED`. |
| AI influencers Mira and Leon, ambassadors Amelia and Adrian | Document or local draft | No live publishing account was connected. |
| Marketing automation | Partial | Four ad channels prepare a local payload and do not call a network. Spend capture stays locked. |
| Kleinanzeigen | Code or document, not live | No live listing was published. |
| Product recommendation AI | Code, local | No live recommendation traffic was verified. |

## J. Future ecosystem

| Name | Class |
|---|---|
| Buzzard24 | Document and export archive. Not a separate running product in this tree. |
| Buzzard Film | No source module found. |
| Buzzard AI | The local AI modules above. Not a separate live product. |
| Buzzard Logistics | Carrier code plus documents. Not a live carrier network. |
| Buzzard Marketplace | The dry connector registry above. Not a live marketplace. |
| Buzzard Bank | No bank product module. `server/lib/finance/bankingAdapter.js` is a local finance adapter and is not a bank. |

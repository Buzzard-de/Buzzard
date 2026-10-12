# Blocked Items

These are **not** missing software modules in the same sense as an empty handler. They cannot be honestly marked complete without external access. Code may still exist.

| Item | Class | Why blocked | Software still usable? |
| --- | --- | --- | --- |
| Live LLM (OpenAI/Anthropic/Google) | credentials | keys absent; no probe | stub provider + redaction tests |
| Live Stripe/PayPal | credentials | keys absent | mock payment; timeout = UNCERTAIN, no retry |
| Live Twilio / STT / TTS / WebRTC / Realtime | credentials | keys absent | voice adapter reports NOT_CONFIGURED / BLOCKED |
| Live supplier PO send | policy + credentials | sales lock + no live adapter | feed preview + PO draft only |
| Live marketplace publish | credentials + policy | no accounts | draft listing only; OTTO/eMAG/Skroutz/bol/Cdiscount classification-only |
| Live carrier create/GPS | credentials | stubs only | tracking model + estimates, `gpsInvented: false` |
| Customer email/SMS send | credentials + policy | no provider | draft/queued only; send returns BLOCKED |
| Product Source of Truth activate | policy | must stay closed | dry-run / DRAFT / READY only; never ACTIVE from this task |
| Remaining product master writers | architecture | `productStore.upsertProduct` (file JSON) not on the boundary | policy increment only; no store migration |
| Sales unlock | policy | `BUZZARD_SALES_ENABLED` must stay off | catalog mode |
| Production DB migrate | policy | no production touch | local/isolated SQLite |
| Production deploy | policy | out of scope | — |
| CI on `a26b51d` | observed | run 38153709074 quality + e2e-storefront + e2e-admin SUCCESS | does not prove live providers |
| CI on `0d76330` | observed | run 38245468242 quality + e2e-storefront + e2e-admin SUCCESS | does not prove live providers |
| braces/micromatch | human | no Next 15 compatible patch | lint toolchain only |

Health payloads list blocked ids (`llm_live`, `stripe`, `twilio`, `marketplace_publish`, `carrier_shipment_create`, `supplier_purchase_order_send`, `customer_message_send`, `product_source_of_truth`, `sales_unlock`). A green `/api/health/software` `code` object does **not** mean `liveReady`.

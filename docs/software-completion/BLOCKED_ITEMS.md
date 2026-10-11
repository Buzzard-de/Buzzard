# Blocked Items

These are **not** missing software modules in the same sense as an empty handler. They cannot be honestly marked complete without external access. Code may still exist.

| Item | Class | Why blocked | Software still usable? |
| --- | --- | --- | --- |
| Live LLM (OpenAI/Anthropic/Google) | credentials | keys absent; no probe | stub provider + redaction tests |
| Live Stripe/PayPal | credentials | keys absent | mock payment; no retry |
| Live Twilio / STT / TTS / WebRTC | credentials | keys absent | voice adapter reports BLOCKED |
| Live supplier PO send | policy + credentials | sales lock + no live adapter | PO draft only |
| Live marketplace publish | credentials + policy | no accounts | draft listing only |
| Live carrier create/GPS | credentials | stubs only | tracking model + estimates, `gpsInvented: false` |
| Customer email/SMS send | credentials + policy | no provider | draft message only |
| Product Source of Truth activate | policy | must stay closed | dry-run / DRAFT only |
| Sales unlock | policy | `BUZZARD_SALES_ENABLED` must stay off | catalog mode |
| Production DB migrate | policy | no production touch | local/isolated SQLite |
| Production deploy | policy | out of scope | — |
| Admin Control Center UI | environment | static export does not keep the admin session across `/admin/control-center/` | login page + dashboard + admin APIs work |
| Full CI matrix | workflow scope | `quality` does not run `test:unit` or Playwright | those ran locally this session |

Health payloads list blocked ids (`llm_live`, `stripe`, `twilio`, `marketplace_publish`, `carrier_shipment_create`, `supplier_purchase_order_send`, `customer_message_send`, `product_source_of_truth`, `sales_unlock`). A green `/api/health/software` `code` object does **not** mean `liveReady`.

GitHub Actions `quality` was observed SUCCESS for `8adcc87` and `ba95c26`. That is not production verification and is not a full-suite green.

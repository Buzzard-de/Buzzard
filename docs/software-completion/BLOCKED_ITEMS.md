# Blocked Items

These are **not** missing software modules in the same sense as an empty handler. They cannot be honestly marked complete without external access. Code may still exist.

| Item | Class | Why blocked | Software still usable? |
| --- | --- | --- | --- |
| Live LLM (OpenAI/Anthropic/Google) | credentials | keys absent; no probe | stub provider + redaction tests |
| Live Stripe/PayPal | credentials | keys absent | mock payment; no retry |
| Live Twilio / STT / TTS / WebRTC | credentials | keys absent | voice adapter reports NOT_CONFIGURED / BLOCKED |
| Live supplier PO send | policy + credentials | sales lock + no live adapter | PO draft only |
| Live marketplace publish | credentials + policy | no accounts | draft listing only |
| Live carrier create/GPS | credentials | stubs only | tracking model + estimates, `gpsInvented: false` |
| Customer email/SMS send | credentials + policy | no provider | draft message only |
| Product Source of Truth activate | policy | must stay closed | dry-run / DRAFT / READY only; never ACTIVE from this task |
| Sales unlock | policy | `BUZZARD_SALES_ENABLED` must stay off | catalog mode |
| Production DB migrate | policy | no production touch | local/isolated SQLite |
| Production deploy | policy | out of scope | — |
| Admin Control Center / Sessions / PIM UI | environment | static export does not keep the admin session | login page + dashboard + admin APIs work |
| CI `quality` on `25a48da` | empty catalog assumption | part8 listed leftover public PIM rows | fixed on `7f81585`; run 38144084891 SUCCESS |

Health payloads list blocked ids (`llm_live`, `stripe`, `twilio`, `marketplace_publish`, `carrier_shipment_create`, `supplier_purchase_order_send`, `customer_message_send`, `product_source_of_truth`, `sales_unlock`). A green `/api/health/software` `code` object does **not** mean `liveReady`.

GitHub Actions on `7f81585` run [38144084891](https://github.com/Buzzard-de/Buzzard/actions/runs/38144084891): `quality` SUCCESS (including `test:unit`) and `e2e-storefront` SUCCESS. `25a48da` remains the documented failed predecessor.

# Blocked Items

These are **not** missing software modules in the same sense as an empty handler. They cannot be honestly marked complete without external access. Code may still exist.

| Item | Class | Why blocked | Software still usable? |
| --- | --- | --- | --- |
| Live LLM (OpenAI/Anthropic/Google) | credentials | keys absent; no probe | stub provider + redaction tests |
| Live Stripe/PayPal | credentials | keys absent | mock payment; no retry |
| Live Twilio / STT / TTS / WebRTC | credentials | keys absent | voice adapter reports NOT_CONFIGURED / BLOCKED |
| Live supplier PO send | policy + credentials | sales lock + no live adapter | feed preview + PO draft only |
| Live marketplace publish | credentials + policy | no accounts | draft listing only |
| Live carrier create/GPS | credentials | stubs only | tracking model + estimates, `gpsInvented: false` |
| Customer email/SMS send | credentials + policy | no provider | draft/queued only; send returns BLOCKED |
| Product Source of Truth activate | policy | must stay closed | dry-run / DRAFT / READY only; never ACTIVE from this task |
| Sales unlock | policy | `BUZZARD_SALES_ENABLED` must stay off | catalog mode |
| Production DB migrate | policy | no production touch | local/isolated SQLite |
| Production deploy | policy | out of scope | — |
| CI on HEAD `f967c01` | not yet observed | pushed after `a2879e4` green | local tests passed |

Health payloads list blocked ids (`llm_live`, `stripe`, `twilio`, `marketplace_publish`, `carrier_shipment_create`, `supplier_purchase_order_send`, `customer_message_send`, `product_source_of_truth`, `sales_unlock`). A green `/api/health/software` `code` object does **not** mean `liveReady`.

GitHub Actions on `a2879e4` run [38150381530](https://github.com/Buzzard-de/Buzzard/actions/runs/38150381530): `quality` SUCCESS, `e2e-storefront` SUCCESS, `e2e-admin` SUCCESS. Superseded `a273651` e2e-admin FAILURE is documented (storefront header stole the login submit).

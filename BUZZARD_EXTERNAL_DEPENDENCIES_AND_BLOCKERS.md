# BUZZARD — External Dependencies & Blockers

Status template: **Adapter** = code present · **Config** = env/docs · **Creds** = not inspected (no secrets) · **Auth** · **Live test** · **Live ops**

## Critical six (dev-list)

| # | Dependency | Adapter | Config | Creds | Auth | Live test | Live ops | Remaining |
|---|------------|---------|--------|-------|------|-----------|----------|-----------|
| 19 | TecDoc | B — TecDoc fields in PIM pipeline | G | E | E | E | E | OEM contract + credentials |
| 20 | Live supplier API | B — `apiSupplierAdapter` dry | Partial env | E | E | E | E | `REAL_SUPPLIER_LIVE_IMPORT=0` |
| 28 | Payment capture | B — `paymentSandbox`, Stripe/PayPal flags off | Env gates | E | E | E | E | Sales gate + provider contracts |
| 30 | Refund / banking | B — `refundMoney` sandbox | — | E | E | E | E | PSP refund APIs |
| 37 | Tax Connect filing | B — `taxConnect.js` queue | **Missing** `BUZZARD_TAX_CONNECT_URL/KEY` in assess | E | E | E | E | External Tax Connect account |
| 41 | Live carrier rates | B — carrier registry mock | No credentials | E | E | E | E | DHL/etc. API keys |

Evidence: `evaluateDevList51()` → 6× `LIVE_BLOCKED`; `assessTaxConnect()` missing env array; `getIntegrationStatus().salesEnabled === false`.

---

## Extended dependency table

| Dependency | Adapter status | Live ops | Notes |
|------------|----------------|----------|-------|
| Supplier XML/CSV/API | **B** — `supplierImportPipeline`, adapters | E | Dry-run default |
| Marketplace OAuth (Amazon, eBay, …) | **B** — `marketplaceConnectorRegistry.js` CHANNELS | E | All connectors `live: false` in snapshots |
| Google Shopping | **B** — extra channel `google_shopping` | E | Not in user’s 9-name list but present in code |
| Email delivery (SMTP/IMAP) | **B** — processors/queue | E | No production mailbox verified |
| AI vision (textile try-on) | **C** — `demoTryOn` | E | Explicitly non-live |
| Voice/STT/TTS | **B** — `voice/signaling`, Pusat | E | `liveCallsBlocked` in health |
| Social / ads APIs | **D** — not under `server/lib/marketing` | E | Only synthetic identities |
| Render / GitHub Pages hosting | **G** — `egressPolicy.inventoryDependencies` text | G | Not connectivity-tested |
| Persistent production disk | **E** — migration tests failing | E | `jsonStoreIntegrity.test.mjs` |
| Domain / TLS | G | G | Out of repo scope |
| Monitoring/alerting | **B** — security/audit logs | G | No external APM verified |
| OpenAI / LLM providers | **B** — AI center plugins | E | Keys not inspected |
| Inter Cars / OEM data | G | E | Mentioned in prior program docs; not re-verified here |
| FIN-M25 / PR #502 | G | G | **Not modified** per mission rules |

---

## Environment gates (verified values in audit runs)

```
BUZZARD_SALES_ENABLED=0
REAL_SUPPLIER_LIVE_IMPORT=0
REAL_SUPPLIER_DRY_RUN=1
BUZZARD_STRIPE_ENABLED=0
BUZZARD_PAYPAL_ENABLED=0
```

---

## Responsible party

External credentials and contracts are **operator/vendor** responsibilities unless otherwise assigned in project docs. This audit does not invent connection results.
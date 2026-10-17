# Buzzard — Seven External Dependencies: Cost Minimization

Date: 2026-10-15  
Mode: **READ-ONLY INSPECTION AND REPORTING**  
No code change, commit, push, PR, merge, deploy, purchase, or production configuration change.  
Sales / Product SoT / live payments were **not** enabled.

| Field | Value |
| --- | --- |
| Branch | `cursor/software-completion-local-c293` |
| HEAD | `a3c2da867b4b2f95b7eb2134510dff7669b7a089` |
| Working tree at inspect | clean (ahead 38) |
| This file before write | **ABSENT** |
| Production access | **not assumed, not used** |

Prices that are not in this repository or on a public list are marked **bilinmiyor**. Services already on an existing invoice are **not** counted as new cost.

Register items (unchanged): 87, 88, 185, 205, 212, 217, 220. Statuses and percentages were **not** modified.

---

## 87 Inter-Cars

### Adapter and documentation

- Classification only: `server/lib/software/connectorInventory.js` (`id: "inter_cars"`, `class: PARTIAL`, `live: BLOCKED_EXTERNAL_DEPENDENCY`). Note: key is **not** used for live orders in this environment.
- Inventory row: `server/lib/software/externalIntegrations.js` — env names `INTERCARS_API_KEY`, `INTERCARS_API_URL`; `adapterPath` is **`connectorInventory.js`**, not an HTTP client.
- There is **no** Inter-Cars request/signature/order module under `server/lib`.
- Docs: `docs/PART15_REAL_SUPPLIER_INTEGRATION_PLAN.md` lists Inter Cars as a **shortlist** (PL/EU, API/XML). Explicit: “No supplier in this repository is connected.”
- Workspace env: `INTERCARS_API_KEY` / `INTERCARS_API_URL` **absent**.

### Access conditions

1. Commercial Inter Cars (or group) **B2B account** (dealer/workshop/wholesale).
2. Contractual API/XML authorization and URL.
3. Credentials in a secret manager, not git.
4. Local software still refuses live purchase orders without separate **human** approval (`liveWriteConfigured: false`).

### Free vs commercial

| | |
| --- | --- |
| Free | Local CSV/XML/JSON/mock supplier **preview** already exists. That is **not** Inter-Cars live. No public free Inter-Cars catalog API was found in this repo. |
| Commercial | Live stock/price/order from Inter-Cars **requires a trade contract**. Not a self-serve SaaS sticker. |

**Minimum spend to unblock 87 without live PO:** authorized **read** sandbox (if Inter-Cars offers one) + credentials. Live PO remains HUMAN (item 182 / sales lock). Price: **bilinmiyor**.

---

## 88 TecDoc

### Fields and purpose in code

| Use | Code | Fields |
| --- | --- | --- |
| Mock vehicle lookup | `server/lib/adapters/tecdocAdapter.js` | brand, model, type, year_from/to, engine |
| Mock article–vehicle link | same | article, vehicle_id, part_reference |
| Declared capabilities | same | `vehicle_lookup`, `compatibility`, `catalog` |
| Stock/price fetch | `fetchStock` / `fetchPrices` | **empty mock** — not a live TecDoc commerce feed |
| PIM product | `productCatalogPim.js` / `db.js` | `tecdoc_ref` |
| Supplier SKU | `supplierHub.js` | `tecdoc_article`, `tecdoc_enabled` |
| Compatibility table | `supplierHub.linkCompatibility` | product_sku, vehicle_id, source `tecdoc_adapter` |
| HTTP | `POST /api/tecdoc/compatibility` | `checkTecDocCompatibility` returns `compatible: null`; status `license_and_api_required` unless `TECDOC_API_KEY` is set (**boolean only**; no live call) |

Adapter header: **“No real TecDoc API calls.”** Env `TECDOC_API_KEY` **absent**. Checklist: catalog mapping only; not a PO channel.

### Minimum license scope (recommendation, not a quote)

Code actually needs **fitment**, not TecDoc as a wholesaler:

1. **Passenger-car (PKW) article + vehicle linkage** for the markets you sell (start **DE**; add AT/other CEE only if those shops go live).
2. Vehicle identification at **make / model / type / year / engine** — matching the mock. **VIN decoder** is not implemented; do not buy VIN unless a later product decision requires it.
3. Do **not** buy by default: Nkw/CV, motorcycle, TecRMI labour times, full worldwide country packs, image/media extras, OEM-only dumps, stock/price modules (code does not consume TecDoc stock/price).

Do **not** assume unlicensed commercial use of TecDoc data. Mock vehicles in-repo are **not** a license.

Price: **bilinmiyor** (TecAlliance quote). Typical shape: **annual**, module- and country-based — not listed in this repository.

---

## 185 Alert

### Existing infrastructure

| Channel | Implementation | Sends live? |
| --- | --- | --- |
| Internal log | `server/lib/securityLog.js` → `server/data/security-log.json` (max 5000) | Local file only |
| Rule engine | `alertReadiness.js` + `localAlerts.js` | `liveDispatch: false`, `deliveryBlocked: no_authorized_alerting_backend` |
| SMTP diagnostic | `SMTP_HOST` + `SMTP_USER` presence | Env **absent**. `notificationEngine.dispatchEmail` has **no** nodemailer/`sendMail`; it only marks `queued` / `queued_demo` |
| Webhook diagnostic | `BUZZARD_ALERT_WEBHOOK_URL` or `COMMERCE_WEBHOOK_SECRET` | Both **absent**; never dispatched in `localAlerts` |
| Pager | Explicit `pager: false` | Not implemented |

### Free option vs missing evidence

Free and **already in software**: generate alerts into logs; unit test `localMetricsAlerts.test.mjs` (dispatched false).

To satisfy **live delivery** evidence without a pager product:

- If an SMTP account **already exists** for the company: wire it later under human approval; **new monthly cost 0** if already paid. This environment has **no** SMTP env.
- Incoming webhook to Slack/Discord/Teams incoming URL: list price **0 €**; still needs an authorized destination URL and a **send** that today does not exist.
- GitHub Actions `uptime-monitor.yml` already schedules `scripts/verify-go-live.mjs` every 6 hours against documented production URLs — that is **uptime**, not the 185 pager channel. Do not double-count as 185.

Missing evidence: authorized destination; an actual send (this code path does not send); production delivery log. PagerDuty is **not** required by the register (“Not a live pager”).

---

## 205 and 212 CI

### Workflows and coverage

Canonical `.github/workflows/ci.yml` runs **only** on `push`/`pull_request` to **`main`**:

- `quality`: `npm ci`, lint, typecheck, build, `test:ai`, `test:software`, `test:unit`, `render:preflight`, `security:check`
- `e2e-storefront`: Playwright homepage viewports
- `e2e-admin`: API + admin/PIM/customer-journey (sales `0`, `BUZZARD_TEST_MODE=1`)

Other workflows (`deploy-pages`, `deploy-api`, `uptime-monitor`, `verify-go-live`) also target **main** or schedule. They do **not** run automatically on `cursor/software-completion-local-c293`.

This clone is **ahead 38** of origin on that feature branch. Register 212: local HEAD ahead of PR; rollup empty.

### Same problem twice?

**Yes.** 205 (“release quality / CI UNKNOWN for this HEAD”) and 212 (“CI evidence / PR #430 checks”) share **one** GitHub Actions pipeline and **one** missing artifact: a green check on an **uploaded SHA**. 212 additionally names draft **PR #430** vs current local HEAD. That is the same CI product, two evidence rows.

### Missing evidence and authority

Need: GitHub Actions run on the intended SHA (this HEAD or a PR into `main`), recorded status.

Authority: an **independent human** may push or open/update a PR. **This task did not push or create a PR.**

Cost: no new CI product. If GitHub private Actions minutes are **already included**, new money **0**. Extra minutes: public list **~$0.008/min** Linux (GitHub list; not a Buzzard invoice). This repo’s CI is heavy (build + full vitest + Playwright); still usually cheaper than a second CI vendor.

---

## 217 Production monitoring

### In-repo (no production login)

- Public: `GET /api/health`, `GET /api/health/db`, `GET /api/health/version`
- Auth’d: `/api/health/software`, `/api/health/pusat`, production/go-live/operations snapshots
- Aggregators: `monitoringReadiness.js`, `monitoringReady.js` (`productionDb: UNKNOWN`, `reason: BLOCKED_EXTERNAL` unless local `/var/data` evidence)
- GitHub `uptime-monitor.yml` + `verify-go-live.yml` call `https://buzzard24.de` and `https://buzzard-api.onrender.com` **when those workflows run on GitHub**. This audit **did not** execute them and does **not** claim those hosts are healthy.

### What free options cover

Item 217 is “authorized prod monitor **probe**”, not a SOC/SIEM buy.

Sufficient **minimum** if a human already has GitHub + the public health URL:

- Existing `/api/health` (no extra fee)
- Existing 6-hour Actions uptime job (minutes already on GitHub; **0** new product)
- Render dashboard metrics **if** the `buzzard-api` starter instance is already paid (included with plan; **not** verified here)

Not required to close 217: Datadog, New Relic, paid status pages.

Still required: **operator-recorded** probe (HTTP 200 + persistence fields) by someone allowed to look at production. This agent did not.

---

## 220 Production disk

### Configuration (code, not live proof)

`render.yaml`: service `buzzard-api`, `plan: starter`, Frankfurt, disk `buzzard-data`, mount `/var/data`, `sizeGB: 1`, intended `BUZZARD_DB_PATH=/var/data/buzzard.db`. Free-tier ephemeral disk is documented as **losing SQLite on redeploy**.

App: `dbPaths.js` — production refuses missing `BUZZARD_DB_PATH` and `/tmp`. Operator procedure: `docs/software-completion/RENDER_STORAGE_OPERATOR.md` — all live rows **NOT_VERIFIED**.

### Measured local durable set (this workspace, not production)

| Object | Size |
| --- | --- |
| `server/data/buzzard.db` | **16 MB** |
| `server/data/` (json + db) | **39 MB** |
| Root `data/` catalog JSON | **~6 MB** (largest `buzzard_categories.json` 932 KB) |

SQLite is the durable runtime store. WAL + a few file backups still keep the working set on the order of **tens of MB**, not GB.

### Verified here vs operator

| Verifiable without production | Operator must confirm |
| --- | --- |
| Blueprint asks for 1 GB at `/var/data` | Disk `buzzard-data` attached to **live** `buzzard-api` |
| Local DB 16 MB | Runtime `BUZZARD_DB_PATH=/var/data/buzzard.db` |
| Code fail-closed on ephemeral paths | File exists after **authorized** restart; `persistent=true` |
| | Backup dir on the same disk |

**Do not buy extra GB from this report.** 1 GB already in the blueprint is **>10×** the measured 16 MB SQLite file (growth/backups). Enlarging the disk is not justified by current data. If starter + 1 GB is **already** on the Render invoice, **new cost 0**. If the live service is still free/ephemeral, the **minimum paid** piece is a plan that **allows** a persistent disk (starter is what the blueprint names) + **1 GB**, not a larger disk.

Public list (not invoice): Render starter historically **~$7/month**; disk **~$0.25/GB/month** → 1 GB **~$0.25/month**. Confirm on Render’s current price page before purchase. This task did not purchase or open the dashboard.

---

## Summary table

Legend: **zaten ödendi** = do not add as new spend if the org already pays that product. **bilinmiyor** = no list/quote in repo.

| Madde | Ücretsiz seçenek | Minimum ücretli seçenek | Tek seferlik | Aylık (yeni) | İnsan onayı | Kanıt |
| --- | --- | --- | --- | --- | --- | --- |
| **87 Inter-Cars** | Yerel CSV/XML/JSON/mock; canlı IC yok | B2B hesap + yetkili **okuma** sandbox (PO kapalı kalsın) | **bilinmiyor** (sözleşme/onboarding) | **bilinmiyor** | Evet: hesap, anahtar, sandbox; PO ayrı | `live: false` bugün; canlı GET stok kanıtı yok. Ücretsiz “IC API” yok |
| **88 TecDoc** | Mock adapter (ticari TecDoc verisi değil) | Yalnızca PKW article+linkage; ülke: önce DE; VIN/Nkw/RMI alma | **bilinmiyor** (yıllık lisans) | **bilinmiyor** (genelde yıllık) | Evet: lisans + `TECDOC_API_KEY` secret manager | Lisanssız ticari kullanım yok; mock ≠ lisans |
| **185 Alert** | `securityLog` + `localAlerts` (`liveDispatch: false`) | Mevcut SMTP veya ücretsiz incoming webhook; pager **gerekmez** | 0 € (kod) veya SMTP kurulum **bilinmiyor** | 0 € if SMTP/GitHub zaten var; pager ürünü **kaçın** | Evet: hedef URL/SMTP; müşteri maili ayrı HUMAN 155/165 | Gönderim yok; env SMTP/webhook yok |
| **205 CI** | Mevcut `.github/workflows/ci.yml` (main) | Yeni CI satıcısı yok | 0 € | 0 € if Actions dakikası dahil; aşım **~$0.008/dk** list | Evet: bu SHA için workflow (push/PR — **bu görev yapmadı**) | Feature branch CI tetiklemez; rollup boş |
| **212 CI / PR #430** | **Aynı** Actions; 205 ile tekrar | Aynı; ikinci ürün yok | 0 € | 0 € (205 ile paylaşılır) | Evet: PR/CI kanıtı; merge değil | Draft #430 ≠ bu HEAD; ayrı fatura yok |
| **217 Monitoring** | `/api/health` + mevcut 6s uptime workflow | Datadog alma; Render metrik if instance zaten ödendi | 0 € | 0 € yeni ürün | Evet: yetkili prod probe kaydı | Bu ajan prod’a bakmadı; `productionDb: UNKNOWN` |
| **220 Disk** | Yerel 16 MB SQLite (prod sayılmaz) | Blueprint: **starter + 1 GB**; daha büyük disk alma | 0 € if disk zaten bağlı | **~$7 + ~$0.25** list **yalnızca** henüz ödenmediyse; zaten ödendiyse **0** | Evet: `RENDER_STORAGE_OPERATOR.md` | Yerelde `/var/data` yok; canlı attach **NOT_VERIFIED** |

**En ucuz dürüst sıra (satın alma emri değil):** 205/212 (insan CI, 0 € ürün) → 217 (mevcut health/uptime, 0 € ürün) → 220 (disk zaten varsa 0 €; yoksa 1 GB, büyütme) → 185 (log veya mevcut SMTP, pager yok) → 88 (dar TecDoc teklifi) → 87 (IC ancak tedarik stratejisi gerektiriyorsa).

---

## Explicit statement

Read-only. No purchase, deploy, secret, or score change. Unknown prices remain **bilinmiyor**. Already-paid GitHub/Render/SMTP must not be double-counted. Sales, live payments, and Product SoT stay off.

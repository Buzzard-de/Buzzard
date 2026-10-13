# Buzzard Phase 5 — Final Software Gap Closure, Security, E2E, Persistence, Operator Readiness

Version: 5.0  
Date: 2026-10-13  
Branch: `cursor/final-completion-execution-c293`  
Starting HEAD: `f137f11b8eba28a6c53ca53f59e6546c9490a648` (Phase 4 pin)  
Ending HEAD: recorded at the bottom after the local report commit.

Git push / PR / merge / deploy: **not performed**.  
`git reset --hard` / `git clean -fd`: **not used**.  
Port 3000: left running (`next-server` pid 380566, HTTP 200). Isolated E2E used `:3010` + API `:3002` and was stopped afterwards.

Locks (verified, not enabled):

| Flag | State |
| --- | --- |
| `BUZZARD_SALES_ENABLED` | disabled (`0` in `.env.example`; local `/api/health/software` `salesEnabled: false`) |
| `BUZZARD_PRODUCT_SOT_ACTIVE` | unset; health `productSourceOfTruthActive: false` |
| `BUZZARD_LIVE_PAYMENTS` | unset |

No capability below is `LIVE_VERIFIED`. Local Vitest and Playwright on loopback are not Stripe/PayPal/Render sandbox or live proof.

Status labels: `NOT_IMPLEMENTED` | `STUB` | `PARTIAL` | `CODE_READY` | `CONFIGURED` | `SANDBOX_VERIFIED` | `LIVE_VERIFIED`  
Security labels: `FIXED_AND_VERIFIED` | `MITIGATED_WITH_EVIDENCE` | `OPEN` | `BLOCKED_EXTERNAL`

---

## 1. Baseline

| Field | Value |
| --- | --- |
| Branch | `cursor/final-completion-execution-c293` |
| Starting HEAD | `f137f11` — matched expected Phase 4 HEAD; tree clean |
| Uncommitted user changes at start | none |
| Phase 4 report | `docs/software-completion/BUZZARD_PHASE4_SECURITY_ORDER_CHECKOUT_QR_REPORT_2026-10-13.md` |
| Pusat | sole orchestrator; not duplicated |

Phase 3/4 engines were **not** rebuilt. This phase re-investigated braces, closed remaining local E2E gaps, verified contracts with existing tests, assessed persistence without production access, and inventoried connectors from `software.externalIntegrations`.

---

## 2. Files changed and why

| File | Reason |
| --- | --- |
| `playwright.config.ts` | Attach previously unmatched `e2e/storefront-bridge.spec.ts` to `chromium-desktop`. |
| `e2e/customer-journey.spec.ts` | Skip-link keyboard test; product-detail E2E against a **static export** slug. |
| `e2e/storefront-bridge.spec.ts` | Reuse `seedAdminSession` / `waitForAdminReady`. Naive form login treated `/admin/login/` as success (`waitForURL(/\/admin/)`). |
| This report | Evidence for Phase 5. |

`npm run build` rewrote taxonomy preflight JSON (localhost probe). Those files were **restored**; unrelated.

---

## 3. Security findings

### braces / GHSA-vfj7-8cjw-p6xm / CVE-2026-93687

**Status: OPEN / BLOCKED_EXTERNAL**

Re-checked 2026-10-13 (not copied from Phase 4):

```
eslint-config-next@15.5.27
  → @next/eslint-plugin-next@15.5.27
    → fast-glob@3.3.1
      → micromatch@4.0.8
        → braces@3.0.3 (dev)
```

| Check | Result |
| --- | --- |
| Installed braces | 3.0.3 |
| npm latest braces | **3.0.3** (no 3.0.4+) |
| micromatch 4.0.8 deps | `braces: ^3.0.3` |
| eslint-config-next latest | 16.4.0 — major vs Next **15.5.27** |
| `@next/eslint-plugin-next@16.4.0` | still `fast-glob: 3.3.1` |
| fast-glob latest 3.3.3 | still `micromatch: ^4.0.8` |
| `npm audit --audit-level=high` | exit **1**, 5 HIGH, all this chain |
| Other frontend severities | 0 critical / 0 moderate / 0 low besides this chain |
| `npm --prefix server audit --audit-level=high` | **0** vulnerabilities |

Suggested audit “fix”: `npm audit fix --force` → `eslint-config-next@14.2.35` (`isSemVerMajor: true`). **Not applied.** Next 15 compatibility would break.

Not done: force, fabricated override, threshold lowering, Next 16 eslint-config jump without a verified migration.

Exposure remains **lint-time glob expansion**, not payment/order/QR runtime. That does not make it FIXED.

### Other local protections (code + tests, not a pentest)

| Area | Evidence | Label |
| --- | --- | --- |
| Admin auth | E2E login, unauthenticated Control Center → login, software API 401 | **SANDBOX_VERIFIED** (local) |
| IDOR cart | `commerce-security` foreign cart 403/404 | **SANDBOX_VERIFIED** |
| Rate limit | existing admin login 429 handling | **CODE_READY** |
| Webhook verify | dual-payment HMAC / verifyFn | **SANDBOX_VERIFIED** (fixtures) |
| Replay / idempotency | duplicate capture + checkout idempotency | **SANDBOX_VERIFIED** |
| PII in QR | `bzqr_` payload `{v,t,id}`; account page no token leak | **SANDBOX_VERIFIED** |
| Redirect allowlist | QR `OPEN_REDIRECT_BLOCKED` | **SANDBOX_VERIFIED** |
| Secret logging | Pusat health redaction tests | **SANDBOX_VERIFIED** |
| Production DB path | missing `BUZZARD_DB_PATH` fail-closed in production | **CODE_READY** |

No penetration test was performed.

---

## 4. Canonical order identity

Status: **SANDBOX_VERIFIED** (local). No `canonical_order_id` column added — Phase 4 contract still holds; no demonstrated defect requiring dual-write.

Canonical: `bzord_*`. Aliases: `OMS_ID`, `OMS_NUMBER`, `COMMERCE_ID`, `MARKETPLACE_REF`, `SUPPLIER_REF`, `PAYMENT_ORDER_ID`, `LEGACY_RAW`, `CANONICAL`.

Verified this HEAD (`npm run test:software` 143, including `orderIdentityLoyalty` + `dualPaymentAdapters` + `softwareMasterCompletion`):

| Case | Where | Result |
| --- | --- | --- |
| Duplicate alias | identity Phase 4 | same canonical, `duplicate: true` |
| Alias collision | `ALIAS_CONFLICT` / `AMBIGUOUS_ORDER_IDENTITY` | fail closed, no consume |
| Unknown order | `UNRESOLVED_ORDER_REF` | no guess |
| Wrong-order event | consume with foreign ref | consumed 0 |
| Invalid signature | dual-payment | not paid |
| Amount / currency mismatch | dual-payment / secureCommerce | fail closed |
| Duplicate capture | identity + adapters | idempotent |
| Payment timeout / failure | adapters | not paid, no consume |
| Cancel before consume | `softwareMasterCompletion` | `released: 1` |
| Cancel after consume | identity | `released: 0`, `skippedConsumed: 1` |
| Repeated cancel | identity | second `released: 0` |
| Payment/cancel race | identity | `CONSUMED` or `RELEASED`, never both |
| Duplicate stock consume | identity | duplicate rows |
| Return after QR redeem | identity | `REDEEMED`, review-only, no clawback |
| Refund / chargeback / supplier credit | dual-payment | distinct events |
| Reconcile without money | dual-payment | no live movement |

Shipment is not authorized by client success pages or unsigned callbacks.

---

## 5. QR loyalty

Unchanged implementation. Re-verified via existing tests + landing E2E.

| Rule | Status |
| --- | --- |
| No PII in token | **SANDBOX_VERIFIED** |
| Scan ≠ discount / login | **SANDBOX_VERIFIED** |
| Package vs customer QR | **CODE_READY** / local **SANDBOX_VERIFIED** |
| Safe redirects | **SANDBOX_VERIFIED** |
| Server-side eligibility | **SANDBOX_VERIFIED** |
| Cancel/return/pending return | **SANDBOX_VERIFIED** |
| Duplicate + concurrent redeem | **SANDBOX_VERIFIED** |
| No stacking; max 15%; EUR 0.50 | **SANDBOX_VERIFIED** |
| Missing cost/tax fail-closed | **SANDBOX_VERIFIED** |
| Late return no auto-charge | **SANDBOX_VERIFIED** |
| Statutory rights unrestricted in code | **CODE_READY** (`legalComplianceProven: false`) |
| Amazon/eBay/Kaufland/Allegro inserts | **REVIEW_REQUIRED** |
| Live campaign send | **NOT_IMPLEMENTED** as live ops |

Arabic RTL landing E2E passed (`dir="rtl"`, catalog mode).

---

## 6. Pusat, workers, scheduler

Status: **SANDBOX_VERIFIED** locally. No second orchestrator. No paid AI calls.

`npm run test:ai` — **58 passed**.

Covered: unique claim, idempotency keys, retry/backoff, timeout, stale-lock recovery, financial dead-letter, human approval, audit/correlation ids, scheduler `AI_TASK` bound to Pusat task id, circuit/fail-closed providers, sales lock.

---

## 7. E2E coverage

Stack: `PLAYWRIGHT_WEB_PORT=3010`, `PLAYWRIGHT_API_PORT=3002`, `PLAYWRIGHT_SKIP_WEBSERVER=1`. Port 3000 not targeted.

Final command: `npx playwright test --reporter=line`  
**107 passed, 8 skipped, 0 failed** (115 tests). Exit 0. HEAD of this run: `6d178a9`.

### Skips (intentional filters, not missing assertions)

| Skip | Why | Material? |
| --- | --- | --- |
| Mobile category drill on `chromium-desktop` | width ≥ 768 | No — runs on mobile project |
| Mobile category drill on `chromium-tablet` | width ≥ 768 | No |
| 3 desktop overflow cases on mobile | project filter | No — run on desktop |
| 3 desktop overflow cases on tablet | project filter | No |

### Journey map

| Flow | How | Result |
| --- | --- | --- |
| Homepage | Playwright | passed |
| Skip-to-main keyboard | Tab → `.skip-link` → `#maincontent` | passed (new) |
| Category / catalog | mobile drill + storefront-bridge category | passed |
| Product detail | static slug `/produkt/premium-bremsscheibe-testprodukt/` | passed (new) |
| PIM API slug as PDP | Next `generateStaticParams` rejects unknown slugs under `output: export` | **gap** — see defects |
| Invalid product | cart add missing SKU | passed |
| Cart / checkout catalog | UI + commercial attempt blocked | passed (sales locked) |
| Missing cost/tax / EUR 0.50 | Vitest pricing/QR | **not Playwright** |
| Payment pending/fail/success/webhooks | dual-payment unit fixtures | **not browser paid checkout** |
| Order identity / inventory / cancel / return | Vitest | **not Playwright** |
| QR landing DE/AR | Playwright | passed |
| Duplicate redemption | Vitest | **not Playwright** |
| Account PII | `/konto/` | passed |
| Admin auth | admin + storefront-bridge Control Center | passed |
| Viewports + RTL | homepage-viewports + overlay | passed |

Paid browser checkout remains **NOT_IMPLEMENTED** while sales are locked (correct).

**Architecture gap (software, not a weakened test):** `/api/catalog/products` returns PIM items (`seo.slug`, e.g. `isolated-cart-fixture`) that are **not** in `getProductStaticParams()`. Hitting that slug in `next dev` with `output: export` overlays `missing param "/produkt/[slug]"`. Static PDP and live PIM catalog are not one product source. Product SoT stays inactive.

---

## 8. Unit / software / AI / bridge

| Command | Passed | Failed | Skipped | Not run |
| --- | --- | --- | --- | --- |
| `npm run test:software` | **143** | 0 | 0 | — |
| `npm run test:unit` | **881** | 0 | 0 | — |
| `npm run test:ai` | **58** | 0 | 0 | — |
| `npm run test:bridge` | **18** | 0 | 0 | — |
| Playwright | **107** | 0 | **8** | — |
| `npm run test:backup-restore` | dry-run OK | 0 | — | production restore **not run** |
| `npm run verify:db-persistence` | — | — | — | **not run** (defaults to `https://buzzard-api.onrender.com`; unauthorized) |
| `verify:render-persistence` | — | — | — | **script does not exist** |

`test:unit` includes software/AI/bridge files. Counts are not additive.

---

## 9. Lint, typecheck, build, audit

| Command | Exit |
| --- | --- |
| `npm run lint` | **0** |
| `npm run typecheck` | **0** |
| `npm run build` | **0** |
| `npm run security:audit` | **1** (braces OPEN) |
| `npm --prefix server audit --audit-level=high` | **0** |

---

## 10. Render persistence and backup

**Production persistence: UNKNOWN**

Local `/api/health/db` on isolated `:3002` (not production):

- path: `/workspace/server/data/buzzard.db`
- `mode: development_default`
- `persistent: false`
- `/var/data` exists: **false**
- `BUZZARD_DB_PATH`: unset

Five separate assertions:

| # | Assertion | Evidence | Status |
| --- | --- | --- | --- |
| 1 | Config declares a persistent disk | `render.yaml` disk `buzzard-data`, mount `/var/data`, `BUZZARD_DB_PATH=/var/data/buzzard.db` | **CODE_READY** (blueprint only) |
| 2 | Runtime uses intended path | production not inspected | **UNKNOWN** |
| 3 | Data survives authorized restart | no restart authorized | **UNKNOWN** |
| 4 | A backup exists in production | not inspected | **UNKNOWN** |
| 5 | Restore from backup tested | `npm run test:backup-restore` local dry-run only | local **CODE_READY**; production **UNKNOWN** |

`verify:db-persistence.mjs` probes live Render by default. **Not executed** against production.

### Operator instructions (read-only, no lock changes)

Follow `docs/software-completion/RENDER_STORAGE_OPERATOR.md`:

1. Confirm service `buzzard-api` (not a preview).
2. Confirm disk `buzzard-data` attached, mount `/var/data`.
3. Confirm runtime path **string** `BUZZARD_DB_PATH=/var/data/buzzard.db` (do not paste secrets; do not change the variable).
4. Confirm `BUZZARD_SALES_ENABLED=0` still.
5. GET `/api/health` or `/api/health/db`: `persistence.mode=render_persistent_disk`, `persistent=true`, path under `/var/data`.
6. Confirm backup files under `BUZZARD_BACKUP_DIR` without copying customer data off-platform.
7. Restart **only if separately authorized**, then re-check the same path still has data.

Do not treat `render.yaml` or this local SQLite as production proof.

---

## 11. Integration inventory

Source: `software.externalIntegrations.inventory()` this environment — **31 items, 0 credentials present, live: 0**. Plus `bankAdapters.accountingHealth()`.

Labels below use the Phase 5 vocabulary. Adapter presence ≠ configured ≠ sandbox ≠ live.

| Integration | Adapter | This env | Honest status |
| --- | --- | --- | --- |
| Stripe | yes (`paymentService` + dual-payment) | no keys | **CODE_READY** / **NOT_CONFIGURED**. Local fixture tests ≠ provider sandbox. |
| PayPal | yes | no keys | **CODE_READY** / **NOT_CONFIGURED**. Same. |
| Supplier API | yes | no keys | **CODE_READY** preview; PO send blocked |
| TecDoc | yes | no keys | **CODE_READY** mapping only |
| Amazon | mock module | no | **PARTIAL** mock; publish blocked |
| eBay | mock module | no | **PARTIAL** mock; publish blocked |
| Kaufland | draft (`marketplaceV35`) | no | **STUB** / **PARTIAL**; **REVIEW_REQUIRED** inserts |
| Allegro | draft | no | **STUB** / **PARTIAL**; **REVIEW_REQUIRED** |
| OTTO | classification only (`adapterExists: false`) | no | **STUB** / **NOT_IMPLEMENTED** vendor adapter |
| bol.com | classification only | no | **STUB** / **NOT_IMPLEMENTED** vendor adapter |
| Cdiscount | classification only | no | **STUB** / **NOT_IMPLEMENTED** vendor adapter |
| eMAG | classification only | no | **STUB** / **NOT_IMPLEMENTED** vendor adapter |
| Skroutz | classification only | no | **STUB** / **NOT_IMPLEMENTED** vendor adapter |
| DHL / DPD / GLS / Hermes / UPS | yes (`carriers.js`) | no keys | **CODE_READY** tracking model; no live create |
| SMTP / email | yes | no | **CODE_READY** draft/queue; send **BLOCKED** |
| Twilio / STT / TTS / WebRTC / realtime / digital human | yes | no | **STUB** / **CODE_READY** interface; **NOT_CONFIGURED** |
| SEPA | IBAN checksum only | no `SEPA_CREDITOR_ID` | **CODE_READY** format check; **NOT_CONFIGURED**; no transfer |
| Bank transfer | presence check | no | **NOT_CONFIGURED** |
| DATEV | adapter stub | no | **STUB** / **NOT_CONFIGURED** |
| OpenAI / Anthropic / Google | stub providers | no | **NOT_CONFIGURED**; fail-closed |
| Product SoT | policy lock | inactive | must stay inactive |
| Customer tracking GPS | estimates only | — | `gpsInvented: false`; **NOT_IMPLEMENTED** as live GPS |

Engine connections (code present, not live):

- Official capture → inventory consume (local verified).
- Cancel → release ACTIVE only (local verified).
- Scheduler → Pusat taskId (local verified).
- Marketplace import/status sync: drafts only; publish blocked.
- Returns vs supplier credit: separate events in code; no live reimbursement.
- Catalog vs Product SoT: **five stores remain**; static PDP ≠ PIM list (see defects).

No provider was called.

---

## 12. Remaining software defects

1. **OPEN HIGH braces@3.0.3** — no compatible patch on npm; Next 16 eslint plugin still pulls `fast-glob@3.3.1`.
2. **Static PDP vs PIM catalog** — API slugs are not `generateStaticParams` entries under `output: export`. Customer PDP E2E uses the static JSON catalog. Unifying catalogs requires a Product SoT decision (locked).
3. Playwright skip filters hide desktop overflow cases on mobile/tablet projects (intentional; covered on desktop).
4. Paid UI checkout cannot be E2E’d while sales are locked (policy, not a silent gap).

No other reproducible local application defect was left unfixed in this phase.

---

## 13. External dependencies and human tasks

### A. Software Cursor can complete safely (this phase)

Local identity/payment/QR/Pusat tests, admin/customer E2E on 3010/3002, lint/typecheck/build, document braces as OPEN, attach storefront-bridge, skip-link + static PDP coverage.

### B. Human / operator (accounts, legal, business)

| Item | Missing | Why it matters | Who | How to verify | Blocks safe catalog launch? | Blocks paid launch? |
| --- | --- | --- | --- | --- | --- | --- |
| braces upstream | patched braces or Next eslint chain | lint-time DoS advisory | Next/braces maintainers | `npm audit` exit 0 | No | No (devDependency) |
| Stripe/PayPal keys | `STRIPE_*`, `PAYPAL_*` | real capture/webhooks | Finance + ops | signed sandbox webhook, still sales=0 | No | Yes |
| Marketplace accounts + legal insert review | Amazon/eBay/Kaufland/Allegro policy | package QR / publish | Legal + marketplace ops | written approval; publish still blocked until go-live | No | Yes for those channels |
| OTTO/bol/Cdiscount/eMAG/Skroutz contracts | vendor API | cannot invent adapters | Business | contract then implement | No | Yes for those channels |
| Supplier / TecDoc | URL + keys | live stock/cost | Purchasing | non-prod read probe | Catalog can stay static | Yes for live cost |
| Carriers | API keys | labels/tracking | Logistics | tracking read first; no create | No | Yes for fulfilment |
| SMTP/Twilio | host/SID | customer messages | Ops; policy | send stays BLOCKED until approval | No | Yes for notices |
| DATEV/SEPA | client id / creditor id | accounting / collection | Finance | never from this repo task | No | Yes for payouts |
| LLM keys | provider keys | live assistants | AI ops | no `BUZZARD_AI_LIVE_PROBE` in prod from this task | No | No |
| Sales / SoT / live payments | business decision | irreversible commercial risk | Owner | keep unset until written go-live | Catalog OK | Yes |
| QR campaign legal | marketing vs statutory returns | clawback/rights | Legal | `legalComplianceProven` | No | Campaign go-live |

### C. Production verification (explicit authorization required)

Render disk attach, runtime `BUZZARD_DB_PATH`, restart persistence, production backup file, restore drill, live `/api/health/db`. None performed.

---

## 14. Operator actions before any production-readiness review

1. Keep `BUZZARD_SALES_ENABLED`, `BUZZARD_PRODUCT_SOT_ACTIVE`, `BUZZARD_LIVE_PAYMENTS` disabled.
2. Execute `RENDER_STORAGE_OPERATOR.md` read-only; record path/mount/backup without secrets.
3. Do not merge or deploy this branch as a production go-live.
4. Do not run `npm audit fix --force`.
5. Do not run `verify:db-persistence` against production unless a human authorizes a read-only health GET.
6. Treat local 107 Playwright passes as catalog-mode evidence only.

---

## 15. Prioritized backlog

### P0

1. Upstream braces / eslint-config-next 15-compatible bump; re-run `security:audit`.
2. Authorized Render persistence evidence (runtime path, disk, backup).
3. Keep sales / SoT / live payments locked.

### P1

4. Product catalog unification (static JSON vs PIM) — requires SoT policy; do not activate SoT here.
5. Stripe/PayPal **sandbox** (not live) signed webhooks with sales still off.
6. Marketplace insert legal review before any package QR print.
7. Supplier cost feed in non-prod so live pricing is not missing-cost fail-closed in production later.

### P2

8. Vendor adapters for OTTO / bol / Cdiscount / eMAG / Skroutz only after contracts exist.
9. DATEV/SEPA configuration after finance approval.
10. Attach further a11y beyond skip-link if a dedicated audit is commissioned.

---

## 16. Safety locks and process

| Control | Confirmed |
| --- | --- |
| Sales disabled | yes |
| Product SoT inactive | yes |
| Live payments disabled | yes |
| Marketplace publishing | blocked |
| Real money movement | false |
| Real supplier purchasing | false |
| Real customer communications | false |
| Production mutation | none |
| Push / PR / merge / deploy | **none** |
| Port 3000 terminated | **no** (HTTP 200 after isolated stack stop) |
| EUR 0.50 min net profit | unchanged |
| Competitor EUR 0.10 undercut | not implemented |

---

## 17. Ending HEAD

Report content commit SHA is pinned in the follow-up commit on this branch.  
Working tree after this file: local commits only; **ahead of origin; not pushed**.

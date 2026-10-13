# Buzzard Phase 4 — Security, Canonical Order, Checkout E2E, QR Loyalty, Persistence

Version: 4.0  
Date: 2026-10-13  
Branch: `cursor/final-completion-execution-c293`  
Starting HEAD: `7f8a6cbe3c50699a97254535f8bf17164ebfdd6d` (Phase 3)  
Ending HEAD: recorded at the bottom of this file after the local report commit.

Git push / PR / merge / deploy: **not performed**.  
`git reset --hard` / `git clean -fd`: **not used**.  
Port 3000: this agent did not send a kill signal to the original `next-server` (pid 380566). Isolated E2E used `:3010` + API `:3002` in a dedicated tmux session, which was stopped afterwards.

Locks: `BUZZARD_SALES_ENABLED` remains disabled (`0` in `.env.example`; not set to enable in `.env` / `.env.local`). `BUZZARD_PRODUCT_SOT_ACTIVE` and `BUZZARD_LIVE_PAYMENTS` remain unset. None of the three were enabled for testing.

Status labels used below: `NOT_IMPLEMENTED` | `STUB` | `PARTIAL` | `CODE_READY` | `CONFIGURED` | `SANDBOX_VERIFIED` | `LIVE_VERIFIED`

No capability in this report is `LIVE_VERIFIED`. Local unit tests and Playwright against loopback are not sandbox-provider or live proof.

---

## 1. Starting and ending HEAD, branch, Git status

| Field | Value |
| --- | --- |
| Branch | `cursor/final-completion-execution-c293` |
| Starting HEAD | `7f8a6cb` — matched the expected Phase 3 commit |
| Tree at start | dirty only after this phase began: identity contract + tests |
| Phase 3 commit | `7f8a6cb` Add a canonical order identity contract and a local QR loyalty engine |
| Phase 2 commit | `3d0f56c` Release reserved stock on order cancel and record the Phase 2 evidence |
| Local Phase 4 code commit | `c32bbe6` Document the canonical order identity contract and add Phase 4 regressions |
| Remote | ahead of `origin/cursor/final-completion-execution-c293`; **not pushed** |
| User changes | preserved |

Phase 3 implementation was **not** repeated. This phase verified it, documented the column decision, added fail-closed regressions, and ran the previously incomplete customer-journey / viewport E2E.

---

## 2. Files changed and why

| File | Reason |
| --- | --- |
| `server/lib/software/orderIdentity.js` | Document `canonicalOrderIdColumn: false` and the explicit rejection of a cosmetic `canonical_order_id` column (alias lookup already joins reservations, payments, cancels, and returns). |
| `server/__tests__/orderIdentityLoyalty.test.mjs` | Phase 4 contract tests: every alias kind, duplicate/unknown refs, alias conflict without stock mutate, duplicate capture, cancel-after-consume, payment/cancel race, return-after-redemption. |
| `e2e/customer-journey.spec.ts` | Add Arabic RTL QR landing, invalid-product cart reject, and account-page PII/QR-token leak check. Existing cart → checkout catalog-mode test was already present and **was run**. |
| `docs/software-completion/BUZZARD_PHASE4_SECURITY_ORDER_CHECKOUT_QR_REPORT_2026-10-13.md` | This evidence report. |

`npm run build` rewrote `data/taxonomy/buzzard_production_preflight.json` and `public/taxonomy/buzzard_production_preflight.json` (timestamp / localhost:3010 probe). Those files were **restored** to HEAD; they are unrelated to this phase.

No second orchestrator. Pusat remains the sole orchestrator.

---

## 3. Security audit — braces / micromatch

**Finding status: OPEN**

Command: `npm run security:audit` (`npm audit --audit-level=high`)  
Exit: **1** (findings were not suppressed)

```
eslint-config-next@15.5.27
  → @next/eslint-plugin-next@15.5.27
    → fast-glob@3.3.1
      → micromatch@4.0.8
        → braces@3.0.3
```

Advisory: GHSA-vfj7-8cjw-p6xm / CVE-2026-93687  
Title: braces stack-exhaustion DoS via deeply nested patterns  
Installed: `braces@3.0.3` (dev)  
npm registry latest at investigation time: **3.0.3** (no patched release)

`npm audit` reports 5 HIGH, all the same chain (`braces` → `micromatch` → `fast-glob` → `@next/eslint-plugin-next` → `eslint-config-next`).

Suggested “fix”: `npm audit fix --force` would install `eslint-config-next@14.2.35` (`isSemVerMajor: true`). That is a Next 14 eslint config against Next **15.5.27**. Not applied.

Not done (per safety rules):

- `npm audit fix --force`
- incompatible dependency downgrade
- fabricated `braces@3.0.4` override
- lowering `--audit-level` or ignoring the advisory

Exposure: **lint-time glob expansion**, not the payment, order, QR, or checkout runtime path. That does not make the finding FIXED.

Not `FIXED_AND_VERIFIED`. Not `MITIGATED_WITH_EVIDENCE` (no compatible patch exists to apply). **OPEN**.

---

## 4. Canonical order identity contract

Status: **SANDBOX_VERIFIED** (local SQLite / Vitest). Not live.

Canonical ID: `bzord_<24 hex>` in `software_order_identities`.  
Existing store IDs remain aliases in `software_order_aliases`. Stores are not rewritten (`rewrittenStores: false`).

### Alias kinds (each bound to one canonical in tests)

| Kind | Example / rule |
| --- | --- |
| `CANONICAL` | `bzord_*` |
| `OMS_ID` | numeric OMS id; bind only with explicit kind |
| `OMS_NUMBER` | `BZ-YYYY-…` |
| `COMMERCE_ID` | `ord_*` |
| `MARKETPLACE_REF` | optional, unverified feed |
| `SUPPLIER_REF` | optional, unverified feed |
| `PAYMENT_ORDER_ID` | payment engine order ref |
| `LEGACY_RAW` | adopt-legacy path |

Contract:

- Duplicate alias on the same canonical: recorded as `duplicate: true`, same `canonicalId`.
- Same external ref on two canonicals: `ALIAS_CONFLICT` (fail closed).
- Two different canonicals in one bind: `AMBIGUOUS_ORDER_IDENTITY`.
- Unknown ref: `UNRESOLVED_ORDER_REF` / `unresolved: true` — not guessed.
- Wrong-order payment consume: `ORDER_IDENTITY_MISMATCH` or `UNRESOLVED_ORDER_REF`; **consumed = 0**.
- `AMBIGUOUS` / `ALIAS_CONFLICT` paths do not create payments or consume stock.

### Schema decision

**No `canonical_order_id` column added.**

`describeContract().canonicalOrderIdColumn === false`.  
Reason: alias lookup already joins reservations, payments, cancels, and returns. A new column would dual-write without changing store IDs. Historical `software_reservations.order_id` / `software_payments.order_id` stay as written.

Residual risks (unchanged):

- Numeric OMS ids can collide with unrelated numeric strings if adopted blindly — bind with explicit kind.
- Marketplace / supplier refs stay `REVIEW_REQUIRED` until a verified feed exists.

---

## 5. Payment / order / stock / cancellation / return

Status: **SANDBOX_VERIFIED** (local adapters and SQLite). Real money movement: **false**.

Verified in this phase (Vitest `orderIdentityLoyalty` Phase 4 + existing `dualPaymentAdapters` / `secureCommerce`):

| Path | Result |
| --- | --- |
| Every supported alias kind → one canonical | passed |
| Duplicate alias | same canonical, `duplicate: true` |
| Unknown order | fail closed, no guess |
| Alias conflict / ambiguous bind | no payment on the other order, no consume |
| Wrong-order payment event | consume 0 |
| Official capture consumes reserved stock once | passed (existing dual-payment + identity) |
| Duplicate capture | idempotent (`duplicate: true`) |
| Repeated cancel | second cancel `released: 0` |
| Cancel after consume | `released: 0`, `skippedConsumed: 1`, stock not restored |
| Payment vs cancel race | row ends `CONSUMED` or `RELEASED`, never both |
| Unsigned / bad signature webhook | not paid; no consume (existing adapters) |
| Amount / currency mismatch, timeout, failed pay | not paid; no consume (existing adapters) |
| Return after QR redemption | stays `REDEEMED`, `reviewRequired: true`, `automaticClawback: false` |
| Refund / supplier credit / chargeback | remain separate events (existing dual-payment test) |

**Partial (not a browser paid checkout):** Playwright cannot and did not complete a live capture. Sales stay locked. The UI checkout path asserts catalog mode, zero commercial orders, and `realPayment !== true`.

Shipment is not authorized by client “paid” claims or unverified webhooks (existing dual-payment C tests).

---

## 6. QR loyalty

Status:

| Feature | Label |
| --- | --- |
| Customer QR token `bzqr_` + 32 hex, payload `{ v:1, t:"c", id }` — no PII | **SANDBOX_VERIFIED** |
| Scan ≠ login and ≠ discount | **SANDBOX_VERIFIED** |
| Redirect allowlist; open redirect blocked | **SANDBOX_VERIFIED** |
| Package QR `bzpk_` separate from customer QR | **CODE_READY** / local **SANDBOX_VERIFIED** |
| Marketplace package inserts Amazon/eBay/Kaufland/Allegro | **REVIEW_REQUIRED** (not inserted, not live) |
| Eligibility state machine | **SANDBOX_VERIFIED** |
| Cancel / return → not eligible / pending window / revoked | **SANDBOX_VERIFIED** |
| Concurrent + duplicate redemption | **SANDBOX_VERIFIED** (unique customer+campaign) |
| Max 15%, min net profit EUR 0.50, no stacking | **SANDBOX_VERIFIED** |
| Missing cost/tax fail-closed | **SANDBOX_VERIFIED** (pricing) |
| Late return after redeem: no automatic charge | **SANDBOX_VERIFIED** |
| Statutory rights unrestricted in code | **CODE_READY** (`legalComplianceProven: false`) |
| Retention metrics without inventing CAC/LTV | **CODE_READY** |
| Live campaign email / SMS / package insert | **NOT_IMPLEMENTED** as live ops (intentionally) |
| Pusat integration | events in `software_loyalty_events`; **no second orchestrator** |

Landing E2E: German catalog-only + Arabic `dir="rtl"` + `data-campaign-live="false"`. No fake live prices.

---

## 7. Pusat / worker

Status: **SANDBOX_VERIFIED** (existing Phase 2 tests; no architecture change).

Command: `npm run test:ai` — **58 passed / 0 failed**.

Covered by existing suites (`pusatOrchestrator`, `pusatWorkerIntegration`, `pusatApprovalExceptions`, `pusatMasterCompletion`):

- duplicate task / isolated `claimAndExecute` does not double-claim
- retry then dead-letter for non-financial failures
- financial / payment / refund: no silent retry; duplicate protection
- crashed-worker: abandoned lock recovery
- scheduler `AI_TASK` job bound to Pusat `taskId`
- timeout classified `TIMEOUT`
- audit fields / correlation id
- sales lock holds; marketplace mock does not publish
- no customer send, no live supplier, no GPS shipping

No defect found that required a code change in this phase.

---

## 8. Checkout and customer-journey E2E

Stack: Playwright `PLAYWRIGHT_WEB_PORT=3010`, `PLAYWRIGHT_API_PORT=3002`, `PLAYWRIGHT_SKIP_WEBSERVER=1` after `scripts/e2e-webserver.mjs` in tmux `e2e-stack-3010`. Original `:3000` process was not targeted.

Command: `npx playwright test --reporter=line`  
**95 passed, 8 skipped, 0 failed** (103 tests, 1 worker, 1.5m). Exit 0.

Skipped tests (not counted as passed):

| Skip | Why |
| --- | --- |
| Mobile category drill on `chromium-desktop` | viewport width ≥ 768 |
| Mobile category drill on `chromium-tablet` | viewport width ≥ 768 |
| 3× desktop overflow cases on `chromium-mobile` | project is not `chromium-desktop` |
| 3× desktop overflow cases on `chromium-tablet` | project is not `chromium-desktop` |

### Flow map (honest)

| Requested flow | How verified | Result |
| --- | --- | --- |
| 1. Homepage → discovery | Playwright homepage + mobile category drill (mobile project) | passed |
| 2. Product → cart | API add-item + `/warenkorb/` | passed (catalog) |
| 3. Cart validation | warenkorb visible; invalid SKU rejected | passed |
| 4. Checkout validation | `/checkout/` catalog copy; **no** `paymentProvider` inputs | passed (sales locked) |
| 5. Missing/invalid product | `missing-product-xyz` add-item fails | passed |
| 6. Missing supplier cost/tax | Vitest pricing fail-closed | **not a Playwright UI test** — unit **passed** |
| 7. EUR 0.50 net profit | Vitest QR `evaluateDiscount` / `evaluateGivenSale` | **not Playwright** — unit **passed** |
| 8. Payment pending | dual-payment adapter tests | unit **passed**; no live PayPal/Stripe |
| 9. Payment success (local test event) | official capture → consume once | unit **passed**; **not** a browser paid checkout |
| 10. Payment failure | adapter failed/timeout tests | unit **passed** |
| 11. Invalid webhook signature | Stripe HMAC / PayPal verifyFn | unit **passed** |
| 12. Duplicate webhook | adapter + identity duplicate capture | unit **passed** |
| 13. Order alias mismatch | identity consume with foreign ref | unit **passed** |
| 14. Stock reserve/consume | identity + dual-payment | unit **passed** |
| 15. Cancel + reservation release | identity + OMS cancel (Phase 2/3) | unit **passed** |
| 16. Return eligibility | QR reevaluate + review-only clawback | unit **passed** |
| 17. QR landing + campaign copy | `/kampanya/qr/?lang=de` and `lang=ar` | Playwright **passed** |
| 18. Discount reserve / duplicate redeem | QR unit tests | unit **passed**; campaign **not live** |
| 19. Viewports + Arabic RTL | homepage-viewports + overlay + QR `dir=rtl` | Playwright **passed** |
| 20. Auth boundaries | admin unauthenticated login redirect; software API 401; `/konto/` no `bzqr_` leak | Playwright **passed** |

Commercial checkout remains blocked (`salesEnabled: false`, `commercialOrders: 0`, `realPayment` not true). READINESS_TEST API path ran in `commerce-storefront.spec.ts` with `realMoneyMovement: false`.

`e2e/storefront-bridge.spec.ts` is **not** in any Playwright project `testMatch`. **Not run.**

---

## 9. Test totals

| Command | Passed | Failed | Skipped | Not run |
| --- | --- | --- | --- | --- |
| `npm run test:software` | **143** | 0 | 0 | — |
| `npm run test:unit` | **881** | 0 | 0 | — |
| `npm run test:ai` | **58** | 0 | 0 | — |
| `npm run test:bridge` | **18** | 0 | 0 | — |
| Playwright (all configured projects) | **95** | 0 | **8** | `storefront-bridge.spec.ts` |
| of which Admin + PIM | 13 | 0 | 0 | — |
| of which API commerce/security/readiness | 12 | 0 | 0 | — |
| of which customer-journey (3 projects) | 46 | 0 | 8 | — |
| of which homepage-viewports + overlay | 24 | 0 | 0 | — |
| Dual-payment adapter tests | included in `test:software` / `test:unit` | 0 | 0 | — |

`test:unit` includes the software, AI, bridge, identity, and dual-payment files. Counts are not additive.

Skipped ≠ passed. Homepage-only was **not** used as a stand-in for the full journey: cart, checkout catalog-mode, invalid product, QR DE/AR, account, admin, viewports, and overlay all ran.

---

## 10. Lint, typecheck, build, audit

| Command | Exit | Note |
| --- | --- | --- |
| `npm run lint` | **0** | No ESLint warnings or errors |
| `npm run typecheck` | **0** | `tsc --noEmit` |
| `npm run build` | **0** | Next.js 15.5.27 export + post-export complete |
| `npm run security:audit` | **1** | 5 HIGH, braces chain, **OPEN** |

---

## 11. Render persistence

Status: **UNKNOWN**

This environment has no authorized production read. `/var/data` does not exist here. `BUZZARD_DB_PATH` is unset locally. `monitoringReady.readiness()`:

- `productionStatus: UNKNOWN`
- `renderDisk: UNKNOWN`
- `productionDb: UNKNOWN`
- `rollback: UNKNOWN`
- `liveVerified: false`
- `reason: BLOCKED_EXTERNAL`

`render.yaml` still declares disk `buzzard-data`, mount `/var/data`, `BUZZARD_DB_PATH=/var/data/buzzard.db`, `BUZZARD_BACKUP_DIR=/var/data/backups`. That is **blueprint text**, not runtime evidence.

Evidence still required (read-only, authorized operator — see `docs/software-completion/RENDER_STORAGE_OPERATOR.md`):

1. Render service identity `buzzard-api` (not a preview).
2. Disk `buzzard-data` attached.
3. Mount path `/var/data`.
4. Runtime `BUZZARD_DB_PATH` path string `/var/data/buzzard.db` (no secret values).
5. `/api/health` `persistence.mode=render_persistent_disk` and `persistent=true`.
6. Migration/schema state from health or startup logs (no production migrate from this task).
7. Backup file present under `BUZZARD_BACKUP_DIR`.
8. Persistence across an **already authorized** restart.

No production configuration, data, deploy, or restart was performed.

---

## 12. Remaining defects, blockers, external dependencies

1. **OPEN HIGH:** `braces@3.0.3` via `eslint-config-next@15.5.27`. Blocker: no patched braces on npm; only “fix” is a major eslint-config-next downgrade to 14.2.35. Wait for upstream.
2. **Render disk / DB:** UNKNOWN until operator evidence exists.
3. **Marketplace package QR inserts:** legal/marketplace contract review (Amazon, eBay, Kaufland, Allegro).
4. **QR campaign go-live:** human + legal approval; statutory rights vs marketing copy.
5. **Paid checkout UI:** cannot be E2E-verified while sales are locked (correct).
6. **`e2e/storefront-bridge.spec.ts`:** not in a Playwright project; not run.
7. Compatible `braces` / `micromatch` / `fast-glob` upgrade when Next publishes one.

---

## 13. Capability labels

| Capability | Status |
| --- | --- |
| Canonical order identity | **SANDBOX_VERIFIED** |
| Alias conflict fail-closed | **SANDBOX_VERIFIED** |
| Official capture → stock consume | **SANDBOX_VERIFIED** |
| Cancel releases ACTIVE only | **SANDBOX_VERIFIED** |
| Dual Stripe/PayPal adapters | **CODE_READY** / local **SANDBOX_VERIFIED** (test doubles, not provider sandbox) |
| Live payments | locked / **NOT_IMPLEMENTED** as live |
| Sales | locked |
| Product Source of Truth | inactive |
| Marketplace publishing | blocked |
| QR customer token + landing | **SANDBOX_VERIFIED** (catalog mode) |
| QR second-purchase engine | **CODE_READY** / local **SANDBOX_VERIFIED**; campaign not live |
| Marketplace package inserts | **REVIEW_REQUIRED** |
| Pusat workers / idempotency | **SANDBOX_VERIFIED** |
| Admin E2E | **SANDBOX_VERIFIED** (local) |
| Customer journey E2E (catalog) | **SANDBOX_VERIFIED** (local Playwright) |
| Paid customer checkout E2E | **NOT_IMPLEMENTED** (sales lock) |
| Render persistence | **UNKNOWN** |
| braces CVE | **OPEN** |
| Lint / typecheck / build | local pass (**CODE_READY** tooling) |

Provider Stripe/PayPal hosted sandbox accounts were **not** used. Do not read local HMAC fixtures as `SANDBOX_VERIFIED` against Stripe/PayPal cloud.

---

## 14. Business and production locks

| Control | State |
| --- | --- |
| `BUZZARD_SALES_ENABLED` | disabled / not enabled (`.env.example=0`; no `.env` / `.env.local` enable) |
| `BUZZARD_PRODUCT_SOT_ACTIVE` | unset |
| `BUZZARD_LIVE_PAYMENTS` | unset |
| Marketplace publishing | blocked in Pusat tests and commerce attempts |
| Real payment movement | false |
| Real supplier purchasing | false |
| Real customer email/SMS | false |
| Production deploy | not performed |
| Git push | not performed |
| Pull request | not created |
| Merge | not performed |

Minimum net product profit remains **EUR 0.50** (`MIN_NET_PROFIT_EUR = 0.5`). No EUR 0.10 competitor undercut was implemented.

---

## 15. Prioritized next steps (evidence-based)

1. When a patched `braces` (or Next eslint plugin that does not pull 3.0.3) is published, apply the smallest compatible bump and re-run `security:audit`.
2. Authorized read-only Render persistence evidence (disk, mount, runtime path, backup, restart).
3. Keep sales / Product SoT / live payments locked until a separate human go-live decision.
4. Marketplace insert legal review before any package QR is printed or shipped.
5. Optionally attach `e2e/storefront-bridge.spec.ts` to a Playwright project if that suite is still required.

---

## 16. Confirmations

- No push, PR, merge, or deploy from this phase.
- No production configuration or production data change.
- No `npm audit fix --force`.
- No invented credentials, provider capabilities, or infrastructure evidence.
- Pusat is still the only orchestrator.

Ending HEAD (this report commit): `36db56005cec1fb25e2e9d2701a038084893bc21`.

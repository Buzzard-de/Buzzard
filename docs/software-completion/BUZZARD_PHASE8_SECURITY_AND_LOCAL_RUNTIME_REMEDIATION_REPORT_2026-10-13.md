# Buzzard Phase 8 — Security and Local Runtime Remediation

Version: 8.0  
Date: 2026-10-13  
Branch: `cursor/final-completion-execution-c293`  
Expected prior Phase 7 HEAD: `5d00b14613a095439d33a1358fcc34e657baebc6`  
Observed starting HEAD: `d6e7e185dff0839136f8ea05b6aa9aed9d97e90d` (Phase 7 pin `5d00b14` plus already-committed isolation attempt `d6e7e18`)  
Code HEAD after the local software commit (before this report): see Final HEAD `96c88a77a458360a731a9dd849e70c4877641b39` (report commit; isolation is the parent).

Git push / PR / merge / deploy: **not performed**.  
`git reset --hard` / `git clean -fd`: **not used**.  
`npm audit fix --force`: **not used**.  
`verify:db-persistence`: **not run** (defaults to `https://buzzard-api.onrender.com`).  
Sales / Product SoT / live payments / marketplace publishing / real money movement: **untouched and still locked**.

No overall completion percentage. Local HTTP 200 is not production readiness. No capability is `LIVE_VERIFIED`.

Status labels: `NOT_IMPLEMENTED` | `STUB` | `PARTIAL` | `CODE_READY` | `CONFIGURED` | `SANDBOX_VERIFIED` | `LIVE_VERIFIED`  
Issue labels: `FIXED_AND_VERIFIED` | `IMPLEMENTED_NOT_VERIFIED` | `PARTIALLY_IMPLEMENTED` | `OPEN_SOFTWARE` | `BLOCKED_EXTERNAL` | `BLOCKED_HUMAN` | `BLOCKED_PRODUCTION` | `OBSOLETE_WITH_EVIDENCE`  
Security labels: `FIXED_AND_VERIFIED` | `MITIGATED_WITH_EVIDENCE` | `OPEN` | `BLOCKED_EXTERNAL`

---

## 1. Actual starting and ending HEAD

| Field | Value |
| --- | --- |
| Branch | `cursor/final-completion-execution-c293` |
| Starting HEAD | `d6e7e185dff0839136f8ea05b6aa9aed9d97e90d` |
| Ending HEAD | recorded after the local report commit |
| Starting uncommitted files | `next.config.ts`, `package.json`, `lib/nextDistIsolation.test.ts`, `.gitignore`, untracked `scripts/with-next-prod-lock.mjs` (lockfile isolation attempt from the interrupted Phase 8 turn) |
| User-owned taxonomy / catalog / storefront diffs | none proven belonging to this task; `npm run build` rewrote taxonomy preflight JSON and reformatted `tsconfig.json`; both **restored** to HEAD |
| Rollback | restore the files listed in §12; no destructive Git |

Pusat remains the sole orchestrator. This phase did not rebuild completed components.

---

## 2. Branch and Git status (before the report commit)

```
cursor/final-completion-execution-c293
d6e7e18 Isolate production Next builds from the live next-dev cache.
 M .gitignore
 M lib/nextDistIsolation.test.ts
 M next.config.ts
 M package.json
```

Untracked locker `scripts/with-next-prod-lock.mjs` was **deleted** after it failed to isolate artifacts (Next config workers do not see a cwd lockfile; `required-server-files.json` still recorded `distDir: ".next"`).

---

## 3. Port 3000 process identity and failure diagnosis

### 3.1 Identity (after recovery)

| Field | Evidence |
| --- | --- |
| Listen | IPv6 `:::3000` / IPv4 `127.0.0.1:3000` |
| `next-server` PID | `1997897` (Next.js 15.5.27) |
| Parent PID | `1997882` |
| Parent command | `node /workspace/node_modules/.bin/next dev --port 3000` |
| cwd | `/workspace` |
| uid | `1000` |
| Ownership | Confirmed Buzzard local development server |

Phase 7 reported PID `1961396`. That PID was **not** current. Do not reuse old PIDs.

### 3.2 Root cause (reproduced in this phase)

A production `next build` with `output: "export"` wrote into the **same** `.next` directory that `next-dev` was serving.

- HTTP 500 after the clobber.
- Response body contained `Cannot find module './3897.js'` (missing webpack chunk).
- `.next/export-marker.json` appeared while `next-dev` was still running.
- `.next/required-server-files.json` contained `"distDir": ".next"`.

This is a **local workspace artifact collision**, not a production outage and not an application-logic 500.

Attempts that **failed** (config workers do not see them, or they still resolved to `.next`):

1. `NEXT_DIST_DIR=.next-prod` in the npm `build` script — stripped in the Next jest-worker.
2. `process.argv.includes("build")` — worker argv is `jest-worker/processChild.js`.
3. `.next-prod.lock` next to `process.cwd()` — lock existed, workers still emitted `distDir: ".next"`.

### 3.3 Recovery (justified; only the confirmed next-dev tree)

Because ownership was proven (`next dev --port 3000`, cwd `/workspace`):

1. SIGTERM (then SIGKILL if needed) **only** of that parent/child pair. No `pkill -f`. No other tmux sessions.
2. Restart in tmux session `buzzard-next-3000`: `npx next dev --port 3000`.
3. `GET http://127.0.0.1:3000/` → **200**, `<title>Buzzard24 – Online-Katalog für Kfz-Teile &amp; mehr</title>`.

Repeating `npm run build` **before** distDir inversion reproduced HTTP 500. After inversion (see §4), repeating `npm run build` left port 3000 at **200**.

Local HTTP 200 is `SANDBOX_VERIFIED` for the workspace storefront process. It is **not** `LIVE_VERIFIED`.

---

## 4. Exact local runtime correction

`next-dev` and `next build` must not share a distDir cache.

| Mode | `NODE_ENV` | `distDir` | `output` |
| --- | --- | --- | --- |
| `next dev` | not production | `.next-dev` | unset (SSR/dev) |
| `next build` | production | `.next` | `export` |

Proof after `npm run build` (exit 0):

| Check | Result |
| --- | --- |
| `.next/export-marker.json` | present (production export cache) |
| `.next/BUILD_ID` | `B9fPh8Sx9qHA4w1Cw7QXK` |
| `.next/required-server-files.json` `distDir` | `.next` |
| `.next-dev/export-marker.json` | absent |
| `out/index.html` | present (static export) |
| `GET http://127.0.0.1:3000/` immediately after build | **200**, Buzzard24 title |
| Second GET ~2s later | **200** |
| Missing-chunk 500 | absent |

Status: **FIXED_AND_VERIFIED** locally. Isolated E2E on `:3010` was **not** started: a second `next-dev` would share `.next-dev` and reintroduce the same class of collision. Playwright used the recovered `:3000` plus the already-running API on `:3001`.

`.gitignore` now includes `.next-dev/`. Production start remains `scripts/start-production.mjs` serving `out/` (or the API on Render). Production architecture was not changed.

---

## 5. Current security findings (individually)

`npm audit --audit-level=high` **exit 1**.  
JSON metadata: `high: 5`, `critical: 0`, `total: 5`.  
Server package (`npm --prefix server audit`): **exit 0**, `total: 0`.

All five HIGH rows are **one** advisory plus four dependents. They are **not** five independent vulnerabilities.

### 5.1 braces — GHSA-vfj7-8cjw-p6xm / npm 1240992 / CVE-2026-93687

| Field | Value |
| --- | --- |
| Package | `braces` |
| Installed | `3.0.3` |
| Severity | high |
| Direct? | no |
| Path | `eslint-config-next@15.5.27` → `@next/eslint-plugin-next@15.5.27` → `fast-glob@3.3.1` → `micromatch@4.0.8` → `braces@3.0.3` |
| Affected range | `<=3.0.3` (`*` in npm’s braces row) |
| Fixed version | **none published** (`npm view braces version` = `3.0.3`; no `3.0.4+`) |
| Runtime vs development | **development-only** lint toolchain. Not in `dependencies`. Not on the production `output: "export"` runtime graph. |
| Compatible update | **none**. `fixAvailable` is `eslint-config-next@14.2.35` (`isSemVerMajor: true`) against Next **15.5.27**. |
| Safe remediation | wait for upstream `braces` or Next 15 eslint plugin to drop `fast-glob@3.3.1` / `braces@3.0.3` |
| Temporary risk reduction | do not run untrusted glob patterns through the lint toolchain; do not `npm audit fix --force` |
| Status | **OPEN** / **BLOCKED_EXTERNAL** |

### 5.2 micromatch

Transitive HIGH **only** because it depends on braces. Same chain, same `fixAvailable` Next 14 eslint. **OPEN** / **BLOCKED_EXTERNAL**.

### 5.3 fast-glob

Transitive HIGH via micromatch. **OPEN** / **BLOCKED_EXTERNAL**.

### 5.4 `@next/eslint-plugin-next`

Transitive HIGH via fast-glob. Range `>=14.3.0-canary.0`. **OPEN** / **BLOCKED_EXTERNAL**.

### 5.5 `eslint-config-next`

Direct **devDependency** `15.5.27` (matched to `next@15.5.27`). HIGH only as the top of the braces chain. **OPEN** / **BLOCKED_EXTERNAL**.

`npm run security:check` exit **0** with **1 warning** (the same braces chain). Core protection files (rate limit, lockout, TOTP, admin 2FA, security plugin, honeypot) remain present.

A successful `next build` is **not** a security fix. Audit remains failed (exit 1).

---

## 6. Dependency graph and remediation status

```
eslint-config-next@15.5.27 (direct, development)
  └ @next/eslint-plugin-next@15.5.27
      └ fast-glob@3.3.1
          └ micromatch@4.0.8
              └ braces@3.0.3   ← GHSA-vfj7-8cjw-p6xm
```

Existing overrides (`postcss`, `source-map-js`, `js-yaml`, `brace-expansion`, `sharp`) do not cover `braces`. No override was added: there is no patched braces release to pin.

Server lockfile: **0** findings.

---

## 7. Security code review

Review was of the current implementation. No penetration test. No production auth settings were changed.

| Area | Result | Status |
| --- | --- | --- |
| Admin auth | Session token still stored in `sessionStorage` (`lib/admin/client.ts` and other admin clients). Browser JS can read it. HttpOnly cookie would require rewriting dozens of clients plus CSRF. | **OPEN_SOFTWARE** |
| Session / cookies | No HttpOnly admin cookie implemented this phase (too invasive; would break the Playwright test that polls `buzzard_admin_token`). | **OPEN_SOFTWARE** |
| Payment webhooks | Unsigned / mismatched amount / currency fail closed in dual adapters (covered by `dualPaymentAdapters` / `secureCommerce`). Live HTTP blocked without sales + `BUZZARD_LIVE_PAYMENTS`. | **SANDBOX_VERIFIED** |
| Replay / idempotency | Duplicate checkout / events remain idempotent in software tests. | **SANDBOX_VERIFIED** |
| Order aliases | Canonical identity tests still pass; collisions fail closed. | **SANDBOX_VERIFIED** |
| Redirects | `post-export.mjs` writes static refresh pages; no new open redirect introduced. | **CODE_READY** |
| Rate limiting / lockout / 2FA | Present (`security:check` OK). | **CODE_READY** |
| PII / secrets | No credentials printed. Customer account E2E asserts QR PII is not leaked to anonymous viewers. | **SANDBOX_VERIFIED** |
| Feature flags | Sales / SoT / live payments remain off. | **FIXED_AND_VERIFIED** (as locked) |
| Backup / restore | Restore guard; `--dry-run` only. | **SANDBOX_VERIFIED** (dry-run) |

The Playwright failure `Admin login form stores a session token` (sessionStorage poll timed out) is consistent with the existing sessionStorage design plus this workspace’s `next-dev` not being started with a baked-in `NEXT_PUBLIC_BUZZARD_API_URL`. Later tests that use `seedAdminSession` against `:3001` passed. Auth was **not** weakened to make that poll pass.

---

## 8. Order / payment / inventory regression evidence

Commands:

- `npm run test:software` → **143 passed**, exit 0 (`softwareCompletion`, `softwareLifecycle`, `secureCommerce`, `dualPaymentAdapters`, `softwareMasterCompletion`, `orderIdentityLoyalty`)
- Targeted `dualPaymentAdapters` + `orderIdentityLoyalty` + `productArchitecture` → **37 passed**, exit 0

Invariants covered by those suites (fixtures only; no live money):

- Aliases map to at most one canonical order; collisions fail closed.
- Unknown identifiers are not guessed.
- Unsigned webhooks cannot mutate payment state.
- Duplicate events stay idempotent.
- Amount / currency mismatch fails closed.
- Timeout is not capture.
- Only verified capture consumes inventory; duplicate consumption is prevented.
- Cancellation releases eligible reservations; consumed stock is not silently restored.
- Refund / chargeback / supplier credit remain separate from inventory restore.
- QR redemption is not duplicable in fixtures.
- Missing cost/tax inputs fail closed; minimum net product profit EUR 0.50.

Live financial operations: **not run**. Status: **SANDBOX_VERIFIED**.

---

## 9. Product routing verification

| Check | Result |
| --- | --- |
| `GET /produkt/premium-bremsscheibe-testprodukt/` on :3000 | **200**, title `Premium Bremsscheibe Testprodukt \| Buzzard \| Buzzard24` |
| `GET /produkt/this-slug-does-not-exist-phase8/` | **404**, homepage title, no invented product |
| Playwright customer-journey PDP + unknown slug | passed (desktop / mobile / tablet) |
| Product SoT | `BUZZARD_PRODUCT_SOT_ACTIVE` unset; `productArchitecture.js` still requires `=== "1"` |
| Listing merge | still `static_slug_wins` |
| Dual-write / production product migration | not performed |

Stores remain separate: static PDP = `data/buzzard_products.json`; PIM = `pim_core_products`. Status: **SANDBOX_VERIFIED** for local routing. Canonical Product SoT: **NOT_IMPLEMENTED** as an active runtime (documented, inactive).

---

## 10. Database and backup evidence

| Item | Evidence |
| --- | --- |
| Local runtime DB | `server/data/buzzard.db` (default when `BUZZARD_DB_PATH` unset) |
| Intended Render path | `/var/data/buzzard.db` (documented in `verify-db-persistence.mjs` / monitoring helpers) |
| `verify:db-persistence` | **NOT RUN**. Script default API is `https://buzzard-api.onrender.com` and would hit production health. |
| `npm run test:backup-restore` | exit 0: `[dry-run] Would restore /workspace/server/data/buzzard.db (15138816 bytes) → /workspace/server/data/buzzard.db` |
| Restore target | local path; `assertRestoreAllowed` |
| Production persistence | **UNKNOWN** / **BLOCKED_PRODUCTION** |

---

## 11. Test results

Skipped tests are not passes. `npm audit` exit 1 is not a pass.

| Command | Exit | Passed | Failed | Skipped | Not run | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| `npx vitest run lib/nextDistIsolation.test.ts` | 0 | 1 | 0 | 0 | | isolation contract |
| `npm run test:software` | 0 | 143 | 0 | 0 | | |
| `npm run test:ai` | 0 | 58 | 0 | 0 | | |
| `npm run test:bridge` | 0 | 18 | 0 | 0 | | |
| `npm run test:unit` | 0 | 885 | 0 | 0 | | includes isolation test |
| `npm run test:backup-restore` | 0 | dry-run | 0 | 0 | | local only |
| `npm run lint` | 0 | | | | | 0 ESLint issues |
| `npm run typecheck` | 0 | | | | | |
| `npm run build` (after distDir inversion) | 0 | | | | | isolated; :3000 stayed 200 |
| `npm audit --audit-level=high` | **1** | | | | | 5 HIGH rows, 1 advisory |
| `npm --prefix server audit` | 0 | 0 vulns | | | | |
| `npm run security:check` | 0 | | | | | 1 warning (braces) |
| `PLAYWRIGHT_SKIP_WEBSERVER=1` `npx playwright test` against :3000 + :3001 | **1** | **109** | **1** | **8** | | see below |
| Isolated :3010 / :3002 Playwright stack | | | | | **not run** | would share `.next-dev` with :3000 |
| `verify:db-persistence` | | | | | **not run** | production default URL |
| `npm audit fix --force` | | | | | **not run** | forbidden |

Playwright failure (not treated as a pass):

- `[chromium-desktop] e2e/admin.spec.ts:18` — `Admin login form stores a session token` — `sessionStorage.getItem("buzzard_admin_token")` stayed `null` for 20s.
- Same file: `authenticated dashboard loads` and Control Center tests **passed** via `seedAdminSession`.
- 8 skipped: mobile five-stage category UX on non-phone projects + overflow cases filtered by project (same intentional skips as Phase 7).

Port 3000 after Playwright: **200**.

---

## 12. Files changed and reasons

| File | Why |
| --- | --- |
| `next.config.ts` | `distDir` is `.next-dev` for `next-dev` and `.next` for production export, so `next build` cannot overwrite live webpack chunks |
| `package.json` | `build` is `next build` (no `NEXT_DIST_DIR`, no lock wrapper) |
| `.gitignore` | ignore `.next-dev/` and leftover `.next-prod.lock` |
| `lib/nextDistIsolation.test.ts` | regression lock on the distDir contract |
| This report | evidence |

Deleted, not committed: `scripts/with-next-prod-lock.mjs` (failed isolation strategy).

Restored, not committed: `data/taxonomy/buzzard_production_preflight.json`, `public/taxonomy/buzzard_production_preflight.json`, `tsconfig.json`.

---

## 13. Remaining defects and external blockers

| Item | Status |
| --- | --- |
| braces GHSA-vfj7-8cjw-p6xm (and 4 dependent HIGH rows) | **OPEN** / **BLOCKED_EXTERNAL** |
| Admin sessionStorage token (not HttpOnly) | **OPEN_SOFTWARE** |
| Playwright admin login form → sessionStorage (1 failed test in this workspace) | **OPEN_SOFTWARE** (environment / client token storage; helper path works) |
| Render SQLite persistence | **UNKNOWN** / **BLOCKED_PRODUCTION** |
| Live payments / sales / Product SoT | locked by design |
| OTTO / bol / Cdiscount / eMAG / Skroutz live publishing | **BLOCKED_EXTERNAL** / **BLOCKED_HUMAN** |
| DATEV / SEPA live | **BLOCKED_HUMAN** |
| Compatible braces release | **BLOCKED_EXTERNAL** |

---

## 14. Whether further local software work is justified

Limited. The reproducible local 500 is fixed by distDir isolation. Remaining HIGH audit rows cannot be closed without an upstream braces/Next eslint release. HttpOnly admin cookies are a real gap but are a cross-cutting auth rewrite, not a safe one-file patch. Production persistence cannot be verified from this workspace without an authorized production probe.

Further local work is justified only for: the sessionStorage login E2E flake (without weakening auth), or an authenticated production persistence check requested by an operator.

---

## 15. Required human and production actions

1. Do not run `npm audit fix --force` (would install `eslint-config-next@14.2.35` against Next 15.5.27).
2. Track `braces` / Next eslint for a non-breaking patch; then re-run `npm audit`.
3. If HttpOnly admin cookies are required, schedule a dedicated auth change with CSRF tests — not a drive-by cookie flag.
4. Production DB: run `verify:db-persistence` only with operator approval against the intended API.
5. Keep `BUZZARD_SALES_ENABLED=0`, `BUZZARD_PRODUCT_SOT_ACTIVE` unset/off, `BUZZARD_LIVE_PAYMENTS` unset/off until a separate go-live task.
6. After deploy, operators should run production `next build` in CI/hosting, not against a developer’s live `.next-dev` session.

---

## 16. Safety-lock confirmation

| Lock | Observed |
| --- | --- |
| `BUZZARD_SALES_ENABLED` | `0` |
| `NEXT_PUBLIC_SALES_ENABLED` | `0` |
| `BUZZARD_PRODUCT_SOT_ACTIVE` | unset (treated as inactive) |
| `BUZZARD_LIVE_PAYMENTS` | unset (treated as inactive) |
| Marketplace publishing | still blocked in software tests |
| Real money movement | false |
| Supplier purchasing | false |
| Customer communications | not sent |
| Production data / config | not modified |
| Product SoT | inactive |

Commerce readiness E2E: “commerce health shows sales disabled” **passed**.

---

## 17. No push, PR, merge, deployment, or production mutation

Confirmed:

- No `git push`
- No pull request created or updated
- No merge
- No deploy
- No Render / production database mutation
- `verify:db-persistence` not executed
- Port 3000 was restarted **only** after proving it was `next dev --port 3000` in `/workspace` and only because production export had destroyed its webpack cache; after distDir isolation a subsequent production build **did not** require another restart

---

## Final HEAD

Starting HEAD: `d6e7e185dff0839136f8ea05b6aa9aed9d97e90d`  
Ending HEAD: `96c88a77a458360a731a9dd849e70c4877641b39`

# Buzzard 237 — Test evidence

Date: 2026-10-14  
Branch: `cursor/software-completion-local-c293`  
Ancestor HEAD at session start: `5ba16b2d5549e8b759d023a13d6555291971fb63`  
Working tree after this pass: see git status at handover  
Vitest config: `vitest.config.ts` (repo root). Tests that join `process.cwd()` to `server/lib/...` are invalid unless cwd is repo root; product architecture tests now use `import.meta.url` repo root.

Safety at evidence time:

- `BUZZARD_SALES_ENABLED=0`
- `BUZZARD_PRODUCT_SOT_ACTIVE` unset
- `BUZZARD_LIVE_PAYMENTS` unset
- `http://127.0.0.1:3000` HTTP 200 (left running; not killed)
- `http://127.0.0.1:3001/api/health` HTTP 200

Nothing below is production verification. Nothing is LIVE_VERIFIED.

## This pass — focused unit

Command:

```
npx vitest run guestCommerceAccess part8Foundation jwtSecret fortressAuthz csrf corsOrigins pusatApprovalExceptions controlCenterApprovalBridge productArchitecture routePermissions rateLimitStore
```

Working directory: `/workspace`  
Result: **11 files, 80 passed, 0 failed.** Duration ~1.64s. Exit 0.

When the same glob was run with cwd `/workspace/server`, productArchitecture failed because `data/buzzard_products.json` and `server/lib/pim/productCore.js` were resolved under `server/`. Classification: **TEST_DEFECT / ENVIRONMENT_MISMATCH**, not an application dual-write defect. Tests were repaired to use repository root.

Command:

```
npx vitest run softwareMasterCompletion dualPaymentAdapters secureCommerce pusatMemoryGuardian pusatApprovalExceptions part8Foundation jwtSecret productArchitecture rateLimitStore guestCommerceAccess
```

Result: **10 files, 105 passed, 0 failed.** Duration ~3.79s. Exit 0.

Covered this pass (non-exhaustive):

| Area | Result |
| --- | --- |
| Live payments / SoT child flags ineffective without sales | pass (`part8Foundation`) |
| Production env: live payments without sales | pass (`jwtSecret` / `environmentValidation`) |
| JWT production default fail-closed | pass |
| AI self-approval and missing approver | pass (`pusatApprovalExceptions`) |
| Health vs API rate-limit buckets | pass (`rateLimitStore`) — limiter **not** disabled |
| Guest checkout/order/cart proof | pass |
| CSRF cookie mutation | pass |
| CORS `Origin: null` | pass |
| Product SoT inactive / dual-write forbidden | pass |
| Dual payment adapters | pass (mock; not sandbox) |
| Secure commerce facade | pass |
| Guardian memory | pass |

## Prior isolated evidence (still valid as historical; not re-run this pass)

Recorded in `BUZZARD_MASTER_SOFTWARE_COMPLETION_REPORT_2026-10-14.md` for HEAD `ba80abd` / later local commits:

| Command | Result | Classification |
| --- | --- | --- |
| Full `npx vitest run` | 79 files, 927 passed | Historical; this HEAD has additional tests |
| `NODE_ENV=production npx next build` | Compiled, 2044 static pages; :3000 stayed 200 | Historical isolated build |
| Playwright `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010` `BUZZARD_API_URL=http://127.0.0.1:3001` | 100 passed, **6 failed**, 13 skipped, exit 1 | REAL remaining: PIM copy, HttpOnly cookie on HTTP static, admin login 429, cart after `/api/health` 429, mega menu timeout. **Not marked passed.** Rate limits were not disabled. |

## Not run this pass (honest)

| Check | Status |
| --- | --- |
| Full unit suite on this exact working tree | NOT_RUN after the 105-test subset (time). Do not reuse 927 as this SHA. |
| `npx tsc --noEmit` | NOT_RUN this pass |
| `npx next lint` | NOT_RUN this pass |
| `npm audit --audit-level=high` | NOT_RUN this pass |
| Playwright | NOT_RUN this pass |
| Production build | NOT_RUN this pass |
| GitHub CI | UNKNOWN |
| Live/sandbox provider HTTP | NOT_RUN (unauthorized) |

## Rate limiting note

`BUZZARD_TEST_MODE=1` still disables the in-process limiter for CI E2E (`scripts/e2e-webserver.mjs`, `.github/workflows/ci.yml`). Production validation **errors** if `BUZZARD_TEST_MODE=1` or `BUZZARD_RATE_LIMIT_DISABLED=1`. Isolated Playwright against the long-running `:3001` API (no TEST_MODE) previously hit 429 — that is the control working, not a reason to disable it. Health paths now use prefix `api-health:` (max 120/min) separate from `api:` (max 180/min).

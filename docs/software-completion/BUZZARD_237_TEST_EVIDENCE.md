# Buzzard 237 — Test evidence

Date: 2026-10-14  
Branch: `cursor/software-completion-local-c293`  
Quality HEAD (code, before this docs commit): `fe1cd253ce243bcae51d19a236aeb4aadd9bb160`  
Vitest config: `vitest.config.ts` (repo root). Product architecture tests use `import.meta.url` repo root.

Safety at evidence time:

- `BUZZARD_SALES_ENABLED` not `1` (running API `version.salesEnabled: false`)
- `BUZZARD_PRODUCT_SOT_ACTIVE` unset
- `BUZZARD_LIVE_PAYMENTS` unset
- `http://127.0.0.1:3000` HTTP 200 (left running; not killed)
- `http://127.0.0.1:3001/api/health` HTTP 200, commit prefix `fe1cd253ce24`
- `http://127.0.0.1:3010` HTTP 200 (static `out/` after production export)

Nothing below is production verification. Nothing is LIVE_VERIFIED.

## Commands on current code (fe1cd25 + notificationHub test file)

Working directory: `/workspace` unless noted.

| Command | Exit | Totals | Duration |
| --- | --- | --- | --- |
| `npx vitest run` (after notificationHub.test.mjs added) | 0 | 81 files, **942 passed**, 0 failed | 34.44s |
| `npx tsc --noEmit` | 0 | no output | included in ~4.4s lint/tsc/audit block |
| `npx next lint` | 0 | No ESLint warnings or errors | same |
| `npm audit --audit-level=high` | 1 | **5 high** (`braces`/`micromatch` via `eslint-config-next`). Did **not** `audit fix --force`. | same |
| `NODE_ENV=production npx next build` | 0 | Compiled; 2044 static pages; export ok; `:3000` stayed 200 | ~27s |
| Isolated Playwright (below) | 0 | **107 passed, 12 skipped, 0 failed** | 48.1s |

Isolated Playwright command:

```
PLAYWRIGHT_SKIP_WEBSERVER=1 \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010 \
BUZZARD_API_URL=http://127.0.0.1:3001 \
NEXT_PUBLIC_BUZZARD_API_URL=http://127.0.0.1:3001 \
npx playwright test
```

`BUZZARD_TEST_MODE` was **not** set for this isolated run. Rate limits stayed on.

Focused regression before the full suite (on the same working tree, before notificationHub.test.mjs): 13 files, 113 passed, 0 failed, 4.18s, exit 0.

## Previously reported six Playwright failures (classified, then repaired)

These were **not** left as an open failing suite on `fe1cd25`. Isolated re-run: 107/12/0.

| # | Symptom (prior report) | Classification | Repair (controls kept) |
| --- | --- | --- | --- |
| 1 | PIM Validation / Import assertions | TEST_DEFECT | Select product then Validate; dry-run copy `/Dry run\|dry-run/i` |
| 2 | `admin_session_lost` on static HTTP 3010→3001 | ENVIRONMENT_MISMATCH | HttpOnly Secure cookies cannot stick on HTTP split origins; Bearer is a first-class admin path; `page.route` injects Authorization |
| 3 | `admin_login_rate_limited` | RATE_LIMIT_INTERFERENCE | Unique TEST-NET `X-Forwarded-For` on `APIRequestContext` only. Limiter not disabled. |
| 4 | cart/health 429 sharing `api:` bucket | RATE_LIMIT_INTERFERENCE | Dedicated `api-health:` bucket (max 120) via `isHealthPath`; unique IPs on cart posts |
| 5–6 | mega-menu 90s hang | TEST_DEFECT | Invalid comma `page.click` selector; bounded locator + 8s timeout; skip only if opener absent |

Follow-on after first isolation pass:

| Symptom | Classification | Repair |
| --- | --- | --- |
| Admin login form CORS preflight | TEST_DEFECT | Do not set browser `extraHTTPHeaders` `X-Forwarded-For`. That header is **not** in `Access-Control-Allow-Headers` (production CORS unchanged). |

No REAL_APPLICATION_DEFECT required disabling auth, CSRF, CORS, or rate limits.

12 skipped tests are Playwright project/viewport filters in `customer-journey.spec.ts`, not failures.

## Coverage notes (non-exhaustive)

| Area | Result |
| --- | --- |
| Live payments / SoT child flags ineffective without sales | pass (`part8Foundation`) |
| Production env: live payments without sales | pass (`jwtSecret`) |
| Product SoT env warns, software `productSotActive` false | pass (`jwtSecret`) |
| JWT production default fail-closed | pass |
| AI self-approval, named AI actors, missing approver | pass (`pusatApprovalExceptions`) |
| Health vs API rate-limit buckets + `isHealthPath` | pass (`rateLimitStore`) |
| CORS `Origin: null`; `X-Forwarded-For` not a CORS allow-header | pass (`corsOrigins`) |
| Marketplace classification-only + hub 409 while sales off | pass (`marketplaceClassification`) |
| Customer send remains blocked | pass (`notificationHub`) |
| Product SoT inactive / dual-write forbidden | pass (`productArchitecture`) |

## GitHub CI

UNKNOWN for this local HEAD. Push was **not** performed (directive: do not push). Historical PR #430 CI must not be reused as validation of `fe1cd25`.

## Rate limiting note

`BUZZARD_TEST_MODE=1` still disables the in-process limiter for CI E2E (`scripts/e2e-webserver.mjs`, `.github/workflows/ci.yml`). Production validation **errors** if `BUZZARD_TEST_MODE=1` or `BUZZARD_RATE_LIMIT_DISABLED=1`. Isolated Playwright against long-running `:3001` does not set TEST_MODE.

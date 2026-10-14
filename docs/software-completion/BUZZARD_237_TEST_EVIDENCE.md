# Buzzard 237 — Test evidence

Date: 2026-10-14  
Branch: `cursor/software-completion-local-c293`  
Quality HEAD (code, before this docs commit): `1a40186f5336a2085146e39dc24018515ac71abe`

Safety at evidence time:

- `BUZZARD_SALES_ENABLED=0`; running API `version.salesEnabled: false`
- `BUZZARD_PRODUCT_SOT_ACTIVE` unset
- `BUZZARD_LIVE_PAYMENTS` unset
- `:3000` HTTP 200 (not killed)
- `:3001/api/health` HTTP 200
- `:3010` HTTP 200 (static `out/` after production export)

Nothing below is production verification. Nothing is LIVE_VERIFIED.

## Commands on current code (`1a40186`)

Working directory: `/workspace`

| Command | Exit | Totals | Duration |
| --- | --- | --- | --- |
| `npx vitest run` | 0 | 83 files, **947 passed**, 0 failed | 34.62s |
| `npx tsc --noEmit` | 0 | clean | ~4s with lint |
| `npx next lint` | 0 | No ESLint warnings or errors | same |
| `npm run test:backup-restore` | 0 | dry-run only; did not write production DB | <1s |
| `NODE_ENV=production npx next build` | 0 | 2044 pages; `:3000` stayed 200 | ~27s |
| Isolated Playwright (below) | 0 | **107 passed, 12 skipped, 0 failed** | 47.9s |

Isolated Playwright:

```
PLAYWRIGHT_SKIP_WEBSERVER=1 \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010 \
BUZZARD_API_URL=http://127.0.0.1:3001 \
NEXT_PUBLIC_BUZZARD_API_URL=http://127.0.0.1:3001 \
npx playwright test
```

`BUZZARD_TEST_MODE` was **not** set. Rate limits stayed on. `npm audit --audit-level=high` remains **5 high** via eslint-config-next; not force-fixed this pass.

## Previously reported six Playwright failures

The historic report of 100/6/13 is **not** the current result. Isolated re-run on this HEAD: **107/12/0**.

| Prior failure | Classification | Repair |
| --- | --- | --- |
| PIM Validate/Import | TEST_DEFECT | Real UI controls / dry-run copy |
| `admin_session_lost` | ENVIRONMENT_MISMATCH | Bearer on HTTP split origins |
| `admin_login_rate_limited` | RATE_LIMIT_INTERFERENCE | Unique TEST-NET IPs on APIRequestContext |
| cart/health 429 | RATE_LIMIT_INTERFERENCE | Dedicated `api-health:` bucket |
| Mega-menu 90s hang | TEST_DEFECT | Bounded locator |
| Login CORS after browser XFF | TEST_DEFECT | Do not send `X-Forwarded-For` as a CORS request header |

No remaining Playwright failures. 12 skips are project/viewport filters.

## GitHub CI

UNKNOWN. Push was not performed.

Canonical original 237-item checklist: **not found**.

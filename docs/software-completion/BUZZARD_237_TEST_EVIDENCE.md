# Buzzard 237 — Test evidence

Date: 2026-10-14  
Branch: `cursor/software-completion-local-c293`  
Quality HEAD: `10bca62832e54e907ef7a76b0fd204f42e4a5e6a`

Safety at evidence time:

- `BUZZARD_SALES_ENABLED=0`; running API `version.salesEnabled: false`
- `BUZZARD_PRODUCT_SOT_ACTIVE` unset
- `BUZZARD_LIVE_PAYMENTS` unset
- `:3001/api/health` HTTP 200, `salesEnabled: false`
- `:3000` not killed

Nothing below is production verification. Nothing is LIVE_VERIFIED.

## Commands on current code

Working directory: `/workspace`

| Command | Exit | Totals | Duration |
| --- | --- | --- | --- |
| `npx vitest run` | 0 | 87 files, **956 passed**, 0 failed | 36.07s |
| `npx tsc --noEmit` | 0 | clean | combined with lint ~4.2s |
| `npx next lint` | 0 | No ESLint warnings or errors | same |
| `npm run test:backup-restore` | 0 | dry-run only; did not write production DB | <1s |
| `NODE_ENV=production npx next build` | 0 | 2044 pages; export succeeded | ~29s |

Focused pre-suite: `pusatAgentsAutomations`, `searchIndexHonesty`, `storefrontA11yLandmarks`, `localMetricsAlerts`, `part8Foundation`, `part21SecurityObservabilityReadiness` — 6 files, 63 passed.

Isolated Playwright was **not re-run** on this HEAD. Last isolated run (HEAD `1a40186`): **107 passed, 12 skipped, 0 failed**. Layout landmark change is covered by `storefrontA11yLandmarks.test.mjs`. Re-run Playwright before claiming E2E on this tree.

`BUZZARD_TEST_MODE` was **not** set for these commands. `npm audit --audit-level=high` remains **5 high** via eslint-config-next; not force-fixed this pass.

## New tests this pass

| File | Established coverage |
| --- | --- |
| `server/__tests__/pusatAgentsAutomations.test.mjs` | Every `AGENT_CODES` employee seeded + execute bound; product/order remain sales-locked |
| `server/__tests__/searchIndexHonesty.test.mjs` | `liveOpenSearch: false`; stub uses `sql_fallback` |
| `server/__tests__/storefrontA11yLandmarks.test.mjs` | Skip-link href bound to `MAIN_CONTENT_ID` |
| `server/__tests__/localMetricsAlerts.test.mjs` | Local metrics/alerts; no Prometheus; no live dispatch |
| `server/__tests__/localeCoverageHonesty.test.mjs` | i18n does not invent translations; fill script cannot enable sales |

## GitHub CI

UNKNOWN. Push was not performed.

Canonical original 237-item checklist: **not found**.

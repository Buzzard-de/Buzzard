# Buzzard 237 — Test evidence

Date: 2026-10-15  
Branch: `cursor/software-completion-local-c293`  
Starting HEAD this pass: `bfc4265`

Safety:

- `BUZZARD_SALES_ENABLED=0`
- SoT / live payments unset
- `:3000` and `:3001` left running
- Original 237 checklist UNKNOWN — score NOT FULLY AUDITABLE
- No LIVE_VERIFIED / production RESTORE_TESTED

## Commands

| Command | Exit | Totals |
| --- | --- | --- |
| Focused vitest HAC/fail-closed | 0 | 26 passed |
| `npx vitest run` | 0 | 113 files, **1084 passed** |
| `npx tsc --noEmit` | 0 | clean |
| account lint | 0 | clean |
| `NODE_ENV=production npx next build` | 0 | 2044 pages; `:3000` 200 |
| Playwright API suite (security+storefront+readiness) | 0 | **12 passed** |
| Full Playwright UI suite | not run | journey/admin/viewports skipped |

Percentages **unchanged**: Esat 83.73%, Buzzard 73.90%.

## Local trial 2026-10-16 (HEAD after `86e799e` tests)

Safety: sales/SoT/live payments off. No `npm audit fix --force`. No merge of #431. Items 87/88/185 unchanged.

| Command | Exit | Totals |
| --- | --- | --- |
| `npx vitest run` rateLimitStore + a11y landmarks + localMetricsAlerts + backupRestoreIntegrity + carrierLabelPurchase | 0 | 5 files, **15 passed** |
| `npm run security:audit` (`--audit-level=high`) | 1 | 5 high: `braces` via `eslint-config-next` / micromatch / fast-glob. Force upgrade refused. |
| `npm run test:backup-restore` | 0 | dry-run `server/data/buzzard.db` (16543744 bytes) → `server/data/test-scratch/phase11-unit.db` |
| `npm run diagnostics:providers` | 0 | `secretsIncluded: false`, `attempted: false`, `live: 0` |

Register mean after this trial: **75.76%** (17955/237; one decimal **75.8%**). VERIFIED_100 remains 0.

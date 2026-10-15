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

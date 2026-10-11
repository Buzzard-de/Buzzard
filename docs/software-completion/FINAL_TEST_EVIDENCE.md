# Final Test Evidence

Branch: `cursor/software-completion-c293`  
Environment: isolated local (`BUZZARD_SALES_ENABLED` unset) and GitHub Actions.  
No production database.

## Commands executed this pass

| Command | Exit | Result |
| --- | --- | --- |
| `npm run test:software` | 0 | **46/46** |
| `npm run test:ai` | 0 | **58/58** |
| `npm run test:unit` | 0 | **739/739** (59 files) |
| `npm run typecheck` | 0 | no errors |
| `npm run lint` | 0 | no warnings/errors (`next lint` deprecation notice only) |
| `npm run security:check` | 0 | **1 warning** (frontend npm audit: vitest/tinypool + Next bundled postcss/sharp) |
| `npm run diagnostics:providers` | 0 | dry-run, attempted=false, live=0, 31 items |
| `npm run render:preflight` | 0 | 2 warnings; deploy not executed; existing script performed a read-only `/api/health` GET |
| Playwright storefront/admin | not re-run locally this pass | last CI SUCCESS was `da0dfd3` run 38158295514 — **not** this HEAD |

Skipped Playwright cases from the prior full run are viewport/project filters, not silent passes.

## What tests do not prove

Live provider auth, production SQLite, Render disk, commercial checkout while sales are locked, Vitest 5 remediation.

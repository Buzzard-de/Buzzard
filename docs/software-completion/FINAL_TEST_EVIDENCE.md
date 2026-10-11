# Final Test Evidence

Branch: `cursor/software-completion-c293`  
Environment: isolated local (`BUZZARD_SALES_ENABLED` unset) and GitHub Actions.  
No production database.

## Commands executed this pass

| Command | Exit | Result |
| --- | --- | --- |
| `npm run test:software` | 0 | **38/38** |
| `npm run test:ai` | 0 | **58/58** |
| `npm run test:unit` | 0 | **731/731** (59 files) |
| `npm run typecheck` | 0 | no errors |
| `npm run lint` | 0 | no warnings/errors (`next lint` deprecation notice only) |
| `npm run build` | 0 | static export completed |
| `npm run security:check` | 0 | 2 warnings (frontend remaining advisories; contact time-trap) |
| `npm run diagnostics:providers` | 0 | dry-run, attempted=false, live=0, 31 items |
| `npm run render:preflight` | not re-run this pass | previously exit 0; CI will run |
| Playwright admin unauth + diagnostics 401 | 0 | **2/2** |
| Homepage / full admin / journey | not re-run after Next bump | last local 37+18; CI will re-run |

Skipped Playwright cases from the prior full run are viewport/project filters, not silent passes.

## What tests do not prove

Live provider auth, production SQLite, Render disk, commercial checkout while sales are locked, Vitest 5 remediation.

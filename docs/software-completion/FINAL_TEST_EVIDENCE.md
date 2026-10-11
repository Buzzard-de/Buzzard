# Final Test Evidence

Branch: `cursor/software-completion-c293`  
Environment: isolated local (`BUZZARD_SALES_ENABLED` unset).  
No production database.

## Commands executed this pass

| Command | Exit | Result |
| --- | --- | --- |
| `npm run test:software` | 0 | **50/50** (Vitest 5.0.3) |
| `npm run test:ai` | 0 | **58/58** (Vitest 5.0.3) |
| `npm run test:unit` | 0 | **743/743** (59 files) |
| `npm run lint` | 0 | no errors |
| `npm run typecheck` | 0 | no errors |
| `npm run build` | 0 | Next static export with postcss/sharp overrides |
| `npm run diagnostics:providers` | 0 | dry-run, attempted=false, live=0, 31 items |
| `npm run security:check` | 0 | 1 warning (eslint-config-next/braces, dev-only) |
| `npm audit --omit=dev` | 0 | **0** production vulnerabilities |
| Playwright storefront/admin | not re-run locally | last CI SUCCESS was `f4ba504` run 38161918900 — **not** this HEAD |

## What tests do not prove

Live provider auth, production SQLite, Render disk, commercial checkout, a penetration test.

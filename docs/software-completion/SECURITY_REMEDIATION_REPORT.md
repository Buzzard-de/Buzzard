# Security Remediation Report

Timestamp: 2026-10-11T17:56:00Z  
Branch: `cursor/software-completion-c293`  
This is not a penetration test.

## Targeted fix applied

| Package | Installed before | Installed after | Advisory | Why this was safe |
| --- | --- | --- | --- | --- |
| `next` (direct) | 15.5.23 | **15.5.27** | GHSA-p293-qw3h-jr36 and GHSA-2jg2-4ch7-h545 RCE ranges `<15.5.24`; cache poisoning `<15.5.27` | Patch within 15.5.x. `eslint-config-next` moved with it. Lint, typecheck, build, unit tests passed locally. |
| `eslint-config-next` (direct) | 15.5.23 | **15.5.27** | kept aligned with Next | Same minor line. |

`npm audit fix --force` was **not** used.

## Remaining advisories (honest)

| Package | Severity | Direct? | Why not patched here |
| --- | --- | --- | --- |
| `vitest` / `tinypool` | critical | vitest is direct | Fix offered is **vitest 5.0.3** (semver major). Isolated follow-up: upgrade vitest + re-run `test:unit`/`test:ai`/`test:software`. |
| `next` via bundled `postcss` / `sharp` | moderate/high | transitive through Next | Next 15.5.27 still vendors older postcss/sharp. Overriding those independently is unreviewed. |
| `eslint-config-next` via `braces`/`micromatch` | high | eslint-config-next is direct | Suggested fix is **downgrade to 14.2.35** — incompatible with Next 15. |
| `js-yaml`, `brace-expansion`, `source-map-js` | high | transitive | Dev-tool chain; not a targeted compatible bump in this task. |
| Contact time-trap | resolved in code | n/a | Hidden `_formStarted` field + server fail-closed. `security:check` now OK. |

## Controls still enforced

Sales lock, ACTIVE reject, Guardian deny, approval bind, customer tracking ownership, admin 401s, webhook fail-closed, payment UNCERTAIN, no secret values in diagnostics.

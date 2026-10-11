# Remaining Human Actions

No secret values.

1. Keep PR #425 and #426 **unmerged** until a human merge plan exists. Do not merge both as independent stacks; #426 already contains #425.
2. Supply **non-production** credentials listed by name in `EXTERNAL_CONFIGURATION_CHECKLIST.md`.
3. Approve a specific guarded read-only probe if one is ever wanted. Do not set `BUZZARD_PROVIDER_PROBE=1` or `BUZZARD_AI_LIVE_PROBE=1` in production from this task. This harness still does not open sockets.
4. Decide whether to upgrade **vitest → 5.x** (tinypool RCE) as an isolated breaking change.
5. Decide whether Next’s bundled **postcss/sharp** overrides are acceptable; do not `audit fix --force`.
6. Production Render disk: set/confirm `BUZZARD_DB_PATH` only through the operator dashboard. This task did not change production config.
7. Sales unlock and Product SoT activation remain separate human decisions. Not requested here.
8. Contact time-trap is implemented. Remaining `security:check` warning is frontend npm audit (vitest 5 / bundled postcss-sharp), not the form.

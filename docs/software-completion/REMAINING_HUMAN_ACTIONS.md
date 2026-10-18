# Remaining Human Actions

No secret values.

1. Keep PR #425 and #426 **unmerged** until a human merge plan exists. #426 already contains #425.
2. Supply **non-production** credentials listed by name in `EXTERNAL_CONFIGURATION_CHECKLIST.md`. Zero credentials are present here.
3. Approve a specific guarded read-only probe if one is ever wanted. Do not set `BUZZARD_PROVIDER_PROBE=1` in production. The harness still does not open sockets.
4. Confirm CI Node 22 (`.nvmrc`) is acceptable for test runners. Production API `engines` remain `>=20`.
5. Decide whether to wait for a braces 3.x patch or an eslint-config-next 15 line that does not pull vulnerable micromatch. Do not downgrade to eslint-config-next 14.2.35.
6. Production Render disk: follow `RENDER_STORAGE_OPERATOR.md`. Confirm `BUZZARD_DB_PATH=/var/data/buzzard.db` in the dashboard without changing it from this task.
7. Sales unlock and Product SoT activation remain separate human decisions. Not requested here.
8. A backup file on the production disk is **not** claimed. Confirm it only after authorized inspection.

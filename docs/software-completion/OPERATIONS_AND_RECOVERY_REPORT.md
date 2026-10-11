# Operations and Recovery Report

Branch: `cursor/software-completion-c293`  
Production operations were **not** exercised.

## Worker / queue

`jobQueue` + `pusat.worker`:
- Unique job ids, claim lock, `releaseStaleLocks` → RETRYING.
- `markDeadLetter` terminal.
- Financial classify `retryable:false` for payment/refund/timeout.
- Software test 38 recovers a unique `SW_RECOVERY_*` job and dead-letters it.

## Task cancel

`pusat.cancelTask` now exists. Pending tasks cancel without side effects. Repeat cancel is idempotent. Completed tasks are not cancelled.

## Memory

SQLite `core_ai_memory`. Restart proof uses isolated `BUZZARD_DB_PATH` (not `/tmp` as the durable production path). `memoryHealth().volatileFallback` is false. `productionPersistent` follows `getPersistenceInfo()` and is **false** on the local default file — that is not Render disk proof.

## Health

`/api/health` and `/api/health/software` distinguish `ready` (code + sales lock) from `liveReady` (always false here). Provider diagnostics never set `liveReady`.

## Production disk

`BUZZARD_DB_PATH` / `/var/data/buzzard.db` remain **BLOCKED_EXTERNAL_ACCESS**. This environment used `/workspace/server/data/buzzard.db` in `development_default` mode.

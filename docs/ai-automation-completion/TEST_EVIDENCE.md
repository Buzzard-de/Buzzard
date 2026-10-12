# Test Evidence

## `npm run test:ai` (2026-10-11)

```
Test Files  6 passed (6)
Tests       58 passed (58)
```

Files:

- `pusatOrchestrator.test.mjs` (7)
- `pusatMemoryGuardian.test.mjs` (7)
- `pusatApprovalExceptions.test.mjs` (6)
- `pusatAgentsAutomations.test.mjs` (15)
- `pusatWorkerIntegration.test.mjs` (5)
- `pusatMasterCompletion.test.mjs` (18) — A–Z groups

Process-restart test spawned two Node processes with `BUZZARD_DB_PATH` pointing at a temp SQLite file. Write PID ≠ read PID; same memory id and content. That is a real process boundary, not an in-process object rebuild.

## Other commands

| Command | Exit |
| --- | --- |
| `npm run lint` | 0 |
| `npm run typecheck` | 0 |
| `npm run build` | 0 |

`npm run test:unit` (full Vitest) was **not** executed. GitHub Actions for PR #425 was **not** observed in this session.

## A–Z map

| Group | Covered by |
| --- | --- |
| A-C lifecycle / idempotency / correlation | master + orchestrator |
| D timeout | master + orchestrator |
| E SQLite memory | memory tests + master |
| F process restart | master E-F (child script) |
| G-H Guardian | memory/guardian + master |
| I-J approval / hash / duplicate | approval + master |
| K retry / DLQ | exceptions + master |
| L-M worker claim isolation | master (job type `AI_TASK_ISOLATED`) |
| N-O productCore dry-run / ACTIVE reject | master |
| P validateCustoms fail-closed | master |
| Q supplier mock | master + automations |
| R order/PO | master |
| S payment/refund duplicate | master integrations |
| T customer assistant / no send | master |
| U marketplace mock | master |
| V provider errors / redact | master |
| W-X sales lock / unauthorized submit | master |
| Y no secrets in health/report | master |
| Z shipping ≠ GPS | master |

All of these tests use mocks or in-process engines. None called production APIs.

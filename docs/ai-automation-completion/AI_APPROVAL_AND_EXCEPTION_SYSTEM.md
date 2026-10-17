# Approval and Exception Systems

## Human Approval Center

Implemented in `server/lib/pusat/approval.js` on `core_approvals` (existing table + new columns).

### States

`PENDING` → `APPROVED` | `REJECTED` | `EXPIRED` | `CANCELLED` | `EXECUTION_FAILED`

### Required fields on each request

| Field | Source |
| --- | --- |
| Request ID | `core_approvals.id` |
| Task ID | `task_id` |
| Requesting agent | `requesting_agent` |
| Requested action | `action` |
| Business reason | `reason` |
| Input data | `metadata_json.input` |
| Expected side effects | `expected_side_effects` |
| Risk level | `risk_level` |
| Created | `created_at` |
| Expiration | `expires_at` (default 24h) |
| Decision / reviewer | `status`, `decided_by`, `decided_at` |
| Execution result | `execution_result` |

Approvals are bound to `sha256` of the canonicalized input. A material change cancels the approval (`input_changed`) and the lifecycle can open a new request. Expired pending rows are closed by `expireDue()` before decide.

Sensitive agent recommendations do **not** execute the side effect. `executeTask` only continues after `assertBound` succeeds.

Admin decide route: `POST /api/admin/approvals/:id/decide` now uses Pusat `decide` (approve / reject / cancel) and will not resume after input-change or expiry.

Tests cover approve, reject, expire, duplicate decide, and changed inputs.

## Exceptions

`server/lib/pusat/exceptions.js` + table `core_ai_exceptions`.

- Stable codes (`PUSAT_*`)
- Task id + correlation id
- Retryable vs not
- Backoff `1s / 5s / 15s`
- Retry limit (default 3)
- Dead-letter + human escalation
- Audit events

**Never auto-retried:** `payment.*`, `refund.*`, `purchase.*`, supplier order submit, marketplace publish. Classification uses both the action name and message hints.

A retry is only offered when the exception is marked retryable and under `max_retries`. Exhaustion moves the row to `DEAD_LETTER` and opens an escalation.

# AI Memory and Guardian

## Memory

**Backend:** SQLite table `core_ai_memory` in the established Buzzard database (same `db.js` path as products/orders). **Not `/tmp`.**

| Field | Purpose |
| --- | --- |
| `kind` / `classification` | `verified_fact`, `unverified_observation`, `temporary_task_state`, `derived_analysis`, `historical_record` |
| `subject` | Lookup key (e.g. `price:SKU`, `task:<id>`) |
| `content_json` | Structured payload (secrets rejected) |
| `source` + timestamps | Provenance |
| `confidence` | Optional 0–1 |
| `access_roles_json` | ACL |
| `conflict_of` | Prior record id when content diverges |
| `expires_at` | Retention |

Rejected keys include `password`, `secret`, `token`, `api_key`, `credit_card`, `iban`, `private_key`.

Access: `admin` / `administrator` / `super_admin` always; other roles must appear in `access_roles_json`.

Health: `memoryHealth()` reports `persistent: true`, `backend: "sqlite"`, `ephemeral: false`.

### Persistence evidence

Unit tests write a row and read it back with a raw `SELECT` on `core_ai_memory`. That proves the established SQLite file is the store. A full OS-level process kill/restart was **not** run in this environment. Production `/var/data/buzzard.db` was **not** migrated or probed.

If `resolveDbPath()` points at an ephemeral disk, memory will be as ephemeral as the rest of the API database. That is a hosting concern, not a second SoT.

## Guardian / Esat Bey

Local policy in `server/lib/pusat/guardian.js` runs **inside** `executeTask` before any agent or automation:

1. Agent identity
2. Active status
3. `aiCanExecute` permissions
4. Tool allow-list when the employee declares tools
5. Secret-bearing payload rejection
6. Dangerous-action regex (`refund`, `purchase`, `bypass approval`, …)
7. In-memory rate limit (60/min/agent)
8. Approval requirement for `SENSITIVE_ACTIONS` and CRITICAL priority
9. Audit via `core_system_events` + `securityLog`

Remote `BUZZARD_GUARDIAN_URL` remains an optional health signal (`guardianBridge`). It is **not** required for the local gate. If the Python service is undeployed, local Guardian still protects the Node execution path.

Guardian is not disabled to make tests pass. The refund action is denied as dangerous; `prices.update` is allowed only with `requireApproval: true`.

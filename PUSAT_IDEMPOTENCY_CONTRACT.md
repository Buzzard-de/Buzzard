# ADR / Contract: AI-Task Idempotency (B8)

**Status:** Analysis only — no schema change, no migration, no implementation  
**Date:** 2026-09-26  
**Related:** `PUSAT_CONSOLIDATION_PLAN.md` §6 (prefer `payload_json` first); `PUSAT_PHASE_C_REVIEW.md` Blocker #8  

---

## 1. Where idempotency exists today (repo evidence)

| Location | Mechanism | Scope | Persistence |
|---|---|---|---|
| `server/lib/commerce/idempotency.js` + `commerce_idempotency` (`db.js` ~3729) | `withIdempotency` / `storeIdempotency` / SHA-256 `key_hash` + `scope` + TTL | Checkout / commerce handler replay | SQLite `buzzard.db` |
| `oms_order_idempotency` (`db.js` ~1811; `orderManagement.js` ~30–102) | Lookup by `idempotency_key` before `INSERT INTO oms_orders` | OMS create | SQLite |
| `finance_payment_intents.idempotency_key` (`paymentsFinance.js` ~38–41) | SELECT existing intent | Payment intents | SQLite |
| `commerce_checkouts.idempotency_key` (`checkoutService.js`) | Column on checkout row | Commerce checkout | SQLite |
| `core_job_idempotency` + `core_background_jobs.idempotency_key` (`db.js` ~3836–3856; `jobIdempotency.js`; `jobQueue.js`) | `beginOperation` unique key | Background jobs | SQLite |
| `automationEngine.js` | File-backed `wasDelivered` / `markDelivered` | Event emit | JSON deliveries file |
| `fulfillmentStore.js` | `idempotencyKey` on supplier orders | Fulfillment | JSON files |
| `pusat-ai-runtime/src/orchestrator.ts` + `storage.ts` | `store.idempotency` `Map` keyed by `input.idempotencyKey` | Pusat in-process dispatch | **In-memory only** (lost on process restart) |
| `pusatRuntimeBridge.js` ~87, ~156 | Passes / synthesizes `idempotencyKey` into Pusat `dispatch` | Bridge → Pusat Map | Not written to `core_ai_tasks` |

**`commerce_idempotency` is not used by `aiOrchestrator.js` or `controlCenter.createAiTask`.** Grep: no import of `./commerce/idempotency` from those files.

---

## 2. Where idempotency does NOT exist today

| Path | Evidence |
|---|---|
| `core_ai_tasks` schema | `db.js` 3269–3288: `id`, `payload_json`, `retry_count`, `max_retries` — **no** `idempotency_key` column, **no** unique index on payload |
| `controlCenter.createAiTask` | Always `newId("task")` + `INSERT`; **no** lookup of existing `payload_json` (`controlCenter.js` ~254–296) |
| `aiOrchestrator.processTask` / `enqueueTaskProcessing` | Retries **same** `taskId` via `retry_count`; **no** client key; `setImmediate` can enqueue `processTask` again on approval (`resumeAfterApproval`) |
| `orchestratorBridge.fetchOrchestrator` | HTTP client; 8s abort; **no** idempotency header or body field |
| `productAi.js` ~108–117 | `POST /tasks` with `task_type: product_enrichment` only; **no** idempotency key; `.catch(() => {})` |
| `categoryIntelligence.js` ~61–70 | `POST /tasks` `category_intelligence`; **no** key |
| Python `Orchestrator.create_task` | Always `task_id = new_id("task")` (`buzzard_orchestrator.py` ~576–578); new row per POST |
| Cross-system (Node `core_ai_tasks` ↔ Python `tasks`) | Separate DBs; **no** shared key |

---

## 3. Which systems can dispatch the same logical AI work more than once?

1. **Admin UI twice:** `POST /api/admin/ai/tasks` → two `createAiTask` → two `enqueueTaskProcessing` (`controlCenterPlugin.js`).
2. **productAi + categoryIntelligence:** every enrichment/analysis call `POST`s a new Python task if `BUZZARD_ORCHESTRATOR_URL` is set.
3. **Python retries:** `fail_or_retry` re-queues **same** Python `task_id` (`buzzard_orchestrator.py` ~901–920) — same row, not a second create; **new POSTs** still create new IDs.
4. **Pusat + future Facade + `createAiTask` + `fetchOrchestrator`:** if Phase C wired all three without a shared key, one user action could create: in-memory Pusat result + `core_ai_tasks` row + Python `tasks` row.
5. **`enqueueTaskProcessing` twice on same `taskId`:** no mutex in `aiOrchestrator.js`; concurrent `processTask` on the same row is possible (retry increment race).

---

## 4. How `core_ai_tasks` are uniquely identified today

- **Primary key:** `id` TEXT (`task_` + hex from `newId("task")`).
- **No** unique business key.
- `payload_json` is opaque TEXT JSON; `createAiTask` stores `JSON.stringify(payload || {})` without reading `payload.idempotencyKey`.
- Status uniqueness: none (many `PENDING` rows allowed).

---

## 5. Can `payload_json.idempotencyKey` be used safely without schema change?

**Yes, as a contract — with limits.**

- SQLite can query `json_extract(payload_json, '$.idempotencyKey')` **without** `ALTER TABLE` (application SQL only).
- **Not unique at DB level:** two parallel INSERTs can both see “no row” and both insert (TOCTOU).
- Empty/missing key: `createAiTask` today still succeeds — contract must **require** the key at facade layer.
- Synthesized keys in `pusatRuntimeBridge.js` (`${action}:${correlationId}:${payload slice}`) change if `correlationId` is new per request → **not** stable across retries unless caller passes a stable key.
- JSON size / escaping: must store a single string field; do not rely on truncated payload slice as the durable key.

**Safe use:** Facade **before** `createAiTask`: `SELECT id, status FROM core_ai_tasks WHERE json_extract(payload_json, '$.idempotencyKey') = ?`. If found, return existing task (replay). Then insert with `payload.idempotencyKey` set. Accept rare race until a unique index exists (Option B, later ADR).

---

## 6. Where the dedupe check must live

| Layer | Should check? | Why |
|---|---|---|
| **Future `orchestrationFacade` / before `createAiTask`** | **Yes — SoT check** | Only place that writes `core_ai_tasks` |
| `controlCenter.createAiTask` | **Yes (defense in depth)** | All current admin creates go here |
| `aiOrchestrator.processTask` | **No new create** | Operates on existing `taskId`; retries same row |
| `pusatRuntimeBridge` | Pusat Map only | Does not persist Buzzard tasks today |
| `orchestratorBridge` | **Pass-through only** | If delegating to Python, send **same** key in body; do not invent a second Node task |
| Python `create_task` | Not SoT for Buzzard | Different DB; optional echo of key in payload only |

**Source of truth for Buzzard AI-task dedupe:** **`core_ai_tasks` in `buzzard.db`**, keyed by `payload_json.idempotencyKey` (application lookup).  
Not: Pusat `Map`, not Python `tasks`, not `commerce_idempotency`.

---

## 7. Preventing duplicate dispatch: Pusat → Facade → aiOrchestrator → Python

Recommended **single-create** flow (architecture, not implemented):

```
Caller supplies stable idempotencyKey (not derived from a new correlationId)
        ↓
Facade: lookup core_ai_tasks by json_extract(payload_json, '$.idempotencyKey')
        ↓
HIT → return existing taskId / result_json (no enqueue, no Python POST)
        ↓
MISS → createAiTask({ payload: { ..., idempotencyKey, correlationId } })
        ↓
enqueueTaskProcessing(taskId)  // same row retries via retry_count
        ↓
If Python delegate: fetchOrchestrator POST once; store python task_id in payload_json.externalOrchestratorTaskId
        ↓
Pusat dispatch (if flagged): use SAME idempotencyKey; treat as specialist, not a second SoT
```

Rules:

- One Buzzard `taskId` per key.
- Python POST only if `payload.delegated_to === "python_orchestrator"` and no `externalOrchestratorTaskId` yet.
- Pusat in-memory cache is **not** the replay store after process restart; Buzzard row is.

---

## 8. Existing retry scenarios

| System | Retry behavior | Same ID? |
|---|---|---|
| `aiOrchestrator.js` | On provider fail: `retry_count++`; if `< max_retries` (default 3) status → `ASSIGNED` | Same `core_ai_tasks.id` |
| `enqueueTaskProcessing` | `setImmediate(processTask)` | Same id |
| `resumeAfterApproval` | Re-enqueues `processTask` | Same id |
| Python `fail_or_retry` | `retries++`, status `queued` | Same Python `task_id` |
| `orchestratorBridge` | Abort after 8000 ms; caller may retry HTTP | New Python task if caller POSTs again (`productAi` fire-and-forget) |
| Pusat `withTimeout` | Rejects `TASK_TIMEOUT`; cache set **after** success only (`orchestrator.ts` ~83–84) | Timeout **does not** cache; retry with same key **re-executes** agent |

---

## 9. Timeout + retry risks

- **Bridge 8s timeout** then caller retries → Python already created a task (`create_task` committed before response) → **second Python task**.
- **Pusat timeout** before `idempotency.set` → same key re-runs agent (side-effect risk if write actions ever enabled).
- **`processTask` timeout** is not a dedicated abort; provider hang can overlap a second `enqueueTaskProcessing`.
- **productAi `.catch(() => {})`** hides timeout; next enrichment POSTs another Python task.

---

## 10. Two parallel requests with the same `idempotencyKey`

| Store | Behavior |
|---|---|
| `commerce_idempotency` | `ON CONFLICT(key_hash) DO NOTHING` + read-before-write in `withIdempotency` — still a small race, unique PK reduces duplicates |
| `core_ai_tasks` today | **Both insert** — two `id`s, same payload if both include the key |
| Pusat Map | First `set` wins in one process; two Node workers = two Maps |
| Option A without unique index | Race remains; acceptable for Phase C if documented; serialize at facade (single-thread Node helps **one** process only) |

---

## 11. Solutions without migration / new DB / current schema

- **No migration / no new DB:** Option **A** — store key in existing `payload_json`; lookup via `json_extract`.
- **Works with current `core_ai_tasks` schema:** **A** only among A/B/C without `ALTER`.
- **B** and **C** require DDL (`ALTER` or `CREATE TABLE`) → migration in this repo’s terms.

Do **not** reuse `commerce_idempotency` for AI tasks: different `scope` semantics, TTL purge (`purgeExpired`), and checkout resource IDs — mixing scopes risks key collision if hashing is only `scope:key` and a caller reuses a checkout key.

Do **not** use `core_job_idempotency` as AI-task SoT: it is bound to `core_background_jobs` / operations (`jobIdempotency.js`).

---

## 12. Option comparison (repo architecture only)

### A) `payload_json.idempotencyKey` + application-layer dedupe

| | |
|---|---|
| **Repo-Evidenz** | `payload_json` already TEXT JSON; `createAiTask` already stringifies payload; Pusat/bridge already have a key field; plan forbids migration for B8 start |
| **Vorteile** | Kein `ALTER`; kein neues Table; passt zu `core_ai_tasks`; Facade kann vor INSERT prüfen |
| **Nachteile** | Kein UNIQUE; JSON-Query langsamer/ungeindexiert; Race bei Parallel-INSERT |
| **Risiken** | Fehlender Key → weiterhin Duplikate; instabiler synthetischer Key (`correlationId`) |
| **Dateien (später)** | `controlCenter.js` `createAiTask`; künftige Facade; Aufrufer müssen Key setzen |
| **Migration** | NEIN |
| **Neue DB** | NEIN |
| **Phase-C-Eignung** | **Geeignet (empfohlen)** |

### B) Neue Spalte `idempotency_key` auf `core_ai_tasks`

| | |
|---|---|
| **Repo-Evidenz** | Pattern existiert bei `core_background_jobs` (`ALTER` + unique partial index, `db.js` ~3854–3856) |
| **Vorteile** | UNIQUE möglich; schnelle Lookup |
| **Nachteile** | Schema-Change an `db.js`; widerspricht „keine Migration“ für diesen Schritt |
| **Risiken** | Deploy-Reihenfolge; bestehende NULL-Zeilen |
| **Dateien** | `server/lib/db.js` |
| **Migration** | JA |
| **Neue DB** | NEIN |
| **Phase-C-Eignung** | Später, nach ADR — **nicht** jetzt |

### C) Separate Idempotency-Tabelle

| | |
|---|---|
| **Repo-Evidenz** | `commerce_idempotency`, `oms_order_idempotency`, `core_job_idempotency` already exist for **other** domains |
| **Vorteile** | Klare Trennung; ON CONFLICT pattern copyable |
| **Nachteile** | Vierte Idempotency-Tabelle; SoT-Verwirrung mit `core_ai_tasks.id`; DDL |
| **Risiken** | Zwei Wahrheiten (Tabelle vs Task-Row) |
| **Dateien** | `db.js` + neues Lib |
| **Migration** | JA |
| **Neue DB** | NEIN (same `buzzard.db`) aber **neues Schema** |
| **Phase-C-Eignung** | Nicht nötig; **nicht** empfohlen für B8 |

---

## 13. Recommendation (evidence-based)

**A** — matches existing `payload_json`, Pusat key field, consolidation plan, and “no schema change”.  
Dedupe SoT = **`core_ai_tasks`**.  
Pusat Map + Python `tasks` = delegates only.  
Do not enable Python POST from Facade until key + `externalOrchestratorTaskId` rules exist.  
Option B is a later hardening (unique index), not a Phase-C prerequisite.

---

IDEMPOTENCY STATUS:  
SPLIT — Commerce/OMS/jobs/payments have durable keys; `core_ai_tasks` and Python `/tasks` POST do not; Pusat Map is process-local.

CURRENT STATE:  
`createAiTask` always new `id`; `productAi`/`categoryIntelligence` fire-and-forget Python creates; `aiOrchestrator` retries same `taskId` via `retry_count`; no shared cross-orchestrator key.

RECOMMENDED CONTRACT:  
A

MIGRATION REQUIRED:  
NEIN

NEW DATABASE REQUIRED:  
NEIN

PHASE C BLOCKED:  
NEIN

NO CODE CHANGES MADE  
NO DATABASE CHANGES MADE  
NO DEPLOYMENT MADE  
NO PRODUCTION ACTIVATION MADE

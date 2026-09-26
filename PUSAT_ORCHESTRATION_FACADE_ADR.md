# ADR: Phase-C Orchestration Facade

**Status:** Architecture only — no implementation, no routes, no flags enabled  
**Date:** 2026-09-26  
**Inputs:** Repository files listed below; `PUSAT_ORDER_READ_SOT_ADR.md`; `PUSAT_IDEMPOTENCY_CONTRACT.md`  
**Non-goals:** Code, migration, `PUSAT_RUNTIME_ENABLED=1`, Render changes, `pusat.db`

---

## 0. Existing pieces (repo)

| Piece | File | What it already does |
|---|---|---|
| Task processor | `server/lib/aiOrchestrator.js` | `processTask` / `enqueueTaskProcessing` / `resumeAfterApproval` on `core_ai_tasks`; retries `retry_count`; approvals via `controlCenter.createApproval` |
| Control plane | `server/lib/controlCenter.js` | `createAiTask`, `createApproval`, `decideApproval`, `recordSystemEvent`, employee RBAC helpers |
| Admin HTTP | `server/plugins/controlCenterPlugin.js` | `POST /api/admin/ai/tasks` → create + enqueue; `POST /api/admin/approvals/:id/decide` → decide + resume |
| Python HTTP client | `server/lib/orchestratorBridge.js` | `fetchOrchestrator` 8s timeout; no idempotency |
| Python service | `intelligence/buzzard_orchestrator.py` | Own SQLite `tasks` / `approvals`; `create_task` always new `task_id` |
| Public proxy | `server/plugins/orchestratorBridgePlugin.js` | `GET /api/orchestrator/status|agents|tasks` |
| Pusat bridge | `server/lib/pusatRuntimeBridge.js` | Flag `PUSAT_RUNTIME_ENABLED === "1"`; `dispatchPusatTask`; **no plugin** |
| Policy | `server/lib/pusatPolicyAdapter.js` | Read-only allowlist; writes → `createApproval`; `GET_ORDER` → `phoneAssistantService` |
| RBAC | `server/lib/rbac.js` | `ai.read` / `ai.assign` / `ai.execute` on admin role |
| Routes | `server/lib/routePermissions.js` | `POST /api/admin/ai/tasks` and `POST /api/admin/orchestration/dispatch` = `ai.assign` |
| **Facade** | `server/lib/orchestrationFacade.js` | **NOT FOUND** |

Pusat Runtime (`pusat-ai-runtime/src/orchestrator.ts`) is an **in-memory** specialist. It must not become a fourth production orchestrator (own task DB / own approval DB).

---

## A. Source of Truth / responsibility matrix

| Concern | Owner today | Facade **may** | Facade **must not** |
|---|---|---|---|
| **AI task creation** | `controlCenter.createAiTask` | Call it after idempotency miss | Invent a second task table |
| **Task persistence** | `core_ai_tasks` (`db.js`) | Pass `payload` including `idempotencyKey` | Write Python `tasks` as Buzzard SoT |
| **Task processing** | `aiOrchestrator.processTask` | Call `enqueueTaskProcessing(taskId)` | Re-implement provider/retry loop |
| **Retry** | `aiOrchestrator` `retry_count` / `max_retries` | — | Parallel `processTask` without `taskId` |
| **Human approval request** | `controlCenter.createApproval` | Via `pusatPolicyAdapter.mapHumanApprovalToControlCenter` or same API | Python `approvals` / Guardian as SoT |
| **Approval persistence** | `core_approvals` | — | New approval table / `pusat.db` |
| **Approval decision** | `controlCenter.decideApproval` + plugin | — | Auto-approve side effects |
| **Audit** | `recordSystemEvent` → `core_system_events`; `coreAudit` | Emit `pusat.audit` / `orchestration.dispatch` | Separate audit DB |
| **Correlation** | `server.js` + `correlationContext`; `req.correlationId` | Copy into payload + events | Invent a second ID scheme when `req` exists |
| **RBAC** | `globalAuthMiddleware` + `routePermissions` + `rbac.js`; AI perms on employees | Check action vs `ai.read` / `ai.assign` | New JWT/realm |
| **Idempotency (AI tasks)** | **Missing** on `createAiTask` (see idempotency contract) | **Dedupe SoT check** via `json_extract(payload_json, '$.idempotencyKey')` **before** create | New column/table; `commerce_idempotency` reuse |
| **Python delegate** | `orchestratorBridge` + `productAi` / `categoryIntelligence` | Optional **one** POST if `delegated_to=python` and no `externalOrchestratorTaskId` | Default-path Python create on every dispatch |
| **Commerce reads** | Domain libs / phone assistant | Call **existing** adapters only | Fake catalog/stock/price results |
| **Side-effect gates** | `taskRequiresApproval`, sales guards, policy adapter write block | Route writes to `createApproval` only | Execute refund/order/payment |

---

## B. Pusat role (allowed vs forbidden)

Pusat **shall** (when a future flag is on, not now):

| Allowed | Evidence / note |
|---|---|
| Voice session / persona | `pusat-ai-runtime/src/voice-session.ts` — in-memory; **not** production telephony |
| Policy / authorization pre-check | `policy.ts` + `pusatPolicyAdapter.buildAuthorizationScopes` → existing `aiCanExecute` |
| Idempotency **hint** | `orchestrator.ts` Map — **not** durable SoT |
| Correlation | `dispatchPusatTask` binds `req.correlationId` |
| Adapter / specialist behind facade | Dynamic import of `pusat-ai-runtime/dist` |
| Read-only domain access | Only through Buzzard adapters (`executeReadOnlyBuzzardAction`) |

Pusat **shall not**:

- Persist `core_ai_tasks` / `core_approvals` / orders / payments
- Own production approval store
- Replace `aiOrchestrator.processTask`
- Be a fourth production orchestrator (no `pusat.db`, no Render service)
- Treat in-memory Map as replay after restart
- Implement fake commerce reads

---

## C. Orchestrator boundaries

```
Caller (future admin route or internal)
        ↓
[Flag OFF] → stop (no-op / 503 disabled)     ← default
        ↓
orchestrationFacade.js   (NOT FOUND today — planned entry)
  • require stable idempotencyKey
  • lookup core_ai_tasks
  • classify action (read vs write vs NOT_IMPLEMENTED)
  • GET_ORDER → existing Buzzard read adapter
  • write → createApproval only
  • miss → createAiTask + enqueueTaskProcessing
  • optional: dispatchPusatTask (PUSAT_RUNTIME_ENABLED — stays 0)
  • optional: fetchOrchestrator if explicitly delegated
        ↓
controlCenter.createAiTask / createApproval / recordSystemEvent
        ↓
aiOrchestrator.enqueueTaskProcessing → processTask
        ↓
(optional) orchestratorBridge.fetchOrchestrator → Python
        ↓
buzzard_orchestrator.py   specialist only; own DB is NOT Buzzard SoT
```

| Component | Production? | Role |
|---|---|---|
| Pusat Runtime | Not on `main`; flag off | Optional specialist **inside** facade, never the public face |
| `orchestrationFacade` | Does not exist | **Single new entry** — compose, do not own loops/DBs |
| `aiOrchestrator` | Yes (`buzzard-api`) | **Only** processor for `core_ai_tasks` |
| `controlCenter` | Yes | Persist tasks/approvals/events |
| `orchestratorBridge` | Yes if URL set | Transport to Python |
| Python orchestrator | Yes (`buzzard-orchestrator`) | Specialist queue; **not** approval SoT for Buzzard commerce/AI admin |

**Fourth orchestrator forbidden:** no new FastAPI/Node service, no Pusat task table.

---

## D. Human approval

```
Pusat / facade write or APPROVAL_CLASS action
        ↓
pusatPolicyAdapter.mapHumanApprovalToControlCenter
        ↓
controlCenter.createApproval(...)
        ↓
INSERT core_approvals (PENDING)
        ↓
Admin POST /api/admin/approvals/:id/decide  (existing)
        ↓
decideApproval → resumeAfterApproval(taskId) if linked
```

- SoT: **`core_approvals` only** for this path.  
- Python `GET /approvals` and Guardian `/approvals/*` remain **other** systems (already in production); facade **must not** write them for Pusat/commerce gates.  
- `createApproval` with `taskId: null` is already used by the policy adapter — decide then **does not** resume a task; facade should pass `taskId` when a `core_ai_tasks` row exists.

---

## E. Idempotency (from `PUSAT_IDEMPOTENCY_CONTRACT.md`)

- **Contract:** `payload_json.idempotencyKey` — **A**  
- **No** new column, **no** new table, **no** `commerce_idempotency` for AI tasks  
- **Dedupe location:** **facade first**, then optionally `createAiTask` defense-in-depth  
- **Lookup:** `json_extract(payload_json, '$.idempotencyKey')` on `core_ai_tasks`  
- **HIT:** return existing `taskId` / `result_json` / approval ids — **no** second enqueue, **no** Python POST  
- **Caller must send a stable key** (not `action:newCorrelationId:payloadSlice`)  
- **SoT for AI-task dedupe:** `core_ai_tasks` in `buzzard.db`  
- Pusat Map + Python new `task_id` per POST are **not** the contract store  

Duplicate prevention across the chain: one Buzzard task per key; Python only if `delegated_to` + empty `externalOrchestratorTaskId`; Pusat uses the **same** key.

---

## F. Task lifecycle vs existing owners

| Step | Existing owner | Facade |
|---|---|---|
| **REQUEST** | Future plugin (not built) | `dispatch(req, body)` |
| **AUTH** | `wrapRouteHandler` + admin session (`controlCenterPlugin` pattern) | Assume identity present; do not reimplement login |
| **IDEMPOTENCY** | **None** on AI tasks today | **Required** lookup/create gate |
| **TASK CREATE** | `createAiTask` | Call only on miss |
| **TASK PROCESS** | `enqueueTaskProcessing` → `processTask` | Call once per new task |
| **APPROVAL** | `createApproval` / `taskRequiresApproval` / policy adapter | Writes only here |
| **RESULT** | `result_json` on task; adapter return for GET_ORDER | Compose response |
| **AUDIT** | `recordSystemEvent`, `logAuditFromRequest` | Dispatch + replay events |

---

## G. Read-only Phase-C MVP

| Action | Real Buzzard adapter today | Facade behavior |
|---|---|---|
| **GET_ORDER** | `pusatPolicyAdapter.executeReadOnlyBuzzardAction` → `phoneAssistantService.getVerifiedOrderStatus` → **`orders.json`** (`PUSAT_ORDER_READ_SOT_ADR.md`) | **Only** implemented read. Document SoT = JSON **interim**; target later = `orderManagement.getOrderByNumber` (**B**), without changing Phone routes in this ADR |
| CHECK_AVAILABILITY | **NOT FOUND** in adapter | `NOT_IMPLEMENTED` |
| GET_PRODUCT | **NOT FOUND** | `NOT_IMPLEMENTED` |
| CHECK_VARIANT | **NOT FOUND** | `NOT_IMPLEMENTED` |
| IDENTIFY_CUSTOMER | **NOT FOUND** | `NOT_IMPLEMENTED` |
| CHECK_RETURN_POLICY | **NOT FOUND** | `NOT_IMPLEMENTED` |
| CHECK_PRICE | **NOT FOUND** | `NOT_IMPLEMENTED` |
| CHECK_SUPPLIER | **NOT FOUND** | `NOT_IMPLEMENTED` |

Do **not** return Pusat stub agent success as if Buzzard data were read.  
Do **not** invent stock/price/product from Pusat `agents.ts`.

---

## H. Production safety

| Rule | How the facade must behave |
|---|---|
| Feature-flag gated | e.g. `BUZZARD_ORCHESTRATION_FACADE === "1"` — **unset = OFF** (like Pusat runtime) |
| Default OFF | Plugin `register` no-ops if flag ≠ `"1"` |
| No production side effects | Writes → approval only; no OMS/payment/marketplace calls |
| `SALES_ENABLED` | Do not call `dbOrders` / checkout create; do not bypass `assertSalesEnabled` |
| No replace payment/order/marketplace | No new engines |
| No `pusat.db` | — |
| No second approval DB | `createApproval` only |
| `PUSAT_RUNTIME_ENABLED` | Stays unset in Render; facade may call bridge only if that env is `"1"` (not Phase-C activation) |

---

## I. Admin route (implemented — flag default OFF)

**Route:** `POST /api/admin/orchestration/dispatch`  
**Plugin:** `server/plugins/orchestrationFacadePlugin.js`  
**Permission:** `ai.assign` in `routePermissions.js` EXACT map.

| Topic | Binding |
|---|---|
| **RBAC** | Same family as `POST /api/admin/ai/tasks` → **`ai.assign`** |
| **Auth** | `wrapRouteHandler` + plugin `attachAdmin` / `requirePermission` |
| **Feature flag** | `BUZZARD_ORCHESTRATION_FACADE !== "1"` → HTTP `503` `{ errorCode: "ORCHESTRATION_FACADE_DISABLED" }`; no tasks |
| **Pusat** | `PUSAT_RUNTIME_ENABLED` unused/OFF; plugin does not call the Pusat bridge |
| **Request** | `{ action, idempotencyKey, payload, targetEmployeeId?, delegate? }` — MVP `delegate` omitted or `"none"` |
| **Handler** | Calls `orchestrationFacade.dispatch` only |
| **Audit** | Facade `recordSystemEvent` + plugin `logAuditFromRequest` |

No production activation. No deploy. Flag stays OFF.

`GET /api/orchestrator/*` stays the **Python proxy**, not the facade.

---

## J. Architecture decisions

1. **`orchestrationFacade.js` is:** a **composition entry** (flag, idempotency, action router, existing APIs).  
   **It is not:** a task engine, approval store, commerce engine, or fourth orchestrator.

2. **Pusat is:** optional **policy/session/specialist** behind the facade.  
   **It is not:** production SoT for tasks, approvals, orders, or auth.

3. **`aiOrchestrator.js` remains:** the **only** in-process processor (`processTask`, retry, resume after approval).

4. **Python orchestrator remains:** **specialist HTTP queue** (agents/demo/enrichment POSTs); **not** Buzzard approval/task SoT.

5. **`controlCenter` remains:** create/list/update tasks, approvals, events, employees.

6. **`core_ai_tasks` remains:** **task persistence SoT** (id + `payload_json` including idempotencyKey).

7. **`core_approvals` remains:** **human approval SoT** for this path.

8. **`core_system_events` remains:** control-plane audit stream (`recordSystemEvent`).

9. **Idempotency:** **where** — facade before `createAiTask`; **how** — `payload_json.idempotencyKey` + `json_extract` (Contract A).

10. **GET_ORDER:** **adapter now** — `phoneAssistantService.getVerifiedOrderStatus` (JSON). **SoT now** — `orders.json` (interim). **Target SoT** — `orderManagement.getOrderByNumber` / `oms_orders` (Order-Read ADR **B**), later, flag-gated, Phone route unchanged.

---

ORCHESTRATION FACADE STATUS:  
CONDITIONAL

PUSAT ROLE:  
Optional specialist / policy / voice-session — not production orchestrator

FACADE ROLE:  
Flagged composer: idempotency + action route + existing controlCenter/aiOrchestrator/adapters

AI ORCHESTRATOR ROLE:  
Sole processor of `core_ai_tasks` (retry, enqueue, resume)

PYTHON ORCHESTRATOR ROLE:  
Optional HTTP specialist; own SQLite is not Buzzard SoT

APPROVAL SOURCE OF TRUTH:  
`core_approvals` via `controlCenter.createApproval`

TASK SOURCE OF TRUTH:  
`core_ai_tasks` via `controlCenter.createAiTask`

IDEMPOTENCY CONTRACT:  
A — `payload_json.idempotencyKey` (no column, no new table)

GET_ORDER SOURCE OF TRUTH:  
Interim `orders.json` via phone assistant; target `oms_orders` via `getOrderByNumber`

PRODUCTION ACTIVATION:  
OFF

NO CODE CHANGES MADE  
NO DATABASE CHANGES MADE  
NO DEPLOYMENT MADE  
NO PRODUCTION ACTIVATION MADE

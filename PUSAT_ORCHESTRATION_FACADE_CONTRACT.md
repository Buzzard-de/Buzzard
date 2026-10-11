# CONTRACT: `orchestrationFacade.js` (Phase-C MVP)

**Status:** Binding specification — **implemented** as Buzzard composer (`server/lib/orchestrationFacade.js`). Flag default OFF. No route. No production activation.  
**Date:** 2026-09-26  
**Authority:** `PUSAT_ORCHESTRATION_FACADE_ADR.md`, `PUSAT_IDEMPOTENCY_CONTRACT.md`, `PUSAT_ORDER_READ_SOT_ADR.md`, `PUSAT_PHASE_C_REVIEW.md`  

This document is the **only** allowed behavior for a future `orchestrationFacade.js`. It does **not** authorize writing that file now.

---

## 1. Zweck der Facade

Die Facade ist ein **Kompositions-Einstieg** (composer):

- Feature-Flag prüfen (Default OFF)
- Request validieren (`action`, `idempotencyKey`)
- Application-Layer-Dedupe gegen `core_ai_tasks.payload_json.idempotencyKey`
- Action-Router (MVP: nur `GET_ORDER` ausführen; andere Reads → `NOT_IMPLEMENTED`; Writes → Approval)
- Bestehende APIs aufrufen: `controlCenter.createAiTask`, `aiOrchestrator.enqueueTaskProcessing`, `controlCenter.createApproval`, `controlCenter.recordSystemEvent`, `pusatPolicyAdapter.executeReadOnlyBuzzardAction` für `GET_ORDER`
- Response + Audit + Correlation zusammenführen

Die Facade ist **kein** Orchestrator, **kein** Task-Processor, **kein** Approval-Store, **kein** Commerce-/Payment-/Marketplace-System.

---

## 2. Input Request Schema

Normative JSON (`POST /api/admin/orchestration/dispatch` — implemented, flag default OFF):

```json
{
  "action": "GET_ORDER",
  "idempotencyKey": "string, required, stable, caller-supplied",
  "payload": {
    "orderNumber": "string",
    "email": "string",
    "postalCode": "string, optional",
    "locale": "de | en | tr | ar, optional"
  },
  "targetEmployeeId": "optional string — existing core_ai_employees.id",
  "delegate": "none"
}
```

| Field | Required | Rules |
|---|---|---|
| `action` | yes | Must be a known action string (section 4–5) |
| `idempotencyKey` | yes | Stable across retries. **Forbidden** as sole key: synthesized `action:newCorrelationId:payloadSlice` (bridge default). Min length 8. |
| `payload` | yes for GET_ORDER | Object; extra keys allowed, stored in `payload_json` |
| `targetEmployeeId` | no | If set, must exist in `core_ai_employees` (enforced by `createAiTask`) |
| `delegate` | no | MVP **must be omitted or `"none"`**. `"python"` and `"pusat"` are **out of MVP** (Idempotency ADR: no Python POST until key + `externalOrchestratorTaskId`) |

HTTP: reuse `req` from `server.js` (body already parsed). Facade function signature (future): `dispatch({ req, action, idempotencyKey, payload, targetEmployeeId, delegate })`.

---

## 3. Output Response Schema

```json
{
  "taskId": "string | null",
  "correlationId": "string",
  "status": "SUCCESS | REPLAY | BLOCKED | WAITING_APPROVAL | NOT_IMPLEMENTED | DISABLED | FAILED",
  "replay": false,
  "approvalId": "string | null",
  "result": {},
  "errorCode": "string | null",
  "errorMessage": "string | null"
}
```

| `status` | When |
|---|---|
| `DISABLED` | Facade flag ≠ `"1"` |
| `REPLAY` | Idempotency HIT; `replay: true`; `taskId` = existing |
| `SUCCESS` | GET_ORDER adapter returned `ok: true` (and task created or replayed) |
| `NOT_IMPLEMENTED` | Known read action without Buzzard adapter |
| `WAITING_APPROVAL` / `BLOCKED` | Write / approval-class / not read-only |
| `FAILED` | Validation or unexpected error from existing APIs |

`errorCode` values (closed set for MVP):  
`ORCHESTRATION_FACADE_DISABLED` | `IDEMPOTENCY_KEY_REQUIRED` | `ACTION_REQUIRED` | `ACTION_NOT_ALLOWED` | `NOT_IMPLEMENTED` | `NOT_AUTHORIZED` | `HUMAN_APPROVAL_REQUIRED` | `GET_ORDER_FAILED` | `DELEGATE_NOT_ALLOWED` | `INTERNAL_ERROR`

---

## 4. Erlaubte Actions (MVP)

| Action | Effect |
|---|---|
| `GET_ORDER` | Only real read: `executeReadOnlyBuzzardAction("GET_ORDER", payload)` |

Also **allowed as orchestration mechanics** (not domain actions):

- Create `core_ai_tasks` via `createAiTask` (after idempotency miss)
- Map human approval via `createApproval`
- Audit via `recordSystemEvent`
- Propagate `correlationId`
- Dedupe via `idempotencyKey`

---

## 5. Nicht erlaubte Actions

**Must return `NOT_IMPLEMENTED` (no Pusat stub, no fake catalog/stock/price):**

- `CHECK_AVAILABILITY`
- `GET_PRODUCT`
- `CHECK_VARIANT`
- `IDENTIFY_CUSTOMER`
- `CHECK_RETURN_POLICY`
- `CHECK_PRICE`
- `CHECK_SUPPLIER`

**Must return `ACTION_NOT_ALLOWED` or `HUMAN_APPROVAL_REQUIRED` (no domain write):**

- `CHANGE_ORDER`, `CANCEL_ORDER`, `CREATE_RETURN`, `CREATE_EXCHANGE`, `REQUEST_SUPPLIER_ACTION`
- Approval-class: `REFUND_HIGH_VALUE`, `CANCEL_HIGH_VALUE_ORDER`, `SUPPLIER_PURCHASE`, `MARKETPLACE_ORDER`, `REAL_PAYMENT_CAPTURE` (`pusatPolicyAdapter.js`)

**Unknown `action`:** `ACTION_NOT_ALLOWED`.

**`delegate` ≠ `none`:** `DELEGATE_NOT_ALLOWED` (MVP).

---

## 6. Feature-Flag-Verhalten

| Env | Behavior |
|---|---|
| `BUZZARD_ORCHESTRATION_FACADE` **≠** `"1"` (including unset) | Return immediately: `status: DISABLED`, `errorCode: ORCHESTRATION_FACADE_DISABLED`. **No** `createAiTask`, **no** approval, **no** GET_ORDER, **no** audit required beyond optional single event |
| `=== "1"` | Execute this contract |
| `PUSAT_RUNTIME_ENABLED` | **Must remain unset / not `"1"`**. Facade **must not** call `dispatchPusatTask` in MVP |

Default: **OFF**. Production Render: **do not add** these env vars.

---

## 7. RBAC-Anforderung

- Transport: `POST /api/admin/orchestration/dispatch` (`orchestrationFacadePlugin.js`), flag default OFF.
- Permission: **`ai.assign`** (same as `POST /api/admin/ai/tasks` in `routePermissions.js`).
- Identity: existing admin session (`requireAuth` / `wrapRouteHandler` / CSRF).
- Employee permissions: if `createAiTask` includes `permissionsRequired`, existing `assertAiPermissionsAllowed` / `aiCanExecute` apply.
- Facade **must not** invent a Pusat JWT or second RBAC model.

---

## 8. Correlation-ID-Verhalten

- If `req.correlationId` exists (`server.js` + `correlationContext`): **use it**.
- Else: `correlationContext.newCorrelationId()` (same helper as `pusatRuntimeBridge.resolveCorrelationId`).
- Store in `payload_json.correlationId`.
- Echo in response `correlationId` and existing response headers `X-Correlation-Id` (already set on the request).
- Do **not** replace an incoming `X-Correlation-Id`.

---

## 9. Idempotency-Verhalten

Per `PUSAT_IDEMPOTENCY_CONTRACT.md` **A**:

1. Reject missing/short `idempotencyKey` → `IDEMPOTENCY_KEY_REQUIRED`.
2. **Before** `createAiTask`:  
   `SELECT id, status, result_json, payload_json FROM core_ai_tasks WHERE json_extract(payload_json, '$.idempotencyKey') = ?`
3. **HIT:** `status: REPLAY`, `replay: true`, return existing `taskId` and stored result/approval ids from payload/result. **No** enqueue. **No** second GET_ORDER **unless** result is empty and action is GET_ORDER (optional re-read allowed; must not create a second task).
4. **MISS:** proceed; persist `idempotencyKey` inside `payload` passed to `createAiTask`.
5. No `ALTER`, no `commerce_idempotency`, no `core_job_idempotency` for this path.
6. Parallel-insert race: accepted residual risk (documented in B8 ADR).

---

## 10. Task-Erstellung

- **Only** `controlCenter.createAiTask({ title, description, employeeId, payload, createdBy, permissionsRequired })`.
- `payload` **must** include: `idempotencyKey`, `correlationId`, `action`, original `payload` fields.
- `title`: e.g. `orchestration:GET_ORDER`.
- `createdBy`: `req.adminUser.email` when present.
- Facade **must not** `INSERT INTO core_ai_tasks` itself.

---

## 11. Task-Processing

- **Only** `aiOrchestrator.enqueueTaskProcessing(taskId)` after a **new** create.
- Replay: **no** enqueue.
- Facade **must not** call `executeWithProvider`, **must not** implement `retry_count`, **must not** call `processTask` in a loop.

---

## 12. Human Approval

- **Only** `controlCenter.createApproval` (directly or via `pusatPolicyAdapter.mapHumanApprovalToControlCenter`).
- Prefer `taskId` set to the `core_ai_tasks.id` when a task exists.
- Persist **only** `core_approvals`.
- Do **not** write Python `approvals` or Guardian approvals.
- Decision remains existing `POST /api/admin/approvals/:id/decide` → `resumeAfterApproval`.

---

## 13. Audit

- **Only** `controlCenter.recordSystemEvent`.
- Suggested `eventType`: `orchestration.dispatch` | `orchestration.replay` | `orchestration.blocked` | `pusat.audit` (existing adapter type).
- Metadata: `correlationId`, `action`, `idempotencyKey`, `taskId`, `approvalId`, `errorCode`.
- Optional later: `logAuditFromRequest` — not required for the contract minimum.

---

## 14. `GET_ORDER` Adapter und Interim-SoT

Per `PUSAT_ORDER_READ_SOT_ADR.md`:

| Item | Binding |
|---|---|
| Adapter | `pusatPolicyAdapter.executeReadOnlyBuzzardAction("GET_ORDER", payload)` → `phoneAssistantService.getVerifiedOrderStatus` |
| Interim SoT | `server/data/orders.json` via `aiChatService.findOrder` |
| Target SoT (not MVP) | `orderManagement.getOrderByNumber` / `oms_orders` |
| Phone route | **Do not change** `/api/ai/phone/*` |
| If adapter `ok: false` | `status: FAILED` or `SUCCESS` with `result` = adapter body; `errorCode: GET_ORDER_FAILED` when `ok === false` |

---

## 15. Nicht implementierte Read-only Actions

For every action in section 5 `NOT_IMPLEMENTED` list:

- `status: NOT_IMPLEMENTED`
- `errorCode: NOT_IMPLEMENTED`
- **No** Pusat agent execute
- **No** fabricated product/stock/price
- **No** `createAiTask` required (optional: skip persist to avoid junk tasks; **preferred: no task row**)
- Optional audit event only

---

## 16. Fehler- und Timeout-Verhalten

| Case | Behavior |
|---|---|
| Flag off | `DISABLED` — no I/O to tasks |
| Validation | `FAILED` + specific `errorCode` |
| `createAiTask` throws | `INTERNAL_ERROR`; no silent swallow |
| GET_ORDER adapter error | `GET_ORDER_FAILED`; persist task only if already created |
| Facade **must not** set HTTP client timeouts of its own to Python | MVP has no Python call |
| Pusat timeout | N/A in MVP (bridge not called) |
| Existing `aiOrchestrator` provider failures | Handled **inside** `processTask` (`retry_count`), not by the facade |

---

## 17. Retry-Verantwortung

| Layer | Responsibility |
|---|---|
| Caller | Same `idempotencyKey` on retry |
| Facade | Replay HIT; no second processing |
| `aiOrchestrator` | **Only** owner of `retry_count` / `max_retries` / `resumeAfterApproval` |
| Facade | **No** retry queue, **no** `setInterval`, **no** job table |

---

## 18. Grenze zu `aiOrchestrator.js`

| Facade | `aiOrchestrator` |
|---|---|
| When to start work | How work runs |
| `enqueueTaskProcessing(id)` once | `processTask`, provider, retry, approval gate `taskRequiresApproval` |
| Must not select employees for execution | `selectEmployeeForTask` |

---

## 19. Grenze zum Python-Orchestrator

- MVP: **no** `fetchOrchestrator` / `POST /tasks`.
- Existing `productAi.js` / `categoryIntelligence.js` fire-and-forget **out of facade scope** (do not “fix” them in this contract).
- `GET /api/orchestrator/*` remains `orchestratorBridgePlugin` — **not** the facade.
- Python SQLite is **not** task/approval SoT.

---

## 20. Grenze zum Pusat Runtime

- MVP: **no** `dispatchPusatTask`, **no** `PUSAT_RUNTIME_ENABLED=1`.
- Policy **constants** / `executeReadOnlyBuzzardAction` / `mapHumanApprovalToControlCenter` **may** be imported (they are Buzzard Node modules, not the TS runtime).
- In-memory Pusat `Orchestrator` is **not** task SoT.

---

## 21. Grenze zu Commerce / Payments / Marketplace

Forbidden in the facade:

- `orderManagement.createOrder`, `dbOrders.createOrderFromCart*`, `commerce.orderService.createOrderFromCheckout`
- `paymentsFinance.createPaymentIntent`, `commerce.paymentService` capture/refund
- `marketplaceHub` publish/sync
- Any write that `SALES_ENABLED` would gate

Allowed: **GET_ORDER read** via the phone assistant chain only.

---

## 22. Production-Safety-Regeln

1. `BUZZARD_ORCHESTRATION_FACADE` default OFF.  
2. `PUSAT_RUNTIME_ENABLED` not `"1"`.  
3. No `pusat.db`.  
4. No second approval or task database.  
5. No own retry queue.  
6. No Python as parallel processor.  
7. No fake backends.  
8. Respect `BUZZARD_SALES_ENABLED` by not calling sales-gated writers.  
9. Do not change production voice routes.  
10. Implementation ≠ activation.

---

## Forbidden (explicit)

The facade **must not**: persist tasks/approvals/orders itself; run payments; run marketplace actions; create a retry queue; create a task DB; create `pusat.db`; use Python as a parallel `processTask`.

---

## Phase-C MVP checklist

| Allowed | Not implemented / forbidden |
|---|---|
| GET_ORDER (JSON interim SoT) | CHECK_* / GET_PRODUCT / IDENTIFY_CUSTOMER |
| createAiTask after dedupe miss | Fake adapters |
| createApproval for writes | Python/Pusat delegates |
| recordSystemEvent | Schema/migration |
| Correlation + idempotency | Production flag ON |

---

FACADE CONTRACT:  
READY

ALLOWED MVP ACTIONS:  
GET_ORDER (+ task create, approval mapping, audit, correlation, idempotency)

NOT IMPLEMENTED:  
CHECK_AVAILABILITY, GET_PRODUCT, CHECK_VARIANT, IDENTIFY_CUSTOMER, CHECK_RETURN_POLICY, CHECK_PRICE, CHECK_SUPPLIER

TASK OWNER:  
`controlCenter.createAiTask` → `core_ai_tasks`; process: `aiOrchestrator.enqueueTaskProcessing`

APPROVAL OWNER:  
`controlCenter.createApproval` → `core_approvals`

AUDIT OWNER:  
`controlCenter.recordSystemEvent` → `core_system_events`

IDEMPOTENCY OWNER:  
Facade lookup on `payload_json.idempotencyKey` (Contract A); SoT row = `core_ai_tasks`

ORDER READ:  
Interim `orders.json` via `phoneAssistantService.getVerifiedOrderStatus` / `aiChatService.findOrder`

PRODUCTION FLAG:  
OFF

CODE: `server/lib/orchestrationFacade.js` (composer only)  
NO DATABASE CHANGES MADE  
NO DEPLOYMENT MADE  
NO PRODUCTION ACTIVATION MADE

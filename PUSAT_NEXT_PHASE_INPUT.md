# PUSAT NEXT PHASE — READ-ONLY INPUT AUDIT

**Status:** Analysis only — no implementation, no flags, no deploy  
**Date:** 2026-09-26  
**Workspace HEAD:** `1fa0338` `feat(buzzard): complete guarded orchestration dispatch`  
**Branch:** `cursor/pusat-ai-runtime-foundation-c293` (not `main`)  
**Method:** Repository + existing ADRs/contracts/tests only. No invented architecture.

**Non-goals of the next phase (binding):**
- Do **not** set `PUSAT_RUNTIME_ENABLED=1` in production
- Do **not** set `BUZZARD_ORCHESTRATION_FACADE=1` in production
- Do **not** create `pusat.db`, second approval/task store, or a fourth orchestrator
- Do **not** change the production phone GET_ORDER path unless a later ADR says so

---

## 1. CURRENT VERIFIED STATE

| Item | Value | Evidence |
|---|---|---|
| Buzzard = production SoT | YES | `PUSAT_SYSTEM_HIERARCHY.md`; `render.yaml` `BUZZARD_DB_PATH=/var/data/buzzard.db` |
| Pusat = supporting only | YES | Hierarchy §2; facade does not call `dispatchPusatTask` |
| Facade implemented | YES | `server/lib/orchestrationFacade.js` |
| Admin dispatch route | YES | `server/plugins/orchestrationFacadePlugin.js` `POST /api/admin/orchestration/dispatch` |
| Route RBAC | `ai.assign` | `server/lib/routePermissions.js` EXACT line 93 |
| Facade flag | DEFAULT OFF | `isOrchestrationFacadeEnabled()` requires `=== "1"` |
| Pusat runtime flag | DEFAULT OFF | `isPusatRuntimeEnabled()` requires `=== "1"` |
| Render blueprint | Neither flag present | `render.yaml` grep: no `PUSAT_RUNTIME` / `ORCHESTRATION_FACADE` |
| On production `main` | NO | `git show main:server/lib/orchestrationFacade.js` → path not in `main` (same for plugin, `pusatRuntimeBridge.js`) |
| GET_ORDER | Implemented via phone/json adapter | `executeReadOnlyBuzzardAction` → `getVerifiedOrderStatus` |
| Other listed reads | `NOT_IMPLEMENTED` | Facade `NOT_IMPLEMENTED_READ_ACTIONS` |
| Writes via facade | Approval only, no mutation | `WRITE_SIDE_EFFECT_ACTIONS` → `createApproval` |
| Local commits (unpushed relative to prior work) | Feature branch | `1fa0338`, `3f89b28` |

**Doc inconsistency (not a new decision):** `PUSAT_ORCHESTRATION_FACADE_CONTRACT.md` header still says “No route” while §2 and the plugin implement the route. Treat the **code + later operator tasks** as current; do not silently rewrite the contract in the next phase without an explicit doc-fix task.

---

## 2. WHAT PHASE C NOW PROVIDES

| Capability | Module | Behavior | Tests |
|---|---|---|---|
| Composer | `orchestrationFacade.dispatch` | Flag, validate, RBAC `ai.assign`, correlation, `json_extract` idempotency, action router | `orchestrationFacade.test.mjs` (20) — verified |
| HTTP entry | `orchestrationFacadePlugin.handleDispatch` | Calls facade only; 503 when disabled | `orchestrationDispatchRoute.test.mjs` — verified |
| GET_ORDER | `pusatPolicyAdapter.executeReadOnlyBuzzardAction` | Real phone/json read; no fake order | Facade tests 4–5 — verified |
| Unmapped reads | Facade | `NOT_IMPLEMENTED`, no task row | Facade test 6 — verified |
| Writes | Facade + `controlCenter.createApproval` | `WAITING_APPROVAL` / `HUMAN_APPROVAL_REQUIRED` | Facade tests 8, 18 — verified |
| Tasks | `controlCenter.createAiTask` → `core_ai_tasks` | GET_ORDER stores adapter result via `updateTaskStatus`; **no** `enqueueTaskProcessing` | Facade test 9 — verified |
| Audit | `recordSystemEvent` + `logAuditFromRequest` | `orchestration.*` events | Facade test 10 — verified |
| Correlation | `req.correlationId` or `correlationContext.newCorrelationId` | Stored in `payload_json` | Facade test 11 — verified |
| Delegates | Facade | `python` / `pusat` → `DELEGATE_NOT_ALLOWED` | Facade test 20 — verified |

Phase C does **not** provide: production activation, OMS order read, product/stock/price adapters, voice-path change, Pusat processor in the request path, Python as facade processor.

---

## 3. EXISTING PUSAT CAPABILITIES

| Piece | Path | Function | Current behavior | Tests |
|---|---|---|---|---|
| Runtime factory | `pusat-ai-runtime/src/index.ts` | `createPusatRuntime` | In-memory store + orchestrator + voice + 7 stub agents | `pusat-ai-runtime/tests/runtime.test.ts` — 4 tests PASS |
| In-memory orchestrator | `pusat-ai-runtime/src/orchestrator.ts` | `dispatch` / `parallel` | Policy + Map idempotency; **not** durable | Runtime tests — verified in-process only |
| Policy | `pusat-ai-runtime/src/policy.ts` | `PolicyEngine.evaluate` | Approval set matches adapter constants | Runtime refund test — verified |
| Agents | `pusat-ai-runtime/src/agents.ts` | `BaseAgent.execute` | Returns `SUCCESS` with **echoed payload** (`result: { agent, action, payload }`) — **not** Buzzard domain data | Runtime parallel GET_ORDER/CHECK_AVAILABILITY — verifies stub SUCCESS, **not** real catalog/order |
| Voice session | `pusat-ai-runtime/src/voice-session.ts` | `VoiceSessionManager` | In-memory personas (`personas.ts` DE/GB/FR/ES/IT/GR/TR/PL/CH) | Runtime persona test — verified |
| Storage / audit | `storage.ts`, `audit.ts` | Maps / arrays | Lost on process restart | Not production SoT |
| Node bridge | `server/lib/pusatRuntimeBridge.js` | `dispatchPusatTask` | Off unless `PUSAT_RUNTIME_ENABLED=1`; then loads `pusat-ai-runtime/dist/src/index.js` | `pusatRuntimeBridge.test.mjs` — disabled path verified; enabled GET_ORDER **skipped** if dist missing |
| Dist | `pusat-ai-runtime/dist/` | tsc outDir | **gitignored**; not a production artifact | Bridge cannot load runtime without a local/CI build |

**Finding:** Enabling Pusat runtime in the next phase would still execute **stub agents** unless every action is overwritten by a Buzzard adapter after dispatch (bridge already merges `buzzardRead` only when `executeReadOnlyBuzzardAction` returns non-null — today only GET_ORDER).

---

## 4. EXISTING BUZZARD ORCHESTRATION CAPABILITIES

| Piece | Path | Function | Current behavior | Tests |
|---|---|---|---|---|
| AI task processor | `server/lib/aiOrchestrator.js` | `processTask`, `enqueueTaskProcessing`, `resumeAfterApproval` | Provider loop, `retry_count`, `taskRequiresApproval` | `aiOrchestrator.test.mjs` — permissions only, not full processTask |
| Control plane | `server/lib/controlCenter.js` | `createAiTask`, `createApproval`, `decideApproval`, `recordSystemEvent` | Writes `core_*` tables | Used by facade tests against live SQLite |
| Admin AI HTTP | `server/plugins/controlCenterPlugin.js` | `POST /api/admin/ai/tasks` | create + **enqueue** (unlike facade GET_ORDER) | No dedicated facade-equivalent suite |
| Python client | `server/lib/orchestratorBridge.js` | `fetchOrchestrator` | 8s timeout; no idempotency | Out of Phase C MVP |
| Python service | `intelligence/buzzard_orchestrator.py` | `create_task` | Own SQLite; new `task_id` per POST | Production sidecar; **not** Buzzard SoT |
| Public Python proxy | `server/plugins/orchestratorBridgePlugin.js` | `GET /api/orchestrator/*` | Status/agents/tasks | Unrelated to facade |
| Guardian | `guardianBridge.js` | Approvals/health | Separate DB | Must not become facade approval SoT |

---

## 5. AVAILABLE READ ACTIONS

From `pusatPolicyAdapter.READ_ONLY_ACTIONS` (aligned with Pusat policy names):

| Action | Facade today | Real Buzzard adapter? | Existing candidate (already in repo — not wired) | Tests |
|---|---|---|---|---|
| `GET_ORDER` | Executes | YES — `phoneAssistantService.getVerifiedOrderStatus` → `aiChatService.findOrder` → `orders.json` | Target later: `orderManagement.getOrderByNumber` (`PUSAT_ORDER_READ_SOT_ADR.md`) — **not** next-phase default | Facade 4–5 PASS |
| `CHECK_AVAILABILITY` | `NOT_IMPLEMENTED` | NO | WMS/stock readers exist in commerce/WMS libs; **no adapter mapping decided** | Facade 6 PASS |
| `GET_PRODUCT` | `NOT_IMPLEMENTED` | NO | Existing readers: `productStore.getProductById`, `pimCatalog.getProductBySku`, `catalogReadService.getProductById` — **candidates only** | Facade 6 PASS |
| `CHECK_VARIANT` | `NOT_IMPLEMENTED` | NO | No dedicated mapped function in policy adapter | Facade 6 PASS |
| `IDENTIFY_CUSTOMER` | `NOT_IMPLEMENTED` | NO | Customer/auth modules exist; **no adapter mapping** | Facade 6 PASS |
| `CHECK_RETURN_POLICY` | `NOT_IMPLEMENTED` | NO | Chat copy in `aiChatService` RESPONSES.returns — **not** a policy engine | Facade 6 PASS |
| `CHECK_PRICE` | `NOT_IMPLEMENTED` | NO | Pricing/PIM fields exist; **no adapter mapping** | Facade 6 PASS |
| `CHECK_SUPPLIER` | `NOT_IMPLEMENTED` | NO | Supplier hub health exists; **no adapter mapping** | Facade 6 PASS |

**Rule already binding:** no adapter → `NOT_IMPLEMENTED`. Do not use Pusat `BaseAgent` SUCCESS echo as a product/stock/price result.

---

## 6. AVAILABLE WRITE / SIDE-EFFECT ACTIONS

From `WRITE_SIDE_EFFECT_ACTIONS` + approval class:

| Action | Facade | Domain execute | Tests |
|---|---|---|---|
| `CHANGE_ORDER`, `CANCEL_ORDER`, `CREATE_RETURN`, `CREATE_EXCHANGE`, `REQUEST_SUPPLIER_ACTION` | `WAITING_APPROVAL` + `core_approvals` | **Not executed** | Facade 18 — no `orders` row increase |
| `REFUND_HIGH_VALUE`, `CANCEL_HIGH_VALUE_ORDER`, `SUPPLIER_PURCHASE`, `MARKETPLACE_ORDER`, `REAL_PAYMENT_CAPTURE` | Same | **Not executed** | Facade 8, 18; bridge write-block tests |
| Unknown | `ACTION_NOT_ALLOWED` | No | Facade 2 |

**Next phase must not** add payment/order/marketplace writers through the facade. Existing engines remain Buzzard-owned and sales-gated (`BUZZARD_SALES_ENABLED=0` in Render).

---

## 7. EXISTING AI AGENTS / ROLES

### Buzzard `core_ai_employees` seeds (`server/core/constants.js` `DEFAULT_AI_EMPLOYEES`)

| id | Department | Permissions (seed) |
|---|---|---|
| `product_ai` | Catalog | `products.read/write`, `ai.execute` |
| `price_ai` | Commerce | `products.read`, `prices.read/update`, `ai.execute` |
| `category_ai` | Catalog | `categories.read/write`, `ai.execute` |
| `order_ai` | Operations | `orders.read/write`, `ai.execute` |
| `security_ai` | Security | `security.read/alert`, `ai.execute` |

Facade may pass `targetEmployeeId`; `createAiTask` enforces employee exists and `ai.read` on GET_ORDER tasks.

### Pusat stub agents (`agents.ts`)

`customer-ai`, `order-ai`, `product-ai`, `inventory-ai`, `supplier-ai`, `returns-ai`, `pricing-ai` — capability strings only; **not** Buzzard employees.

**Do not** merge these into a second employee table.

---

## 8. EXISTING APPROVAL FLOW

```
Write / approval-class
  → controlCenter.createApproval (taskId linked when facade created a task)
  → INSERT core_approvals PENDING
  → Admin POST /api/admin/approvals/:id/decide (ai.execute)
  → decideApproval → resumeAfterApproval(taskId) if linked
```

| Path | File | Notes | Tests |
|---|---|---|---|
| Facade writes | `orchestrationFacade.js` | `createApproval` with `taskId` | Facade 8 |
| Bridge writes | `mapHumanApprovalToControlCenter` | `taskId: null` — decide does **not** resume a task | Bridge approval tests (flaky if PENDING list ≥ 100) |
| AI orchestrator | `processTask` → `createApproval` if `requiresApproval` / CRITICAL | Separate path | Not covered by facade suite |
| Python / Guardian | Own DBs | Pre-existing; facade must not write them | N/A |

SoT for this path: **`core_approvals` only**.

---

## 9. EXISTING TASK FLOW

| Step | Owner | Facade GET_ORDER | Classic `POST /api/admin/ai/tasks` |
|---|---|---|---|
| Create | `createAiTask` | Yes, after idempotency miss | Yes |
| Persist | `core_ai_tasks` | Yes | Yes |
| Process | `aiOrchestrator.processTask` | **Not enqueued** (would overwrite read result with provider) | `enqueueTaskProcessing` |
| Retry | `retry_count` in orchestrator | N/A for GET_ORDER read | Yes |
| Dedupe | `payload_json.idempotencyKey` | Facade SELECT | **Still missing** on raw `createAiTask` |

---

## 10. EXISTING PHONE FLOW

| Route | Plugin | Service | Store | Tests |
|---|---|---|---|---|
| `POST /api/ai/phone/verify-order` | `aiAutomationPlugin.js` | `verifyOrderAccess` | `orders.json` | Phone path not in facade suite; production path unchanged |
| `POST /api/ai/phone/order-status` | same | `getVerifiedOrderStatus` | same | same |
| `POST /api/ai/phone/escalate` | same | `routeToHumanSupport` | n/a | same |

`routePermissions.js` has **no** EXACT entries for `/api/ai/phone/*` (public/plugin-level, not admin RBAC).

Consolidation plan §19 step 5 proposed wiring phone → facade. **That would change the production voice path.** Existing ADRs say do not change `/api/ai/phone/*` without a dedicated decision. **Next phase must not do this unless a new operator/ADR explicitly requires it.**

Pusat `VoiceSessionManager` is **not** on this path. `Buzzard/voice_server.py` is not in `render.yaml`.

---

## 11. EXISTING RBAC / PERMISSIONS

| Mechanism | File | Behavior | Tests |
|---|---|---|---|
| Role matrix | `server/lib/rbac.js` | `admin` has `ai.assign`; `staff` / `read_only` do not | `rbac.test.mjs` |
| Route map | `routePermissions.js` | Dispatch = `ai.assign` | `routePermissions.test.mjs` |
| Global wrap | `globalAuthMiddleware.wrapRouteHandler` | CSRF + admin auth + permission | Route tests 401/403 |
| Facade defense | `can(role, "ai.assign")` | Denies missing identity / staff | Facade 3, 12 |
| Plugin defense | `requirePermission(..., "ai.assign")` | Same family as AI tasks | Dispatch route tests |
| AI employee perms | `assertAiPermissionsAllowed` / `aiCanExecute` | Blocks `*` / `system.configure` on task create | Orchestrator permission tests |

No Pusat JWT. Facade scopes in `buildAuthorizationScopes` are unused by the facade (bridge-only).

---

## 12. EXISTING AUDIT / CORRELATION / IDEMPOTENCY

| Concern | Owner | Mechanism | Tests |
|---|---|---|---|
| Audit SoT | `controlCenter.recordSystemEvent` | `core_system_events`; types `orchestration.dispatch\|replay\|blocked`, `pusat.audit` | Facade 10 |
| File audit | `logAuditFromRequest` | `server/data/audit-log.json` from plugin | Route handler calls it |
| Correlation | `correlationContext` + `server.js` headers | `req.correlationId` / `X-Correlation-Id` | Facade 11; bridge correlation tests |
| Facade idempotency | Contract A | `json_extract(payload_json,'$.idempotencyKey')` — no unique index | Facade 7 |
| Commerce idempotency | `commerce_idempotency`, OMS, payments | **Not** reused by facade (per B8 ADR) | Out of scope |
| Pusat Map | `orchestrator.ts` | In-memory only | Runtime test 3 |
| Bridge synthesized key | `${action}:${correlationId}:payloadSlice` | **Forbidden** as sole durable key | Documented in contract |

---

## 13. WHAT IS ACTUALLY PRODUCTION-READY

Meaning: **already on `main` / Render and safe as-is**, not “Phase C complete on a feature branch.”

| Ready on production `main` | Evidence |
|---|---|
| Buzzard API, `controlCenter`, `aiOrchestrator`, `core_*` tables | `render.yaml` `buzzard-api` → `node server/server.js` |
| Admin AI tasks / approvals | `controlCenterPlugin.js` on `main` |
| Phone GET_ORDER json path | `aiAutomationPlugin` on `main` |
| Sales OFF | `BUZZARD_SALES_ENABLED=0` |
| Pusat **not** running | Flag absent; files not on `main` |

Phase C facade/route is **code-complete on the feature branch, flags OFF**, therefore **not production-activated** and **not on `main`**.

---

## 14. WHAT IS NOT PRODUCTION-READY

| Item | Why |
|---|---|
| Facade + dispatch route | Not on `main`; flag OFF even on branch |
| Pusat TS runtime | Flag OFF; dist gitignored; stub agents; in-memory SoT |
| GET_ORDER vs OMS/SQLite | Interim JSON; false negatives for DB-only orders (`PUSAT_ORDER_READ_SOT_ADR.md`) |
| Remaining read actions | No real adapters |
| Write actions | Approval records only; no fulfillment |
| Voice + facade | Phone routes not wired to facade (correct per ADR) |
| Python/Pusat delegates | `DELEGATE_NOT_ALLOWED` |
| `createAiTask` without facade | Still no idempotency |
| Merge/deploy | Process, not done |

---

## 15. BLOCKERS

Numbered. “Blocker” = must be resolved or explicitly accepted **before** that next-phase item ships.

| # | Title | Severity | File / function | Current | Evidence | Blocks |
|---|---|---|---|---|---|---|
| B1 | Phase C artifacts not on `main` | Process | feature branch vs `render.yaml` `branch: main` | Prod API cannot serve facade even if flag were set | `git show main:…` fatal | Production **use** of facade (not local next-phase coding) |
| B2 | GET_ORDER SoT ≠ SQLite/OMS | Accepted residual / product | `aiChatService.findOrder` | JSON only | Order-Read ADR §3–7 | Accurate voice/OMS parity; **not** required to add more `NOT_IMPLEMENTED` adapters |
| B3 | No real adapters for 6 reads | Scope | `executeReadOnlyBuzzardAction` returns `null` | Facade `NOT_IMPLEMENTED` | Adapter lines 115–125 | Expanding MVP actions beyond GET_ORDER |
| B4 | Pusat agents fabricate SUCCESS | Safety | `agents.ts` `BaseAgent.execute` | Echo payload | Runtime tests expect SUCCESS | Any path that returns Pusat `result` as domain truth without Buzzard adapter |
| B5 | Runtime dist not in repo | Ops | `.gitignore` `pusat-ai-runtime/dist/` | Bridge import fails without build | gitignore + skipped bridge test | `PUSAT_RUNTIME_ENABLED=1` anywhere |
| B6 | Wiring phone → facade | ADR conflict | Consolidation §19.5 vs Order-Read / facade contract | Phone unchanged | `aiAutomationPlugin.js` 596–606 | Changing production voice |
| B7 | Enabling either production flag | Operator | `render.yaml` | Flags absent | Grep empty | Production activation (forbidden) |
| B8 | Idempotency TOCTOU | Accepted residual | Facade `findTaskByIdempotencyKey` | No unique index | `PUSAT_IDEMPOTENCY_CONTRACT.md` | Parallel double-insert (accepted) |

**Confirmed start-blockers for a *safe next implementation phase* (adapters only, flags OFF):** **0**  
**Confirmed blockers for production Pusat/facade activation:** **B1, B5, B7** plus product sign-off on **B2**.  
**Confirmed blockers for expanding read actions:** **B3** (must add real adapters, not stubs).  
**Confirmed blocker for voice integration:** **B6**.

---

## 16. RISKS

| # | Risk | File | Evidence | Tests |
|---|---|---|---|---|
| R1 | Four order stores diverge | `orders.json`, `orders`, `oms_orders`, `commerce_orders` | Order-Read ADR | Documented, not unified |
| R2 | `listApprovals` LIMIT 100 hides new rows | `controlCenter.listApprovals` | Bridge tests fail when PENDING ≥ 100 | Isolation gap |
| R3 | Dual Node/Python orchestrators | `aiOrchestrator.js`, `buzzard_orchestrator.py` | Consolidation §2 | Pre-existing |
| R4 | Dual approval systems (Python/Guardian vs `core_approvals`) | bridges | Phase C review | Pre-existing |
| R5 | Contract header “No route” vs plugin | Contract vs `orchestrationFacadePlugin.js` | Stale sentence | Doc drift |
| R6 | GET_ORDER task + no enqueue vs `processTask` if someone enqueues later | `aiOrchestrator.processTask` | Would overwrite `result_json` | Not tested as negative enqueue case |
| R7 | Raw `POST /api/admin/ai/tasks` still duplicates | `controlCenterPlugin.js` | No Contract A | Gap |
| R8 | Bridge synthesized idempotency key unstable | `pusatRuntimeBridge.js` ~156 | Contract forbids as sole key | Documented |
| R9 | Shared test DB pollution | workspace `buzzard.db` | Facade write tests | afterEach reject helper |
| R10 | Feature-branch merge could deploy unused code | PR vs `main` | Implementation ≠ activation **if** flags stay off | Process |

---

## 17. DEPENDENCIES

| Next-phase item | Depends on | Must not depend on |
|---|---|---|
| More read adapters | Existing Buzzard read functions + contract `NOT_IMPLEMENTED` until wired | Pusat agent execute, new tables |
| OMS GET_ORDER | New **Order-Read** implementation ADR (target B) | Changing phone routes |
| Facade on `main` | PR merge; flags still OFF | `PUSAT_RUNTIME_ENABLED=1` |
| Optional non-prod Pusat specialist | Built `dist`, flag only in non-prod, facade still owns dispatch | Production Render env |
| Phone → facade | Explicit ADR + operator | Silent consolidation §19.5 |
| Unique idempotency index | Later schema ADR (Option B) | Migration in next phase |

---

## 18. RECOMMENDED NEXT SAFE IMPLEMENTATION BOUNDARY

Aligned with `PUSAT_CONSOLIDATION_PLAN.md` Phase 1 (“Read-only adapters”) and Phase C contract — **not** Phase 3 delegates, **not** Phase 4+ markets, **not** sales/voice activation.

**IN SCOPE (safe):**
1. One real Buzzard adapter at a time inside **existing** `executeReadOnlyBuzzardAction` (or equivalent single function), only when an **already exported** read API exists and an ADR names it.
2. Keep facade contract: no adapter → `NOT_IMPLEMENTED`; no fake SUCCESS.
3. Flags remain **OFF**; no `render.yaml` flag add.
4. Tests: adapter success / not-found / no-fake; facade regression.
5. Optional doc-only fix of stale contract header (“No route”).

**OUT OF SCOPE:**
- `PUSAT_RUNTIME_ENABLED=1` (any environment unless later operator task says non-prod only)
- `BUZZARD_ORCHESTRATION_FACADE=1` on Render
- Phone route changes
- `orders.json` → `oms_orders` migration
- Payments / marketplace / order mutation
- Python/Pusat `delegate`
- `enqueueTaskProcessing` on GET_ORDER
- New DBs / tables / unique index
- Fourth orchestrator
- Seller engine (consolidation: NOT FOUND)

**Proposed next-phase name (descriptive, not a new architecture):**  
**Phase D — additional real read-only Buzzard adapters behind the existing facade, flags still OFF.**

First adapter candidate **if and only if** a follow-up ADR picks one existing function: `GET_PRODUCT` via `pimCatalog.getProductBySku` or `catalogReadService.getProductById`. Until that ADR exists, do **not** implement (this audit does not choose).

---

## 19. EXACT FILES INVOLVED

### Read in this audit (no changes made except this document)

ADRs: `PUSAT_SYSTEM_HIERARCHY.md`, `PUSAT_ORCHESTRATION_FACADE_CONTRACT.md`, `PUSAT_ORCHESTRATION_FACADE_ADR.md`, `PUSAT_IDEMPOTENCY_CONTRACT.md`, `PUSAT_ORDER_READ_SOT_ADR.md`, `PUSAT_PHASE_C_REVIEW.md`, `PUSAT_CONSOLIDATION_PLAN.md`, `PUSAT_PHASE_C_INPUT.md`.

Code: `orchestrationFacade.js`, `orchestrationFacadePlugin.js`, `routePermissions.js`, `rbac.js`, `globalAuthMiddleware.js`, `controlCenter.js`, `aiOrchestrator.js`, `pusatPolicyAdapter.js`, `pusatRuntimeBridge.js`, `phoneAssistantService.js`, `aiChatService.js`, `correlationContext.js`, `aiAutomationPlugin.js`, `controlCenterPlugin.js`, `orchestratorBridge.js`, `constants.js` (`DEFAULT_AI_EMPLOYEES`), `render.yaml`, `pusat-ai-runtime/src/*`.

Tests: `orchestrationFacade.test.mjs`, `orchestrationDispatchRoute.test.mjs`, `routePermissions.test.mjs`, `pusatRuntimeBridge.test.mjs`, `pusat-ai-runtime/tests/runtime.test.ts`.

### Files that would **likely** need modification in the recommended next phase (adapters only)

| File | Why |
|---|---|
| `server/lib/pusatPolicyAdapter.js` | Only place `executeReadOnlyBuzzardAction` lives |
| `server/__tests__/orchestrationFacade.test.mjs` | New action: SUCCESS / NOT_IMPLEMENTED / no fake |
| Possibly `server/__tests__/orchestrationDispatchRoute.test.mjs` | HTTP 200/501 for that action |
| Optional: one existing reader import (e.g. `pimCatalog.js` / `catalogReadService.js`) | Call site only |
| Optional docs | Contract/ADR “implemented actions” list |

**Unlikely / forbidden unless new ADR:** `aiAutomationPlugin.js`, `phoneAssistantService.js`, `aiChatService.js`, `db.js`, `render.yaml`, `aiOrchestrator.js`, `pusat-ai-runtime/src/agents.ts` as domain SoT, `orchestratorBridge.js`.

---

## 20. TEST COVERAGE / GAPS

| Area | Coverage | Gap |
|---|---|---|
| Facade disabled / RBAC / GET_ORDER / NOT_IMPLEMENTED / idempotency / approval / audit / correlation | Strong | — |
| Dispatch route 401/403/503/501 | Strong | No live HTTP server + session cookie E2E |
| Pusat runtime stubs | 4 unit tests | Stub SUCCESS ≠ Buzzard data |
| Bridge disabled | Strong | Enabled GET_ORDER skipped without dist |
| `processTask` / enqueue vs GET_ORDER | None | R6 |
| Phone routes | Not in Phase C suite | Intentional |
| OMS `getOrderByNumber` as GET_ORDER | None | Correct until ADR |
| `createAiTask` admin path idempotency | None | R7 |
| Full Vitest | Pre-existing part6/7/8, part24–35; bridge listApprovals cap | Do not rewrite as next-phase work |

---

## CLOSEOUT COUNTS

**BLOCKER COUNT:** 8 listed (B1–B8).  
Of these, **0** block **starting** a flags-OFF adapter phase on the feature branch.  
**3** block production activation (B1, B5, B7).  
**1** blocks expanding reads without real adapters (B3).  
**1** blocks phone wiring (B6).  
**2** are accepted residuals (B2, B8).

**RISK COUNT:** 10 (R1–R10).

**PROPOSED NEXT-PHASE SCOPE:**  
Phase D — add **one** real read-only Buzzard adapter at a time into existing `executeReadOnlyBuzzardAction`, keep `NOT_IMPLEMENTED` otherwise, **do not** enable flags, **do not** activate Pusat, **do not** change phone GET_ORDER, **do not** migrate orders.

**LIKELY FILES TO MODIFY (next phase, after an adapter ADR):**  
`server/lib/pusatPolicyAdapter.js`, `server/__tests__/orchestrationFacade.test.mjs`, optionally `server/__tests__/orchestrationDispatchRoute.test.mjs`, optionally one existing catalog/PIM reader import, optional ADR/contract list update.

---

NEXT PHASE INPUT: READY  
PRODUCTION FLAG: OFF  
PUSAT_RUNTIME_ENABLED: OFF  
NO CODE CHANGES TO PRODUCTION MODULES (this file only)  
NO COMMIT  
NO PUSH  
NO DEPLOY  
NO PRODUCTION ACTIVATION

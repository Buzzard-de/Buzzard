# PUSAT / BUZZARD ARCHITECTURE EXPORT (READ-ONLY AUDIT)

**Audit date:** 2026-09-25  
**Workspace git branch:** `cursor/pusat-ai-runtime-foundation-c293` @ `d29e561`  
**Render production blueprint branch:** `main` (`render.yaml` → `repo` Buzzard-de/Buzzard, `branch: main`)  

**Scope:** Repository file analysis only. No production HTTP calls, no deploy, no dependency install.  
**Reference foundation (not in repo):** `/home/ubuntu/.cursor/projects/workspace/uploads/pusat_core_f46e.py`, `PUSAT_CORE_README_1db7.md`

---

## A) Repository architecture (as evidenced by files)

### High-level production topology (from `render.yaml` on `main`)

| Render service | Runtime | Start / entry | Persistent store |
|---|---|---|---|
| `buzzard-api` | Node | `node server/server.js` | SQLite `BUZZARD_DB_PATH=/var/data/buzzard.db` (persistent disk `/var/data`) |
| `buzzard-intelligence` | Docker (Python) | Dockerfile under `intelligence/` | NOT FOUND in blueprint (ephemeral container FS) |
| `buzzard-orchestrator` | Python FastAPI | `uvicorn buzzard_orchestrator:app` | SQLite `BUZZARD_DB=/tmp/buzzard_orchestrator.db` (ephemeral on free tier) |
| `buzzard-guardian` | Python FastAPI | `uvicorn buzzard_guardian_api:app` | SQLite `BUZZARD_GUARDIAN_DB=/tmp/buzzard_guardian.sqlite3` |

**API wiring (env on `buzzard-api`):** `BUZZARD_ORCHESTRATOR_URL`, `BUZZARD_GUARDIAN_URL`, `BUZZARD_INTELLIGENCE_API_URL` (from sibling Render services).  
**Sales gate:** `BUZZARD_SALES_ENABLED=0` in `render.yaml`.  
**Default payment provider (env):** `DEFAULT_PAYMENT_PROVIDER=stripe`.

### Application shape (Node API)

- **HTTP server:** `server/server.js` — minimal router; loads every `server/plugins/*Plugin.js` via `loadPlugins()` (alphabetical, with priority prefix for `productionHealthPlugin`, `storefrontBridgePlugin`, `orderAutomationPlugin`).
- **No explicit `require` of `pusatRuntimeBridge.js` in `server/server.js`** (grep: no matches).
- **Cross-cutting:** correlation IDs (`server/lib/operations/correlationContext.js`), rate limit, CSRF/RBAC via `server/lib/globalAuthMiddleware.js` + `server/lib/routePermissions.js`.

### Parallel / duplicate orchestration layers (all present in repo)

1. **Python task orchestrator (deployed service):** `intelligence/buzzard_orchestrator.py` — own SQLite, REST `/tasks`, `/approvals`, `/agents`.
2. **Node AI task orchestrator (in-process, Buzzard DB):** `server/lib/aiOrchestrator.js` — `core_ai_tasks`, approvals via `controlCenter.createApproval`.
3. **HTTP bridge to Python orchestrator:** `server/lib/orchestratorBridge.js` + `server/plugins/orchestratorBridgePlugin.js` (`/api/orchestrator/*`).
4. **Guardian (separate Python service + bridge):** `intelligence/buzzard_guardian_api.py` (referenced by `render.yaml`), `server/lib/guardianBridge.js`, `server/plugins/guardianBridgePlugin.js`.
5. **Additional Python `orchestrator.py` copies** under `intelligence/buzzard_intelligence/`, `intelligence/buzzard_ai_complete/**`, `intelligence/buzzard_ki_gesamt/**` — archive/kit trees; **not** referenced in `render.yaml` start commands.
6. **Pusat AI runtime (TypeScript, in-memory):** `pusat-ai-runtime/` — `createPusatRuntime()` with `Orchestrator`, `VoiceSessionManager`. **Present on current workspace branch; NOT on `main`** (`git show main:pusat-ai-runtime/package.json` → fatal).
7. **Phase B bridge (Node):** `server/lib/pusatRuntimeBridge.js`, `server/lib/pusatPolicyAdapter.js` — **same branch as above; NOT on `main`**. Not registered in any plugin; only referenced from tests.

### Commerce / OMS / payments (multiple paths documented in `server/plugins/README.md`)

- **SQLite canonical schema:** `server/lib/db.js` — `orders`, `products`, `carts`, marketplace tables, `core_*` control-plane tables.
- **JSON file orders (legacy/demo path):** `server/plugins/ordersPlugin.js` → `server/data/orders.json`.
- **Commerce Core (Part 8):** `server/plugins/commerceCorePlugin.js` → `server/lib/commerce/*`.
- **Order Management module:** `server/plugins/orderManagementPlugin.js` → `server/lib/orderManagement.js`.
- **Order Management V32:** `server/plugins/orderManagementV32Plugin.js` → `server/lib/orderManagementV32.js`.
- **Payments Finance:** `server/plugins/paymentsFinancePlugin.js` → `server/lib/paymentsFinance.js`.
- **Payments V36:** `server/plugins/paymentsV36Plugin.js` → `server/lib/paymentsV36.js`.

### Voice

- **Buzzard Intelligence Voice UI (Flask):** `Buzzard/voice_server.py` — local/intelligence stack, not declared in `render.yaml`.
- **Customer phone / order lookup API:** `server/lib/phoneAssistantService.js` exposed via `server/plugins/aiAutomationPlugin.js`.
- **Pusat voice sessions (in-memory TS):** `pusat-ai-runtime/src/voice-session.ts` — not wired to production API.

---

## B) Component inventory (path, role, consumer)

### 1. Pusat / Buzzard Orchestrator

| Path | File | Role | Used by |
|---|---|---|---|
| `intelligence/buzzard_orchestrator.py` | buzzard_orchestrator.py | Python FastAPI AI task orchestrator; SQLite tasks/agents/approvals/audit | Render `buzzard-orchestrator`; Node `orchestratorBridge.js` → `/api/orchestrator/*` |
| `intelligence/deploy/Dockerfile.orchestrator` | Dockerfile.orchestrator | Docker build for orchestrator variant | NOT FOUND in `render.yaml` (Render uses `buildCommand` + uvicorn on `buzzard_orchestrator.py`) |
| `server/lib/aiOrchestrator.js` | aiOrchestrator.js | Node in-process AI task processor (`core_ai_tasks`) | `server/plugins/controlCenterPlugin.js` (`enqueueTaskProcessing`, `resumeAfterApproval`) |
| `server/lib/orchestratorBridge.js` | orchestratorBridge.js | HTTP client to Python orchestrator | `controlCenter.js` (status), `orchestratorBridgePlugin.js` |
| `server/plugins/orchestratorBridgePlugin.js` | orchestratorBridgePlugin.js | Routes `/api/orchestrator/status`, `/agents`, `/tasks` | Loaded by `server/server.js` plugin loader |
| `server/lib/pusatRuntimeBridge.js` | pusatRuntimeBridge.js | Feature-flagged bridge to `pusat-ai-runtime` dist | **Only** `server/__tests__/pusatRuntimeBridge.test.mjs` (no plugin wiring) |
| `pusat-ai-runtime/src/orchestrator.ts` | orchestrator.ts | In-memory Pusat orchestrator + policy/exceptions | `pusat-ai-runtime/src/index.ts` → bridge when flag ON |
| `pusat-ai-runtime/dist/src/orchestrator.js` | orchestrator.js | Compiled orchestrator | Dynamic `import()` from bridge |
| `intelligence/buzzard_intelligence/orchestrator.py` | orchestrator.py | Alternate intelligence orchestrator | NOT FOUND in Render start commands |
| `intelligence/buzzard_ai_complete/**/orchestrator.py` | orchestrator.py (many) | Kit/archive orchestrators | NOT FOUND as production entry |
| `docs/ORCHESTRATOR_DE.md` | ORCHESTRATOR_DE.md | Documentation | Human / ops |
| **PusatOrchestrator** (symbol name) | — | — | **NOT FOUND** (class is `Orchestrator` in TS; Python uses `WorkflowEngine` / task orchestrator classes in `buzzard_orchestrator.py`) |

### 2. Runtime / Voice

| Path | File | Role | Used by |
|---|---|---|---|
| `server/lib/pusatRuntimeBridge.js` | pusatRuntimeBridge.js | Phase B runtime dispatch | Tests only (see above) |
| `server/lib/pusatPolicyAdapter.js` | pusatPolicyAdapter.js | Maps Pusat actions → `controlCenter`, read-only `phoneAssistantService` | `pusatRuntimeBridge.js` |
| `pusat-ai-runtime/` | package | TS runtime: storage, policy, agents, voice | Bridge + vitest |
| `pusat-ai-runtime/src/index.ts` | index.ts | `createPusatRuntime()` factory | Bridge, tests |
| `pusat-ai-runtime/src/voice-session.ts` | voice-session.ts | `VoiceSessionManager` | `createPusatRuntime()` |
| `Buzzard/voice_server.py` | voice_server.py | Flask voice UI for intelligence (8787) | Manual/local; imports `buzzard_intelligence` |
| `intelligence/buzzard_ki_gesamt/launchers/Buzzard/voice_server.py` | voice_server.py | Copy under kit tree | Duplicate / launcher |
| `server/lib/phoneAssistantService.js` | phoneAssistantService.js | Order verification for phone assistant | `aiAutomationPlugin.js`, `pusatPolicyAdapter.js` |
| `server/plugins/aiAutomationPlugin.js` | aiAutomationPlugin.js | AI chat, phone assistant routes | Plugin loader |
| **VoiceSession** | voice-session.ts | Type/class `VoiceSessionManager` / type `VoiceSession` | Pusat runtime only |

### 3. Approval / Governance

| Path | File | Role | Used by |
|---|---|---|---|
| `server/lib/controlCenter.js` | controlCenter.js | Control center: tasks, approvals, integrations, audit events | Many admin plugins; `aiOrchestrator.js`; `pusatPolicyAdapter.js` |
| `server/plugins/controlCenterPlugin.js` | controlCenterPlugin.js | `/api/admin/control-center/*` incl. `createApproval`, `decideApproval` | Plugin loader |
| `server/lib/db.js` | db.js | DDL `core_approvals`, `core_ai_tasks`, `core_system_events` | All control-center flows |
| `intelligence/buzzard_orchestrator.py` | buzzard_orchestrator.py | Separate `approvals` table + `/approvals` API | Python orchestrator service only |
| `intelligence/buzzard_guardian_api.py` | buzzard_guardian_api.py | Guardian approvals API | Guardian service (Render) |
| **ApprovalCenter** (Node module name) | — | — | **NOT FOUND** as dedicated module (functionality in `controlCenter.js`) |
| **createApproval** | controlCenter.js | Inserts `core_approvals` | `controlCenterPlugin`, `aiOrchestrator`, `pusatPolicyAdapter` |
| **core_approvals** | db.js | SQLite table | `controlCenter.js` |

### 4. Commerce Core

| Path | File | Role | Used by |
|---|---|---|---|
| `server/plugins/commerceCorePlugin.js` | commerceCorePlugin.js | `/api/commerce/*` cart, checkout, readiness | Plugin loader when `isCommerceCoreEnabled()` |
| `server/lib/commerce/index.js` | index.js | Exports cart, checkout, order, payment services | `commerceCorePlugin.js` |
| `server/lib/commerce/cartService.js` | cartService.js | Cart operations | Commerce API |
| `server/lib/commerce/checkoutService.js` | checkoutService.js | Checkout flow | Commerce API |
| `server/lib/commerce/orderService.js` | orderService.js | Order service (commerce layer) | Commerce API |
| `server/lib/commerce/paymentService.js` | paymentService.js | Payment service (commerce layer) | Commerce API |
| `server/plugins/pimCatalogPlugin.js` / `pimCorePlugin.js` | plugins | PIM / catalog APIs | Admin / catalog |
| `server/plugins/orderManagementPlugin.js` | orderManagementPlugin.js | OMS-style `/api/order-management/*` | Admin OMS |
| `server/lib/orderManagement.js` | orderManagement.js | OMS logic | Plugin |
| `server/plugins/orderManagementV32Plugin.js` | orderManagementV32Plugin.js | V32 OMS extension | Plugin |
| `server/lib/wmsInventory.js` | wmsInventory.js | WMS / inventory | `wmsInventoryPlugin.js` |
| `server/plugins/wmsInventoryPlugin.js` | wmsInventoryPlugin.js | Inventory API | Plugin |
| `server/lib/paymentsFinance.js` | paymentsFinance.js | Payment intents, finance | `paymentsFinancePlugin.js` |
| `server/plugins/supplierHubPlugin.js` | supplierHubPlugin.js | Supplier hub admin | Plugin |
| `server/lib/supplier/*.js` | adapters | Supplier connectors (mock, CSV, API, dry-run) | Supplier hub / import |
| `server/lib/returnRecovery.js` / returns plugins | — | Returns RMA | `returnsRmaPlugin.js` (pattern) |
| **Product Engine** (named module) | — | — | **NOT FOUND** as `product-engine` path; closest: PIM + `products` table + `commerce` + catalog JSON |
| **Pricing Engine** (named module) | — | — | **NOT FOUND** dedicated; `server/lib/commerce/taxProvider.js`, coupons, PIM pricing fields |
| **Customer Engine** (named module) | — | — | **NOT FOUND**; `customerAuth`, `customerAccountPlugin`, CRM plugins |

### 5. Marketplace

| Path | File | Role | Used by |
|---|---|---|---|
| `server/lib/marketplaceHub.js` | marketplaceHub.js | Channel enable, sync jobs (Amazon, eBay seeded) | `marketplaceHubPlugin.js` |
| `server/lib/db.js` | db.js | `marketplace_channels`, listings, orders, SKU maps | Seeded: `amazon`, `ebay`, `google_shopping`, `tiktok_shop` |
| `server/plugins/marketplaceHubPlugin.js` | marketplaceHubPlugin.js | Marketplace hub API | Plugin |
| `server/lib/marketplaceV35.js` | marketplaceV35.js | Generic `mkt35_records` / jobs | `marketplaceV35Plugin.js` |
| `server/plugins/marketplaceV35Plugin.js` | marketplaceV35Plugin.js | `/api/marketplace-v35/*` | Plugin |
| **Kaufland / OTTO / Allegro / bol.com / Cdiscount / eMAG / Skroutz** | — | — | **NOT FOUND** under `server/` (grep) |

### 6. Market / Country / i18n

| Path | File | Role | Used by |
|---|---|---|---|
| `data/buzzard_europe_countries.json` | buzzard_europe_countries.json | Europe country data | Storefront / localization (consumers vary) |
| `server/lib/internationalV37.js` | internationalV37.js | `int37_records` CRUD / jobs | `internationalV37Plugin.js` |
| `server/plugins/internationalV37Plugin.js` | internationalV37Plugin.js | International module API | Plugin |
| `server/plugins/localizationFeedsPlugin.js` | localizationFeedsPlugin.js | Feeds, merchant XML | Plugin |
| `server/lib/localizationFeeds.js` | localizationFeeds.js | Google merchant feed builder | Localization |
| **global_countries_35** (file/symbol) | — | — | **NOT FOUND** in `data/` or `server/` |
| VAT/tax | `server/lib/commerce/taxProvider.js` | Tax calculation abstraction | Commerce core |
| Currency | orders/commerce fields | `currency` columns / request bodies | Checkout, DB |

### 7. Payment / Banking

| Path | File | Role | Used by |
|---|---|---|---|
| `server/lib/paymentsFinance.js` | paymentsFinance.js | Payment methods, intents | Admin finance plugin |
| `server/lib/paymentsV36.js` | paymentsV36.js | V36 payment records | `paymentsV36Plugin.js` |
| `server/lib/commerce/paymentService.js` | paymentService.js | Commerce-layer payments | Commerce core |
| `server/lib/paymentVerification.js` | paymentVerification.js | Providers: paypal, stripe, klarna, sepa | `ordersPlugin.js` |
| `render.yaml` | env | `STRIPE_*`, `PAYPAL_*`, `DEFAULT_PAYMENT_PROVIDER=stripe` | Production config |
| **EBICS** | — | — | **NOT FOUND** in `server/` |
| **SEPA** | ordersPlugin / paymentVerification | Valid payment method string `sepa` | Checkout validation only (no EBICS connector found) |
| Supplier payment / payout | partial in finance plugins | **NOT FOUND** dedicated EBICS/bank connector in repo |

### 8. Seller / Partner

| Path | File | Role | Used by |
|---|---|---|---|
| `server/lib/reviewsRatings.js` | reviewsRatings.js | `authorType` may be `seller` | Reviews module |
| `server/lib/storefront/merchantFeedService.js` | merchantFeedService.js | Google Merchant feed | Storefront / SEO |
| **multi-vendor / commission module** | — | — | **NOT FOUND** in `server/lib` (no seller engine tables found in quick inventory) |

### 9. Database

| Path | Role | Tables / notes |
|---|---|---|
| `server/lib/db.js` | Primary schema + migrations | `orders`, `products`, `users`, `core_approvals`, `core_ai_tasks`, marketplace, many `*_v3x` module tables |
| `server/lib/dbPaths.js` | Resolves `BUZZARD_DB_PATH` | Production: `/var/data/buzzard.db` per `render.yaml` |
| `server/plugins/databasePlugin.js` | SQLite-backed auth, carts, orders API | Uses `orders` table |
| `intelligence/buzzard_orchestrator.py` | Separate SQLite | `tasks`, `approvals`, `audit_log`, `agents` |
| `intelligence/buzzard_ai_guardian_max.py` | Guardian DB | Separate approvals/incidents (via guardian API) |
| **pusat.db / PUSAT_DB** | — | **NOT FOUND** in repository (only in upload `pusat_core_f46e.py`) |

### 10. Security

| Path | Role |
|---|---|
| `server/lib/globalAuthMiddleware.js` | Route wrapping, CSRF, admin auth |
| `server/lib/auth.js` / `server/lib/dbAuth.js` | Sessions, JWT, admin users |
| `server/lib/rbac.js` | AI + admin permissions |
| `server/lib/routePermissions.js` | Route → permission map |
| `server/lib/security.js` | Rate limits, headers |
| `server/lib/securityLog.js` | Security event log |
| `server/lib/coreAudit.js` | Audit logging helper |
| `server/lib/environmentValidation.js` | Production startup validation |
| `render.yaml` | `JWT_SECRET` generate, `BUZZARD_CSRF_ENFORCE=1`, Redis rate limit |

---

## C) Full or structured file contents

### C.1 `server/lib/aiOrchestrator.js` (complete, 172 lines)

```javascript
/**
 * Central AI task orchestrator — coordinates employees, permissions, retries, approvals.
 */

const { db } = require("./db");
const controlCenter = require("./controlCenter");
const { executeWithProvider, getActiveProvider } = require("./aiProviders");
const { TASK_STATUS, TASK_PRIORITY, RISK_LEVEL, AI_EMPLOYEE_STATUS } = require("../core/constants");
const { aiCanExecute } = require("./rbac");

function parseJson(val, fallback = {}) {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function priorityWeight(priority) {
  const map = { CRITICAL: 4, HIGH: 3, NORMAL: 2, LOW: 1 };
  return map[priority] || 2;
}

function selectEmployeeForTask(task) {
  if (task.employee_id) {
    return controlCenter.getAiEmployee(task.employee_id);
  }
  const required = parseJson(task.permissions_required_json, []);
  const employees = controlCenter.listAiEmployees().filter((e) => e.status === AI_EMPLOYEE_STATUS.ACTIVE);
  const eligible = employees.filter((emp) =>
    required.every((perm) => aiCanExecute(emp.permissions, perm))
  );
  if (!eligible.length) return null;
  eligible.sort((a, b) => b.priority - a.priority || priorityWeight(task.priority) - priorityWeight(task.priority));
  return eligible[0];
}

function taskRequiresApproval(task) {
  const payload = parseJson(task.payload_json, {});
  return Boolean(payload.requiresApproval) || task.priority === TASK_PRIORITY.CRITICAL;
}

async function processTask(taskId) {
  const row = db.prepare("SELECT * FROM core_ai_tasks WHERE id = ?").get(taskId);
  if (!row) return null;

  if (row.depends_on_task_id) {
    const dep = db.prepare("SELECT status FROM core_ai_tasks WHERE id = ?").get(row.depends_on_task_id);
    if (!dep || dep.status !== TASK_STATUS.COMPLETED) {
      return controlCenter.updateTaskStatus(taskId, TASK_STATUS.PENDING);
    }
  }

  const employee = selectEmployeeForTask(row);
  if (!employee) {
    controlCenter.createEscalation({
      sourceType: "ai_task",
      sourceId: taskId,
      title: "No eligible AI employee",
      message: `Task ${row.title} has no employee with required permissions`,
      riskLevel: RISK_LEVEL.HIGH,
    });
    return controlCenter.updateTaskStatus(taskId, TASK_STATUS.FAILED, {
      error: "No eligible AI employee",
    });
  }

  const required = parseJson(row.permissions_required_json, []);
  for (const perm of required) {
    if (!aiCanExecute(employee.permissions, perm)) {
      return controlCenter.updateTaskStatus(taskId, TASK_STATUS.FAILED, {
        error: `Permission denied: ${perm}`,
      });
    }
  }

  if (!row.employee_id) {
    db.prepare("UPDATE core_ai_tasks SET employee_id = ?, assigned_at = CURRENT_TIMESTAMP WHERE id = ?").run(
      employee.id,
      taskId
    );
  }

  if (taskRequiresApproval(row)) {
    controlCenter.createApproval({
      taskId,
      resourceType: "ai_task",
      resourceId: taskId,
      aiRecommendation: "Review before execution",
      reason: row.title,
      riskLevel: row.priority === TASK_PRIORITY.CRITICAL ? RISK_LEVEL.CRITICAL : RISK_LEVEL.MEDIUM,
    });
    return controlCenter.updateTaskStatus(taskId, TASK_STATUS.WAITING_APPROVAL);
  }

  controlCenter.updateTaskStatus(taskId, TASK_STATUS.RUNNING);

  const providerResult = await executeWithProvider({
    provider: getActiveProvider(),
    prompt: row.title,
    context: {
      taskId,
      employeeId: employee.id,
      payload: parseJson(row.payload_json, {}),
    },
  });

  if (!providerResult.ok) {
    const retryCount = (row.retry_count || 0) + 1;
    db.prepare("UPDATE core_ai_tasks SET retry_count = ? WHERE id = ?").run(retryCount, taskId);
    if (retryCount < (row.max_retries || 3)) {
      return controlCenter.updateTaskStatus(taskId, TASK_STATUS.ASSIGNED, {
        error: providerResult.message || providerResult.error,
      });
    }
    controlCenter.createEscalation({
      sourceType: "ai_task",
      sourceId: taskId,
      title: "AI task failed after retries",
      message: row.title,
      riskLevel: RISK_LEVEL.HIGH,
    });
    return controlCenter.updateTaskStatus(taskId, TASK_STATUS.FAILED, {
      error: providerResult.message || providerResult.error,
    });
  }

  db.prepare(`
    UPDATE core_ai_employees SET last_activity_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(employee.id);

  controlCenter.recordSystemEvent({
    eventType: "ai.task.completed",
    actorType: "ai_employee",
    actorId: employee.id,
    resourceType: "ai_task",
    resourceId: taskId,
    summary: `Task completed: ${row.title}`,
  });

  return controlCenter.updateTaskStatus(taskId, TASK_STATUS.COMPLETED, {
    result: providerResult.output,
  });
}

function enqueueTaskProcessing(taskId) {
  setImmediate(() => {
    processTask(taskId).catch((err) => {
      controlCenter.updateTaskStatus(taskId, TASK_STATUS.FAILED, { error: err.message });
      controlCenter.createEscalation({
        sourceType: "ai_task",
        sourceId: taskId,
        title: "Orchestrator error",
        message: err.message,
        riskLevel: RISK_LEVEL.CRITICAL,
      });
    });
  });
}

function resumeAfterApproval(taskId) {
  enqueueTaskProcessing(taskId);
}

module.exports = {
  processTask,
  enqueueTaskProcessing,
  resumeAfterApproval,
  selectEmployeeForTask,
};
```

### C.2 `server/lib/pusatRuntimeBridge.js` (complete)

```javascript
/**
 * Phase B — Feature-flagged bridge to compiled @pusat/ai-runtime (ESM dist only).
 * Default OFF (PUSAT_RUNTIME_ENABLED !== "1"). Does not replace Python/Node orchestrators.
 */

const path = require("path");
const { pathToFileURL } = require("url");
const policyAdapter = require("./pusatPolicyAdapter");

let runtimeModulePromise = null;
let runtimeInstancePromise = null;

function isPusatRuntimeEnabled() {
  return process.env.PUSAT_RUNTIME_ENABLED === "1";
}

/**
 * Prefer existing request correlation (middleware / X-Correlation-Id); do not invent parallel IDs when req is present.
 */
function resolveCorrelationId({ req, correlationId } = {}) {
  if (correlationId) return correlationId;
  if (req?.correlationId) return req.correlationId;
  const correlationContext = require("./operations/correlationContext");
  return correlationContext.newCorrelationId();
}

function bindRequestCorrelation(req, correlationId) {
  if (!req || !correlationId) return correlationId;
  req.correlationId = correlationId;
  if (req.operationsContext) {
    req.operationsContext.correlationId = correlationId;
  }
  return correlationId;
}

async function loadPusatRuntimeModule() {
  if (!isPusatRuntimeEnabled()) {
    throw new Error("PUSAT_RUNTIME_DISABLED");
  }
  if (!runtimeModulePromise) {
    const distPath = path.join(__dirname, "../../pusat-ai-runtime/dist/src/index.js");
    runtimeModulePromise = import(pathToFileURL(distPath).href);
  }
  return runtimeModulePromise;
}

async function getPusatRuntime() {
  if (!isPusatRuntimeEnabled()) {
    return null;
  }
  if (!runtimeInstancePromise) {
    runtimeInstancePromise = loadPusatRuntimeModule().then((mod) => mod.createPusatRuntime());
  }
  return runtimeInstancePromise;
}

function blockedResult({ correlationId, errorCode, errorMessage, extra }) {
  return {
    taskId: null,
    correlationId,
    status: "BLOCKED",
    errorCode,
    errorMessage,
    ...(extra || {}),
  };
}

/**
 * Dispatch a Pusat task through the in-memory Pusat orchestrator (stubs) with Buzzard policy/audit wiring.
 * Phase B: read-only actions only; side effects stop at bridge + controlCenter approval record.
 */
async function dispatchPusatTask(options = {}) {
  if (!isPusatRuntimeEnabled()) {
    return blockedResult({
      correlationId: resolveCorrelationId(options),
      errorCode: "PUSAT_RUNTIME_DISABLED",
      errorMessage: "Pusat runtime bridge is disabled (PUSAT_RUNTIME_ENABLED != 1).",
    });
  }

  const {
    req,
    action,
    targetAi,
    sourceAi = "voice-ai",
    payload = {},
    idempotencyKey,
    permissions = ["ai.read"],
    timeoutMs = 5000,
  } = options;

  const correlationId = bindRequestCorrelation(req, resolveCorrelationId(options));

  policyAdapter.mirrorAuditEvent({
    correlationId,
    actor: sourceAi,
    action,
    outcome: "DISPATCH_REQUEST",
    metadata: { targetAi, idempotencyKey: idempotencyKey || null },
  });

  if (!policyAdapter.isReadOnlyAction(action)) {
    let approval = null;
    if (
      policyAdapter.isWriteOrSideEffectAction(action) ||
      policyAdapter.requiresBuzzardApprovalRecord(action)
    ) {
      approval = policyAdapter.mapHumanApprovalToControlCenter({
        correlationId,
        action,
        reason: "Phase B bridge allows read-only actions only; side effects require human approval.",
        sessionId: payload?.sessionId,
        payload,
      });
    }
    policyAdapter.mirrorAuditEvent({
      correlationId,
      actor: "pusat-bridge",
      action,
      outcome: "BLOCKED",
      metadata: { reason: "not_read_only", approvalId: approval?.id || null },
    });
    return blockedResult({
      correlationId,
      errorCode: policyAdapter.requiresBuzzardApprovalRecord(action)
        ? "HUMAN_APPROVAL_REQUIRED"
        : "ACTION_NOT_ALLOWED",
      errorMessage: "Only read-only Pusat actions are permitted in Phase B.",
      extra: { approvalId: approval?.id || null },
    });
  }

  const authorizationScope = policyAdapter.buildAuthorizationScopes(action, permissions);
  if (!authorizationScope.length) {
    policyAdapter.mirrorAuditEvent({
      correlationId,
      actor: "pusat-bridge",
      action,
      outcome: "BLOCKED",
      metadata: { reason: "insufficient_permissions" },
    });
    return blockedResult({
      correlationId,
      errorCode: "NOT_AUTHORIZED",
      errorMessage: "Insufficient Buzzard AI permissions for this read-only action.",
    });
  }

  const runtime = await getPusatRuntime();
  const dispatchInput = {
    correlationId,
    sourceAi,
    targetAi: targetAi || "order-ai",
    action,
    payload,
    idempotencyKey: idempotencyKey || `${action}:${correlationId}:${JSON.stringify(payload).slice(0, 64)}`,
    authorizationScope,
    timeoutMs,
  };

  let result;
  try {
    result = await runtime.orchestrator.dispatch(dispatchInput);
  } catch (error) {
    policyAdapter.mirrorAuditEvent({
      correlationId,
      actor: "pusat-bridge",
      action,
      outcome: "FAILED",
      metadata: { error: error.message },
    });
    return blockedResult({
      correlationId,
      errorCode: "RUNTIME_ERROR",
      errorMessage: error.message,
    });
  }

  if (result.errorCode === "HUMAN_APPROVAL_REQUIRED") {
    const approval = policyAdapter.mapHumanApprovalToControlCenter({
      correlationId,
      action,
      reason: result.errorMessage,
      sessionId: payload?.sessionId,
      payload,
    });
    result = { ...result, approvalId: approval?.id || null };
  }

  const buzzardRead = await policyAdapter.executeReadOnlyBuzzardAction(action, payload);
  if (buzzardRead && result.status === "SUCCESS") {
    result = {
      ...result,
      result: {
        ...(result.result && typeof result.result === "object" ? result.result : {}),
        buzzardRead,
      },
    };
  }

  policyAdapter.mirrorAuditEvent({
    correlationId,
    actor: targetAi || "pusat-orchestrator",
    action,
    outcome: result.status,
    metadata: { taskId: result.taskId, errorCode: result.errorCode || null },
  });

  return result;
}

/** Test hook — clears cached ESM runtime */
function resetPusatRuntimeCacheForTests() {
  runtimeModulePromise = null;
  runtimeInstancePromise = null;
}

module.exports = {
  isPusatRuntimeEnabled,
  resolveCorrelationId,
  bindRequestCorrelation,
  getPusatRuntime,
  dispatchPusatTask,
  resetPusatRuntimeCacheForTests,
};
```

### C.3 `server/lib/pusatPolicyAdapter.js` (complete)

```javascript
/**
 * Phase B — Maps Pusat runtime policy/actions onto Buzzard control center, RBAC, and read-only services.
 * No parallel approval DB; no production side effects in this phase.
 */

const controlCenter = require("./controlCenter");
const { aiCanExecute } = require("./rbac");
const phoneAssistantService = require("./phoneAssistantService");
const { RISK_LEVEL } = require("../core/constants");

/** Aligned with pusat-ai-runtime/src/policy.ts APPROVAL_ACTIONS */
const APPROVAL_CLASS_ACTIONS = new Set([
  "REFUND_HIGH_VALUE",
  "CANCEL_HIGH_VALUE_ORDER",
  "SUPPLIER_PURCHASE",
  "MARKETPLACE_ORDER",
  "REAL_PAYMENT_CAPTURE",
]);

/** Phase B: only these may reach Pusat orchestrator dispatch */
const READ_ONLY_ACTIONS = new Set([
  "GET_ORDER",
  "CHECK_AVAILABILITY",
  "GET_PRODUCT",
  "CHECK_VARIANT",
  "IDENTIFY_CUSTOMER",
  "CHECK_RETURN_POLICY",
  "CHECK_PRICE",
  "CHECK_SUPPLIER",
]);

/** Blocked write/side-effect agent actions (never execute in Phase B) */
const WRITE_SIDE_EFFECT_ACTIONS = new Set([
  "CHANGE_ORDER",
  "CANCEL_ORDER",
  "CREATE_RETURN",
  "CREATE_EXCHANGE",
  "REQUEST_SUPPLIER_ACTION",
  ...APPROVAL_CLASS_ACTIONS,
]);

function isReadOnlyAction(action) {
  return READ_ONLY_ACTIONS.has(String(action || ""));
}

function isWriteOrSideEffectAction(action) {
  return WRITE_SIDE_EFFECT_ACTIONS.has(String(action || ""));
}

function requiresBuzzardApprovalRecord(action) {
  return APPROVAL_CLASS_ACTIONS.has(String(action || ""));
}

function buildAuthorizationScopes(action, permissions = []) {
  const normalized = Array.isArray(permissions) ? permissions : [];
  const scopes = [];
  if (aiCanExecute(normalized, "ai.execute") || aiCanExecute(normalized, "*")) {
    scopes.push("*");
  }
  if (isReadOnlyAction(action) && aiCanExecute(normalized, "ai.read")) {
    scopes.push(`action:${action}`);
  }
  if (requiresBuzzardApprovalRecord(action) && aiCanExecute(normalized, "system.configure")) {
    scopes.push("critical:approval");
  }
  return [...new Set(scopes)];
}

function mirrorAuditEvent({ correlationId, actor, action, outcome, metadata }) {
  controlCenter.recordSystemEvent({
    eventType: "pusat.audit",
    actorType: "pusat_runtime",
    actorId: actor || "pusat-bridge",
    resourceType: "pusat_action",
    resourceId: action || "unknown",
    summary: `Pusat ${action || "action"}: ${outcome || "UNKNOWN"}`,
    metadata: {
      correlationId: correlationId || null,
      phase: "B",
      readOnlyBridge: true,
      ...(metadata || {}),
    },
  });
}

function mapHumanApprovalToControlCenter({ correlationId, action, reason, sessionId, payload }) {
  const approval = controlCenter.createApproval({
    taskId: null,
    resourceType: "pusat_runtime",
    resourceId: correlationId || "unknown",
    aiRecommendation:
      `Pusat runtime blocked action "${action}" pending human approval. ` +
      `Session: ${sessionId || "n/a"}. No automatic side effects.`,
    reason: reason || `Pusat policy: ${action}`,
    riskLevel: RISK_LEVEL.HIGH,
  });

  mirrorAuditEvent({
    correlationId,
    actor: "pusat-policy-adapter",
    action,
    outcome: "HUMAN_APPROVAL_REQUIRED",
    metadata: { approvalId: approval?.id, sessionId, payloadKeys: payload ? Object.keys(payload) : [] },
  });

  return approval;
}

async function executeReadOnlyBuzzardAction(action, payload) {
  if (action === "GET_ORDER") {
    const body = payload && typeof payload === "object" ? payload : {};
    return phoneAssistantService.getVerifiedOrderStatus({
      orderNumber: body.orderNumber,
      email: body.email,
      postalCode: body.postalCode,
      locale: body.locale || "de",
    });
  }
  return null;
}

module.exports = {
  APPROVAL_CLASS_ACTIONS,
  READ_ONLY_ACTIONS,
  WRITE_SIDE_EFFECT_ACTIONS,
  isReadOnlyAction,
  isWriteOrSideEffectAction,
  requiresBuzzardApprovalRecord,
  buildAuthorizationScopes,
  mirrorAuditEvent,
  mapHumanApprovalToControlCenter,
  executeReadOnlyBuzzardAction,
};
```

### C.4 `server/lib/controlCenter.js` — `createApproval` / DB access

```javascript
function createApproval({ taskId, resourceType, resourceId, aiRecommendation, reason, riskLevel }) {
  const id = newId("appr");
  db.prepare(`
    INSERT INTO core_approvals(id, task_id, resource_type, resource_id, ai_recommendation, reason, risk_level, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
  `).run(id, taskId || null, resourceType || null, resourceId || null, aiRecommendation || "", reason || "", riskLevel || RISK_LEVEL.MEDIUM);

  if (taskId) {
    updateTaskStatus(taskId, TASK_STATUS.WAITING_APPROVAL);
  }

  recordSystemEvent({
    eventType: "approval.created",
    resourceType: "approval",
    resourceId: id,
    summary: `Approval requested: ${reason || resourceType}`,
    metadata: { riskLevel: riskLevel || RISK_LEVEL.MEDIUM },
  });

  return getApproval(id);
}
```

**HTTP surface:** `server/plugins/controlCenterPlugin.js` — `POST` handler calls `controlCenter.createApproval(req.body || {})`.

### C.5 `intelligence/buzzard_orchestrator.py` (structured extract; file ~1243 lines)

**Imports & config:**

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

DB_PATH = os.getenv("BUZZARD_DB", "buzzard_orchestrator.db")
MAX_RETRIES = int(os.getenv("BUZZARD_MAX_RETRIES", "3"))
DEFAULT_TIMEOUT = int(os.getenv("BUZZARD_TASK_TIMEOUT", "120"))
HUMAN_APPROVAL_THRESHOLD_EUR = float(os.getenv("BUZZARD_APPROVAL_THRESHOLD_EUR", "500"))
```

**Persistence:** class `Database` — tables `tasks`, `agents`, `approvals`, `audit_log`, dependencies, etc. (SQLite at `DB_PATH`).

**Workflow:** `WorkflowEngine`, `AgentRegistry`, simulated agent handlers.

**FastAPI routes (production-relevant):**

| Method | Path | Purpose |
|---|---|---|
| GET | `/`, `/health` | Service meta |
| GET | `/agents`, `/agents/{agent_id}` | Agent registry |
| POST | `/tasks` | Create task |
| GET | `/tasks`, `/tasks/{task_id}` | List/get |
| POST | `/tasks/{task_id}/execute` | Execute |
| POST | `/tasks/{task_id}/cancel` | Cancel |
| POST | `/tasks/{task_id}/approval` | Human decision on task |
| GET | `/approvals` | List approvals (Python DB) |
| GET | `/audit` | Audit log |
| POST | `/demo/daily-summary`, `/demo/purchase-request` | Demo endpoints |

**Deploy:** `render.yaml` → `startCommand: uvicorn buzzard_orchestrator:app --host 0.0.0.0 --port $PORT`, `BUZZARD_DB=/tmp/buzzard_orchestrator.db`.

### C.6 `Buzzard/voice_server.py` (complete, 108 lines)

```python
"""Buzzard project — Voice UI server on http://127.0.0.1:8787"""

from __future__ import annotations

import sys
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

BUZZARD_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BUZZARD_DIR.parent
INTELLIGENCE_ROOT = PROJECT_ROOT / "intelligence"
WEB_DIR = BUZZARD_DIR / "web"

if str(INTELLIGENCE_ROOT) not in sys.path:
    sys.path.insert(0, str(INTELLIGENCE_ROOT))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from urls import BUZZARD_HOST, BUZZARD_VOICE_PORT, BUZZARD_VOICE_URL
from buzzard_intelligence import CategoryDiscovery, Council, MemoryEngine, Reporter

app = Flask(__name__, static_folder=str(WEB_DIR), static_url_path="")

# ... _services(), _reply_for_message() ...

@app.get("/")
def index():
    return send_from_directory(WEB_DIR, "index.html")

@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "service": "Buzzard Voice", ...})

@app.post("/api/message")
def message():
    data = request.get_json(silent=True) or {}
    text = str(data.get("text", "")).strip()
    language = data.get("language", "de-DE")
    # ...
    reply = _reply_for_message(text, language)
    return jsonify({"ok": True, "language": language, "text": text, "reply": reply})

def main(host: str = BUZZARD_HOST, port: int = BUZZARD_VOICE_PORT) -> None:
    app.run(host=host, port=port, debug=False)
```

### C.7 `pusat-ai-runtime` main runtime files

**`pusat-ai-runtime/src/index.ts` (complete):**

```typescript
export * from "./types.js";
export * from "./storage.js";
export * from "./audit.js";
export * from "./policy.js";
export * from "./personas.js";
export * from "./exceptions.js";
export * from "./agents.js";
export * from "./orchestrator.js";
export * from "./voice-session.js";

import { AuditService } from "./audit.js";
import { CustomerAgent, InventoryAgent, OrderAgent, ProductAgent, ReturnsAgent, SupplierAgent, PricingAgent } from "./agents.js";
import { ExceptionService } from "./exceptions.js";
import { Orchestrator } from "./orchestrator.js";
import { PolicyEngine } from "./policy.js";
import { createRuntimeStore } from "./storage.js";
import { VoiceSessionManager } from "./voice-session.js";

export function createPusatRuntime() {
  const store = createRuntimeStore();
  const audit = new AuditService(store);
  const policy = new PolicyEngine();
  const exceptions = new ExceptionService(store, audit);
  const orchestrator = new Orchestrator(store, audit, policy, exceptions);
  const voice = new VoiceSessionManager(store);

  [
    new CustomerAgent(),
    new OrderAgent(),
    new ProductAgent(),
    new InventoryAgent(),
    new SupplierAgent(),
    new ReturnsAgent(),
    new PricingAgent()
  ].forEach(agent => orchestrator.register(agent));

  return { store, audit, policy, exceptions, orchestrator, voice };
}
```

**`orchestrator.ts`:** `Orchestrator.dispatch()` — idempotency cache, `PolicyEngine.evaluate`, `ExceptionService.approval` → `HUMAN_APPROVAL_REQUIRED`, agent `execute` with timeout.

**`voice-session.ts`:** in-memory sessions keyed by `sessionId`; persona from `getPersona(countryCode)`.

### C.8 Commerce Core entrypoints

**`server/lib/commerce/index.js`:**

```javascript
module.exports = {
  ...require("./commerceFeatureFlags"),
  ...require("./commerceValidation"),
  ...require("./commerceGuards"),
  cartService: require("./cartService"),
  checkoutService: require("./checkoutService"),
  orderService: require("./orderService"),
  paymentService: require("./paymentService"),
  shippingProvider: require("./shippingProvider"),
  taxProvider: require("./taxProvider"),
  commerceReadiness: require("./commerceReadiness"),
  idempotency: require("./idempotency"),
  riskEngine: require("./riskEngine"),
  webhookFoundation: require("./webhookFoundation"),
  goLiveApproval: require("./goLiveApproval"),
  legacyPimMigration: require("./legacyPimMigration"),
  productSearch: require("./productSearchAbstraction"),
};
```

**`server/plugins/commerceCorePlugin.js`:** registers `/api/health/commerce`, `/api/commerce/status`, `/api/commerce/cart*`, checkout routes when `isCommerceCoreEnabled()`.

**OMS alternate entry:** `server/plugins/orderManagementPlugin.js` → `/api/order-management/orders` → `server/lib/orderManagement.js`.

---

## D) Large-file policy

| File | Lines (approx.) | Export treatment |
|---|---|---|
| `intelligence/buzzard_orchestrator.py` | ~1243 | Structured extract (§C.5) |
| `server/lib/db.js` | ~3900+ | Schema excerpts only (`orders`, `core_approvals`, marketplace seeds) |
| `server/lib/controlCenter.js` | ~655 | `createApproval` + integration with orchestrator status |
| Upload `pusat_core_f46e.py` | ~1087 | **NOT IN REPO** — API surface listed from upload read (§F reference) |

---

## E) Production questions (evidence-based; no live probing)

| # | Question | Answer (from repo + Render blueprint on `main`) |
|---|---|---|
| 1 | **Real orchestrator in production?** | **Two deployed orchestration services:** (a) Python **`buzzard-orchestrator`** running `buzzard_orchestrator.py`; (b) Node **`aiOrchestrator.js`** inside **`buzzard-api`** for admin control-center AI tasks. They use **different databases**. Node also **proxies** Python via `BUZZARD_ORCHESTRATOR_URL`. |
| 2 | **Real database in production?** | **Primary commerce + control plane:** SQLite **`/var/data/buzzard.db`** on `buzzard-api` (`BUZZARD_DB_PATH`). **Secondary:** Python orchestrator **`/tmp/buzzard_orchestrator.db`**; Guardian **`/tmp/buzzard_guardian.sqlite3`**. |
| 3 | **Real approval system in production?** | **Admin/commerce source of truth for Buzzard API:** **`core_approvals`** via **`server/lib/controlCenter.js`** (UI/API: `controlCenterPlugin.js`). **Separate:** Python orchestrator **`approvals`** table; Guardian **`/approvals/*`** — not merged into `core_approvals` in code reviewed. |
| 4 | **Real voice system in production?** | **NOT FOUND** in `render.yaml`. Production customer voice path evidenced: **`phoneAssistantService`** + **`aiAutomationPlugin`** on `buzzard-api`. **`Buzzard/voice_server.py`** is Flask intelligence UI (local/optional). **Pusat `VoiceSessionManager`** not wired to API. |
| 5 | **Real Order/OMS in production?** | **Authoritative for persisted orders on API:** SQLite **`orders`** via **`databasePlugin.js`** / **`dbOrders`** / **`orderManagement.js`** (flags in `render.yaml` enable order modules). **Parallel:** JSON **`server/data/orders.json`** via **`ordersPlugin.js`**. Commerce Core **`orderService`** is additional layer. |
| 6 | **Real payment system in production?** | **`paymentsFinance.js`** + **`paymentsV36.js`** + commerce **`paymentService`**; env **`DEFAULT_PAYMENT_PROVIDER=stripe`** with Stripe/PayPal secrets in Render. Checkout validates **`sepa`** as method string; **no EBICS** implementation found. |
| 7 | **Phase-B bridge active now?** | **On `main` (production deploy branch):** bridge files **NOT FOUND** → inactive. **On workspace branch:** code exists but **`PUSAT_RUNTIME_ENABLED` not in `render.yaml`**, **no plugin/route wiring**, default flag OFF → **inactive**. |
| 8 | **Pusat Runtime connected to production?** | **No.** No `render.yaml` env, no HTTP routes, no `server.js` import; dynamic import only from bridge when flag=1. Package **not on `main`**. |
| 9 | **Duplicate systems?** | Orchestrator: Python service vs Node `aiOrchestrator` vs many kit `orchestrator.py` copies vs Pusat TS orchestrator. Approvals: `core_approvals` vs Python `approvals` vs Guardian. Orders: SQLite vs JSON vs commerce services. Marketplace: `marketplaceHub` vs `marketplaceV35` generic records. Voice: Flask vs phone assistant vs Pusat voice. |
| 10 | **Source of truth?** | **Commerce data:** `buzzard.db` SQLite on **`buzzard-api`**. **Human approvals for admin control center:** **`core_approvals`**. **Python orchestrator tasks/approvals:** its **own SQLite** (downstream adapter only via HTTP). **Catalog storefront (static):** GitHub Pages build from repo (separate from this audit’s API focus). |

---

## F) Pusat Core vs Buzzard mapping

Reference: upload **`pusat_core_f46e.py`** (NOT in git). Modules named in its docstring/root JSON.

| Pusat Core modülü | Mevcut Buzzard karşılığı | Durum | Çakışma | Önerilen işlem |
|---|---|---|---|---|
| Pusat Orchestrator | `intelligence/buzzard_orchestrator.py` + `server/lib/aiOrchestrator.js` + `pusat-ai-runtime/src/orchestrator.ts` | DUPLICATE | 3+ orchestrators, 2+ DBs | **ENTEGRasyon GEREKLİ:** single dispatch facade; keep Buzzard DB; do not deploy `pusat.db` |
| Shared state / memory | `core_system_events`, Guardian memory API, Pusat `createRuntimeStore()` (in-memory) | DUPLICATE | In-memory Pusat vs SQLite vs Guardian | **ENTEGRasyon GEREKLİ:** shared correlation + audit in `controlCenter` / existing tables |
| AI specialists / agents | Python agent registry; `core_ai_employees`; Pusat `agents.ts` | DUPLICATE | Parallel agent models | **REFERANS OLARAK KULLANILABİLİR:** map Pusat agent IDs → existing employees |
| Human Approval Center | `controlCenter.createApproval` / `core_approvals` | MEVCUT | Python/G guardian approvals separate | **MEVCUT** as SoT; Pusat bridge already maps here (`pusatPolicyAdapter.js`) |
| Product engine | PIM plugins, `products` table, catalog JSON | MEVCUT | No single `ProductEngine` class | **MEVCUT** — wire Pusat read actions to PIM/search services |
| Supplier engine | `server/lib/supplier/*`, supplier hub plugins | MEVCUT | — | **MEVCUT** |
| Stock / inventory | `wmsInventory.js`, product stock fields | MEVCUT | — | **MEVCUT** |
| Pricing engine | tax/coupons/PIM pricing | EKSİK (named module) | Pusat has explicit `PricingEngine` class in upload only | **ENTEGRasyon GEREKLİ** only if unified pricing rules needed |
| Order engine | `orderManagement.js`, `db.js` `orders`, commerce `orderService` | DUPLICATE | JSON + SQL + commerce | **MEVCUT** SoT = SQLite; deprecate JSON path over time |
| Returns engine | `returnsRmaPlugin`, return recovery libs | MEVCUT | — | **MEVCUT** |
| Marketplace engine | `marketplaceHub.js`, `marketplaceV35.js` | MEVCUT | EU MP names in Pusat upload not in Buzzard server | **EKSİK** connectors (Kaufland, OTTO, etc.) — **NOT FOUND** |
| Seller / partner | — | EKSİK | Pusat upload has `SellerEngine` | **EKSİK** in Buzzard repo |
| Payment engine | `paymentsFinance.js`, Stripe/PayPal | MEVCUT | Pusat upload SEPA/EBICS abstraction | **REFERANS OLARAK KULLANILABİLİR** for EBICS design; **no second payment DB** |
| Voice / call engine | `phoneAssistantService`, `Buzzard/voice_server.py`, Pusat voice | DUPLICATE | Three stacks | **MEVCUT** phone API for prod; Pusat voice **REFERANS** |
| Market / locale (37) | `data/buzzard_europe_countries.json`, `internationalV37` | EKSİK vs 37-market claim | `global_countries_35` **NOT FOUND** | **ENTEGRasyon GEREKLİ** for market matrix; use data files + V37 records |
| Security / RBAC | `rbac.js`, `globalAuthMiddleware`, JWT | MEVCUT | Pusat upload has own `Actor` model | **MEVCUT** Buzzard auth; map scopes only |
| Audit / idempotency | `coreAudit`, commerce idempotency, Pusat audit service | DUPLICATE | — | **MEVCUT** + extend `recordSystemEvent` (already used by Pusat adapter) |
| FastAPI monolith (`pusat_core.py`) | Many Node plugins + Python sidecars | REFERANS | Would duplicate entire platform | **REFERANS OLARAK KULLANILABİLİR** only — **do not** productionize second stack |

---

## G) RECOMMENDED PUSAT TARGET ARCHITECTURE

Goal: **one logical orchestrator face**, **one approval SoT**, **one commerce DB**, without breaking current Render services.

```
                    ┌─────────────────────────────────────┐
                    │  Single Orchestrator Facade (Node)   │
                    │  server/lib/aiOrchestrator.js        │
                    │  + optional Python delegate          │
                    │    (orchestratorBridge.js)           │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │  Shared state / audit / correlation    │
                    │  controlCenter.recordSystemEvent       │
                    │  core_ai_tasks + core_approvals        │
                    │  (buzzard.db)                          │
                    └──────────────┬──────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
   ┌──────▼──────┐        ┌───────▼────────┐      ┌───────▼────────┐
   │ AI specialists│       │ Pusat runtime   │      │ Python agents   │
   │ core_ai_      │       │ (flagged)       │      │ buzzard_        │
   │ employees     │       │ read-only Phase │      │ orchestrator    │
   └──────┬──────┘        └───────┬────────┘      └───────┬────────┘
          │                        │                        │
          └────────────────────────┼────────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │  Buzzard commerce engines (existing)   │
                    │  commerce/, orderManagement, PIM, WMS  │
                    │  paymentsFinance, marketplaceHub       │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │  Marketplace / Payment / Voice         │
                    │  Stripe/PayPal, marketplace channels   │
                    │  phoneAssistant (prod voice path)      │
                    └─────────────────────────────────────┘
```

**Rules (from audit constraints):**

- Do **not** introduce `pusat.db` or second production SQLite for orders/payments/approvals.
- Phase B pattern is correct: **`mapHumanApprovalToControlCenter` → `createApproval`** only.
- Merge **`cursor/pusat-ai-runtime-foundation-c293`** to `main` only after explicit ops review; keep **`PUSAT_RUNTIME_ENABLED` unset** until Phase C routes exist.
- Retire or demote **JSON `orders.json`** path for production flows where SQLite is enabled.
- Document Python orchestrator as **specialist delegate**, not second approval SoT.

---

## H) FILES NEEDED FOR NEXT INTEGRATION STEP

Priority order for files **you should send / confirm** (paths outside repo or integration-critical):

1. **`pusat_core_f46e.py`** (full) — already at uploads; confirm latest version if updated.
2. **`PUSAT_CORE_README_1db7.md`** — scope and module boundaries.
3. **Integration ADR / decision doc** — which orchestrator face wins for voice vs admin (if exists).
4. **`server/lib/routePermissions.js`** excerpt or full — to plan Phase C routes without RBAC gaps.
5. **`server/lib/phoneAssistantService.js`** — telephony production contract.
6. **Any real marketplace connector specs** (Amazon SP-API, eBay, etc.) — **NOT FOUND** for EU marketplaces in repo.
7. **Bank/EBICS requirements** — **NOT FOUND** in Buzzard; only reference in `pusat_core` upload.
8. **Production env export (redacted)** — confirm whether `BUZZARD_ORCHESTRATOR_URL` / Guardian URLs are reachable (ops; not in git).
9. **`global_countries_35` or 37-market JSON** if maintained outside repo — **NOT FOUND** in workspace.
10. **Merge checklist** for branch `cursor/pusat-ai-runtime-foundation-c293` → `main` (CI, build of `pusat-ai-runtime/dist`).

---

## Appendix: Branch vs production deploy delta

| Artifact | On workspace branch `cursor/pusat-ai-runtime-foundation-c293` | On `main` (Render deploy) |
|---|---|---|
| `pusat-ai-runtime/` | Present | **NOT FOUND** |
| `server/lib/pusatRuntimeBridge.js` | Present | **NOT FOUND** |
| `PUSAT_RUNTIME_ENABLED` in `render.yaml` | **NOT FOUND** | **NOT FOUND** |

---

*End of PUSAT_ARCHITECTURE_EXPORT.md*

# PUSAT CONSOLIDATION — PHASE C PREPARATION (PLAN ONLY)

**Status:** Documentation only — no code, migration, deploy, Phase B activation, or new databases.  
**References:** `PUSAT_ARCHITECTURE_EXPORT.md`, `/home/ubuntu/.cursor/projects/workspace/uploads/pusat_core_f46e.py`, `PUSAT_CORE_README_1db7.md`  
**Audit baseline branch (workspace):** `cursor/pusat-ai-runtime-foundation-c293`  
**Production deploy branch (Render):** `main` per `render.yaml`

---

## 1. Executive Summary

Pusat Core (`pusat_core_f46e.py`) is a **reference foundation** that consolidates orchestration, commerce engines, approvals, markets, marketplace connectors, payments, voice, and seller concepts in a **single FastAPI + SQLite (`pusat.db`)** stack. Buzzard production already implements the same **business capabilities** across **Node (`buzzard-api` + `buzzard.db`)**, **Python sidecars** (orchestrator, guardian, intelligence), and **81+ plugins**.

**Consolidation goal:** Adopt Pusat’s **patterns** (policy-gated dispatch, specialist agents, correlation, human approval before side effects) **without** importing Pusat’s tables or running a second commerce/approval/order/payment/voice system of record.

**Non-negotiables:**

| System of record | Location |
|---|---|
| Primary DB | `BUZZARD_DB_PATH=/var/data/buzzard.db` |
| Approvals (admin/commerce) | `core_approvals` via `server/lib/controlCenter.js` |
| AI control tasks | `core_ai_tasks` |
| Commerce | `server/lib/commerce/*`, `orderManagement.js`, `wmsInventory.js`, `paymentsFinance.js`, `marketplaceHub.js` |

**Phase C (future) direction:** Extend existing Node **`aiOrchestrator.js`** as the **public orchestration facade** inside `buzzard-api`; treat Python **`buzzard_orchestrator`** and optional **Pusat TS runtime** as **delegates** for specific task types; route all human gates through **`controlCenter.createApproval`**; propagate **`correlation_id`** from `server/lib/operations/correlationContext.js` and HTTP headers end-to-end.

---

## 2. Current Production Architecture

(Summary from `PUSAT_ARCHITECTURE_EXPORT.md` — evidence from `render.yaml` on `main`.)

| Service | Entry | Data store |
|---|---|---|
| `buzzard-api` | `node server/server.js` | SQLite `/var/data/buzzard.db` |
| `buzzard-orchestrator` | `uvicorn buzzard_orchestrator:app` | `/tmp/buzzard_orchestrator.db` |
| `buzzard-guardian` | `uvicorn buzzard_guardian_api:app` | `/tmp/buzzard_guardian.sqlite3` |
| `buzzard-intelligence` | Docker under `intelligence/` | Ephemeral FS |

**Orchestration today (parallel, not unified):**

1. **Node:** `server/lib/aiOrchestrator.js` → `core_ai_tasks`, `controlCenter.createApproval`, `executeWithProvider`.
2. **Python HTTP:** `server/lib/orchestratorBridge.js` → remote tasks/agents/approvals (separate DB).
3. **Guardian:** task-gate / approvals via `guardianBridge.js` (separate DB).
4. **Pusat TS (branch only, unwired):** `pusat-ai-runtime/src/orchestrator.ts` in-memory; `pusatRuntimeBridge.js` test-only; **not on `main`**, **no `PUSAT_RUNTIME_ENABLED` in Render**.

**Commerce paths (coexist):** SQLite `orders` (`databasePlugin`, `orderManagement`), JSON `server/data/orders.json` (`ordersPlugin`), `commerceCorePlugin` layer.

**Voice (prod path):** `phoneAssistantService.js` + `aiAutomationPlugin.js` — **not** `Buzzard/voice_server.py` on Render.

---

## 3. Pusat Core → Buzzard Mapping (consolidation lens)

| Pusat Core concept | Buzzard anchor | Consolidation stance |
|---|---|---|
| `Pusat Orchestrator` + task dispatch | `aiOrchestrator.js` + optional delegates | Facade on Node; no `pusat.db` |
| `ApprovalCenter` / `approvals` table | `core_approvals` | Map all Pusat-critical paths to `createApproval` |
| Shared state / KV / idempotency | `core_system_events`, task rows, commerce idempotency | Extend metadata, no new DB |
| `ProductEngine` / `StockEngine` | PIM, `products`, `wmsInventory.js` | Call existing services |
| `OrderEngine` | `orderManagement.js`, `orders` table | Single write path |
| `PaymentEngine` | `paymentsFinance.js`, `paymentService.js` | Stripe/PayPal/SEPA string only today |
| `MarketplaceEngine` | `marketplaceHub.js`, `marketplaceV35.js` | Extend channels, not duplicate engine |
| `LocaleEngine` / 37 markets | `buzzard_europe_countries.json`, `internationalV37` | Data + config layer |
| `VoiceEngine` | `phoneAssistantService` | Facade on existing API |
| `SellerEngine` | **NOT FOUND** in Buzzard | Future module only |
| FastAPI monolith | Plugins + sidecars | **Do not deploy** as second stack |

---

## 4. Orchestrator Consolidation

### 4.1 Analysis of four components

| Component | Role today | Strength | Weakness for “single face” |
|---|---|---|---|
| `server/lib/aiOrchestrator.js` | In-process task runner tied to `core_ai_tasks`, RBAC, approvals, AI providers | Same DB as commerce; already wired to `controlCenterPlugin` | Does not expose unified public API for all AI/voice/Pusat actions |
| `intelligence/buzzard_orchestrator.py` | Deployed microservice; agent registry; task CRUD; own approvals | Good for long-running / Python-native workflows | Separate SQLite; duplicate approval model |
| `server/lib/orchestratorBridge.js` | HTTP proxy; status in control center | Clean delegate boundary | No deduplication if Node also creates tasks |
| `pusat-ai-runtime/src/orchestrator.ts` | Policy + idempotency + specialist stubs (in-memory) | Aligns with Pusat action names (`GET_ORDER`, etc.) | Not production-connected; must not become second SoT |

### 4.2 Decisions (target design)

| Question | Answer |
|---|---|
| **Public orchestration facade?** | **`server/lib/aiOrchestrator.js`** extended (or thin wrapper module e.g. future `orchestrationFacade.js`) — all new Phase C+ entrypoints call this, not Python/Pusat directly. |
| **Node stays primary?** | Yes — creates/updates **`core_ai_tasks`**, enforces **`rbac`**, records **`core_system_events`**, triggers **`createApproval`**. |
| **Python orchestrator use?** | **Specialist delegate** when `task_type` / `payload.delegate === "python_orchestrator"` and `BUZZARD_ORCHESTRATOR_URL` configured — e.g. batch simulations, agent catalog demos, workflows already modeled in Python. **Not** for commerce writes. |
| **Pusat TS runtime use?** | **Specialist delegate** for **read-only, action-keyed** flows (voice/AI policy rehearsal) after merge + explicit flag — same action whitelist as `pusatPolicyAdapter.js`. **Never** write orders/payments directly. |
| **Prevent double execution?** | (1) **Single task row** per unit of work in `core_ai_tasks` with unique `idempotency_key` column or payload field; (2) **Delegate lock** in task payload `delegated_to` + status `DELEGATED`; (3) Reject second dispatch if task not `PENDING`/`ASSIGNED`; (4) Pusat runtime idempotency keys stored in **task result_json**, not new table. |
| **`correlation_id`?** | Source: `req.correlationId` from `server/server.js` / `correlationContext.createContext`; propagate to task `payload_json.correlationId`, all `recordSystemEvent`, Python bridge `X-Correlation-Id` header, Pusat dispatch input. |
| **`task_id`?** | **Canonical ID:** `core_ai_tasks.id` (prefix `task_…`). Python orchestrator `task_id` stored as **`payload_json.externalOrchestratorTaskId`** when delegated. Pusat `taskId` UUID stored in **`result_json.pusatTaskId`** only. |

### 4.3 Recommended unified flow (target)

```
HTTP / Admin / Voice API request
        ↓
[Future] orchestrationFacade.dispatch(req, { action, targetEmployee, payload })
        ↓
Policy / RBAC (rbac.js, routePermissions, task permissions_required_json)
        ↓
controlCenter.createAiTask() → core_ai_tasks (status PENDING/ASSIGNED)
        ↓
aiOrchestrator.enqueueTaskProcessing(taskId)
        ↓
┌───────────────────┬────────────────────┬─────────────────────┐
│ In-process AI     │ Python delegate     │ Pusat TS delegate    │
│ executeWithProvider│ orchestratorBridge │ pusatRuntimeBridge   │
│ (default)         │ (specialist only)   │ (read-only, flagged) │
└───────────────────┴────────────────────┴─────────────────────┘
        ↓
Existing commerce read/write ONLY via existing libs (orderManagement, commerce, etc.)
        ↓
Side effect? → controlCenter.createApproval() → core_approvals
        ↓
Human decideApproval → resumeAfterApproval(taskId) → aiOrchestrator.processTask
        ↓
recordSystemEvent + coreAudit / securityLog as today
        ↓
Result to client (correlation_id echoed in response headers/body)
```

**Explicit non-goals:** Remove Python orchestrator service; merge orchestrator DB into `buzzard.db`; auto-enable Pusat runtime in production.

---

## 5. Approval Consolidation

### 5.1 Single source of truth

**All Buzzard-admin and Pusat-gated critical actions** must land in **`core_approvals`** via **`controlCenter.createApproval`** and **`decideApproval`**.

| System | Current approval store | Consolidation |
|---|---|---|
| `controlCenter.js` | `core_approvals` | **SoT** |
| `pusatPolicyAdapter.js` | Already calls `createApproval` (Phase B design) | **Keep pattern** for Phase C+ |
| `aiOrchestrator.js` | `createApproval` for critical tasks | **Keep** |
| `buzzard_orchestrator.py` | SQLite `approvals` | **Read-only mirror optional**; new cross-system approvals **must not** be written here for commerce |
| Guardian | `/approvals/*` on guardian DB | **Operational/security gate only** — document boundary; do not duplicate commerce refund approvals |

### 5.2 Target approval flow

```
Pusat AI / Voice / Admin AI action (write or APPROVAL_CLASS)
        ↓
policy evaluation (pusatPolicyAdapter and/or taskRequiresApproval)
        ↓
controlCenter.createApproval({
  taskId,                      // link when available
  resourceType: "ai_task" | "pusat_runtime" | "order" | …,
  resourceId: correlationId or entity id,
  aiRecommendation, reason, riskLevel
})
        ↓
core_approvals.status = PENDING
        ↓
Admin UI: controlCenterPlugin POST decideApproval
        ↓
decideApproval → update core_ai_tasks → resumeAfterApproval(taskId)
        ↓
Side effect executed ONLY through existing engine APIs (post-approval)
```

**Rules:**

- No second approval table in `buzzard.db`.
- Python orchestrator task approval API **must not** be the only gate for production commerce mutations.
- Guardian remains for cost/anomaly/task-gate; map IDs in `metadata_json` if cross-referenced.

---

## 6. Shared State / Memory

**No new database.** Adapt Pusat “shared state” to existing structures:

| Pusat concept | Buzzard mechanism | Fields / usage |
|---|---|---|
| `correlation_id` | `correlationContext.js`, `req.correlationId`, `X-Correlation-Id` | Propagate to tasks, events, logs |
| Task state | `core_ai_tasks.status`, `payload_json`, `result_json`, `error_message` | Include `delegate`, `action`, `idempotencyKey` |
| Agent state | `core_ai_employees.status`, `last_activity_at` | Map Pusat `targetAi` → employee `id` |
| Exception / human gate | `core_approvals` + task `WAITING_APPROVAL` | Pusat `HUMAN_APPROVAL_REQUIRED` → approval row |
| Audit trail | `core_system_events` (`recordSystemEvent`), `coreAudit`, `securityLog` | `eventType: pusat.audit` already in adapter |
| Idempotency | Commerce `server/lib/commerce/idempotency.js`; task-level key in payload | Reuse keys for checkout; task dispatch keys in `core_ai_tasks` metadata (Phase 1+: optional column vs JSON only — **prefer JSON first to avoid migration**) |
| Short-lived request context | `correlationContext` Map keyed by `requestId` | Not durable memory — OK |

**Guardian memory API:** Optional **read** for enrichment; not SoT for commerce decisions.

**Pusat in-memory store (`createRuntimeStore`):** Dev/test delegate only; state must be **reflected back** into task `result_json` if persisted insight needed.

---

## 7. AI Agent Mapping

Pusat Core roles (`AgentRole` in upload) vs Buzzard **`DEFAULT_AI_EMPLOYEES`** (`server/core/constants.js`) and services.

| Pusat Agent | Existing Buzzard Component | Reuse | New Code Needed | Risk |
|---|---|---|---|---|
| Customer | CRM plugins, `customerAuth`, `customerAccountPlugin`, `phoneAssistantService` | High | Facade mapping action `IDENTIFY_CUSTOMER` → existing services | Low — read-only first |
| Order | `order_ai` employee, `orderManagement.js`, `commerce/orderService` | High | Dispatch rules; no second OMS | Medium — duplicate JSON orders path |
| Product | `product_ai`, PIM plugins, `products` table, catalog JSON | High | Action `GET_PRODUCT` → PIM read | Low |
| Stock | `wmsInventory.js`, product stock fields | High | `CHECK_AVAILABILITY` → WMS/inventory read | Low |
| Supplier | `supplierHubPlugin`, `server/lib/supplier/*` | High | `CHECK_SUPPLIER` → hub read | Low |
| Pricing | `price_ai`, coupons, `commerce/taxProvider`, PIM prices | Partial | Named pricing rules engine **optional** later | Medium — business rule drift |
| Returns | `returnsRmaPlugin`, `returnRecovery` libs | High | `CHECK_RETURN_POLICY`, `CREATE_RETURN` (approval-gated) | Medium — approval path |
| Category | `category_ai`, taxonomy plugins, `categoryVisibility` | High | Taxonomy tasks via existing employees | Low |
| SEO | `catalogSeoPlugin`, `seoMarketingPlugin`, `localizationFeeds` | High | Task types for SEO jobs | Low |
| Sales Analysis | `analyticsDashboard`, `analyticsV39`, BI plugins | Partial | New task templates, not new agent DB | Low |
| Payment | `paymentsFinance`, `paymentService`, Stripe/PayPal | High | No Pusat payment execution | High if miswired |
| Marketplace | `marketplaceHub.js`, `marketplaceV35.js` | Partial | Connector expansion (Phase 5) | Medium |
| Security | `security_ai`, `securityLog`, Guardian | High | Guardian delegate for anomalies only | Medium |
| Voice | `phoneAssistantService`, `aiAutomationPlugin` | High | Orchestrator routes voice intents → phone assistant | Medium — UX |
| Orchestrator (meta) | `aiOrchestrator.js` | High | Facade module | Low |

**No new AI employee database** — extend `DEFAULT_AI_EMPLOYEES` or admin UI only when necessary; prefer mapping Pusat agent IDs (`order-ai`, `customer-ai`) to existing `order_ai`, etc.

---

## 8. Commerce Engine Mapping

| Pusat Engine (reference) | Buzzard implementation | Action |
|---|---|---|
| ProductEngine | PIM (`pimCatalogPlugin`, `pimCorePlugin`), `products`, `catalogProductSync` | Read/write via existing APIs only |
| SupplierEngine | `server/lib/supplier/*`, `supplierHubPlugin`, `supplierIntegrationHubPlugin` | Reuse adapters |
| StockEngine | `wmsInventory.js`, inventory on products | Reserve/adjust via WMS APIs |
| PricingEngine | `taxProvider`, coupons, `price_ai`, PIM price fields | Optional shared **pricing rules module** later in `server/lib/commerce/` — not Phase C |
| OrderEngine | `orderManagement.js`, `db.js` `orders`, `commerce/orderService` | **SQLite SoT**; demote JSON orders over time |
| ReturnsEngine | `returnsRmaPlugin`, return recovery libs | RMA flows |
| PaymentEngine | `paymentsFinance.js`, `paymentsV36.js`, `commerce/paymentService.js` | Stripe/PayPal; SEPA as method validation |
| MarketplaceEngine | `marketplaceHub.js` (+ `marketplaceV35` metadata) | Channel registry in `marketplace_channels` |
| SellerEngine | **NOT FOUND** | Future (Section 13) |

**Rule:** Phase C preparation **does not** add parallel `ProductEngine.js` that writes its own tables.

---

## 9. 37-Market Architecture (plan only)

### 9.1 Current Buzzard assets

| Asset | Path | Notes |
|---|---|---|
| Europe country JSON | `data/buzzard_europe_countries.json` | Rich per-country: `locale`, `currency`, `taxRate`, `taxModel`, `rtl` |
| International module | `server/lib/internationalV37.js` | Generic `int37_records` / jobs — extensible bucket |
| Feeds | `server/lib/localizationFeeds.js`, `localizationFeedsPlugin` | Merchant XML |
| Tax | `server/lib/commerce/taxProvider.js` | Abstraction for commerce |
| Currency | `orders`, commerce cart/checkout bodies | Already multi-currency capable at field level |

### 9.2 Pusat 37-market set (from upload `CURRENT_MARKETS`)

EU-27 + TR + GCC-6 (SA, AE, QA, KW, BH, OM) + EG + **GB** + **CH**.

### 9.3 Target extensible configuration (no implementation)

Proposed **single market registry** (data-only Phase 4):

```
server/data/buzzard_markets.json   (new file, future)
  OR extend buzzard_europe_countries.json → buzzard_markets.json with merged entries
```

Each market record (aligned with Pusat `MARKET_CONFIG` ideas, Buzzard fields):

- `code`, `name`, `locale`, `language`, `currency`, `vat` / `taxModel`, `rtl`
- `namespaces`: category, shipping, payment (Pusat-style) → map to i18n keys in existing locale files
- `status`: `active` | `planned` | `catalog_only`
- `rolloutPhase`: 4a EU extend, 4b TR, 4c GCC+EG, 4d GB+CH

**Integration points:**

- `internationalV37` records hold **per-market rollout flags** and connector readiness.
- `taxProvider` receives market code from cart/checkout.
- Storefront bridge reads same registry for country switcher consistency.

**NOT FOUND today:** `global_countries_35.json` — do not assume; build from verified lists only.

---

## 10. Marketplace Expansion

### 10.1 Current state

| Channel | Evidence |
|---|---|
| Amazon | `marketplace_channels` seed `amazon`; `marketplaceHub.js` CHANNELS |
| eBay | seed `ebay` |
| Google Shopping | seed `google_shopping` |
| TikTok Shop | seed `tiktok_shop` |
| marketplaceV35 | Generic `mkt35_records` / jobs — parallel metadata layer |

Operations: enable channel, sync jobs (`marketplace_sync_jobs`), listings (`marketplace_listings`), channel orders (`marketplace_channel_orders`).

### 10.2 Missing targets (NOT FOUND in `server/`)

Kaufland, OTTO, Allegro, bol.com, Cdiscount, eMAG, Skroutz.

### 10.3 Future connector framework (design only)

Extend **`marketplaceHub.js`** pattern — **do not** create second `MarketplaceEngine` DB.

```
server/lib/marketplace/connectors/
  baseConnector.js          // interface: health, publishListing, syncStock, pullOrders
  amazonConnector.js        // wrap existing seed
  ebayConnector.js
  kauflandConnector.stub.js // Phase 5 — no API keys
  ...
server/lib/marketplace/registry.js  // code → connector instance
```

- Credentials: env / admin vault table **already pattern** via channel `account_label` — no new secrets store design in Phase C prep.
- Jobs: continue **`marketplace_sync_jobs`** queue processed by existing `jobWorker`.
- Idempotency: `integration_events.event_key` in `db.js` for order ingest.

---

## 11. Payment / EBICS Future Architecture

### 11.1 Preserve

- Stripe / PayPal (`render.yaml`, `paymentsFinance`, webhooks foundation in commerce).
- SEPA as **validated method string** in `ordersPlugin` / `paymentVerification.js` — not bank file exchange today.

### 11.2 Pusat EBICS-ready idea → future adapter (Phase 7)

```
server/lib/payments/bank/
  ebicsAdapter.interface.js   // submitPaymentFile, fetchStatus — no-op default
  ebicsAdapter.stub.js        // returns NOT_CONFIGURED
  sepaBatch.interface.js      // pain.008 generation hook — documentation only
```

- **No** changes to payment intent tables in Phase C prep.
- **No** credential collection in agent automation.
- Payout/refund: continue through Stripe/PayPal; bank transfer = manual ops until adapter certified.

---

## 12. Voice Architecture

| Layer | Component | Production? |
|---|---|---|
| Flask intelligence UI | `Buzzard/voice_server.py` | NOT in `render.yaml` — local/intelligence |
| API voice / phone | `phoneAssistantService.js` | Yes — via `aiAutomationPlugin.js` |
| Pusat sessions | `VoiceSessionManager` in `pusat-ai-runtime` | Not wired |

### 12.1 Target facade (feasibility: **yes**, plan only)

```
Client (telephony webhook / future voice API)
        ↓
[Future] voiceOrchestrationFacade (thin, in server/lib/)
        ↓
phoneAssistantService (verify order, route to human)
        ↓
orchestrationFacade.dispatch({ action, sourceAi: "voice-ai", payload })
        ↓
Read-only: GET_ORDER, IDENTIFY_CUSTOMER, CHECK_RETURN_POLICY
Write: blocked → createApproval
```

- **Do not** deploy `voice_server.py` to Render for commerce.
- Pusat persona/locale (`personas.ts`) can inform **response templates** copied into phone assistant i18n — data only, no new server.

---

## 13. Seller/Partner Future Architecture

**Current Buzzard:** merchant feed “seller” mentions in reviews; **no** seller accounts, commission, or multi-vendor OMS (**NOT FOUND**).

### 13.1 Future model (Phase 6 — design only)

| Concern | Proposed Buzzard extension |
|---|---|
| Seller account | New tables **only after ADR** — e.g. `seller_accounts` in `buzzard.db` (not in Phase C prep) |
| Onboarding | Admin plugin + approval via `core_approvals` |
| Permissions | Extend `rbac.js` — `seller.*` permissions |
| Commission | Rules in `seller_commission_rules` — future |
| Product ownership | `products.seller_id` nullable FK — future migration |
| Orders | Split `order_items.seller_id` — future |
| Payouts | Link to Phase 7 payment adapter / manual |
| Seller API | Separate route namespace `/api/seller/*` with JWT realm `seller` |
| Marketplace mapping | `marketplace_sku_mappings` extended with `seller_id` |

**Phase C prep:** document only; **no** schema changes.

---

## 14. Security Architecture

**Keep:** `globalAuthMiddleware.js`, `routePermissions.js`, `rbac.js`, `auth.js` / `dbAuth.js`, JWT, CSRF, `securityLog.js`, `coreAudit.js`.

### Pusat `Actor` / permissions → Buzzard RBAC

| Pusat concept | Buzzard mapping |
|---|---|
| `Actor.permissions` set | `aiCanExecute(employee.permissions, perm)` / admin permissions |
| `AgentRole` enum | `core_ai_employees.id` + department |
| Critical actions | `system.configure`, `orders.write`, existing perm strings |
| Pusat `authorizationScope` | Already mirrored in `pusatPolicyAdapter.buildAuthorizationScopes` |
| Service-to-service | Continue JWT + Render internal URLs; add mTLS only if ops requires (out of scope) |

**No new authentication system.**

---

## 15. Migration Phases

### Phase 0 — Documentation only (current)

| Item | Detail |
|---|---|
| Files changed | `PUSAT_CONSOLIDATION_PLAN.md`, prior export |
| New files | Plan/docs only |
| DB impact | None |
| Rollback | N/A |
| Tests | N/A |
| Risk | None |

### Phase 1 — Read-only adapters

| Item | Detail |
|---|---|
| Change | Merge `pusat-ai-runtime` + bridge to `main` **without** enabling flag; optional `orchestrationFacade.readOnlyDispatch` calling existing services |
| New files | `server/lib/orchestrationFacade.js` (proposed), tests |
| DB impact | None if only JSON metadata on tasks |
| Rollback | Remove facade require; flag stays off |
| Tests | Extend `pusatRuntimeBridge.test.mjs`; facade unit tests |
| Risk | Low if read-only enforced |

### Phase 2 — Pusat AI → controlCenter

| Item | Detail |
|---|---|
| Change | Wire blocked writes to `createApproval` from all AI entrypoints consistently |
| Files | `aiOrchestrator.js`, future facade, `aiAutomationPlugin.js` |
| DB impact | More rows in `core_approvals` / events — expected |
| Rollback | Feature flag per route |
| Tests | Approval integration tests |
| Risk | Medium — duplicate approvals if Python also creates |

### Phase 3 — Shared orchestration facade

| Item | Detail |
|---|---|
| Change | Single dispatch API; delegate to Python/Pusat with dedupe |
| Files | `orchestrationFacade.js`, `aiOrchestrator.js`, `orchestratorBridge.js`, optional plugin |
| DB impact | Optional `idempotency_key` on tasks (prefer JSON first) |
| Rollback | Facade bypass to current behavior |
| Tests | E2E task lifecycle, double-dispatch prevention |
| Risk | Medium–high — orchestration bugs |

### Phase 4 — Market/locale expansion

| Item | Detail |
|---|---|
| Change | Market registry JSON + int37 records for TR/GCC/GB/CH |
| Files | `data/buzzard_markets.json`, `internationalV37.js`, storefront i18n |
| DB impact | `int37_records` rows only |
| Rollback | Remove records / disable markets |
| Tests | tax/currency per market unit tests |
| Risk | Low–medium — tax compliance review required |

### Phase 5 — Marketplace connectors

| Item | Detail |
|---|---|
| Change | Stub connectors + hub registration for EU MPs |
| Files | `server/lib/marketplace/connectors/*`, `marketplaceHub.js`, seeds in `db.js` |
| DB impact | New `marketplace_channels` rows |
| Rollback | Disable channel flags |
| Tests | Job queue dry-run |
| Risk | Medium — API TOS/credentials |

### Phase 6 — Seller/Partner

| Item | Detail |
|---|---|
| Change | Schema ADR + admin onboarding |
| Files | New plugins, migrations **only after approval** |
| DB impact | **New tables** — explicit ADR required |
| Rollback | Migration down + disable plugin |
| Tests | RBAC isolation seller vs admin |
| Risk | High — multi-vendor complexity |

### Phase 7 — Payment/EBICS adapter

| Item | Detail |
|---|---|
| Change | Stub EBICS interface behind feature flag |
| Files | `server/lib/payments/bank/*` |
| DB impact | None initially |
| Rollback | Flag off |
| Tests | Stub never calls network |
| Risk | High — financial compliance |

### Phase 8 — Voice expansion

| Item | Detail |
|---|---|
| Change | Voice facade → orchestration read-only actions |
| Files | `phoneAssistantService.js`, new voice facade, plugin routes |
| DB impact | Events only |
| Rollback | Route disable |
| Tests | Voice intent → GET_ORDER mock |
| Risk | Medium — customer data exposure if RBAC wrong |

---

## 16. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Dual orchestrator executes same job | Medium | High | Single `core_ai_tasks` idempotency; delegate flags |
| R2 | Approval in Python DB but not `core_approvals` | Medium | High | Policy: commerce writes require Buzzard approval row |
| R3 | Phase B enabled in prod prematurely | Low | High | No `PUSAT_RUNTIME_ENABLED` in Render until Phase 3 sign-off |
| R4 | JSON orders vs SQLite divergence | Medium | Medium | Phase 3+ route all OMS to SQLite |
| R5 | New marketplace connectors without legal review | Medium | High | Stubs only Phase 5; manual go-live |
| R6 | EBICS/payout automation | Low | Critical | Phase 7 stub only; human treasury |
| R7 | Seller multi-vendor data model rush | Medium | High | Phase 6 ADR gate |
| R8 | Voice leaks PII | Low | High | Existing phoneAssistant verification + audit |

---

## 17. Exact Files That Would Change (future phases — not now)

**Phase 1–3 (orchestration / approval):**

- `server/lib/aiOrchestrator.js`
- `server/lib/orchestratorBridge.js` (headers, correlation)
- `server/lib/pusatRuntimeBridge.js` / `pusatPolicyAdapter.js` (if merged to main)
- `server/plugins/controlCenterPlugin.js` (optional unified dispatch route)
- `server/plugins/aiAutomationPlugin.js`
- `server/plugins/orchestratorBridgePlugin.js`
- **New:** `server/lib/orchestrationFacade.js`
- **New:** `server/__tests__/orchestrationFacade.test.mjs`
- `pusat-ai-runtime/src/*` (personas, policy alignment only)

**Phase 4:** `data/buzzard_markets.json`, `server/lib/internationalV37.js`, locale JSON under storefront.

**Phase 5:** `server/lib/marketplaceHub.js`, `server/lib/db.js` (seeds), new connector stubs.

**Phase 6–8:** As sections 13, 11, 12.

**Deploy config (later, explicit ops):** `render.yaml` — only after review; **not** Phase C prep.

---

## 18. Files That MUST NOT Change (without explicit ADR)

| Category | Paths |
|---|---|
| Primary schema authority | `server/lib/db.js` — **no** Pusat table imports |
| SoT approval logic | `controlCenter.js` — do not redirect to Python DB |
| Production DB path | `server/lib/dbPaths.js`, `render.yaml` `BUZZARD_DB_PATH` |
| Legacy production entry | `server/server.js` plugin loader contract — changes minimal |
| Python orchestrator service definition | `intelligence/buzzard_orchestrator.py` — **do not remove** in consolidation |
| Upload reference | `pusat_core_f46e.py` — **never** deploy as runtime |
| Commerce write paths | Direct new writers bypassing `orderManagement` / `commerce` guards |

**Also MUST NOT (operational):**

- Enable `PUSAT_RUNTIME_ENABLED=1` in production in Phase C prep.
- Run migrations for `pusat.db` tables.
- Delete `ordersPlugin.js` or Python orchestrator without deprecation plan.

---

## 19. Proposed Phase C Implementation Order

1. **Merge documentation + read-only code to `main`** (facade design review only — separate PR policy).
2. **Implement `orchestrationFacade.js`** — read-only actions mirroring `pusatPolicyAdapter.READ_ONLY_ACTIONS`.
3. **Unit tests** — dedupe, correlation propagation, approval on blocked write.
4. **Admin API design** — `POST /api/admin/orchestration/dispatch` (draft OpenAPI in doc PR).
5. **Wire `aiAutomationPlugin`** voice paths to facade (feature flag `BUZZARD_ORCHESTRATION_FACADE=0` default).
6. **Python delegate module** — optional path in facade calling `orchestratorBridge` with correlation header.
7. **Pusat TS delegate** — only when `PUSAT_RUNTIME_ENABLED=1` in **non-production** environments.
8. **Operational runbook** — approval SoT, rollback, monitoring `core_system_events` for `pusat.audit`.
9. **Phase 4+ market/marketplace/seller/payment/voice** per sections 9–13 sequentially.

**Phase C scope boundary:** Steps 1–3 are **preparation**; steps 4–7 are **implementation** (future PRs, not this task).

---

## Appendix A — Duplicate system prevention checklist

- [ ] Every dispatch creates or reuses one `core_ai_tasks` row.
- [ ] `correlation_id` on request = task payload + events.
- [ ] Writes require `core_approvals` or existing commerce guards.
- [ ] Python task IDs stored as external reference only.
- [ ] Pusat runtime never writes `orders` / `products` / `payments` tables.
- [ ] Guardian approvals not used for refund authorization alone.

---

## Appendix B — Reference file index

| Document | Path |
|---|---|
| Architecture export | `/workspace/PUSAT_ARCHITECTURE_EXPORT.md` |
| This plan | `/workspace/PUSAT_CONSOLIDATION_PLAN.md` |
| Pusat core upload | `/home/ubuntu/.cursor/projects/workspace/uploads/pusat_core_f46e.py` |
| Pusat README upload | `/home/ubuntu/.cursor/projects/workspace/uploads/PUSAT_CORE_README_1db7.md` |
| Render blueprint | `/workspace/render.yaml` |

---

*End of PUSAT_CONSOLIDATION_PLAN.md*

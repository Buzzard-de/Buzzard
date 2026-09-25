# PUSAT Phase C — Technical Input Report (Read-Only)

**Generated from repository reads only.** No production connections.  
**References:** `PUSAT_CONSOLIDATION_PLAN.md`, `PUSAT_ARCHITECTURE_EXPORT.md`  
**Workspace branch (local):** `cursor/pusat-ai-runtime-foundation-c293` — Pusat bridge files exist locally; **`git show main:server/lib/pusatRuntimeBridge.js` → fatal: not in `main`**.  
**Render deploy branch:** `main` (`render.yaml` lines 18–19, 24).

---

## 1. EXECUTIVE SUMMARY

Buzzard production API (`buzzard-api`, `node server/server.js`, SQLite `BUZZARD_DB_PATH=/var/data/buzzard.db`) already hosts **commerce**, **OMS**, **payments finance**, **marketplace hub**, **WMS**, **control center**, and **in-process AI orchestration** (`server/lib/aiOrchestrator.js` → `core_ai_tasks` / `core_approvals`).

A **separate Python orchestrator service** (`buzzard-orchestrator`, `intelligence/buzzard_orchestrator.py`, DB `BUZZARD_DB=/tmp/buzzard_orchestrator.db` per `render.yaml`) and **Guardian** (`buzzard_guardian_api.py`, separate DB) add **parallel task/approval stores**.

**Pusat runtime (Phase B)** exists in workspace as `server/lib/pusatRuntimeBridge.js`, `server/lib/pusatPolicyAdapter.js`, `pusat-ai-runtime/` — **not merged to `main`**, **no `PUSAT_RUNTIME_ENABLED` in `render.yaml`**, **no plugin references** to `dispatchPusatTask` under `server/plugins/` (grep: no matches).

`PUSAT_CONSOLIDATION_PLAN.md` defines Phase C direction: **facade on Node `aiOrchestrator.js`**, **approval SoT `core_approvals`**, **no `pusat.db`**, Pusat TS as **optional read-only delegate** when explicitly flagged (non-prod per plan).

Phase C coding requires **merge strategy for Pusat files**, **route/spec for unified dispatch**, and **resolution of dual order paths** (`orders` table vs `server/data/orders.json` used by phone assistant).

---

## 2. CURRENT SOURCE OF TRUTH

| Domain | Source of Truth (repo evidence) | Primary paths / tables |
|---|---|---|
| **Commerce data (Part 8 layer)** | SQLite on `buzzard-api` when enabled | `commerce_carts`, `commerce_checkouts`, `commerce_orders` in `server/lib/db.js` (~3672+); services in `server/lib/commerce/*` |
| **Orders (legacy SQLite checkout)** | SQLite `orders` / `order_items` | `server/lib/db.js` (~64+); `server/plugins/databasePlugin.js`, `server/lib/orderManagement.js` |
| **Orders (JSON file)** | File `server/data/orders.json` | `server/plugins/ordersPlugin.js`; `server/lib/aiChatService.js` → `phoneAssistantService.js` |
| **Products** | SQLite `products` + static catalog | `server/lib/db.js`; `data/buzzard_products.json` (via plugins); PIM plugins |
| **Approvals (Buzzard admin/API)** | SQLite `core_approvals` | `server/lib/controlCenter.js` `createApproval` / `decideApproval`; routes `server/plugins/controlCenterPlugin.js` |
| **AI tasks** | SQLite `core_ai_tasks` | `controlCenter.createAiTask`; `aiOrchestrator.processTask` |
| **System events / audit (control plane)** | SQLite `core_system_events` | `controlCenter.recordSystemEvent`; also `server/lib/coreAudit.js`, `server/lib/securityLog.js` |
| **Payments (finance module)** | SQLite finance tables | `server/lib/paymentsFinance.js` (`finance_payment_intents`, providers); default provider lookup `stripe` in code |
| **Payments (commerce abstraction)** | Commerce layer + guards | `server/lib/commerce/paymentService.js` (Mock default; Stripe/PayPal classes present) |
| **Marketplace (operational channels)** | SQLite marketplace_* | Seeds in `server/lib/db.js` (~956+); logic `server/lib/marketplaceHub.js` |
| **Marketplace (V35 metadata)** | SQLite `mkt35_*` | `server/lib/marketplaceV35.js` |
| **Voice (API path on API service)** | `phoneAssistantService` → `aiChatService` (JSON orders) | `server/plugins/aiAutomationPlugin.js` `/api/ai/phone/*` |
| **Voice (Flask UI)** | Local/intelligence stack | `Buzzard/voice_server.py` — **NOT FOUND** in `render.yaml` services |
| **Markets / locales (country list)** | JSON file | `data/buzzard_europe_countries.json` (**42** country entries per file parse) |
| **International module records** | SQLite `int37_records` | `server/lib/internationalV37.js` |
| **Tax (commerce)** | In-code country map | `server/lib/commerce/taxProvider.js` (`VAT_BY_COUNTRY` subset) |
| **Python orchestrator tasks/approvals** | Separate SQLite file | `intelligence/buzzard_orchestrator.py` tables `tasks`, `approvals` |
| **Guardian approvals** | Guardian SQLite | `intelligence/buzzard_guardian_api.py` `/approvals/*` |

---

## 3. ORCHESTRATOR CONSOLIDATION

Comparison strictly from repository; **no demote/keep recommendation beyond citing `PUSAT_CONSOLIDATION_PLAN.md`**.

| Component | In Render blueprint (`render.yaml`)? | Called from (repo) | DB used | Task types (evidence) | Plan stance (`PUSAT_CONSOLIDATION_PLAN.md`) |
|---|---|---|---|---|---|
| **`server/lib/aiOrchestrator.js`** | Yes (inside `buzzard-api` `startCommand: node server/server.js`) | `server/plugins/controlCenterPlugin.js` (`enqueueTaskProcessing`, `resumeAfterApproval` on lines 5, 149, 203) | `buzzard.db` via `db` → `core_ai_tasks`, `core_approvals` | AI employee tasks; provider execution; approval gate via `taskRequiresApproval` | **Public facade target** (§4.2) |
| **`intelligence/buzzard_orchestrator.py`** | Yes (`buzzard-orchestrator`, uvicorn) | HTTP: `server/lib/orchestratorBridge.js`; callers `productAi.js`, `categoryIntelligence.js`, `orchestratorBridgePlugin.js`, `controlCenter.getSystemStatus` | `BUZZARD_DB` env (`/tmp/buzzard_orchestrator.db` in blueprint) | REST `/tasks`, `/agents`, `/approvals`, demo endpoints (file routes ~1019+) | **Specialist delegate** (§4.2); **do not remove** (§18) |
| **`server/lib/orchestratorBridge.js`** | Yes (env `BUZZARD_ORCHESTRATOR_URL` on API) | Plugins + libs above; **not** used by `pusatPolicyAdapter.js` (test asserts no `fetchOrchestrator` in adapter) | None (HTTP client) | Proxy GET/POST to Python service | **Delegate transport** (§4.3) |
| **`pusat-ai-runtime/src/orchestrator.ts`** | **NOT FOUND** on `main`; package present on workspace branch | Only `server/lib/pusatRuntimeBridge.js` dynamic import of `pusat-ai-runtime/dist/src/index.js`; tests in `server/__tests__/pusatRuntimeBridge.test.mjs` | In-memory `createRuntimeStore()` (no SQLite) | Policy-gated `dispatch()`; agent stubs in `index.ts` | **Read-only delegate when flagged** (§4.2); not production-connected today |

**Double-execution risk (evidence):** `productAi.js` and `categoryIntelligence.js` can `POST` Python `/tasks` while admin can `POST /api/admin/ai/tasks` → `core_ai_tasks` — **no shared idempotency field** on `core_ai_tasks` schema (columns in `db.js` 3269–3288: no `idempotency_key` column).

**Correlation (evidence):** `server/server.js` sets `req.correlationId` via `correlationContext.createContext`; `pusatRuntimeBridge.resolveCorrelationId` reads `req.correlationId` / header path.

---

## 4. APPROVAL CONSOLIDATION

### 4.1 Stores and entry points

| Mechanism | Storage | Create path | Decide path |
|---|---|---|---|
| **Buzzard SoT** | `core_approvals` | `controlCenter.createApproval` (`server/lib/controlCenter.js` ~355) | `controlCenter.decideApproval` → `resumeAfterApproval` in `controlCenterPlugin.js` ~191–204 |
| **Admin HTTP** | same | `POST /api/admin/approvals` | `POST /api/admin/approvals/:id/decide` |
| **AI orchestrator** | same | `aiOrchestrator.js` ~86–93 on critical tasks | via approval `taskId` link |
| **Pusat policy adapter** | same | `mapHumanApprovalToControlCenter` → `createApproval` (`pusatPolicyAdapter.js` ~89–99) | **NOT FOUND** — no Pusat-specific decide handler |
| **Python orchestrator** | SQLite `approvals` in Python DB | Python workflow ~610+ | `/tasks/{task_id}/approval`, `GET /approvals` |
| **Guardian** | Guardian DB via `buzzard_ai_guardian_max.py` | `/approvals/pending`, decide API in `buzzard_guardian_api.py` ~88–104 | separate from `core_approvals` |

### 4.2 Plan-aligned SoT (from `PUSAT_CONSOLIDATION_PLAN.md` §5 — unchanged)

**Phase C approval Source of Truth for Buzzard API / Pusat-gated commerce-critical actions:**  
`core_approvals` + `controlCenter.createApproval` / `decideApproval`.

Pusat path already designed: **Pusat AI → `pusatPolicyAdapter` → `createApproval` → `core_approvals` → human decision → `resumeAfterApproval(taskId)`** when `taskId` present.

---

## 5. PUSAT RUNTIME

| Topic | Repository finding |
|---|---|
| **Files** | `pusat-ai-runtime/src/index.ts`, `orchestrator.ts`, `voice-session.ts`, `policy.ts`, `agents.ts`, …; `server/lib/pusatRuntimeBridge.js`, `pusatPolicyAdapter.js`; `server/__tests__/pusatRuntimeBridge.test.mjs` |
| **Route / plugin wiring** | **NOT FOUND** — grep `dispatchPusatTask` / `pusat` under `server/plugins/`: no matches |
| **`server/server.js`** | **NOT FOUND** — no require of bridge |
| **Production connection** | **NOT CONNECTED** — no Render env; not on `main` |
| **Feature flag** | `PUSAT_RUNTIME_ENABLED === "1"` in `pusatRuntimeBridge.js`; **`PUSAT_RUNTIME_ENABLED` NOT FOUND in `render.yaml`** |
| **Phase C attachment points (plan + evidence)** | (1) Future facade calling `dispatchPusatTask`; (2) reuse `READ_ONLY_ACTIONS` in `pusatPolicyAdapter.js`; (3) `GET_ORDER` → `phoneAssistantService.getVerifiedOrderStatus`; (4) audit via `recordSystemEvent` with `eventType: pusat.audit` |

---

## 6. COMMERCE INTEGRATION

Repo-evidence status for Pusat action → Buzzard engine mapping:

| Domain | Buzzard anchor | Status | Evidence |
|---|---|---|---|
| **Product** | PIM plugins, `products`, catalog JSON, `product_ai` employee | **MEVCUT** | `server/core/constants.js` DEFAULT_AI_EMPLOYEES; PIM plugins |
| **Supplier** | `server/lib/supplier/*`, `supplierHubPlugin.js` | **MEVCUT** | 22 files under `server/lib/supplier/` |
| **Inventory** | `server/lib/wmsInventory.js`, WMS tables | **MEVCUT** | `BUZZARD_WMS_INVENTORY` gated |
| **Pricing** | `price_ai`, coupons, PIM; no standalone PricingEngine module | **ENTEGRASYON GEREKLİ** (named engine) / partial **MEVCUT** | **NOT FOUND** `PricingEngine` in `server/` |
| **Order** | `orderManagement.js`, `orders`, `commerce/orderService.js`, `orders.json` | **DUPLICATE** | Multiple write/read paths |
| **Returns** | `server/lib/returnsRma.js`, `returnsRmaPlugin.js` | **MEVCUT** | Plugin routes for RMA lifecycle |
| **Customer** | CRM/customer plugins, `customerAuth` | **MEVCUT** (fragmented) | **NOT FOUND** single CustomerEngine |
| **Payment** | `paymentsFinance.js`, `commerce/paymentService.js` | **MEVCUT** | Separate layers; finance uses SQLite |

Pusat read-only actions in adapter (`GET_ORDER`, `CHECK_AVAILABILITY`, …): **only `GET_ORDER` implemented** in `executeReadOnlyBuzzardAction`; others **NOT FOUND** as Buzzard lookups in adapter.

---

## 7. MARKETPLACE

### 7.1 Infrastructure

- **Hub:** `server/lib/marketplaceHub.js` — `CHANNELS`: `amazon`, `ebay`, `google_shopping`, `tiktok_shop`
- **DB seeds:** `server/lib/db.js` — same four codes in `marketplace_channels` insert (~956–965)
- **V35:** `server/lib/marketplaceV35.js` — generic `mkt35_records` / jobs (not channel-specific connectors)

### 7.2 Channel presence in `server/` (marketplace code)

| Channel | Found in repo? | Location |
|---|---|---|
| Amazon | Yes | `marketplaceHub.js`, `db.js` seeds |
| eBay | Yes | same |
| Google Shopping | Yes | same |
| TikTok Shop | Yes | same |
| Kaufland | **NOT FOUND** in `server/` | Names appear in `intelligence/website_monitoring/config/sites.json` (monitoring only, not marketplace connector) |
| OTTO | **NOT FOUND** in `server/` | monitoring config only |
| Allegro | **NOT FOUND** in `server/` | — |
| bol.com | **NOT FOUND** in `server/` | — |
| Cdiscount | **NOT FOUND** in `server/` | — |
| eMAG | **NOT FOUND** in `server/` | — |
| Skroutz | **NOT FOUND** in `server/` | — |

---

## 8. PAYMENT

| Capability | Repository finding |
|---|---|
| **Stripe** | `render.yaml` `STRIPE_SECRET_KEY`, `DEFAULT_PAYMENT_PROVIDER=stripe`; `paymentsFinance.js` provider code `stripe`; `commerce/paymentService.js` `StripeProvider` class |
| **PayPal** | `render.yaml` `PAYPAL_CLIENT_*`; `paymentVerification.js` valid provider `paypal` |
| **SEPA** | String validation only: `ordersPlugin.js` `VALID_PAYMENTS` includes `sepa`; `paymentVerification.js` — **NOT FOUND** bank file / mandate handling |
| **EBICS** | **NOT FOUND IN REPOSITORY** (grep `EBICS` under `server/`: no matches) |
| **Supplier payout** | **NOT FOUND** dedicated payout connector in `server/lib` |
| **Bank connector** | **NOT FOUND IN REPOSITORY** |

---

## 9. VOICE

| Component | Role | Production on Render? |
|---|---|---|
| **`phoneAssistantService.js`** | Order verify/status via `aiChatService.findOrder` → **`server/data/orders.json`** | Exposed on API: `aiAutomationPlugin.js` `POST /api/ai/phone/verify-order`, `order-status`, `escalate` |
| **`aiAutomationPlugin.js`** | Registers voice/phone routes + AI chat | Part of `buzzard-api` plugin load |
| **`Buzzard/voice_server.py`** | Flask intelligence voice UI | **NOT FOUND** in `render.yaml` |
| **Pusat `VoiceSessionManager`** | In-memory sessions (`voice-session.ts`) | **NOT wired** to HTTP |

**Production voice path (repo + Render):** **`/api/ai/phone/*` → `phoneAssistantService`** on `buzzard-api`.

**Phase C attachment (per `PUSAT_CONSOLIDATION_PLAN.md` §12):** voice facade → **`phoneAssistantService`** + orchestration read-only dispatch — **route NOT FOUND in repo yet**.

---

## 10. MARKET / LOCALE

| Concern | Where stored | Notes |
|---|---|---|
| **Country list** | `data/buzzard_europe_countries.json` | 42 entries; fields include `code`, `locale`, `language`, `currency`, `taxRate`, `taxModel`, `deliveryDays`, `rtl` |
| **35 / 37 market files** | `global_countries_35` — **NOT FOUND**; 37-market list exists only in upload `pusat_core_f46e.py`, not in repo |
| **International module** | `server/lib/internationalV37.js` | Generic records/jobs, not per-country registry |
| **Localization feeds** | `server/lib/localizationFeeds.js` | Merchant XML |
| **VAT/tax (commerce)** | `server/lib/commerce/taxProvider.js` | Limited `VAT_BY_COUNTRY` keys (DE, AT, FR, IT, ES, BE, NL, PL) |
| **Shipping** | `server/lib/shippingEngine.js` (referenced by orders plugin); country JSON `deliveryDays` | — |
| **Currency** | `orders.currency`, commerce cart/checkout bodies | — |

**Pusat Core markets (TR, GCC, EG, GB, CH):** **NOT FOUND** as entries in `buzzard_europe_countries.json` (file is Europe-focused naming; full list not exhaustively verified per code in this report — Phase C should diff JSON codes vs Pusat upload list).

---

## 11. SECURITY / RBAC

Phase C should reuse existing stack (all under `server/`):

| Layer | File |
|---|---|
| Authentication | `server/lib/auth.js`, `server/lib/dbAuth.js` |
| Authorization / RBAC | `server/lib/rbac.js`, `aiCanExecute` |
| Route permissions | `server/lib/routePermissions.js` — includes `GET/POST /api/admin/ai/tasks`, `GET/POST /api/admin/approvals`, `POST .../decide` |
| Global middleware | `server/lib/globalAuthMiddleware.js` — CSRF via `validateCsrfForRequest` |
| Rate limiting | `server/server.js` `apiRateLimit`; plugin-level limiters in commerce |
| Audit | `server/lib/coreAudit.js`, `controlCenter.recordSystemEvent`, `securityLog.js` |
| Production validation | `server/lib/environmentValidation.js`, `configurationValidation.js` |

**Pusat second auth system:** Pusat runtime uses `PolicyEngine` + scopes (`pusat-ai-runtime/src/policy.ts`, `pusatPolicyAdapter.buildAuthorizationScopes`) mapped to **existing** Buzzard permissions — **NOT FOUND** separate JWT/realm for Pusat in repo.

**Conclusion (evidence):** Phase C **does not require** a new auth system if it uses `routePermissions` + `rbac` + admin session like control center routes.

---

## 12. DUPLICATES / RISKS

Phase C must avoid creating or treating as SoT:

| Risk | Evidence |
|---|---|
| Second commerce DB | `pusat.db` / PUSAT_DB — **NOT IN REPO**; plan forbids |
| Second approval system for API | Python `approvals`, Guardian `/approvals` coexist today |
| Second order system | `orders` + `commerce_orders` + `orders.json` |
| Second orchestrator face without dedupe | Python POST tasks + `core_ai_tasks` |
| Second voice server in production | `voice_server.py` vs `/api/ai/phone` |
| Second payment stack | `paymentsFinance` vs `commerce/paymentService` vs JSON checkout payments |
| Phone order lookup on JSON while OMS uses SQLite | `phoneAssistantService` → `orders.json` |

---

## 13. PHASE C REQUIRED ROUTES

**Existing relevant routes (found):**

| Method | Path | Handler | Permission (routePermissions) | R/W | SoT |
|---|---|---|---|---|---|
| POST | `/api/admin/ai/tasks` | `controlCenter.createAiTask` + `enqueueTaskProcessing` | `ai.assign` | write (task create) | `core_ai_tasks` |
| GET | `/api/admin/ai/tasks` | `listAiTasks` | `ai.read` | read | `core_ai_tasks` |
| POST | `/api/admin/approvals` | `createApproval` | `ai.assign` | write | `core_approvals` |
| POST | `/api/admin/approvals/:id/decide` | `decideApproval` + optional `resumeAfterApproval` | `ai.execute` | write | `core_approvals` |
| GET | `/api/orchestrator/status` | `getOrchestratorStatus` | public | read | HTTP to Python |
| GET | `/api/orchestrator/tasks` | `fetchOrchestrator` | public | read | Python DB |
| POST | `/api/ai/phone/order-status` | `phoneAssistantService.getVerifiedOrderStatus` | **NOT FOUND** in `routePermissions` EXACT list (may fall through heuristics / public API) | read | **`orders.json`** via aiChatService |
| GET | `/api/commerce/*` | `commerceCorePlugin` | mixed public/read | mixed | `commerce_*` tables |

**NOT FOUND in repository (Phase C specs from `PUSAT_CONSOLIDATION_PLAN.md` §19 — proposed only):**

| Proposed path | Method | Intended handler | Permission | R/W | SoT |
|---|---|---|---|---|---|
| `/api/admin/orchestration/dispatch` | POST | future `orchestrationFacade` → `aiOrchestrator` / optional `dispatchPusatTask` | likely `ai.assign` / `ai.execute` | read-first | `core_ai_tasks`, events |
| `/api/admin/pusat/dispatch` | POST | **NOT FOUND** — alternative name | — | — | — |
| Pusat voice unified route | POST | **NOT FOUND** | — | — | — |

Any Phase C route must be added to `server/lib/routePermissions.js` EXACT map (pattern established lines 89–96).

---

## 14. PHASE C IMPLEMENTATION ORDER

Only steps supported by repo + `PUSAT_CONSOLIDATION_PLAN.md`:

1. **Documentation / input** — this file + consolidation plan (Phase 0).
2. **Merge decision** — land `pusat-ai-runtime`, bridge, tests on `main` without enabling flag (plan Phase 1; blocker: currently **not on `main`**).
3. **Add `orchestrationFacade.js` (new file)** — read-only dispatch mirroring `pusatPolicyAdapter.READ_ONLY_ACTIONS`; unit tests (plan §19 step 2–3).
4. **Register admin route** — `POST /api/admin/orchestration/dispatch` in new or existing plugin + `routePermissions.js` (plan step 4–5).
5. **Wire correlation** — ensure facade passes `req.correlationId` into task payload / events (existing middleware in `server.js` ~283–291).
6. **Approval consistency** — all facade blocked writes → `createApproval` only (existing adapter pattern).
7. **Optional Python delegate** — facade branch calling `orchestratorBridge.fetchOrchestrator` with correlation header (plan Phase 3; today used from `productAi.js` not from admin facade).
8. **Pusat TS delegate** — call `dispatchPusatTask` only when `PUSAT_RUNTIME_ENABLED=1` (plan: non-production until sign-off).
9. **Voice** — extend `aiAutomationPlugin` to call facade instead of direct service for order actions (plan Phase 8).
10. **Order SoT alignment** — separate workstream: phone assistant reading SQLite — **NOT FOUND** in current `phoneAssistantService.js`.

---

## 15. BLOCKERS

| ID | Blocker | Evidence |
|---|---|---|
| B1 | Pusat bridge/runtime **not on `main`** | `git show main:server/lib/pusatRuntimeBridge.js` fatal |
| B2 | **No HTTP route** to Pusat bridge | No plugin references |
| B3 | **`PUSAT_RUNTIME_ENABLED` absent** from production blueprint | `render.yaml` grep |
| B4 | **Phone orders use JSON**, not SQLite OMS | `aiChatService.js` `ordersFile` |
| B5 | **Dual approval stores** (Python/Guardian vs `core_approvals`) | Separate services in blueprint |
| B6 | **No orchestration facade file** | **NOT FOUND** `orchestrationFacade.js` |
| B7 | **Partial read-only action wiring** | Only `GET_ORDER` in `executeReadOnlyBuzzardAction` |
| B8 | **No idempotency column** on `core_ai_tasks` | `db.js` schema |

**Blocker count: 8**

---

## 16. SAFE TO IMPLEMENT NOW

(Without changing production behavior on `main` — i.e. on a branch, flags default OFF, no Render env changes.)

| Item | Rationale |
|---|---|
| `orchestrationFacade.js` + tests | No registration in `server.js` until plugin added; dead code safe if unwired |
| Route spec + `routePermissions` entries behind feature flag | Plugin can no-op when flag off |
| Documentation / ADR | No runtime effect |
| Extend unit tests in `pusatRuntimeBridge.test.mjs` | Test-only |
| Market registry **design** JSON draft (not wired) | Data file only if not imported |

**NOT safe without resolving B1/B4:** enabling any production path that serves order status from wrong SoT.

---

## 17. DO NOT TOUCH

Per `PUSAT_CONSOLIDATION_PLAN.md` §18 and repo SoT:

- `server/lib/db.js` — no Pusat tables / no destructive schema without ADR
- `controlCenter.createApproval` / `core_approvals` semantics as SoT
- `render.yaml` `BUZZARD_DB_PATH`, production env secrets
- Remove `intelligence/buzzard_orchestrator.py` service
- Enable `PUSAT_RUNTIME_ENABLED=1` on production Render
- Deploy `pusat_core_f46e.py` or create `pusat.db`
- Delete `ordersPlugin.js` / JSON orders without migration plan

---

## 18. FINAL HANDOFF

### A) READY FOR PHASE C

| Item | Path |
|---|---|
| Consolidation target architecture | `/workspace/PUSAT_CONSOLIDATION_PLAN.md` |
| Architecture export baseline | `/workspace/PUSAT_ARCHITECTURE_EXPORT.md` |
| Node AI orchestrator | `/workspace/server/lib/aiOrchestrator.js` |
| Control center approvals/tasks | `/workspace/server/lib/controlCenter.js`, `/workspace/server/plugins/controlCenterPlugin.js` |
| Pusat policy mapping (Phase B pattern) | `/workspace/server/lib/pusatPolicyAdapter.js` |
| Pusat bridge (local branch) | `/workspace/server/lib/pusatRuntimeBridge.js` |
| RBAC route map | `/workspace/server/lib/routePermissions.js` |
| Pusat runtime factory | `/workspace/pusat-ai-runtime/src/index.ts` |
| Bridge safety tests | `/workspace/server/__tests__/pusatRuntimeBridge.test.mjs` |
| Production blueprint reference | `/workspace/render.yaml` |

### B) NEEDS CLARIFICATION

| Item | Path / note |
|---|---|
| Which order store is authoritative for **phone** vs **customer account** | `orders.json` vs `orders` table |
| Whether Phase C merges Pusat to `main` before or after facade | Git process |
| Public vs admin for `/api/ai/phone/*` in `routePermissions` | `routePermissions.js` gap |
| Full 37-market diff vs `buzzard_europe_countries.json` (42 entries) | `data/buzzard_europe_countries.json` |
| Guardian vs control center approval boundaries | Guardian API vs `core_approvals` |

### C) BLOCKED

| Item | Path / reason |
|---|---|
| Production Pusat runtime activation | Not on `main`; no env; no routes |
| Unified dispatch HTTP API | **NOT FOUND** |
| EBICS / bank payment Phase C | **NOT FOUND IN REPOSITORY** |
| EU marketplace connectors (Kaufland, OTTO, …) | **NOT FOUND** in `server/lib/marketplace*` |
| Seller/partner engine | **NOT FOUND** in `server/lib` |
| `GET_PRODUCT` etc. Buzzard backends for Pusat adapter | **NOT FOUND** in `pusatPolicyAdapter.js` |

---

## Appendix — Key schema excerpts (Phase C reference)

**`core_ai_tasks` / `core_approvals` / `core_system_events`:** `server/lib/db.js` lines 3269–3352 (read in this audit).

**`orders` (SQLite):** `server/lib/db.js` ~64–80.

**`marketplace_channels` seeds:** `server/lib/db.js` ~956–965.

**`commerce_orders`:** `server/lib/db.js` ~3711+.

---

NO CODE CHANGES MADE

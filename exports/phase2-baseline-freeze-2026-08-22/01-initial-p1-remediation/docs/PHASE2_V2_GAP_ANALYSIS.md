# BUZZARD AI CORE — PHASE 2 V2 GAP ANALYSIS

**Date:** 2026-08-22  
**Input status:** 72/100 — `PHASE2_PARTIAL`  
**Target status:** `PHASE2_READY` (no unresolved P0/P1 blockers preventing intended Phase 2 operation)  
**Method:** Code inspection of `code/ai_core/`, `code/settings.py`, `tests/`, cross-check against `PHASE2_FINAL_VERIFICATION_V2.md`, `PHASE2_REMEDIATION_REPORT.md`, and `PHASE2_IMPLEMENTATION_PLAN.md`  
**Code modified:** NO  
**Phase 3 started:** NO

---

## Executive Summary

Phase 2 moved from **18/100 BLOCKED** to **72/100 PARTIAL** because the **foundation architecture is implemented and testable**. It is not `PHASE2_READY` because multiple **P1 gaps** remain: incomplete test coverage (~17% of plan), domain workers that cannot produce real commerce outcomes, security controls that exist as classes but are not fully enforced at runtime, database tables that are migrated but not populated, and exception/Kurmay integration paths that are only partially wired.

The **28-point gap** (72 → 100) breaks down as:

| Score component | Current (approx.) | Gap to READY | Primary reason |
|-----------------|-------------------|--------------|----------------|
| Worker implementation (25%) | 17.5/25 | −5 to −7 | Domain workers are scaffolds; no schema validation; permissions not enforced at execution |
| Category Intelligence (15%) | 13.5/15 | −1 to −2 | All 48 L1 covered; legacy `category-worker` still registered |
| Kurmay AI (10%) | 7.5/10 | −2 to −2.5 | Deterministic only; no exception-triggered synthesis; limited conflict analysis |
| Central systems (15%) | 13.5/15 | −1 to −2 | Namespace guard designed but not enforced in memory writes |
| Security (10%) | 6.0/10 | −3 to −4 | No API rate limit middleware; no EsatBey dual-write; weak token RBAC |
| Database (10%) | 9.0/10 | −1 | Tables 004–005 exist but runtime uses in-memory registries |
| API (5%) | 4.25/5 | −0.5 to −1 | Health-check is trivial; role header spoofable |
| Tests (10%) | 2.5/10 | −7 to −7.5 | 24/143 planned Phase 2 tests |
| Architecture compliance (10%) | 9.0/10 | −1 | Doc sync incomplete; planned modules missing |

---

## Authoritative Category Intelligence

| Field | Value | Evidence |
|-------|-------|----------|
| **Authoritative source** | `master_taxonomy_48_maximal/data/taxonomy.json` | `settings.BUZZARD_MASTER_TAXONOMY_PATH` default |
| **Schema** | `buzzard.master-taxonomy.v2` | JSON `schema` field |
| **Declared L1 count** | 48 | JSON `main_categories: 48` |
| **Runtime L1 count** | **48** | `TaxonomyRegistry.list_main_categories()` — verified live |
| **L1 ID range** | `bz.01` … `bz.48` | Runtime enumeration |
| **Hard-coded count in code** | **NO** | Count via `main_category_count()` |
| **Category workers provisioned** | **48** (`category-bz.01` … `category-bz.48`) | `CategoryWorkerFactory.create_workers()` |
| **Missing L1 workers** | **0** | Runtime check: `missing_workers = []` |
| **Extra category worker** | **1** (`category-worker` legacy stub) | Still registered in `build_phase2_registry()` |
| **Every current main category supported** | **YES** (48/48) | Each L1 has dedicated `CategoryExpertWorker` |
| **Document conflicts** | `DOC_INDEX.md` references "49 workers" (doc only) | Does not affect runtime; code uses taxonomy JSON |

**Decision:** Use `master_taxonomy_48_maximal/data/taxonomy.json` as authoritative. Do not assume 43 or 50 categories.

---

## BUZZARD_AI_CORE_V2 Feature Flag Analysis

| Question | Finding |
|----------|---------|
| **Where defined** | `config/settings.py` L26: `BUZZARD_AI_CORE_V2 = os.getenv("BUZZARD_AI_CORE_V2", "false").lower() in {"1", "true", "yes", "on"}` |
| **What it controls** | `get_registry()` in `ai_core/workers/registry.py` L96–99: returns `build_phase2_registry()` when true, else `build_default_registry()` (5 Phase 1 stubs) |
| **Also exposed** | `/api/v1/health/ready` returns `"ai_core_v2": settings.BUZZARD_AI_CORE_V2` |
| **Default** | `false` — production runs Phase 1 worker set unless flag enabled |
| **Phase 1 regression** | Safe: 366/366 tests pass with V2=0 and V2=1 |
| **Production dependency** | **YES — critical:** Without `BUZZARD_AI_CORE_V2=1`, routed tasks (`supplier_sync`, `product_enrich`, etc.) resolve to worker IDs **not registered** in Phase 1 registry → `WorkerExecutionError` |
| **Safety concern** | Flag is env-only; no per-request override. Misconfiguration silently reverts to Phase 1 stubs while API/orchestrator routing still references Phase 2 worker IDs in `WORKER_ROUTING` |
| **Recommendation before READY** | Document mandatory prod env; add startup warning when routing targets unregistered workers; consider default-on after validation period |

---

## Gap Catalog

### A. Core Worker Execution

#### GAP-A-001
| # | Field |
|---|-------|
| **ID** | GAP-A-001 |
| **Severity** | P1 |
| **Exact missing/broken functionality** | Worker output schema validation not implemented in `WorkerExecutor` |
| **Source-code evidence** | `ai_core/workers/executor.py` — no schema validation; grep `validate`/`schema` in `ai_core/workers/` returns 0 matches. `ai_core/schemas/workers/` directory does not exist |
| **Test evidence** | No schema validation tests. `test_ai_core_phase2_foundation.py` tests `WorkerResult` fields only |
| **Architecture requirement** | `PHASE2_IMPLEMENTATION_PLAN.md` Step 0.4, 0.6 — schema validation in executor, `ai_core/schemas/workers/` |
| **Why it prevents PHASE2_READY** | Workers can return unstructured output; orchestrator cannot reliably validate RESULT → MEMORY flow |
| **Required fix** | Add per-worker JSON schemas; validate `WorkerResult.output` before `_complete_running` persists |
| **Dependencies** | BuzzardWorker contract (done) |
| **Complexity** | MEDIUM |

#### GAP-A-002
| # | Field |
|---|-------|
| **ID** | GAP-A-002 |
| **Severity** | P1 |
| **Exact missing/broken functionality** | Worker permissions declared but not enforced at execution time |
| **Source-code evidence** | `WorkerExecutor.__init__` accepts `required_permission` but orchestrator creates executor without it (`orchestrator.py` L366). Permission check only runs when `required_permission` is set (`executor.py` L44–49) |
| **Test evidence** | `test_buzzard_worker_permissions` tests `check_permission()` on worker object only — not execution boundary |
| **Architecture requirement** | `PHASE2_PERMISSION_MATRIX.md` — least privilege enforced before run |
| **Why it prevents PHASE2_READY** | Any registered worker can execute any task type routed to it regardless of permission matrix |
| **Required fix** | Map task types → required permissions; pass to `WorkerExecutor` or check all declared permissions per task |
| **Dependencies** | GAP-A-001 (optional) |
| **Complexity** | MEDIUM |

#### GAP-A-003
| # | Field |
|---|-------|
| **ID** | GAP-A-003 |
| **Severity** | P1 |
| **Exact missing/broken functionality** | Domain workers return `EXTERNAL_INTEGRATION_PENDING` / `NO_DATA_AVAILABLE` for all real commerce paths |
| **Source-code evidence** | `supplier/hub_worker.py` L28–40: fails when `supplier_feeds != CONNECTED`. `product/intelligence_worker.py` L28–36: fails on `NO_DATA_AVAILABLE`. `IntegrationStatusRegistry._static` — all integrations `EXTERNAL_INTEGRATION_PENDING` |
| **Test evidence** | No domain worker execution tests. Registry presence only (`test_routed_workers_registered`) |
| **Architecture requirement** | `PHASE2_WORKER_SPEC.md` §3–§12 — domain workers produce structured commerce intelligence |
| **Why it prevents PHASE2_READY** | End-to-end worker execution lifecycle works mechanically but cannot deliver intended Phase 2 business outcomes |
| **Required fix** | Connect CommerceBridge + integration adapters to live data sources (Step 13) |
| **Dependencies** | GAP-I-001, GAP-M-002 |
| **Complexity** | HIGH |

#### GAP-A-004
| # | Field |
|---|-------|
| **ID** | GAP-A-004 |
| **Severity** | P2 |
| **Exact missing/broken functionality** | `ExecutionPolicy` and `WorkerHealth` models not implemented |
| **Source-code evidence** | Grep `ExecutionPolicy`, `WorkerHealth` in `ai_core/` — 0 matches. Agent health-check checks `bool(worker.capabilities)` only (`agents.py` L55–58) |
| **Test evidence** | `test_agent_detail` passes; no real health probe |
| **Architecture requirement** | `PHASE2_IMPLEMENTATION_PLAN.md` Step 0.2 |
| **Why it prevents PHASE2_READY** | Cannot verify worker readiness in production; degrades observability |
| **Required fix** | Implement health models; real health-check per worker family |
| **Dependencies** | GAP-G-001 |
| **Complexity** | MEDIUM |

---

### B. Kurmay AI

#### GAP-B-001
| # | Field |
|---|-------|
| **ID** | GAP-B-001 |
| **Severity** | P1 |
| **Exact missing/broken functionality** | Kurmay not triggered on HIGH/CRITICAL exceptions |
| **Source-code evidence** | `_should_trigger_kurmay()` only inspects `memory_entries` impact (`orchestrator.py` L456–468). `_handle_worker_failure` creates exceptions but does not trigger Kurmay. `exception/coordinator.py` has no Kurmay wiring |
| **Test evidence** | No test for exception→Kurmay path. `test_kurmay_synthesis_task` uses memory entries only |
| **Architecture requirement** | `PHASE2_IMPLEMENTATION_PLAN.md` Step 2.5 — Kurmay trigger on HIGH/CRITICAL exceptions |
| **Why it prevents PHASE2_READY** | Cross-domain synthesis incomplete when workers fail or raise exceptions |
| **Required fix** | Trigger `kurmay_synthesis` with `exception_entries` when severity ≥ HIGH |
| **Dependencies** | GAP-E-002 |
| **Complexity** | MEDIUM |

#### GAP-B-002
| # | Field |
|---|-------|
| **ID** | GAP-B-002 |
| **Severity** | P2 |
| **Exact missing/broken functionality** | Kurmay synthesis is deterministic rule engine only — no specialist conflict resolution |
| **Source-code evidence** | `kurmay/rule_engine.py` — detects data gaps (`NO_DATA_AVAILABLE`) but does not compare conflicting specialist outputs (e.g. price deltas between sources) |
| **Test evidence** | `test_kurmay_rule_engine_synthesizes_conflicts` passes two entries but only checks `recommendations is not None` |
| **Architecture requirement** | `PHASE2_ARCHITECTURE.md` §6 — synthesize specialist results, identify conflicts |
| **Why it prevents PHASE2_READY** | Kurmay cannot produce executive decisions from competing worker signals |
| **Required fix** | Add conflict detection rules (numeric divergence, namespace collisions, risk aggregation) |
| **Dependencies** | GAP-A-003 (needs real specialist data) |
| **Complexity** | MEDIUM |

#### GAP-B-003
| # | Field |
|---|-------|
| **ID** | GAP-B-003 |
| **Severity** | P2 |
| **Exact missing/broken functionality** | Auto-triggered Kurmay child tasks do not persist via `KurmayService` |
| **Source-code evidence** | Orchestrator creates `kurmay_synthesis` child task (`orchestrator.py` L440–449). `KurmaySynthesisWorker` writes memory but orchestrator path does not call `KurmayService.synthesize()` for auto-triggers. Reports API reads DB via `KurmayService.list_reports()` |
| **Test evidence** | `test_kurmay_service_persists_report` tests service directly; auto-trigger path not tested |
| **Architecture requirement** | `PHASE2_DATA_FLOW.md` — Kurmay reports persisted and queryable |
| **Why it prevents PHASE2_READY** | Auto-synthesis may not appear in `/api/v1/reports/kurmay` unless worker memory is separately indexed |
| **Required fix** | Call `KurmayService.synthesize()` in orchestrator after child task or inside worker with DB session |
| **Dependencies** | None |
| **Complexity** | LOW |

---

### C. Category Intelligence

#### GAP-C-001
| # | Field |
|---|-------|
| **ID** | GAP-C-001 |
| **Severity** | P2 |
| **Exact missing/broken functionality** | Legacy `category-worker` stub coexists with 48 dynamic workers in V2 registry |
| **Source-code evidence** | `build_phase2_registry()` registers `CategoryScanWorker()` (L74) plus 48 `CategoryExpertWorker` instances (L90–91). Results in 49 `category-*` workers; extra `category-worker` |
| **Test evidence** | `test_worker_count_matches_taxonomy_l1` checks factory count only, not registry deduplication |
| **Architecture requirement** | `PHASE2_CATEGORY_INTELLIGENCE_ARCHITECTURE.md` — one worker per L1 via factory; no monolithic stub |
| **Why it prevents PHASE2_READY** | Ambiguous routing if `category_scan` invoked without `category_id`; stub returns synthetic category list unrelated to taxonomy |
| **Required fix** | Remove `CategoryScanWorker` from `build_phase2_registry()` when V2 enabled; retain only in Phase 1 registry |
| **Dependencies** | None |
| **Complexity** | LOW |

#### GAP-C-002
| # | Field |
|---|-------|
| **ID** | GAP-C-002 |
| **Severity** | P2 |
| **Exact missing/broken functionality** | Category scan depends on legacy `category_intelligence_43_maximal` bridge — name implies 43, taxonomy has 48 |
| **Source-code evidence** | `workers/category/bridge.py` imports `category_intelligence_43_maximal.category_intelligence.agent`. Maps `bz.XX` → `CXX` legacy IDs |
| **Test evidence** | `test_category_scan_writes_memory` passes with offers — bridge works for bz.01. No per-category test for all 48 |
| **Architecture requirement** | Bridge to existing intelligence modules per category |
| **Why it prevents PHASE2_READY** | Unclear whether all 48 L1 categories have equivalent legacy agent depth; only runtime factory guarantees worker existence |
| **Required fix** | Audit legacy agent coverage per L1; document or extend bridge for categories without legacy agents |
| **Dependencies** | None |
| **Complexity** | MEDIUM |

#### GAP-C-003
| # | Field |
|---|-------|
| **ID** | GAP-C-003 |
| **Severity** | P3 |
| **Exact missing/broken functionality** | No automated test covering all 48 category workers individually |
| **Source-code evidence** | `test_category_worker_registered_in_registry` loops all L1 nodes — registration only, no execution |
| **Test evidence** | 6 category tests; 0 parameterized execution tests across 48 workers |
| **Architecture requirement** | Per-step exit criteria require per-worker tests |
| **Why it prevents PHASE2_READY** | Cannot prove each category worker executes correctly |
| **Required fix** | Parameterized test: `category_scan` for each L1 with minimal offers payload |
| **Dependencies** | GAP-L-002 |
| **Complexity** | MEDIUM |

---

### D. Central Memory

#### GAP-D-001
| # | Field |
|---|-------|
| **ID** | GAP-D-001 |
| **Severity** | P1 |
| **Exact missing/broken functionality** | Namespace write permission guard not enforced in `CentralMemoryService` |
| **Source-code evidence** | `PolicyEngine.can_write_namespace()` exists (`policies.py` L15–21). `memory_service.py` `write()` — no policy check; grep `can_write_namespace` — only definition, no callers |
| **Test evidence** | No namespace guard tests in `test_ai_core_phase2_security.py` |
| **Architecture requirement** | `PHASE2_IMPLEMENTATION_PLAN.md` Step 1.6 — namespace write permission check |
| **Why it prevents PHASE2_READY** | Workers can write to any namespace regardless of role/permission matrix |
| **Required fix** | Pass actor role to `memory.write()`; enforce `PolicyEngine.can_write_namespace()` |
| **Dependencies** | GAP-F-001 |
| **Complexity** | MEDIUM |

#### GAP-D-002
| # | Field |
|---|-------|
| **ID** | GAP-D-002 |
| **Severity** | P2 |
| **Exact missing/broken functionality** | Domain memory namespaces incomplete — only `categories/*` and `insights/kurmay` used |
| **Source-code evidence** | Grep `suppliers/`, `products/`, `pricing/`, `orders/` in `ai_core/` — 0 worker memory writes. Domain workers do not emit `memory_entries[]` |
| **Test evidence** | Only `test_category_scan_writes_memory` verifies namespace write |
| **Architecture requirement** | `PHASE2_CATEGORY_INTELLIGENCE_ARCHITECTURE.md` §6; worker spec per domain |
| **Why it prevents PHASE2_READY** | Kurmay and downstream consumers lack domain-scoped memory for non-category workers |
| **Required fix** | Domain workers write to `suppliers/`, `products/`, `pricing/`, `orders/` namespaces on success |
| **Dependencies** | GAP-A-003 |
| **Complexity** | MEDIUM |

---

### E. Exception Engine

#### GAP-E-001
| # | Field |
|---|-------|
| **ID** | GAP-E-001 |
| **Severity** | P1 |
| **Exact missing/broken functionality** | `ExceptionCoordinatorWorker` not wired with `ExceptionCoordinator` instance |
| **Source-code evidence** | `registry.py` L86: `ExceptionCoordinatorWorker()` — no coordinator injected. `coordinator_worker.py` L36–47: returns `NO_DATA_AVAILABLE` when `self._coordinator is None` |
| **Test evidence** | No `test_ai_core_phase2_exception.py`. Phase 1 `test_exception_lifecycle` does not test coordinator worker |
| **Architecture requirement** | `PHASE2_IMPLEMENTATION_PLAN.md` Step 2.1–2.4 |
| **Why it prevents PHASE2_READY** | `exception_route` tasks always fail at worker level despite coordinator service existing |
| **Required fix** | Factory-inject `ExceptionCoordinator(session, exception_service)` into worker at registry build |
| **Dependencies** | None |
| **Complexity** | LOW |

#### GAP-E-002
| # | Field |
|---|-------|
| **ID** | GAP-E-002 |
| **Severity** | P1 |
| **Exact missing/broken functionality** | Exception→Kurmay and exception→audit cross-domain routing incomplete |
| **Source-code evidence** | `ExceptionCoordinator.route_exception` transitions to ASSIGNED only. No Kurmay call. Orchestrator does not pass `worker_result.exceptions` to Kurmay trigger (exceptions created in `_complete_running` L423–433 but not fed to `_should_trigger_kurmay`) |
| **Test evidence** | No integration test for exception triage → Kurmay |
| **Architecture requirement** | `PHASE2_IMPLEMENTATION_PLAN.md` Step 2.5, 2.8 |
| **Why it prevents PHASE2_READY** | Exception lifecycle stops at CLASSIFIED/ASSIGNED without executive synthesis |
| **Required fix** | Wire HIGH/CRITICAL exceptions to Kurmay; complete coordinator integration tests |
| **Dependencies** | GAP-E-001, GAP-B-001 |
| **Complexity** | MEDIUM |

#### GAP-E-003
| # | Field |
|---|-------|
| **ID** | GAP-E-003 |
| **Severity** | P2 |
| **Exact missing/broken functionality** | `exception_triage` task type not in `WORKER_ROUTING` |
| **Source-code evidence** | `WORKER_ROUTING` has `exception_route` only (`orchestrator.py` L48). Plan Step 2.7 references `exception_triage` |
| **Test evidence** | None |
| **Architecture requirement** | `PHASE2_IMPLEMENTATION_PLAN.md` Step 2.7 |
| **Why it prevents PHASE2_READY** | API/clients using `exception_triage` alias would route to `central-orchestrator` |
| **Required fix** | Add routing alias or document canonical task type |
| **Dependencies** | GAP-E-001 |
| **Complexity** | LOW |

---

### F. Security

#### GAP-F-001
| # | Field |
|---|-------|
| **ID** | GAP-F-001 |
| **Severity** | P1 |
| **Exact missing/broken functionality** | API authentication is single shared bearer token — no per-user RBAC |
| **Source-code evidence** | `deps.authorize()` L70–72: token equality check only; returns hardcoded `"api-user"`. `get_actor_role()` uses optional `X-Actor-Role` header — client self-asserts role |
| **Test evidence** | `test_agents_endpoint_requires_auth` — binary auth only. `test_approve_requires_authorized_role` tests orchestrator directly, not API |
| **Architecture requirement** | `PHASE2_PERMISSION_MATRIX.md` §1 — role-based access control |
| **Why it prevents PHASE2_READY** | Any token holder can set `X-Actor-Role: admin` and approve high-risk tasks via API |
| **Required fix** | JWT or signed role claims; reject self-asserted roles in production; map token → roles |
| **Dependencies** | None |
| **Complexity** | HIGH |

#### GAP-F-002
| # | Field |
|---|-------|
| **ID** | GAP-F-002 |
| **Severity** | P2 |
| **Exact missing/broken functionality** | `reject()` does not enforce approver role check |
| **Source-code evidence** | `orchestrator.approve()` checks `policy.can_approve(role)` (L231–232). `reject()` (L252–268) — no role check |
| **Test evidence** | No reject authorization test |
| **Architecture requirement** | Symmetric approval policy for approve/reject |
| **Why it prevents PHASE2_READY** | Unauthorized actors can reject tasks in REVIEW |
| **Required fix** | Add `can_approve()` check to `reject()` |
| **Dependencies** | None |
| **Complexity** | LOW |

#### GAP-F-003
| # | Field |
|---|-------|
| **ID** | GAP-F-003 |
| **Severity** | P2 |
| **Exact missing/broken functionality** | API rate limiting not wired — no HTTP 429 |
| **Source-code evidence** | `RateLimiter` in `security/rate_limiter.py`. `api/middleware.py` — only `RequestIdMiddleware`; no rate limit middleware |
| **Test evidence** | `test_rate_limiter_blocks_excess` — unit test only |
| **Architecture requirement** | `PHASE2_IMPLEMENTATION_PLAN.md` Step 1.3 |
| **Why it prevents PHASE2_READY** | API vulnerable to abuse; rate limiter exists but not operational |
| **Required fix** | Add FastAPI middleware using `RateLimiter` per actor/IP |
| **Dependencies** | None |
| **Complexity** | LOW |

#### GAP-F-004
| # | Field |
|---|-------|
| **ID** | GAP-F-004 |
| **Severity** | P2 |
| **Exact missing/broken functionality** | EsatBey security events not dual-written to `ai_core_audit_log` |
| **Source-code evidence** | `SecurityService.record()` calls `self._esat.record()` only (`security/service.py` L26–27). No `AuditService.log()` call |
| **Test evidence** | No dual-write test |
| **Architecture requirement** | `PHASE2_IMPLEMENTATION_PLAN.md` Step 1.4 |
| **Why it prevents PHASE2_READY** | Split audit trail — security events invisible in ai_core audit queries |
| **Required fix** | Dual-write EsatBey events to `AuditService` |
| **Dependencies** | None |
| **Complexity** | LOW |

---

### G. Database

#### GAP-G-001
| # | Field |
|---|-------|
| **ID** | GAP-G-001 |
| **Severity** | P1 |
| **Exact missing/broken functionality** | `ai_core_workers` table migrated but never populated from runtime registry |
| **Source-code evidence** | `WorkerRegistryRecord` model exists (`models/worker_registry.py`). Grep `WorkerRegistryRecord` usage — only `models/__init__.py` import. Registry built in-memory only (`registry.py`) |
| **Test evidence** | Postgres test checks table exists (`test_alembic_upgrade_head_postgres`) — not row content |
| **Architecture requirement** | `PHASE2_IMPLEMENTATION_PLAN.md` Step 0.7 — worker registry persistence |
| **Why it prevents PHASE2_READY** | Agents API reads in-memory registry; DB registry unused; no restart-safe worker metadata |
| **Required fix** | Sync `build_phase2_registry()` → `ai_core_workers` on startup or scheduler poll |
| **Dependencies** | None |
| **Complexity** | MEDIUM |

#### GAP-G-002
| # | Field |
|---|-------|
| **ID** | GAP-G-002 |
| **Severity** | P1 |
| **Exact missing/broken functionality** | `ai_core_integration_status` table never written; runtime uses static in-memory map |
| **Source-code evidence** | `IntegrationStatusRecord` model exists. `IntegrationStatusRegistry._static` hardcodes all `EXTERNAL_INTEGRATION_PENDING` (`integrations/registry.py` L13–20). API `/integrations/status` uses in-memory registry |
| **Test evidence** | `test_integrations_status` — returns static pending statuses |
| **Architecture requirement** | Step 0.8 — integration status persistence and health tracking |
| **Why it prevents PHASE2_READY** | Integration health not durable; cannot track last-checked timestamps in DB |
| **Required fix** | Persist integration checks to `ai_core_integration_status`; scheduler updates |
| **Dependencies** | GAP-I-002 |
| **Complexity** | MEDIUM |

#### GAP-G-003
| # | Field |
|---|-------|
| **ID** | GAP-G-003 |
| **Severity** | P3 |
| **Exact missing/broken functionality** | Production bootstrap relies on `init_ai_core_db()` in dev; Alembic-only path documented but not enforced |
| **Source-code evidence** | `deps.ensure_ai_core_db()` calls `init_ai_core_db()` (L20–24) |
| **Test evidence** | Alembic tests pass in isolation |
| **Architecture requirement** | Phase 1 limitation — prod must use Alembic |
| **Why it prevents PHASE2_READY** | Minor — operational risk if prod uses dev bootstrap |
| **Required fix** | Disable `init_ai_core_db()` when `APP_ENV=production` |
| **Dependencies** | None |
| **Complexity** | LOW |

---

### H. API

#### GAP-H-001
| # | Field |
|---|-------|
| **ID** | GAP-H-001 |
| **Severity** | P2 |
| **Exact missing/broken functionality** | Agent health-check endpoint does not probe real worker health |
| **Source-code evidence** | `agents.py` L55–58: `healthy = bool(worker.capabilities)` |
| **Test evidence** | No health-check failure test |
| **Architecture requirement** | `PHASE2_IMPLEMENTATION_PLAN.md` Step 3 — health check per agent |
| **Why it prevents PHASE2_READY** | `/agents/{id}/health-check` always returns HEALTHY for any worker with capabilities |
| **Required fix** | Implement per-family health probes (taxonomy load, integration reachability) |
| **Dependencies** | GAP-A-004, GAP-G-002 |
| **Complexity** | MEDIUM |

#### GAP-H-002
| # | Field |
|---|-------|
| **ID** | GAP-H-002 |
| **Severity** | P2 |
| **Exact missing/broken functionality** | Approve/reject API role enforcement not integration-tested |
| **Source-code evidence** | `router.py` L118–121 passes `actor_role` from header to orchestrator — spoofable (see GAP-F-001) |
| **Test evidence** | `test_approve_requires_authorized_role` uses orchestrator fixture, not HTTP client |
| **Architecture requirement** | API security + human approval flow |
| **Why it prevents PHASE2_READY** | API path for approval not verified end-to-end |
| **Required fix** | API tests: approve with/without `X-Actor-Role`; reject unauthorized |
| **Dependencies** | GAP-F-001, GAP-L-003 |
| **Complexity** | LOW |

---

### I. Commerce Bridge

#### GAP-I-001
| # | Field |
|---|-------|
| **ID** | GAP-I-001 |
| **Severity** | P1 |
| **Exact missing/broken functionality** | CommerceBridge read path not connected to any external commerce system |
| **Source-code evidence** | `bridge/commerce.py` — all `read_*` methods return `NO_DATA_AVAILABLE`. `write()` returns `EXTERNAL_INTEGRATION_PENDING` |
| **Test evidence** | No commerce bridge integration test |
| **Architecture requirement** | `PHASE2_COMMERCE_BRIDGE_SPEC.md` — Step 13 live connection |
| **Why it prevents PHASE2_READY** | Product, stock, order, pricing workers cannot access real commerce data |
| **Required fix** | Implement commerce API/DB adapter behind `CommerceBridge` |
| **Dependencies** | GAP-M-002 (external commerce platform) |
| **Complexity** | HIGH |

#### GAP-I-002
| # | Field |
|---|-------|
| **ID** | GAP-I-002 |
| **Severity** | P2 |
| **Exact missing/broken functionality** | Commerce write path not implemented |
| **Source-code evidence** | `commerce.py` L36–43: `write()` always returns `EXTERNAL_INTEGRATION_PENDING` |
| **Test evidence** | None |
| **Architecture requirement** | `PHASE2_COMMERCE_BRIDGE_SPEC.md` Step 13 writes behind approval |
| **Why it prevents PHASE2_READY** | Phase 2 cannot execute approved commerce actions |
| **Required fix** | Write adapter with approval gate |
| **Dependencies** | GAP-I-001, GAP-J-001 |
| **Complexity** | HIGH |

---

### J. Human Approval

#### GAP-J-001
| # | Field |
|---|-------|
| **ID** | GAP-J-001 |
| **Severity** | P1 |
| **Exact missing/broken functionality** | Approval flow works in orchestrator but API role trust model is insecure |
| **Source-code evidence** | `ApprovalRecord` persisted on approve (`orchestrator.py` L238–246). Role from spoofable header (`deps.py` L75–81) |
| **Test evidence** | Orchestrator-level approval test passes; API approval auth not tested |
| **Architecture requirement** | `PHASE2_ARCHITECTURE.md` — human approval where required; policy enforcement |
| **Why it prevents PHASE2_READY** | Approval records can be created by actors with self-asserted admin role |
| **Required fix** | Bind roles to authenticated identity; audit role source |
| **Dependencies** | GAP-F-001 |
| **Complexity** | HIGH |

#### GAP-J-002
| # | Field |
|---|-------|
| **ID** | GAP-J-002 |
| **Severity** | P2 |
| **Exact missing/broken functionality** | No API to list/query approval records |
| **Source-code evidence** | `ApprovalRecord` model + migration 007 exist. No `/approvals` router in `api/v1/` |
| **Test evidence** | None |
| **Architecture requirement** | Auditability of approval decisions |
| **Why it prevents PHASE2_READY** | Approvals persisted but not queryable via API |
| **Required fix** | Add `GET /api/v1/approvals` with task filter |
| **Dependencies** | None |
| **Complexity** | LOW |

---

### K. Audit

#### GAP-K-001
| # | Field |
|---|-------|
| **ID** | GAP-K-001 |
| **Severity** | P2 |
| **Exact missing/broken functionality** | EsatBey security audit split from ai_core audit trail |
| **Source-code evidence** | Same as GAP-F-004 |
| **Test evidence** | Phase 1 `test_audit_append_only` — ai_core only |
| **Architecture requirement** | Unified audit for compliance queries |
| **Why it prevents PHASE2_READY** | Incomplete auditability for security events |
| **Required fix** | Dual-write (same as GAP-F-004) |
| **Dependencies** | None |
| **Complexity** | LOW |

#### GAP-K-002
| # | Field |
|---|-------|
| **ID** | GAP-K-002 |
| **Severity** | P3 |
| **Exact missing/broken functionality** | Kurmay auto-trigger tasks use `created_by="kurmay-trigger"` — limited actor attribution |
| **Source-code evidence** | `orchestrator.py` L447 |
| **Test evidence** | None |
| **Architecture requirement** | Audit actor traceability |
| **Why it prevents PHASE2_READY** | Minor — affects audit forensics only |
| **Required fix** | Propagate parent task actor or system service account |
| **Dependencies** | None |
| **Complexity** | LOW |

---

### L. Testing

#### GAP-L-001
| # | Field |
|---|-------|
| **ID** | GAP-L-001 |
| **Severity** | P1 |
| **Exact missing/broken functionality** | Phase 2 test coverage ~17% of plan (24 of ~143 tests) |
| **Source-code evidence** | 5 test files: `test_ai_core_phase2_{foundation,security,category,kurmay,agents_api}.py`. Missing: `test_ai_core_phase2_exception.py`, domain worker tests (~60), integration E2E (~20) per plan |
| **Test evidence** | 24 Phase 2 tests pass; 119+ planned tests absent |
| **Architecture requirement** | `PHASE2_IMPLEMENTATION_PLAN.md` — per-step exit criteria require tests |
| **Why it prevents PHASE2_READY** | Cannot verify claimed behavior across workers, exceptions, commerce, approval API |
| **Required fix** | Implement remaining test files per implementation plan Steps 2, 6–14 |
| **Dependencies** | All functional gaps |
| **Complexity** | HIGH |

#### GAP-L-002
| # | Field |
|---|-------|
| **ID** | GAP-L-002 |
| **Severity** | P1 |
| **Exact missing/broken functionality** | No Phase 2 end-to-end integration test (full lifecycle) |
| **Source-code evidence** | `test_ai_core_p0_e2e.py` covers Phase 1 paths only. No test: category_scan → memory → Kurmay → REVIEW → approve → audit |
| **Test evidence** | E2E tests pass but predate Phase 2 flows |
| **Architecture requirement** | Step 14 — integration E2E ~20 tests |
| **Why it prevents PHASE2_READY** | Component tests pass; cross-component Phase 2 flow not proven |
| **Required fix** | Add `test_ai_core_phase2_e2e.py` with full lifecycle |
| **Dependencies** | GAP-E-001, GAP-B-001 |
| **Complexity** | MEDIUM |

#### GAP-L-003
| # | Field |
|---|-------|
| **ID** | GAP-L-003 |
| **Severity** | P2 |
| **Exact missing/broken functionality** | V2 feature flag behavior not explicitly regression-tested |
| **Source-code evidence** | Phase 2 tests set `BUZZARD_AI_CORE_V2=1` via fixture. No test asserting Phase 1 registry when V2=0 vs Phase 2 registry when V2=1 in same file |
| **Test evidence** | Full suite passes both configs but no dedicated flag test |
| **Architecture requirement** | Step 0.11 — feature flag gates Phase 2 |
| **Why it prevents PHASE2_READY** | Flag misconfiguration risk not caught by targeted test |
| **Required fix** | `test_v2_flag_switches_registry()` |
| **Dependencies** | None |
| **Complexity** | LOW |

---

### M. External Integrations

#### GAP-M-001
| # | Field |
|---|-------|
| **ID** | GAP-M-001 |
| **Severity** | P2 |
| **Exact missing/broken functionality** | LLM provider not connected — `EnvironmentAIProvider.generate()` always raises |
| **Source-code evidence** | `workers/provider.py` L31–37: raises `AIProviderNotConfiguredError` even when credentials present |
| **Test evidence** | Customer service worker returns `EXTERNAL_AI_PROVIDER_PENDING` in metadata |
| **Architecture requirement** | Phase 2 workers may use LLM when configured |
| **Why it prevents PHASE2_READY** | Customer Service AI cannot produce real LLM-assisted responses |
| **Required fix** | Implement HTTP client for configured provider |
| **Dependencies** | External `LLM_API_KEY` + `LLM_MODEL` |
| **Complexity** | MEDIUM |

#### GAP-M-002
| # | Field |
|---|-------|
| **ID** | GAP-M-002 |
| **Severity** | P1 |
| **Exact missing/broken functionality** | Commerce platform integration not available |
| **Source-code evidence** | All integrations `EXTERNAL_INTEGRATION_PENDING` in `IntegrationStatusRegistry._static` |
| **Test evidence** | `test_integrations_status` returns pending for all |
| **Architecture requirement** | Step 13 — commerce bridge live connection |
| **Why it prevents PHASE2_READY** | Domain worker families cannot fulfill Phase 2 operational intent |
| **Required fix** | Connect supplier feeds, WMS, commerce DB/API |
| **Dependencies** | External commerce platform team |
| **Complexity** | HIGH |

#### GAP-M-003
| # | Field |
|---|-------|
| **ID** | GAP-M-003 |
| **Severity** | P3 |
| **Exact missing/broken functionality** | Storefront taxonomy gap — shop catalog test skipped |
| **Source-code evidence** | `test_category_audit_maximal.py` skipped: "Angebote & Sonderkollektionen ist aktuell nicht als L1 im Shop-Katalog" |
| **Test evidence** | 1 skipped in full suite |
| **Architecture requirement** | Storefront alignment (outside ai_core) |
| **Why it prevents PHASE2_READY** | Not ai_core blocker; storefront team dependency |
| **Required fix** | Align shop catalog with master taxonomy or accept documented skip |
| **Dependencies** | Storefront team |
| **Complexity** | LOW |

---

## Documentation Gaps

#### GAP-DOC-001
| # | Field |
|---|-------|
| **ID** | GAP-DOC-001 |
| **Severity** | P2 |
| **Exact missing/broken functionality** | Architecture doc cross-sync incomplete |
| **Source-code evidence** | N/A — `PHASE2_DATA_FLOW.md` still references `category-kfz`; `DOC_INDEX.md` "49 workers" |
| **Test evidence** | N/A |
| **Architecture requirement** | BLK-P2-005 / Step 0.0 |
| **Why it prevents PHASE2_READY** | Implementation drift risk for future work |
| **Required fix** | Sync docs to taxonomy-driven `category-bz.*` model |
| **Dependencies** | None |
| **Complexity** | LOW |

---

## Gap Summary by Category

| Category | P0 | P1 | P2 | P3 | Total |
|----------|----|----|----|----|-------|
| A. Core Worker Execution | 0 | 3 | 1 | 0 | 4 |
| B. Kurmay AI | 0 | 1 | 2 | 0 | 3 |
| C. Category Intelligence | 0 | 0 | 2 | 1 | 3 |
| D. Central Memory | 0 | 1 | 1 | 0 | 2 |
| E. Exception Engine | 0 | 2 | 1 | 0 | 3 |
| F. Security | 0 | 1 | 3 | 0 | 4 |
| G. Database | 0 | 2 | 0 | 1 | 3 |
| H. API | 0 | 0 | 2 | 0 | 2 |
| I. Commerce Bridge | 0 | 1 | 1 | 0 | 2 |
| J. Human Approval | 0 | 1 | 1 | 0 | 2 |
| K. Audit | 0 | 0 | 1 | 1 | 2 |
| L. Testing | 0 | 2 | 1 | 0 | 3 |
| M. External Integrations | 0 | 1 | 1 | 1 | 3 |
| Documentation | 0 | 0 | 1 | 0 | 1 |
| **Total** | **0** | **15** | **18** | **4** | **37** |

---

## Why 72/100 Instead of READY

`PHASE2_READY` requires **no unresolved P0/P1 blockers** that prevent intended Phase 2 operation.

| Factor | Impact on score | Blocks READY? |
|--------|-----------------|---------------|
| Foundation implemented (workers, Kurmay, taxonomy, API, migrations) | +54 points from 18 baseline | No — enables PARTIAL |
| 24/143 Phase 2 tests (GAP-L-001) | −7.5 test component | **YES — P1** |
| Domain workers scaffolds only (GAP-A-003, GAP-M-002) | −5 worker component | **YES — P1** |
| Commerce bridge not connected (GAP-I-001) | −3 cross-cutting | **YES — P1** |
| Security: token RBAC, no rate limit, no dual-write (GAP-F-001, F-003, F-004) | −4 security component | **YES — P1** |
| DB tables unused (GAP-G-001, GAP-G-002) | −1 database component | **YES — P1** |
| Exception coordinator unwired (GAP-E-001, E-002) | −2 central systems | **YES — P1** |
| Namespace guard not enforced (GAP-D-001) | −1.5 central systems | **YES — P1** |
| Permission enforcement at execution (GAP-A-002) | −2 worker component | **YES — P1** |
| Approval API trust model (GAP-J-001) | security overlap | **YES — P1** |
| P2/P3 items (health checks, doc sync, LLM, etc.) | −3 combined | No — but needed for 90+ |

**Conclusion:** Score is honestly **72/100** because the **architecture skeleton works and tests pass**, but **15 P1 gaps** remain that the implementation plan and READY definition require before production Phase 2 operation.

---

## CURRENT SCORE: 72/100

## REMAINING P0:
None that fully prevent foundation operation. (BLK-P0-006 documentation reconciliation is partial but non-blocking for code execution.)

## REMAINING P1:
1. GAP-A-001 — Worker output schema validation missing  
2. GAP-A-002 — Permissions not enforced at execution  
3. GAP-A-003 — Domain workers are scaffolds without real outcomes  
4. GAP-B-001 — Kurmay not triggered on HIGH/CRITICAL exceptions  
5. GAP-D-001 — Namespace write guard not enforced  
6. GAP-E-001 — ExceptionCoordinator not injected into worker  
7. GAP-E-002 — Exception→Kurmay routing incomplete  
8. GAP-F-001 — Single-token API auth; spoofable roles  
9. GAP-G-001 — Worker registry DB table unused  
10. GAP-G-002 — Integration status DB table unused  
11. GAP-I-001 — CommerceBridge not connected  
12. GAP-J-001 — Approval API role trust insecure  
13. GAP-L-001 — Phase 2 test coverage 24/143 (~17%)  
14. GAP-L-002 — No Phase 2 E2E integration test  
15. GAP-M-002 — Commerce platform integration external  

## REMAINING P2:
1. GAP-A-004 — ExecutionPolicy / WorkerHealth missing  
2. GAP-B-002 — Kurmay conflict synthesis shallow  
3. GAP-B-003 — Auto-trigger Kurmay may not persist to DB  
4. GAP-C-001 — Legacy category-worker in V2 registry  
5. GAP-C-002 — Legacy bridge coverage per 48 L1 unclear  
6. GAP-D-002 — Domain memory namespaces incomplete  
7. GAP-E-003 — exception_triage routing alias missing  
8. GAP-F-002 — reject() no role check  
9. GAP-F-003 — API rate limiting not middleware-wired  
10. GAP-F-004 / GAP-K-001 — EsatBey dual-write missing  
11. GAP-H-001 — Trivial agent health-check  
12. GAP-H-002 — Approval API not integration-tested  
13. GAP-I-002 — Commerce write path not implemented  
14. GAP-J-002 — No approvals query API  
15. GAP-L-003 — V2 flag not explicitly tested  
16. GAP-M-001 — LLM provider not connected  
17. GAP-DOC-001 — Architecture doc cross-sync incomplete  

## REMAINING P3:
1. GAP-C-003 — No per-category execution tests (48 parameterized)  
2. GAP-G-003 — init_ai_core_db() not disabled in production  
3. GAP-K-002 — Kurmay trigger actor attribution  
4. GAP-M-003 — Storefront taxonomy skip (external)  

---

## Exact Remediation Order (V2 → READY)

```
PHASE 1 — P1 SECURITY & TRUST (unblock approval + API)
  1.  GAP-F-001  Secure role binding (JWT/signed claims; remove spoofable X-Actor-Role)
  2.  GAP-F-002  Enforce can_approve() on reject()
  3.  GAP-J-001  API approval integration tests with real auth
  4.  GAP-F-003  Wire RateLimiter to API middleware (429)
  5.  GAP-F-004  EsatBey dual-write to ai_core_audit_log

PHASE 2 — P1 EXECUTION ENFORCEMENT
  6.  GAP-A-002  Enforce worker permissions at execution
  7.  GAP-A-001  Add output schema validation in WorkerExecutor
  8.  GAP-D-001  Enforce namespace write guard in CentralMemoryService
  9.  GAP-C-001  Remove legacy category-worker from V2 registry

PHASE 3 — P1 EXCEPTION + KURMAY WIRING
  10. GAP-E-001  Inject ExceptionCoordinator into worker
  11. GAP-E-002  Complete exception→Kurmay routing
  12. GAP-B-001  Kurmay trigger on HIGH/CRITICAL exceptions
  13. GAP-B-003  Persist auto-trigger Kurmay via KurmayService

PHASE 4 — P1 DATABASE PERSISTENCE
  14. GAP-G-001  Sync runtime registry → ai_core_workers
  15. GAP-G-002  Persist integration status → ai_core_integration_status

PHASE 5 — P1 COMMERCE (or document EXTERNAL_DEPENDENCY for READY-with-limitations)
  16. GAP-I-001  Connect CommerceBridge read path
  17. GAP-M-002  Connect supplier/WMS/CRM integrations
  18. GAP-A-003  Domain workers produce real structured results
  19. GAP-D-002  Domain memory namespaces

PHASE 6 — P1 TEST COMPLETION
  20. GAP-L-002  Phase 2 E2E lifecycle test
  21. GAP-L-001  Remaining Phase 2 tests (~119): exception, domain, integration
  22. GAP-L-003  V2 flag explicit regression test
  23. GAP-H-002  API approval/reject auth tests

PHASE 7 — P2 HARDENING (72 → 85+)
  24. GAP-A-004  WorkerHealth / ExecutionPolicy
  25. GAP-H-001  Real agent health-checks
  26. GAP-B-002  Kurmay conflict detection depth
  27. GAP-J-002  Approvals query API
  28. GAP-I-002  Commerce write path (behind approval)
  29. GAP-DOC-001  Architecture doc sync

PHASE 8 — P2/P3 EXTERNAL (90+ / full READY)
  30. GAP-M-001  LLM provider HTTP client
  31. GAP-C-002  Audit legacy bridge per 48 L1
  32. GAP-C-003  Parameterized category worker tests
  33. GAP-G-003  Disable dev DB bootstrap in production
  34. Re-run PHASE2_FINAL_VERIFICATION (target: PHASE2_READY)
```

---

## Final Assessment

Phase 2 is **72/100 PARTIAL** because:

1. **The foundation is real** — 48 category workers, Kurmay, security classes, API endpoints, migrations 004–007, 366 tests pass.  
2. **The last mile is missing** — enforcement (permissions, namespaces, roles), persistence (DB registries), integration (commerce), and verification (119 tests).  
3. **Production requires `BUZZARD_AI_CORE_V2=1`** — without it, Phase 2 workers are not loaded.  
4. **All 48 current L1 categories are supported** — verified from authoritative taxonomy JSON, not hard-coded.  
5. **READY is blocked by 15 P1 gaps**, not by missing architecture.

*Gap analysis complete. No code modified. No fixes applied. Stopping here.*

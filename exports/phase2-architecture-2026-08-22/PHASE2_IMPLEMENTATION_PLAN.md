# BUZZARD AI CORE — PHASE 2 IMPLEMENTATION PLAN

**Version:** 2.0 (Design)  
**Date:** 2026-08-22  
**Status:** Architecture only — **implementation not started**  
**Prerequisite:** Phase 1 Final Verification — 88/100 READY

---

## 1. Implementation Principles

1. **Incremental delivery** — each step produces testable, deployable value
2. **No fake data** — every integration reports real status from day one
3. **Bridge, don't rewrite** — wrap existing modules (`category_intelligence_43`, `supplier_intelligence`, etc.)
4. **Extend Phase 1** — evolve `Worker` ABC, don't replace orchestrator/memory/audit
5. **Test per worker** — schema validation + permission boundary + integration status tests
6. **Feature flag** — `BUZZARD_AI_CORE_V2=1` gates Phase 2 workers until ready

---

## 2. Implementation Order

### Step 0 — Foundation (Week 1)

**Goal:** Worker contract evolution and infrastructure scaffolding.

| # | Task | Module | Type |
|---|------|--------|------|
| 0.1 | Create `BuzzardWorker` base extending Phase 1 `Worker` | `ai_core/workers/buzzard_worker.py` | NEW |
| 0.2 | Add `ExecutionPolicy`, `WorkerHealth` models | `ai_core/workers/buzzard_worker.py` | NEW |
| 0.3 | Extend `WorkerResult` with confidence, risk_level, memory_entries | `ai_core/workers/base.py` | EXTEND |
| 0.4 | Add schema validation to `WorkerExecutor` | `ai_core/workers/executor.py` | EXTEND |
| 0.5 | Extend `WorkerRegistry` with metadata, health, capability index | `ai_core/workers/registry.py` | EXTEND |
| 0.6 | Create worker schema directory structure | `ai_core/schemas/workers/` | NEW |
| 0.7 | Migration 004: `ai_core_workers` table | `alembic/versions/004_*.py` | NEW |
| 0.8 | Migration 005: `ai_core_integration_status` table | `alembic/versions/005_*.py` | NEW |
| 0.9 | Create `IntegrationAdapter` ABC + status registry | `ai_core/integrations/` | NEW |
| 0.10 | Create `CommerceBridge` read interface (no writes yet) | `ai_core/bridge/commerce.py` | NEW |
| 0.11 | Add `BUZZARD_AI_CORE_V2` feature flag | `config/settings.py` | EXTEND |
| 0.12 | Tests: BuzzardWorker contract, schema validation, registry metadata | `tests/test_ai_core_phase2_foundation.py` | NEW |

**Exit criteria:** BuzzardWorker registered, schema validation in executor, migrations applied, 0 regressions.

---

### Step 1 — Security AI Hardening (Week 1–2)

**Goal:** Production-grade EsatBey gate before domain workers.

| # | Task | Module | Type |
|---|------|--------|------|
| 1.1 | Create `SecurityService` wrapping EsatBey | `ai_core/security/service.py` | NEW |
| 1.2 | Implement `PolicyEngine` with risk/approval rules | `ai_core/security/policies.py` | NEW |
| 1.3 | Add rate limiter (in-memory, per-actor) | `ai_core/security/rate_limiter.py` | NEW |
| 1.4 | Migrate EsatBey audit to `ai_core_audit_log` (dual-write) | `agents/esat_bey/agent.py` | EXTEND |
| 1.5 | Wire expanded checks into orchestrator `_validate_and_assign` | `ai_core/services/orchestrator.py` | EXTEND |
| 1.6 | Add namespace write permission check | `ai_core/security/policies.py` | NEW |
| 1.7 | Seed `policies/security` memory entries | bootstrap script | NEW |
| 1.8 | Tests: policy engine, rate limit, fail-closed, namespace guard | `tests/test_ai_core_phase2_security.py` | NEW |

**Exit criteria:** All 6 EsatBey checks operational, security events in ai_core audit, fail-closed verified.

---

### Step 2 — Exception Coordination (Week 2)

**Goal:** Cross-domain exception routing on top of Phase 1 ExceptionService.

| # | Task | Module | Type |
|---|------|--------|------|
| 2.1 | Create `ExceptionCoordinator` service | `ai_core/exception/coordinator.py` | NEW |
| 2.2 | Implement `AssignmentRouter` by exception type | `ai_core/exception/router.py` | NEW |
| 2.3 | Add domain exception type constants | `ai_core/enums.py` | EXTEND |
| 2.4 | Create `ExceptionCoordinatorWorker` | `ai_core/workers/exception/coordinator_worker.py` | NEW |
| 2.5 | Wire Kurmay trigger on HIGH/CRITICAL | `ai_core/exception/coordinator.py` | NEW |
| 2.6 | Register in `WorkerRegistry` | `ai_core/workers/registry.py` | EXTEND |
| 2.7 | Add `exception_triage` to `WORKER_ROUTING` | `ai_core/services/orchestrator.py` | EXTEND |
| 2.8 | Tests: triage, containment, halt, Kurmay trigger, resolution | `tests/test_ai_core_phase2_exception.py` | NEW |

**Exit criteria:** Exception coordinator handles all severity levels, CRITICAL halts persist, Kurmay triggered.

---

### Step 3 — Agents API & Background Scheduler (Week 2–3)

**Goal:** Operational visibility and async task processing.

| # | Task | Module | Type |
|---|------|--------|------|
| 3.1 | Create `/api/v1/agents` router | `ai_core/api/v1/agents.py` | NEW |
| 3.2 | `GET /agents` — list workers + health | `ai_core/api/v1/agents.py` | NEW |
| 3.3 | `GET /agents/{id}` — worker detail + JSON schemas | `ai_core/api/v1/agents.py` | NEW |
| 3.4 | `POST /agents/{id}/health-check` | `ai_core/api/v1/agents.py` | NEW |
| 3.5 | `GET /api/v1/health/ready` — deep readiness | `ai_core/api/v1/router.py` | EXTEND |
| 3.6 | `GET /api/v1/integrations/status` | `ai_core/api/v1/integrations.py` | NEW |
| 3.7 | Create background poller | `ai_core/scheduler/poller.py` | NEW |
| 3.8 | CLI entry point for poller | `scripts/ai_core_worker_poll.py` | NEW |
| 3.9 | Mount new routers in `api/app.py` | `api/app.py` | EXTEND |
| 3.10 | Tests: agents API, health/ready, poller processes queue | `tests/test_ai_core_phase2_agents_api.py` | NEW |

**Exit criteria:** `/api/v1/agents` returns all registered workers, poller processes QUEUED tasks.

---

### Step 4 — Category Intelligence Workers (Week 3–4)

**Goal:** 48 L1 + KFZ specialist workers bridged to existing intelligence agents.

| # | Task | Module | Type |
|---|------|--------|------|
| 4.1 | Create `CategoryExpertWorker` (BuzzardWorker) | `ai_core/workers/category/expert_worker.py` | NEW |
| 4.2 | Create `CategoryIntelligenceBridge` | `ai_core/workers/category/bridge.py` | NEW |
| 4.3 | Create `TaxonomyLoader` from `master_taxonomy_48_maximal` | `ai_core/workers/category/taxonomy_loader.py` | NEW |
| 4.4 | Define input/output schemas | `ai_core/schemas/workers/category.py` | NEW |
| 4.5 | Factory: generate 48 + KFZ worker instances | `ai_core/workers/category/factory.py` | NEW |
| 4.6 | Register all category workers in registry | `ai_core/workers/registry.py` | EXTEND |
| 4.7 | Update `WORKER_ROUTING` for `category_*` tasks | `ai_core/services/orchestrator.py` | EXTEND |
| 4.8 | `POST /api/v1/categories/{bz_id}/scan` endpoint | `ai_core/api/v1/categories.py` | NEW |
| 4.9 | Create `TecDocAdapter` interface (KFZ only) | `ai_core/integrations/tecdoc.py` | NEW |
| 4.10 | Replace Phase 1 `CategoryScanWorker` stub | `ai_core/workers/deterministic.py` | EXTEND |
| 4.11 | Tests: per-worker schema, bridge, taxonomy load, no fake data | `tests/test_ai_core_phase2_category.py` | NEW |
| 4.12 | Tests: 48 workers registered, KFZ specialist, scan E2E | `tests/test_ai_core_phase2_category_e2e.py` | NEW |

**Exit criteria:** 49 category workers registered, real taxonomy bridge, scan produces findings or `NO_DATA_AVAILABLE`.

---

### Step 5 — Kurmay AI (Week 4–5)

**Goal:** Executive synthesis from Central Memory.

| # | Task | Module | Type |
|---|------|--------|------|
| 5.1 | Create Kurmay schemas | `ai_core/kurmay/schemas.py` | NEW |
| 5.2 | Create `KurmayRuleEngine` (deterministic, no LLM required) | `ai_core/kurmay/rule_engine.py` | NEW |
| 5.3 | Create `KurmayService` | `ai_core/kurmay/service.py` | NEW |
| 5.4 | Create `KurmaySynthesisWorker` | `ai_core/workers/kurmay/synthesis_worker.py` | NEW |
| 5.5 | Migration 006: `ai_core_kurmay_reports` table | `alembic/versions/006_*.py` | NEW |
| 5.6 | Wire auto-trigger on memory write (impact >= MEDIUM) | `ai_core/services/orchestrator.py` | EXTEND |
| 5.7 | Wire auto-trigger on HIGH/CRITICAL exception | `ai_core/exception/coordinator.py` | EXTEND |
| 5.8 | Create `/api/v1/reports/kurmay` router | `ai_core/api/v1/reports.py` | NEW |
| 5.9 | Kurmay recommendation → child task creation | `ai_core/kurmay/service.py` | NEW |
| 5.10 | Tests: synthesis, rule engine, trigger, recommendation tasks | `tests/test_ai_core_phase2_kurmay.py` | NEW |

**Exit criteria:** Kurmay synthesizes from real memory, produces recommendations, spawns child tasks with approval gates.

---

### Step 6 — Supplier Intelligence AI (Week 5–6)

**Goal:** Real supplier feed pipeline with honest integration status.

| # | Task | Module | Type |
|---|------|--------|------|
| 6.1 | Create `SupplierFeedAdapter` ABC | `ai_core/workers/supplier/adapters/base.py` | NEW |
| 6.2 | Create `SupplierHubWorker` | `ai_core/workers/supplier/hub_worker.py` | NEW |
| 6.3 | Create normalizer + validator | `ai_core/workers/supplier/normalizer.py` | NEW |
| 6.4 | Bridge to `supplier_intelligence_ai_maximal/` | `ai_core/workers/supplier/bridge.py` | NEW |
| 6.5 | Define schemas | `ai_core/schemas/workers/supplier.py` | NEW |
| 6.6 | `POST /api/v1/suppliers/sync` endpoint | `ai_core/api/v1/suppliers.py` | NEW |
| 6.7 | Register in registry + routing | registry, orchestrator | EXTEND |
| 6.8 | Tests: pending status, validation, no fake records | `tests/test_ai_core_phase2_supplier.py` | NEW |

**Exit criteria:** Supplier sync returns real status or `EXTERNAL_INTEGRATION_PENDING`, never fake data.

---

### Step 7 — Product AI (Week 6)

**Goal:** Product enrichment with commerce bridge read.

| # | Task | Module | Type |
|---|------|--------|------|
| 7.1 | Create `ProductIntelligenceWorker` | `ai_core/workers/product/intelligence_worker.py` | NEW |
| 7.2 | Create `TaxonomyMapper` | `ai_core/workers/product/taxonomy_mapper.py` | NEW |
| 7.3 | Bridge to `pim_product_master/` | `ai_core/workers/product/bridge.py` | NEW |
| 7.4 | Define schemas | `ai_core/schemas/workers/product.py` | NEW |
| 7.5 | `POST /api/v1/products/enrich` endpoint | `ai_core/api/v1/products.py` | NEW |
| 7.6 | Tests: enrich, classify, no fake products, LLM pending | `tests/test_ai_core_phase2_product.py` | NEW |

**Exit criteria:** Product enrich reads real product or returns NOT_FOUND, proposes changes without applying.

---

### Step 8 — Pricing AI (Week 6–7)

**Goal:** Margin-aware pricing with publish approval gate.

| # | Task | Module | Type |
|---|------|--------|------|
| 8.1 | Evolve `PriceRecheckWorker` to `PriceEngineWorker` | `ai_core/workers/price/engine_worker.py` | NEW |
| 8.2 | Create `MarginPolicyEngine` | `ai_core/workers/price/margin_policy.py` | NEW |
| 8.3 | Define schemas | `ai_core/schemas/workers/price.py` | NEW |
| 8.4 | Wire LOW_MARGIN exception creation | worker + exception coordinator | EXTEND |
| 8.5 | Create `price_publish` action task type (REVIEW gate) | orchestrator | EXTEND |
| 8.6 | Tests: calculate, margin violation, approval required | `tests/test_ai_core_phase2_price.py` | NEW |

**Exit criteria:** Price engine calculates, flags violations, publish requires REVIEW.

---

### Step 9 — Stock AI (Week 7)

**Goal:** Stock monitoring with freshness and negative stock detection.

| # | Task | Module | Type |
|---|------|--------|------|
| 9.1 | Create `StockEngineWorker` | `ai_core/workers/stock/engine_worker.py` | NEW |
| 9.2 | Create `StockFreshnessChecker` | `ai_core/workers/stock/freshness.py` | NEW |
| 9.3 | Define schemas | `ai_core/schemas/workers/stock.py` | NEW |
| 9.4 | Register + routing | registry, orchestrator | EXTEND |
| 9.5 | Tests: level check, negative stock exception, stale data | `tests/test_ai_core_phase2_stock.py` | NEW |

**Exit criteria:** Stock check detects negative/stale, creates exceptions, reports integration status.

---

### Step 10 — Customs AI (Week 7–8)

**Goal:** HS classification with confidence-based approval.

| # | Task | Module | Type |
|---|------|--------|------|
| 10.1 | Create `CustomsClassifierWorker` | `ai_core/workers/customs/classifier_worker.py` | NEW |
| 10.2 | Bridge to `ai_council_19_customs_bureaucracy/` | `ai_core/workers/customs/bridge.py` | NEW |
| 10.3 | Bundle HS code reference data | `ai_core/workers/customs/data/` | NEW |
| 10.4 | Define schemas | `ai_core/schemas/workers/customs.py` | NEW |
| 10.5 | Tests: classify, low confidence → REVIEW, no auto-approve | `tests/test_ai_core_phase2_customs.py` | NEW |

**Exit criteria:** Customs classifies with confidence threshold, never auto-approves uncertain classifications.

---

### Step 11 — Order AI (Week 8)

**Goal:** Order validation with fulfillment approval gate.

| # | Task | Module | Type |
|---|------|--------|------|
| 11.1 | Create `OrderEngineWorker` | `ai_core/workers/order/engine_worker.py` | NEW |
| 11.2 | Bridge to commerce order read | `ai_core/bridge/commerce.py` | EXTEND |
| 11.3 | Define schemas | `ai_core/schemas/workers/order.py` | NEW |
| 11.4 | Create `order_transition` action task (REVIEW gate) | orchestrator | EXTEND |
| 11.5 | Tests: check, blockers, fraud signal, transition approval | `tests/test_ai_core_phase2_order.py` | NEW |

**Exit criteria:** Order check validates with real order data, transitions require approval.

---

### Step 12 — Customer Service AI (Week 8–9)

**Goal:** Intent detection and response drafting with financial escalation.

| # | Task | Module | Type |
|---|------|--------|------|
| 12.1 | Evolve `CustomerServiceWorker` to full BuzzardWorker | `ai_core/workers/customer_service/service_worker.py` | NEW |
| 12.2 | Create `IntentClassifier` + `PolicyEngine` | `ai_core/workers/customer_service/` | NEW |
| 12.3 | Define schemas | `ai_core/schemas/workers/customer_service.py` | NEW |
| 12.4 | Tests: intent, escalation, draft, no auto-send | `tests/test_ai_core_phase2_cs.py` | NEW |

**Exit criteria:** CS detects intents, escalates REFUND/RETURN, drafts never auto-sent.

---

### Step 13 — Commerce Bridge Writes (Week 9)

**Goal:** Approved action execution against Node commerce API.

| # | Task | Module | Type |
|---|------|--------|------|
| 13.1 | Extend `CommerceBridge` with write methods | `ai_core/bridge/commerce.py` | EXTEND |
| 13.2 | Create action task executor (price_publish, order_transition) | `ai_core/bridge/action_executor.py` | NEW |
| 13.3 | Migration 007: `ai_core_action_queue` table | `alembic/versions/007_*.py` | NEW |
| 13.4 | Wire APPROVED → EXECUTED → commerce write | orchestrator | EXTEND |
| 13.5 | Tests: approved write, denied without approval, audit trail | `tests/test_ai_core_phase2_commerce_bridge.py` | NEW |

**Exit criteria:** Approved actions execute against commerce bridge, all writes audited.

---

### Step 14 — Integration & Regression (Week 9–10)

**Goal:** Full system verification.

| # | Task | Module | Type |
|---|------|--------|------|
| 14.1 | End-to-end flow test: category scan → Kurmay → price recheck | `tests/test_ai_core_phase2_e2e.py` | NEW |
| 14.2 | Cross-worker dependency test | `tests/test_ai_core_phase2_dependencies.py` | NEW |
| 14.3 | Permission boundary test suite (all workers) | `tests/test_ai_core_phase2_permissions.py` | NEW |
| 14.4 | PostgreSQL migration test (004–007) | `tests/test_ai_core_postgres.py` | EXTEND |
| 14.5 | Update `docs/buzzard-ai-core/README.md` | docs | EXTEND |
| 14.6 | Create `PHASE2_VERIFICATION.md` | docs | NEW |
| 14.7 | CI: add `ai-core-phase2` job | `.github/workflows/` | EXTEND |
| 14.8 | Frontend: no changes required (API-only phase) | — | — |

**Exit criteria:** All Phase 2 tests pass, E2E flows verified, documentation complete.

---

## 3. Module Summary — Extend vs Create

### Extend (Phase 1 modules)

| Module | Steps |
|--------|-------|
| `ai_core/workers/base.py` | 0 |
| `ai_core/workers/executor.py` | 0 |
| `ai_core/workers/registry.py` | 0, 2, 4, 6–12 |
| `ai_core/workers/deterministic.py` | 4 |
| `ai_core/services/orchestrator.py` | 1, 2, 4, 5, 8, 11, 13 |
| `ai_core/services/memory_service.py` | 5 |
| `ai_core/services/exception_service.py` | 2 |
| `ai_core/services/audit_service.py` | 1 |
| `ai_core/api/v1/router.py` | 3 |
| `ai_core/api/deps.py` | 3 |
| `ai_core/enums.py` | 2 |
| `ai_core/schemas/api.py` | 3, 4–12 |
| `agents/esat_bey/agent.py` | 1 |
| `api/app.py` | 3 |
| `config/settings.py` | 0 |
| `alembic/versions/` | 0, 5, 13 |
| `tests/test_ai_core_postgres.py` | 14 |

### Create (Phase 2 modules)

| Module | Steps |
|--------|-------|
| `ai_core/workers/buzzard_worker.py` | 0 |
| `ai_core/schemas/workers/*.py` | 0, 4–12 |
| `ai_core/integrations/` | 0, 4, 6 |
| `ai_core/bridge/` | 0, 11, 13 |
| `ai_core/security/` | 1 |
| `ai_core/exception/` | 2 |
| `ai_core/kurmay/` | 5 |
| `ai_core/scheduler/` | 3 |
| `ai_core/workers/category/` | 4 |
| `ai_core/workers/kurmay/` | 5 |
| `ai_core/workers/supplier/` | 6 |
| `ai_core/workers/product/` | 7 |
| `ai_core/workers/price/` | 8 |
| `ai_core/workers/stock/` | 9 |
| `ai_core/workers/customs/` | 10 |
| `ai_core/workers/order/` | 11 |
| `ai_core/workers/customer_service/` | 12 |
| `ai_core/workers/exception/` | 2 |
| `ai_core/api/v1/agents.py` | 3 |
| `ai_core/api/v1/reports.py` | 5 |
| `ai_core/api/v1/categories.py` | 4 |
| `ai_core/api/v1/suppliers.py` | 6 |
| `ai_core/api/v1/products.py` | 7 |
| `ai_core/api/v1/integrations.py` | 3 |
| `tests/test_ai_core_phase2_*.py` | 0–14 |

### Bridge (legacy → Phase 2, no rewrite)

| Legacy Module | Phase 2 Bridge |
|---------------|----------------|
| `category_intelligence_43_maximal/` | `ai_core/workers/category/bridge.py` |
| `supplier_intelligence_ai_maximal/` | `ai_core/workers/supplier/bridge.py` |
| `pim_product_master/` | `ai_core/workers/product/bridge.py` |
| `ai_council_19_customs_bureaucracy/` | `ai_core/workers/customs/bridge.py` |
| `master_taxonomy_48_maximal/` | `ai_core/workers/category/taxonomy_loader.py` |
| Node commerce API | `ai_core/bridge/commerce.py` |

---

## 4. Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Taxonomy 43 vs 48 mismatch | Category worker misrouting | Canonical decision: 48 L1 + KFZ; map 43 agents via ID bridge |
| Legacy module API drift | Bridge breakage | Contract tests on bridge interfaces |
| Commerce bridge unavailable | Workers can't read products/orders | `EXTERNAL_INTEGRATION_PENDING` — honest status |
| LLM not configured | No AI-generated content | Deterministic fallback in every worker |
| Worker count (58+) slows registry | Startup time | Lazy registration, factory pattern |
| EsatBey dual-write complexity | Audit inconsistency | Phase 2b: full migration to ai_core DB |
| Scope creep into Phase 2b | Delayed delivery | JWT/RBAC, webhooks, stock writes deferred |

---

## 5. Testing Strategy

| Layer | Coverage |
|-------|----------|
| Unit | Schema validation, policy engine, rule engine, normalizers |
| Worker | Per-worker execute + permission boundary + integration status |
| Service | Orchestrator triggers, Kurmay synthesis, exception coordination |
| API | Agents, reports, domain endpoints, auth |
| Integration | Commerce bridge, taxonomy loader, category bridge |
| E2E | Full pipeline: scan → memory → Kurmay → recommendation → approval |
| Postgres | Migrations 004–007, constraints, halt persistence |
| Regression | All Phase 1 tests continue passing (342+) |

---

## 6. Deployment Sequence

1. Deploy migrations 004–007 on PostgreSQL (`alembic upgrade head`)
2. Set `BUZZARD_AI_CORE_V2=1` in staging
3. Deploy API with new workers (feature-flagged)
4. Start background poller process
5. Verify `/api/v1/agents` and `/api/v1/health/ready`
6. Run category scan on one taxonomy node (staging)
7. Verify Kurmay synthesis from scan results
8. Enable in production with monitoring

---

## 7. Phase 2 Completion Criteria

| # | Criterion |
|---|-----------|
| 1 | All 11 worker families registered and testable |
| 2 | 49 category workers with real taxonomy bridge |
| 3 | Kurmay synthesizes and spawns recommendation tasks |
| 4 | EsatBey gate enforces full policy matrix |
| 5 | Exception coordinator routes all severity levels |
| 6 | `/api/v1/agents` and `/api/v1/reports/kurmay` operational |
| 7 | Background poller processes task queue |
| 8 | Commerce bridge reads real data, writes only on approval |
| 9 | All integrations report honest status |
| 10 | Zero fake AI execution, zero fake supplier data |
| 11 | Phase 1 regression suite passes (342+ tests) |
| 12 | Phase 2 test suite passes (target: 100+ new tests) |

---

## 8. Deferred to Phase 2b

| Item | Reason |
|------|--------|
| JWT / RBAC | Scoped API keys sufficient for initial launch |
| Webhook notifications for REVIEW tasks | Manual dashboard check first |
| Stock write/adjust | Read-only stock sufficient for Phase 2 |
| Real-time WebSocket dashboard | API polling sufficient |
| Multi-tenant isolation | Single-tenant launch |
| LLM fine-tuning | Use external provider when configured |
| Legacy router deprecation | Bridge pattern keeps both running |

---

## 9. Proposed Implementation Order (Summary)

```
Step 0:  Foundation (BuzzardWorker, schemas, migrations, bridge scaffold)
Step 1:  Security AI hardening (EsatBey → SecurityService)
Step 2:  Exception coordination
Step 3:  Agents API + background scheduler
Step 4:  Category Intelligence (49 workers) ← largest step
Step 5:  Kurmay AI (synthesis engine)
Step 6:  Supplier Intelligence AI
Step 7:  Product AI
Step 8:  Pricing AI
Step 9:  Stock AI
Step 10: Customs AI
Step 11: Order AI
Step 12: Customer Service AI
Step 13: Commerce bridge writes (approved actions)
Step 14: Integration testing + verification
```

**Critical path:** 0 → 1 → 2 → 3 → 4 → 5 → 14

Domain workers (6–12) can be parallelized after Step 5.

---

**Phase 2 architecture design complete. Implementation not started.**

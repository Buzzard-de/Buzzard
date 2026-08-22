# BUZZARD AI CORE — PHASE 3 TEST STRATEGY

**Version:** 1.0  
**Date:** 2026-08-22

---

## 1. Quality Gates

Phase 3 implementation cannot proceed to next wave without passing all gates for the current wave.

| Gate | Requirement |
|------|-------------|
| **G1 — Unit** | 100% of new modules have unit tests; >90% line coverage on new code |
| **G2 — Integration** | All adapter interfaces tested against mock + staging endpoints |
| **G3 — Contract** | OpenAPI schema validated; adapter contracts tested |
| **G4 — Security** | Permission tests for all new endpoints; no privilege escalation |
| **G5 — Database** | Migration up/down tested; no data loss on rollback |
| **G6 — Idempotency** | Duplicate request tests for all write endpoints |
| **G7 — Approval** | Approval bypass tests (must fail); approval flow tests (must pass) |
| **G8 — E2E** | Full lifecycle tests against staging commerce API |
| **G9 — Failure** | Circuit breaker, retry, dead letter tests |
| **G10 — Regression** | Full existing suite green (479+ passed, 0 failed) |

---

## 2. Test Types

### 2.1 Unit Tests

| Target | Framework | Location |
|--------|-----------|----------|
| Policy engines | pytest | `tests/test_phase3_pricing_policy.py` |
| Normalizers/validators | pytest | `tests/test_phase3_supplier_normalizer.py` |
| Decision engine rules | pytest | `tests/test_phase3_decision_engine.py` |
| Event handlers | pytest | `tests/test_phase3_event_handlers.py` |
| Autonomy level classification | pytest | `tests/test_phase3_autonomy.py` |

### 2.2 Integration Tests

| Target | Approach |
|--------|----------|
| CommerceIntegrationAdapter | Mock HTTP server + staging API |
| SupplierAdapter | Sample XML/CSV fixtures |
| CarrierAdapter | Mock carrier API |
| JWT middleware | Token generation + validation |
| Event outbox | DB transaction + dispatch |

### 2.3 Contract Tests

| Contract | Validation |
|----------|------------|
| Commerce API | Request/response schema against OpenAPI spec |
| Supplier feed formats | BMEcat, CSV schema validation |
| Webhook payloads | HMAC + payload schema |
| Worker output schemas | Pydantic model validation |

### 2.4 Security Tests

| Test | Expected |
|------|----------|
| Unauthenticated request | 401 |
| Wrong role for endpoint | 403 |
| Worker permission violation | Task FAILED + audit |
| Approval bypass attempt | Blocked at orchestrator |
| Namespace write violation | Memory write rejected |
| Prompt injection in LLM input | Sanitized output |
| Malicious XML in supplier feed | Rejected + exception |

### 2.5 Database Tests

| Test | Approach |
|------|----------|
| Migration 008→013 up | Alembic upgrade on clean DB |
| Migration 013→008 down | Alembic downgrade; verify no data loss |
| Idempotency key TTL | Key expires after 24h |
| Event outbox retry | Failed event retried up to max |
| Foreign key integrity | Cascade rules verified |

### 2.6 Worker Tests

| Worker | Test Focus |
|--------|------------|
| `market-intelligence` | Compliant source only; no scraping |
| `procurement-intelligence` | PO draft; approval gate above threshold |
| `logistics-intelligence` | Rate quote; label creation gate |
| `returns-intelligence` | Eligibility; refund approval required |
| `decision-engine` | Cannot execute writes; creates tasks only |
| Existing workers (wired) | Real adapter responses; honest degradation |

### 2.7 Orchestration Tests

| Scenario | Verification |
|----------|-------------|
| Commerce write full lifecycle | QUEUED → REVIEW → APPROVED → SUCCESS |
| Commerce write rejection | QUEUED → REVIEW → REJECTED → FAILED |
| Decision engine → approval task | APPROVAL_REQUEST → REVIEW |
| Exception → worker halt → resume | HALTED → RESOLVED → ACTIVE |
| Kurmay auto-trigger | HIGH exception → kurmay task created |

### 2.8 End-to-End Tests

| Flow | Environment |
|------|-------------|
| Supplier sync → product enrich → price evaluate → publish | Staging |
| Order ingest → stock reserve → fulfillment | Staging |
| Return request → evaluate → refund approval | Staging |
| Category scan with live commerce data | Staging |
| Full decision engine cycle | Staging |

### 2.9 Failure Tests

| Scenario | Expected Behavior |
|----------|-------------------|
| Commerce API down | EXTERNAL_INTEGRATION_PENDING; circuit breaker open |
| Supplier feed malformed | Exception + no partial data in memory |
| Duplicate order webhook | Idempotent skip |
| Approval timeout | Auto-reject + audit |
| Worker timeout | RETRY then FAILED |
| Database connection lost | 503 + retry |

### 2.10 Permission Tests

Every new API endpoint tested with:
- Valid role → 200/201
- Invalid role → 403
- No auth → 401
- Service identity → appropriate access

### 2.11 Approval Tests

| Test | Must |
|------|------|
| commerce_write without approval | Return APPROVAL_REQUIRED |
| Self-approval attempt | 403 |
| Approver approves | Task proceeds to execution |
| Approver rejects | Task FAILED |
| Approval after timeout | Auto-rejected |

### 2.12 Migration Tests

```bash
# Standard migration test pattern
alembic upgrade head
pytest tests/ -q  # full regression
alembic downgrade -1
pytest tests/test_phase3_migrations.py -q
alembic upgrade head
```

---

## 3. Test Environment Requirements

| Environment | Purpose | Commerce API |
|-------------|---------|--------------|
| Local (CI) | Unit + integration with mocks | Mock server |
| Staging | E2E + contract tests | Staging Buzzard Commerce |
| Production | Smoke tests only | Production (read-only probes) |

`BUZZARD_AI_CORE_V2=1` and `BUZZARD_AI_CORE_V3=1` required for Phase 3 tests.

---

## 4. Minimum Coverage Targets

| Category | Target |
|----------|--------|
| New Phase 3 modules | >90% line coverage |
| Adapter interfaces | 100% method coverage |
| Policy engines | 100% rule coverage |
| API endpoints | 100% endpoint coverage (happy + error paths) |
| Security permissions | 100% role × endpoint matrix |
| Existing Phase 2 tests | 0 regressions |

---

## 5. CI Pipeline

```
1. Lint + type check
2. alembic upgrade head
3. pytest tests/ -q (full suite, V2=1, V3=1)
4. pytest tests/test_phase3_* -q (Phase 3 specific)
5. Contract test validation
6. Security permission matrix test
7. Migration up/down test
8. Coverage report (threshold: 90% on new code)
```

---

## 6. Test Data Management

| Data Type | Source |
|-----------|--------|
| Supplier feeds | Fixture files in `tests/fixtures/suppliers/` |
| Commerce API responses | Mock server + staging snapshots |
| Taxonomy | `master_taxonomy_48_maximal/data/taxonomy.json` (live) |
| Customer data | Synthetic/pseudonymized only; no real PII |
| Orders | Synthetic order fixtures |

---

**STOP — Test implementation not started.**

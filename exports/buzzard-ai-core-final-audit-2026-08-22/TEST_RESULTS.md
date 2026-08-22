# Test Results — Full Suite

**Date:** 2026-08-22  
**Command:** `cd intelligence/buzzard_ai_complete && python3 -m pytest --tb=no -q`  
**Duration:** ~17s

---

## Summary

| Metric | Count |
|--------|-------|
| **TOTAL (collected)** | 577 |
| **PASSED** | 568 |
| **FAILED** | 0 |
| **SKIPPED** | 9 |
| **ERRORS** | 0 |

---

## Breakdown by Phase / Wave

| Category | Passed | Skipped | Failed | Status |
|----------|--------|---------|--------|--------|
| Phase 1 | 19 | 0 | 0 | PASS |
| Phase 2 | 144 | 0 | 0 | PASS |
| Wave 1 | 27 | 0 | 0 | PASS |
| Wave 2 | 11 | 0 | 0 | PASS |
| Wave 3 | 17 | 2 | 0 | PASS |
| Wave 4 | 18 | 0 | 0 | PASS |
| Wave 5 | 16 | 0 | 0 | PASS |
| Postgres | 6 | 0 | 0 | PASS |
| Other/Regression | 310 | 7 | 0 | PASS |

*Note: Phase totals are from targeted file runs; "Other" includes cross-cutting, security, category audit, and legacy tests counted in full suite.*

---

## Skipped Tests (9)

| Test | Reason |
|------|--------|
| `test_category_audit_maximal.py:57` | L1 category not in shop catalog (known taxonomy gap) |
| `test_phase3_commerce_staging_e2e.py` (6 tests) | `COMMERCE_API_URL` + `COMMERCE_API_TOKEN` not provisioned |
| `test_phase3_wms_crm_adapters.py:34` | WMS staging not provisioned |
| `test_phase3_wms_crm_adapters.py:41` | CRM staging not provisioned |

Skipped tests are **correct behavior** — they do not mask failures.

---

## Category Breakdown

### Security
- `test_ai_core_phase2_security.py`, `test_phase3_jwt_auth.py`, `test_phase3_api_permissions.py` — PASS

### Database
- `test_ai_core_postgres.py` (6 tests) — PASS
- Alembic migration tests in Phase 1 E2E — PASS

### API
- Phase 2 agents API, Phase 3 permissions, order/pricing/stock/decisions APIs — PASS

### Workers
- Phase 2 workers, Wave 3–5 worker tests — PASS

### Events
- `test_phase3_idempotency.py` — PASS

### Integrations
- Commerce adapter (unit) — PASS
- Commerce staging E2E — SKIPPED (no credentials)
- WMS/CRM adapters (unit) — PASS; staging — SKIPPED
- Carrier adapter — PASS

### E2E
- `test_ai_core_p0_e2e.py` — PASS (internal E2E)
- Commerce staging — SKIPPED

---

## Regression Verification

| Phase/Wave | Regression | Evidence |
|------------|------------|----------|
| Phase 1 | ✅ No regression | 19/19 pass |
| Phase 2 | ✅ No regression | 144/144 pass |
| Wave 1 | ✅ No regression | 27/27 pass |
| Wave 2 | ✅ No regression | 11/11 pass |
| Wave 3 | ✅ No regression | 17/17 pass (2 skip external) |
| Wave 4 | ✅ No regression | 18/18 pass |
| Wave 5 | ✅ No regression | 16/16 pass |
| Commerce integration | ✅ Preserved | Adapter tests pass; staging skip correct |

---

## Test Integrity

- No tests deleted during audit
- No assertions weakened
- No failures converted to skips
- Full suite run on `cursor/phase3-wave5-implementation-c293`

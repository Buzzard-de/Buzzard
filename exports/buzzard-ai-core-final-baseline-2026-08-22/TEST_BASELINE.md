# Test Baseline — Buzzard AI Core

**Date:** 2026-08-22  
**Command:** `cd intelligence/buzzard_ai_complete && python3 -m pytest --tb=no -q`

---

## Summary

| Metric | Count |
|--------|-------|
| **TOTAL (collected)** | 584 |
| **PASSED** | 575 |
| **FAILED** | 0 |
| **SKIPPED** | 9 |
| **ERRORS** | 0 |

**Result:** PASS (internal regression)

---

## Phase / Wave Breakdown

| Category | Passed | Skipped | Status |
|----------|--------|---------|--------|
| Phase 1 | 19 | 0 | PASS |
| Phase 2 | 144 | 0 | PASS |
| Wave 1 | 27 | 0 | PASS |
| Wave 2 | 11 | 0 | PASS |
| Wave 3 | 17 | 2 | PASS |
| Wave 4 | 18 | 0 | PASS |
| Wave 5 | 16 | 0 | PASS |
| Postgres | 6 | 0 | PASS |
| Other/regression | ~317 | 7 | PASS |

---

## Skipped Tests (9) — Not Counted as Pass

| Test | Reason |
|------|--------|
| `test_category_audit_maximal.py:57` | Known taxonomy L1 gap |
| `test_phase3_commerce_staging_e2e.py` (6 tests) | Commerce credentials not provisioned in runtime |
| `test_phase3_wms_crm_adapters.py:34` | WMS staging not provisioned |
| `test_phase3_wms_crm_adapters.py:41` | CRM staging not provisioned |

---

## Commerce E2E (Blocked)

| Suite | Collected | Passed | Skipped | Status |
|-------|-----------|--------|---------|--------|
| `test_phase3_commerce_staging_e2e.py` | 6 | 0 | 6 | **BLOCKED** |

**Requirement for P1-001 closure:** 6/6 PASS (SKIPPED does not count)

---

## Security / Regression Tests Added (P1 Remediation)

`tests/test_p1_security_remediation.py` — 6 tests, all PASS

---

## Freeze Note

Test suite is frozen. No assertion weakening. No skip removal. Commerce E2E awaits external provisioning.

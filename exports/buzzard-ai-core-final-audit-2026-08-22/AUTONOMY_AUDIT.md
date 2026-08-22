# Autonomy Audit

**Date:** 2026-08-22  
**Result:** PASS

**Authority:** `phase3/architecture/PHASE3_AUTONOMY_MODEL.md`

---

## Autonomy Levels (L0–L5)

| Level | Definition | Enforcement | Status |
|-------|------------|-------------|--------|
| L0 | Deterministic / no autonomy | Worker base classes | ✅ |
| L1 | Recommend only | Default for unclassified | ✅ |
| L2 | Suggest with human review | Customer service, order check | ✅ |
| L3 | Auto-execute whitelist | `can_auto_execute_l3()` | ✅ Tested |
| L4 | High-risk auto with gates | `BUZZARD_AUTONOMY_L4_ENABLED` | ✅ Default OFF |
| L5 | Approval required | Commerce writes, labels, returns | ✅ |

---

## L3 Auto-Execute Whitelist

From `ai_core/observability/autonomy.py`:
- `stock_sync`
- `supplier_sync`
- `report_generation`
- `integration_health_update`
- `market_scan`

**Tested:** `test_phase4_autonomy_l3.py`

---

## L4 Approved Actions (Individually Gated)

From `ai_core/intelligence/autonomy/action_engine.py`:
- `supplier_po`
- `price_publish`
- `product_publish`
- `stock_publish`
- `customer_response_send`

**Requires:** `BUZZARD_AUTONOMY_L4_ENABLED=true` AND `BUZZARD_AUTONOMY_DISABLED=false`

**Tested:** `test_phase5_autonomous_l4.py`, `test_phase5_procurement_worker.py`

---

## Kill Switch: `BUZZARD_AUTONOMY_DISABLED`

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Blocks autonomous execution | ✅ | `action_engine.py:53-70` → recommend-only |
| Cannot be bypassed by workers | ✅ | Central `AutonomousActionEngine` gate |
| Tested | ✅ | `test_phase5_kill_switch.py` (3 tests) |
| Audited | ✅ | `record_autonomy_action()` + block_reason logged |
| Procurement respects kill switch | ✅ | `procurement_service.py:65-71` |

**When active:** All plans return `block_reason="BUZZARD_AUTONOMY_DISABLED"`, level forced to L1.

---

## L4 Gate: `BUZZARD_AUTONOMY_L4_ENABLED`

| Default | `false` |
|---------|---------|
| Effect when false | L4 actions require approval; PO drafts blocked above threshold |
| PO threshold | `BUZZARD_PO_AUTO_THRESHOLD_EUR=500` |
| Tested | ✅ `test_phase5_autonomous_l4.py` |

---

## No Unrestricted Autonomy

- L5 actions always require explicit `approval_granted`
- Commerce writes blocked without approval regardless of autonomy level
- Kill switch overrides all levels
- L4 cannot execute without explicit env flag

---

## Autonomy Metrics

- `buzzard_autonomy_actions_total`
- `buzzard_autonomy_auto_executed_total`

Recorded in `ai_core/observability/autonomy.py`.

---

## Findings

| ID | Severity | Finding |
|----|----------|---------|
| — | — | No autonomy bypass found |
| P2-001 | P2 | `BUZZARD_COMMERCE_WRITES_DISABLED` not enforced (separate from autonomy but related safety) |

**Autonomy verdict: PASS**

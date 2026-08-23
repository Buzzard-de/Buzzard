# BUZZARD AI CORE — PHASE 3 AUTONOMY MODEL

**Version:** 1.0  
**Date:** 2026-08-22

---

## 1. Autonomy Levels

| Level | Name | Description | Human Required |
|-------|------|-------------|----------------|
| **L0** | Observe | Read data, generate reports, no actions | No |
| **L1** | Recommend | Produce recommendations, signals, insights | No |
| **L2** | Prepare | Create drafts, candidates, plans — not published | No |
| **L3** | Execute low-risk | Auto-execute within strict policy bounds | No (policy gate) |
| **L4** | Conditional autonomous | Auto-execute if conditions met; else escalate | Conditional |
| **L5** | Human-governed high-impact | Always requires human approval | Yes |

**Phase 3 implements L0–L3.** L4–L5 are architected but gated behind feature flags, not enabled in initial waves.

---

## 2. Operation Classification

### L0 — Observe

| Operation | Worker/System |
|-----------|---------------|
| Integration health check | CommerceIntegrationAdapter |
| Worker health probe | Agents API |
| Stock level read | stock-engine (read-only mode) |
| Market data ingestion | market-intelligence |
| Kurmay report generation | kurmay |
| Audit log query | Audit API |
| Category scan (read-only) | category-{bz.nn} |

### L1 — Recommend

| Operation | Worker/System |
|-----------|---------------|
| Price recommendation | price-engine → Decision Engine |
| Supplier suggestion | procurement-intelligence |
| Product enrichment suggestion | product-intelligence |
| Return eligibility recommendation | returns-intelligence |
| Customer response draft | customer-service-ai |
| Category gap report | category-{bz.nn} |
| Kurmay strategic recommendation | kurmay |

### L2 — Prepare

| Operation | Worker/System |
|-----------|---------------|
| Price candidate creation | price-engine |
| Purchase order draft | procurement-intelligence |
| Product listing draft | product-intelligence |
| Return authorization draft | returns-intelligence |
| Shipment rate quote | logistics-intelligence |

### L3 — Execute low-risk (policy auto-approve)

| Operation | Policy Gate | Conditions |
|-----------|-------------|------------|
| Stock sync (read + memory write) | Auto | Integration CONNECTED |
| Supplier catalog sync | Auto | Scheduled, no PO |
| Product attribute update (non-price) | Auto | Within category scope |
| Report generation | Auto | Always |
| Memory signal write (LOW impact) | Auto | Always |
| Category scan execution | Auto | Data available |
| Integration health status update | Auto | Always |

### L4 — Conditional autonomous (Wave 4+, feature-flagged)

| Operation | Auto-Execute Condition | Escalate If |
|-----------|----------------------|-------------|
| Price publish | Within min/max margin policy | Outside bounds |
| Product publish to commerce | All validation gates pass | Compliance fail |
| Stock publish to commerce | Reconciled, no conflict | Conflict detected |
| Supplier PO (low value) | Below `BUZZARD_PO_AUTO_THRESHOLD_EUR` | Above threshold |
| Customer response send | LOW risk, LLM confidence > 0.9 | HIGH risk or low confidence |

### L5 — Human-governed (always requires approval)

| Operation | Approver Role | Threshold |
|-----------|---------------|-----------|
| Commerce write (any) | approver | Always |
| Price publish (outside L4 bounds) | pricing-manager | Always |
| Refund recommendation | approver | Always |
| Purchase order (above threshold) | approver | > `BUZZARD_PO_AUTO_THRESHOLD_EUR` |
| Supplier contract action | admin | Always |
| Destructive action (delete, deactivate) | admin | Always |
| Financial commitment | admin + approver | > `BUZZARD_FINANCIAL_THRESHOLD_EUR` |
| Worker halt override | security | Always |

---

## 3. Decision Engine Output Types

| Output | Autonomy Level | Next Step |
|--------|----------------|-----------|
| `SIGNAL` | L0 | Store in memory |
| `RECOMMENDATION` | L1 | Store in memory; notify via Kurmay |
| `DECISION` | L2 | Store in memory; may create task |
| `TASK` | L2–L3 | Orchestrator.create_task() |
| `APPROVAL_REQUEST` | L5 | Orchestrator.create_task(requires_approval=True) |
| `EXCEPTION` | — | ExceptionService.create() |

Decision Engine **never** produces `EXECUTE` output type. Execution is always via Orchestrator task lifecycle.

---

## 4. Policy Engine Integration

```
Action Request
    → PolicyEngine.evaluate(action, context)
        → risk_level: LOW → L3 auto-execute
        → risk_level: MEDIUM → L4 conditional
        → risk_level: HIGH → L5 approval required
        → risk_level: CRITICAL → L5 approval + security review
    → [if approval required] REVIEW state
    → [if auto-approved] direct execution
```

Pricing-specific policy (never bypassed):

```
Price Candidate
    → PricingPolicyEngine.evaluate(candidate)
        → margin >= min_margin → pass
        → margin < min_margin → APPROVAL_REQUEST
        → margin < 0 → EXCEPTION (LOW_MARGIN)
        → price > max_price_policy → APPROVAL_REQUEST
```

---

## 5. Autonomous Action Engine

The Autonomous Action Engine is the **execution layer** that translates approved decisions into orchestrator tasks. It does not make decisions — it executes governed actions.

```
Decision Engine output (TASK or APPROVAL_REQUEST)
    → AutonomousActionEngine.evaluate(output)
        → [if L3 and policy pass] → create task, auto-execute
        → [if L4 and conditions met] → create task, auto-execute
        → [if L5 or conditions not met] → create task, requires_approval=True
    → Orchestrator handles lifecycle
    → Audit records action
```

**Constraint:** Autonomous Action Engine cannot:
- Set `approval_granted=True`
- Call `CommerceBridge.write()` directly
- Modify worker permissions
- Bypass `PolicyEngine`

---

## 6. Kill Switch

| Switch | Effect | Activation |
|--------|--------|------------|
| `BUZZARD_AUTONOMY_DISABLED=true` | All actions downgrade to L1 (recommend only) | Environment variable |
| `BUZZARD_COMMERCE_WRITES_DISABLED=true` | All commerce writes blocked | Environment variable |
| Worker halt | Single worker stopped | Exception CRITICAL or manual |
| Integration disconnect | Workers return EXTERNAL_INTEGRATION_PENDING | Health check failure |

---

## 7. Audit Requirements for Autonomous Actions

Every autonomous execution logged:

```json
{
  "action": "stock_sync",
  "autonomy_level": "L3",
  "policy_result": "auto_approved",
  "worker_id": "stock-engine",
  "task_id": "task-uuid",
  "correlation_id": "req-abc-123",
  "timestamp": "2026-08-22T10:00:00Z"
}
```

L4/L5 actions additionally log: approver, approval_id, policy_conditions_met.

---

## 8. Phase 3 Wave Enablement

| Wave | Autonomy Levels Enabled |
|------|------------------------|
| Wave 1 | L0 only (observe + health) |
| Wave 2 | L0–L1 (recommendations) |
| Wave 3 | L0–L2 (prepare + drafts) |
| Wave 4 | L0–L3 (low-risk auto-execute) |
| Wave 5+ | L4 (conditional, feature-flagged) |
| Future | L5 (always requires approval — never fully autonomous) |

---

**STOP — Autonomy implementation not started.**

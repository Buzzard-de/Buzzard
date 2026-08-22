# BUZZARD AI CORE — PHASE 3 PERMISSION MATRIX

**Version:** 1.0  
**Date:** 2026-08-22  
**Extends:** `docs/buzzard-ai-core/PHASE2_PERMISSION_MATRIX.md` (frozen)

---

## 1. Permission Model

Format: `resource:action`

| Action | Meaning |
|--------|---------|
| `read` | Read data / memory namespace |
| `write` | Write data / memory namespace |
| `execute` | Execute worker task |
| `approve` | Approve pending task / action |
| `reject` | Reject pending task / action |
| `admin` | Full administrative access |
| `inspect` | Security inspection |
| `draft` | Create draft (not publish) |

---

## 2. Roles

| Role | Description | Phase |
|------|-------------|-------|
| `system` | Internal service identity | P1 |
| `admin` | Full platform administrator | P3 |
| `operator` | Day-to-day operations | P3 |
| `approver` | Can approve/reject tasks | P2 (not enforced at API) → P3 |
| `analyst` | Read-only intelligence access | P3 |
| `security` | Security operations | P1 |
| `category-manager` | Category-scoped management | P3 |
| `pricing-manager` | Pricing policy management | P3 |
| `customer-service` | Customer service operations | P3 |
| `integration-service` | Service identity for adapters | P3 |

Phase 3 Wave 1: JWT claims map to roles. `BUZZARD_API_TOKEN_ROLES` preserved for backward compatibility.

---

## 3. API Endpoint Permissions

| Endpoint | Method | Required Permission | Roles |
|----------|--------|---------------------|-------|
| `/api/v1/tasks` | POST | `tasks:create` | admin, operator, system |
| `/api/v1/tasks/{id}/transition` | POST | `tasks:transition` | admin, operator, approver |
| `/api/v1/tasks/{id}/transition` (approve) | POST | `tasks:approve` | approver, admin |
| `/api/v1/memory` | POST | `memory:write` | admin, operator, system |
| `/api/v1/memory` | GET | `memory:read` | admin, operator, analyst, system |
| `/api/v1/exceptions` | POST | `exceptions:create` | admin, operator, system |
| `/api/v1/exceptions/{id}/transition` | POST | `exceptions:transition` | admin, operator, security |
| `/api/v1/audit` | GET | `audit:read` | admin, security, analyst |
| `/api/v1/agents` | GET | `agents:read` | admin, operator, analyst |
| `/api/v1/agents/{id}/health-check` | POST | `agents:execute` | admin, operator |
| `/api/v1/approvals` | GET | `approvals:read` | admin, approver, operator |
| `/api/v1/categories` | GET | `categories:read` | admin, operator, analyst, category-manager |
| `/api/v1/categories/{id}/scan` | POST | `categories:execute` | admin, operator, category-manager |
| `/api/v1/commerce/write` | POST | `commerce:write` | admin, operator (creates approval task) |
| `/api/v1/integrations/status` | GET | `integrations:read` | admin, operator, analyst |
| `/api/v1/integrations/suppliers/sync` | POST | `integrations:execute` | admin, operator |
| `/api/v1/reports/kurmay` | GET | `reports:read` | admin, analyst, operator |
| `/api/v1/reports/kurmay` | POST | `reports:create` | admin, operator |
| `/api/v1/decisions` | GET | `decisions:read` | admin, analyst, operator |
| `/api/v1/decisions/evaluate` | POST | `decisions:execute` | admin, operator |
| `/api/v1/pricing/evaluate` | POST | `pricing:evaluate` | admin, pricing-manager |
| `/api/v1/pricing/publish` | POST | `pricing:publish` | admin, pricing-manager, approver |
| `/api/v1/suppliers` | GET/POST | `suppliers:read/write` | admin, operator |
| `/api/v1/returns/evaluate` | POST | `returns:evaluate` | admin, operator, customer-service |

Phase 3 Wave 1: enforce at API middleware layer (currently only worker-level).

---

## 4. Worker Permission Matrix

| Worker | Permissions | Approval Required For |
|--------|-------------|----------------------|
| `supplier-hub` | `suppliers:read`, `suppliers:sync`, `memory:write` | PO submission |
| `product-intelligence` | `products:read`, `products:enrich`, `memory:write` | Publish to commerce |
| `price-engine` | `pricing:read`, `pricing:execute`, `commerce:write` | All price publishes |
| `stock-engine` | `stock:read`, `stock:sync`, `memory:write` | Stock publish to commerce |
| `order-engine` | `orders:read`, `orders:execute`, `memory:write` | Supplier PO creation |
| `customer-service-ai` | `customers:read`, `customers:draft`, `memory:write` | Response send to customer |
| `commerce-write` | `commerce:write`, `memory:write` | Always (enforced by orchestrator) |
| `customs-classifier` | `customs:read`, `customs:classify`, `memory:write` | None (LOW risk) |
| `kurmay` | `memory:read`, `reports:write`, `memory:write` | None (synthesis only) |
| `security-ai` | `security:inspect`, `security:scan` | None |
| `exception-coordinator` | `exceptions:read`, `exceptions:route`, `memory:write` | None |
| `category-{bz.nn}` | `categories:read`, `categories:analyze`, `memory:write` | None (LOW risk) |
| `market-intelligence` | `market:read`, `memory:write` | None |
| `procurement-intelligence` | `suppliers:read`, `procurement:draft`, `memory:write` | PO above threshold |
| `logistics-intelligence` | `logistics:read`, `logistics:execute`, `memory:write` | Label above threshold |
| `returns-intelligence` | `returns:read`, `returns:evaluate`, `memory:write` | All refund recommendations |
| `decision-engine` | `memory:read`, `decisions:write`, `tasks:create` | Cannot execute writes |

---

## 5. Memory Namespace Access Control

| Namespace Pattern | Read Roles | Write Roles |
|-------------------|------------|-------------|
| `tasks/` | admin, operator, system | system |
| `workers/` | admin, operator, system | system |
| `categories/{bz_id}/` | admin, operator, analyst, category-manager | admin, operator, system, category-{bz_id} worker |
| `products/{sku}/` | admin, operator, analyst | admin, operator, system, product-intelligence |
| `pricing/{sku}/` | admin, operator, analyst, pricing-manager | admin, pricing-manager, price-engine |
| `stock/{sku}/` | admin, operator, analyst | admin, operator, stock-engine |
| `orders/{id}/` | admin, operator, customer-service | admin, operator, order-engine |
| `suppliers/{id}/` | admin, operator, analyst | admin, operator, supplier-hub |
| `customers/{hash}/` | admin, customer-service | admin, customer-service-ai (limited) |
| `commerce/writes/` | admin, approver, operator | commerce-write (via orchestrator) |
| `insights/kurmay/` | admin, analyst, operator | kurmay (via orchestrator) |
| `decisions/` | admin, analyst, operator | decision-engine |
| `market/` | admin, analyst, operator | market-intelligence |
| `security/` | security, admin | security-ai, admin |
| `policies/` | admin, pricing-manager | admin |

`PolicyEngine.can_write_namespace(role, namespace)` enforced at memory write time (Phase 2) + API layer (Phase 3).

---

## 6. ABAC Rules (Phase 3)

| Attribute | Rule |
|-----------|------|
| `risk_level` | HIGH/CRITICAL tasks require `approver` role to transition APPROVED |
| `task_type=commerce_write` | Always requires approval regardless of role |
| `namespace=security/*` | Only `security` or `admin` role |
| `action_value` | Financial actions above `BUZZARD_APPROVAL_THRESHOLD_EUR` require `approver` |
| `category_id` | `category-manager` role scoped to assigned `bz_id` list |
| `supplier_id` | Procurement actions scoped to authorized supplier list |
| `locale` | Customer data access restricted by data residency rules |

---

## 7. Autonomy vs Approval Matrix

| Autonomy Level | Action Examples | Approval |
|----------------|-----------------|----------|
| L0 Observe | Read integrations, generate reports | None |
| L1 Recommend | Price recommendation, supplier suggestion | None |
| L2 Prepare | Draft product listing, draft PO | None (draft only) |
| L3 Execute low-risk | Stock sync, catalog refresh, report generation | Policy auto-approve |
| L4 Conditional | Price change within policy, product update | Auto if within bounds; else approval |
| L5 High-impact | Refund, contract, destructive action | Always human approval |

See `PHASE3_AUTONOMY_MODEL.md` for full level definitions.

---

## 8. Service Identities

| Identity | Role | Used By |
|----------|------|---------|
| `orchestrator` | system | UnifiedOrchestrator internal tasks |
| `kurmay-trigger` | system | Kurmay auto-trigger (GAP-K-002: improve attribution in P3) |
| `commerce-adapter` | integration-service | CommerceIntegrationAdapter |
| `supplier-adapter-{id}` | integration-service | Per-supplier adapter |
| `scheduler` | system | TaskQueuePoller / distributed queue |
| `webhook-receiver` | integration-service | Inbound webhook handler |

Service identities authenticated via JWT with `sub` claim matching identity name.

---

## 9. Phase 2 Gap Closure

| Gap | Phase 3 Resolution |
|-----|-------------------|
| API-level permission not enforced | JWT middleware + `required_permission_for_task()` at API layer (Wave 1) |
| Approval roles not enforceable | `PolicyEngine.can_approve(role)` enforced on transition API (Wave 1) |
| GAP-K-002 Kurmay attribution | Service identity `kurmay-trigger` with proper actor chain (Wave 1) |

---

**STOP — Permission implementation not started.**

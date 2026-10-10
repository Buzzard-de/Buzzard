# BUZZARD AI CORE — PHASE 2 PERMISSION MATRIX

**Version:** 2.0 (Design)  
**Date:** 2026-08-22  
**Status:** Architecture only — **implementation not started**

---

## 1. Permission Model

Permissions are **resource:action** pairs. Each worker has a fixed, immutable set defined at registration. The orchestrator and EsatBey gate enforce boundaries — workers cannot self-elevate.

### 1.1 Global Permission Catalog

| Permission | Description |
|------------|-------------|
| `memory:read` | Read from Central Memory |
| `memory:write` | Write to Central Memory |
| `tasks:read` | Read task state |
| `tasks:create` | Create child tasks |
| `tasks:transition` | Change task status |
| `tasks:approve` | Approve REVIEW tasks |
| `categories:analyze` | Run category intelligence |
| `taxonomy:read` | Read canonical taxonomy |
| `suppliers:read` | Read supplier data |
| `suppliers:sync` | Trigger supplier feed sync |
| `products:read` | Read product records |
| `products:write` | Propose product changes |
| `products:publish` | Apply product changes to commerce |
| `prices:calculate` | Calculate prices |
| `prices:publish` | Publish prices to commerce |
| `stock:read` | Read stock levels |
| `stock:write` | Adjust stock (Phase 2b) |
| `orders:read` | Read order records |
| `orders:transition` | Change order state |
| `customs:classify` | Propose HS classification |
| `customs:approve` | Approve classification |
| `customers:read` | Read customer data (PII-redacted) |
| `exceptions:create` | Raise exceptions |
| `exceptions:read` | Read exceptions |
| `exceptions:resolve` | Resolve exceptions |
| `workers:halt` | Halt worker execution |
| `workers:resume` | Resume halted worker |
| `reports:generate` | Generate Kurmay reports |
| `security:read` | Read security events |
| `security:configure` | Modify security policies |
| `audit:read` | Read audit log |
| `agents:read` | List worker registry |

---

## 2. Worker Permission Matrix

| Permission | Kurmay | Category | Supplier | Product | Price | Stock | Customs | Order | CS | Security | Exception |
|------------|:------:|:--------:|:--------:|:-------:|:-----:|:-----:|:-------:|:-----:|:--:|:--------:|:---------:|
| `memory:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `memory:write` | ❌* | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| `tasks:read` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `tasks:create` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌** |
| `categories:analyze` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `taxonomy:read` | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `suppliers:read` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `suppliers:sync` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `products:read` | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `products:write` | ❌ | ❌ | ❌ | ❌*** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `products:publish` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `prices:calculate` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `prices:publish` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `stock:read` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `orders:read` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `orders:transition` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌**** | ❌ | ❌ | ❌ |
| `customs:classify` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `customs:approve` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `customers:read` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `exceptions:create` | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| `exceptions:resolve` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `workers:halt` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `workers:resume` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `reports:generate` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `security:read` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `audit:read` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

\* Kurmay writes memory via orchestrator callback, not direct `memory:write`  
\** Child task creation is orchestrator responsibility, not worker  
\*** Product worker proposes changes in output; orchestrator creates publish task  
\**** Order worker proposes transitions; orchestrator creates transition task

---

## 3. Autonomy Matrix — What Can Run Without Human Approval

### 3.1 Fully Autonomous (LOW risk, auto-execute)

| Operation | Worker | Task Type | Conditions |
|-----------|--------|-----------|------------|
| Category scan | `category-bz.{nn}` | `category_scan` | Always |
| Taxonomy gap report | `category-bz.{nn}` | `taxonomy_gap_report` | Always |
| System health check | `aslan-bey-orchestrator` | `system_health` | Always |
| Stock level check | `stock-engine` | `stock_check` | Read-only |
| Price calculation | `price-engine` | `price_calculate` | No publish |
| Product enrichment (read) | `product-intelligence` | `product_enrich` | Same L1 category |
| Kurmay synthesis | `kurmay-synthesis` | `kurmay_synthesis` | Always |
| Exception triage (LOW/MEDIUM) | `exception-coordinator` | `exception_triage` | Non-CRITICAL |
| Memory write (SIGNAL/INSIGHT) | All domain workers | (side effect) | impact ≤ MEDIUM |
| Intent classification | `customer-service-ai` | `intent_classify` | Non-financial intents |
| Customs classification propose | `customs-classifier` | `customs_classify` | confidence ≥ 0.85 |
| Supplier sync (incremental) | `supplier-hub` | `supplier_sync` | < 1000 records |

### 3.2 Autonomous with Audit (MEDIUM risk, auto-execute + audit)

| Operation | Worker | Task Type | Conditions |
|-----------|--------|-----------|------------|
| Supplier sync (incremental) | `supplier-hub` | `supplier_sync` | 1000–10000 records |
| Product enrichment with LLM | `product-intelligence` | `product_enrich` | LLM available |
| Price recheck (bulk) | `price-engine` | `price_recheck` | Category-scoped |
| Stock sync | `stock-engine` | `stock_sync` | Standard warehouses |
| Order validation check | `order-engine` | `order_check` | No transition proposed |
| CS response draft | `customer-service-ai` | `response_draft` | Non-REFUND/RETURN |
| Exception creation | Domain workers | (side effect) | severity ≤ HIGH |

### 3.3 Requires Human Approval — REVIEW Gate (HIGH risk)

| Operation | Worker | Task Type | Approver Role | Conditions |
|-----------|--------|-----------|---------------|------------|
| Price publish | `price-engine` → action task | `price_publish` | `operator` | Any live price change |
| Price change > 10% | `price-engine` | `price_recheck` | `operator` | Margin or price delta |
| Product L1 category change | `product-intelligence` | `product_enrich` | `operator` | Taxonomy reassignment |
| Customs classification < 0.85 | `customs-classifier` | `customs_classify` | `operator` | Low confidence |
| Order transition to SHIPPED | `order-engine` → action task | `order_transition` | `operator` | Fulfillment |
| Supplier full sync | `supplier-hub` | `supplier_sync` | `operator` | > 10000 records |
| CS refund intent | `customer-service-ai` | `customer_service` | `operator` | REFUND intent |
| CS return intent | `customer-service-ai` | `customer_service` | `operator` | RETURN intent |
| Kurmay high-risk recommendation | `kurmay-synthesis` | child tasks | `operator` | `requires_approval: true` |

### 3.4 Requires Human Approval — APPROVED Gate (CRITICAL risk)

| Operation | Worker | Task Type | Approver Role | Conditions |
|-----------|--------|-----------|---------------|------------|
| Order refund execution | action task | `order_refund` | `admin` | Financial impact |
| Customs final approve | action task | `customs_approve` | `admin` | Restricted goods |
| Worker resume after CRITICAL | `exception-coordinator` | `exception_resolve` | `admin` | Post-containment |
| Security policy change | manual | — | `superadmin` | Policy update |
| Bulk price publish (> 100 SKUs) | action task | `price_publish_bulk` | `admin` | Mass price change |
| Product publish to live catalog | action task | `product_publish` | `admin` | Commerce write |

---

## 4. Risk Level Matrix

| Worker | Default Risk | Elevated To | Trigger |
|--------|-------------|-------------|---------|
| Kurmay AI | LOW | — | Never executes actions |
| Category Intelligence | LOW | MEDIUM | Finding impact HIGH |
| Supplier Intelligence | MEDIUM | HIGH | Full sync, validation failure > 50% |
| Product AI | MEDIUM | HIGH | L1 category reassignment |
| Pricing AI | MEDIUM | HIGH | Margin below floor or > 10% change |
| Stock AI | LOW | MEDIUM | Negative stock detected |
| Customs AI | MEDIUM | HIGH/CRITICAL | Confidence < 0.85 or restricted goods |
| Order AI | HIGH | CRITICAL | Fraud signal, large order value |
| Customer Service AI | LOW | HIGH | REFUND/RETURN/COMPLAINT escalation |
| Security AI | N/A | — | Evaluates, does not generate |
| Exception Coordinator | Varies | CRITICAL | CRITICAL exception containment |

---

## 5. Role-Based Access Control (Phase 2 Target)

### 5.1 Roles

| Role | Description | Phase |
|------|-------------|-------|
| `superadmin` | Platform owner | 2b |
| `admin` | Operations manager | 2b |
| `operator` | Day-to-day ops, approvals | 2b |
| `worker` | AI worker service account | 2 |
| `readonly` | Audit/review | 2b |
| `api` | External API integration | 2 (current: flat token) |

### 5.2 Phase 2 Initial Auth

Phase 2 launches with:
- `BUZZARD_API_TOKEN` — flat bearer token (Phase 1, unchanged)
- Worker service accounts use same token with `actor: "worker:{worker_id}"` in audit

Phase 2b adds:
- `ai_core_api_keys` table with scoped permissions
- JWT for admin dashboard
- Role-based approval gates

### 5.3 Role → Approval Authority

| Action | operator | admin | superadmin |
|--------|:--------:|:-----:|:----------:|
| Approve price publish | ✅ | ✅ | ✅ |
| Approve order ship | ✅ | ✅ | ✅ |
| Approve refund | ❌ | ✅ | ✅ |
| Approve customs (restricted) | ❌ | ✅ | ✅ |
| Resolve CRITICAL exception | ❌ | ✅ | ✅ |
| Resume halted worker | ❌ | ✅ | ✅ |
| Change security policy | ❌ | ❌ | ✅ |
| Bulk operations (> 100 SKUs) | ❌ | ✅ | ✅ |

---

## 6. EsatBey Policy Rules

### 6.1 Blocked Event Types (Always DENY)

| Event Type | Action |
|------------|--------|
| `credential_exfiltration` | BLOCK + audit |
| `unauthorized_access` | BLOCK + audit |
| `permission_escalation` | BLOCK + audit |
| `audit_tampering` | BLOCK + audit |

### 6.2 Pre-Execution Checks

| Check | Fail Action |
|-------|-------------|
| Authentication missing | DENY (503 if token not configured) |
| Authorization — permission not in worker set | DENY |
| Rate limit exceeded | DENY (429) |
| Input schema validation failed | DENY |
| Risk level HIGH without approval | REVIEW |
| Risk level CRITICAL without approval | BLOCK |
| Worker status HALTED | BLOCK |
| Task dependency not SUCCESS | BLOCK |

### 6.3 Fail-Closed Rules

| Condition | Behavior |
|-----------|----------|
| `BUZZARD_API_TOKEN` not set | 503 on all protected endpoints |
| EsatBey service error | DENY all executions |
| Security policy not loaded | DENY HIGH/CRITICAL; ALLOW LOW with warning audit |
| Worker not registered | DENY (task → FAILED) |

---

## 7. Memory Access Control

| Namespace | Write | Read |
|-----------|-------|------|
| `categories/*` | Category workers only | All workers + Kurmay |
| `suppliers/*` | Supplier worker only | Supplier, Stock, Product, Kurmay |
| `products/*` | Product worker only | Product, Price, Order, Customs, Kurmay |
| `prices/*` | Price worker only | Price, Order, Kurmay |
| `stock/*` | Stock worker only | Stock, Order, Kurmay |
| `orders/*` | Order worker only | Order, CS, Kurmay |
| `customs/*` | Customs worker only | Customs, Order, Kurmay |
| `customer_service/*` | CS worker only | CS, Kurmay |
| `kurmay/reports/*` | Orchestrator (on Kurmay behalf) | All + API |
| `exceptions/*` | Exception coordinator | Exception coordinator, Kurmay |
| `policies/*` | Admin only (manual) | Security AI, all workers (read) |
| `taxonomy/canonical` | Bootstrap only | Category, Product workers |

Workers attempting to write outside their namespace → EsatBey DENY.

---

## 8. Commerce Bridge Write Permissions

| Action | Requires | Approval |
|--------|----------|----------|
| Read product/order/stock | Worker `*:read` permission | None |
| Publish price | `price_publish` APPROVED task | operator+ |
| Publish product | `product_publish` APPROVED task | admin |
| Transition order | `order_transition` APPROVED task | operator+ |
| Process refund | `order_refund` APPROVED task | admin |
| Adjust stock | `stock_adjust` APPROVED task (2b) | operator+ |

No worker has direct commerce write permission. All writes go through approved action tasks.

---

## 9. Exception Severity → Response Matrix

| Severity | Auto-contain | Halt Worker | Kurmay Trigger | Approval to Resolve |
|----------|:------------:|:-----------:|:--------------:|:-------------------:|
| LOW | No | No | No | operator |
| MEDIUM | No | No | No | operator |
| HIGH | Yes | Optional | Yes | operator |
| CRITICAL | Yes | Yes | Yes | admin |

---

## 10. Audit Requirements by Action

| Action Category | Required Audit Fields |
|-----------------|----------------------|
| Task lifecycle | actor, task_id, from_status, to_status, request_id |
| Worker execution | worker_id, task_id, duration_ms, success, request_id |
| Memory write | namespace, key, type, version, actor, task_id |
| Exception | exception_id, severity, type, worker_id, action |
| Security gate | event_type, allowed, severity, reason, request_id |
| Approval | task_id, approved_by, decision, timestamp |
| Commerce action | action_type, entity_id, before_state, after_state, approved_by |
| Kurmay synthesis | report_id, scope, recommendation_count, confidence |
| Worker halt/resume | worker_id, reason, exception_id, actor |

All audit entries are append-only. No UPDATE or DELETE permitted.

---

## 11. Integration Access Control

| Integration | Workers Allowed | Credential Scope |
|-------------|----------------|------------------|
| Commerce bridge (read) | All domain workers | Read-only internal token |
| Commerce bridge (write) | Action tasks only | Write-scoped internal token |
| TecDoc API | `category-kfz` only | `TECDOC_API_KEY` |
| Supplier feeds | `supplier-hub` only | Per-supplier credentials |
| LLM provider | Product, CS, Kurmay, Customs | `LLM_API_KEY` |
| HS code database | `customs-classifier` | Local (no credentials) |

Unconfigured integration → worker returns `EXTERNAL_INTEGRATION_PENDING`, never fake data.

---

**End of Phase 2 Permission Matrix. Implementation not started.**

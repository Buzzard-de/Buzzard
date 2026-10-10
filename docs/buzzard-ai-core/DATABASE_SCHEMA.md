# BUZZARD AI CORE — DATABASE SCHEMA

**Engine:** PostgreSQL 16  
**ORM:** SQLAlchemy 2.0  
**Migrations:** Alembic  
**Date:** 2026-08-21

---

## 1. Design Principles

- Single PostgreSQL database for AI Core (memory, tasks, audit, exceptions, workers)
- Node commerce tables remain in Node DB initially; bridge via API
- All tables use UUID primary keys (except legacy migration IDs)
- `timestamptz` for all timestamps (UTC)
- JSONB for flexible structured data
- Foreign keys with `ON DELETE RESTRICT` (no cascade deletes on audit/memory)
- Append-only tables: `audit_log`, `memory_history`
- Indexes on all FK columns and common query patterns

---

## 2. Entity Relationship Overview

```
workers ──┬── tasks ──┬── task_transitions
          │           ├── task_results
          │           └── task_dependencies
          │
          ├── memory ──── memory_history
          │
          └── worker_permissions

exceptions ── exception_transitions

audit_log (standalone, append-only)

products ──┬── product_attributes
           ├── product_media
           ├── product_compatibility
           └── price_history

suppliers ──┬── supplier_configs
            ├── supplier_feeds (RAW → PARSED → NORMALIZED)
            └── supplier_offers

orders ──┬── order_items
         └── order_transitions

stock_levels

api_keys
users (shared with Node or synced)
sessions
```

---

## 3. Core Tables

### 3.1 `workers`

AI worker registry.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(255) | NOT NULL, UNIQUE |
| category | VARCHAR(100) | NOT NULL |
| description | TEXT | |
| capabilities | JSONB | NOT NULL, default `[]` |
| permissions | JSONB | NOT NULL, default `[]` |
| input_schema | JSONB | NOT NULL |
| output_schema | JSONB | NOT NULL |
| risk_level | VARCHAR(20) | NOT NULL, default `LOW` |
| execution_policy | JSONB | timeout, retry config |
| status | VARCHAR(20) | NOT NULL, default `ACTIVE` |
| memory_namespace | VARCHAR(100) | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

**Indexes:** `idx_workers_category`, `idx_workers_status`

### 3.2 `tasks`

Central task queue.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| type | VARCHAR(100) | NOT NULL |
| payload | JSONB | NOT NULL |
| priority | VARCHAR(20) | NOT NULL, default `NORMAL` |
| status | VARCHAR(20) | NOT NULL, default `QUEUED` |
| worker_id | UUID | FK → workers(id), nullable |
| assigned_at | TIMESTAMPTZ | |
| started_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | |
| result | JSONB | |
| error | TEXT | |
| attempts | INTEGER | NOT NULL, default 0 |
| max_attempts | INTEGER | NOT NULL, default 3 |
| requires_approval | BOOLEAN | NOT NULL, default false |
| approved_by | VARCHAR(255) | |
| approved_at | TIMESTAMPTZ | |
| idempotency_key | VARCHAR(255) | UNIQUE, nullable |
| parent_id | UUID | FK → tasks(id), nullable |
| created_by | VARCHAR(255) | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

**Indexes:** `idx_tasks_status`, `idx_tasks_worker`, `idx_tasks_type`, `idx_tasks_priority_status`, `idx_tasks_idempotency`

**Status enum:** QUEUED, VALIDATING, ASSIGNED, RUNNING, REVIEW, APPROVED, EXECUTED, SUCCESS, FAILED, RETRY, BLOCKED, ESCALATED, CANCELLED

### 3.3 `task_transitions`

Audit trail for task state changes.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| task_id | UUID | FK → tasks(id), NOT NULL |
| from_status | VARCHAR(20) | |
| to_status | VARCHAR(20) | NOT NULL |
| actor | VARCHAR(255) | NOT NULL |
| note | TEXT | |
| created_at | TIMESTAMPTZ | NOT NULL |

**Indexes:** `idx_task_transitions_task`

### 3.4 `task_dependencies`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| task_id | UUID | FK → tasks(id), NOT NULL |
| depends_on_id | UUID | FK → tasks(id), NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |

**Unique:** `(task_id, depends_on_id)`

---

## 4. Memory Tables

### 4.1 `memory`

Central memory store.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| source | VARCHAR(255) | NOT NULL |
| entity | VARCHAR(255) | NOT NULL |
| category | VARCHAR(100) | NOT NULL |
| type | VARCHAR(30) | NOT NULL |
| content | JSONB | NOT NULL |
| confidence | REAL | NOT NULL, CHECK (0 <= confidence <= 1) |
| impact | VARCHAR(20) | NOT NULL, default `LOW` |
| namespace | VARCHAR(100) | NOT NULL |
| key | VARCHAR(255) | NOT NULL |
| version | INTEGER | NOT NULL, default 1 |
| expires_at | TIMESTAMPTZ | nullable |
| created_by | VARCHAR(255) | NOT NULL |
| related_task | UUID | FK → tasks(id), nullable |
| audit_id | UUID | FK → audit_log(id), nullable |
| valid_from | TIMESTAMPTZ | NOT NULL |
| valid_to | TIMESTAMPTZ | nullable |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

**Unique:** `(namespace, key)` where `valid_to IS NULL`

**Type enum:** FACT, SIGNAL, DECISION, INSIGHT, EVENT, TASK_RESULT, RULE, POLICY, EXCEPTION

**Indexes:** `idx_memory_namespace_key`, `idx_memory_entity`, `idx_memory_type`, `idx_memory_impact`, `idx_memory_source`, GIN on `content`

### 4.2 `memory_history`

Append-only version history.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| memory_id | UUID | FK → memory(id), NOT NULL |
| namespace | VARCHAR(100) | NOT NULL |
| key | VARCHAR(255) | NOT NULL |
| content | JSONB | NOT NULL |
| source | VARCHAR(255) | |
| confidence | REAL | NOT NULL |
| version | INTEGER | NOT NULL |
| changed_by | VARCHAR(255) | NOT NULL |
| changed_at | TIMESTAMPTZ | NOT NULL |

**Indexes:** `idx_memory_history_memory`

---

## 5. Exception Tables

### 5.1 `exceptions`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| severity | VARCHAR(20) | NOT NULL |
| type | VARCHAR(100) | NOT NULL |
| message | TEXT | NOT NULL |
| entity | VARCHAR(255) | |
| status | VARCHAR(20) | NOT NULL, default `DETECTED` |
| owner | VARCHAR(255) | |
| assigned_to | VARCHAR(255) | |
| worker_id | UUID | FK → workers(id), nullable |
| task_id | UUID | FK → tasks(id), nullable |
| resolution | TEXT | |
| contained | BOOLEAN | NOT NULL, default false |
| metadata | JSONB | |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |
| resolved_at | TIMESTAMPTZ | |

**Severity enum:** LOW, MEDIUM, HIGH, CRITICAL

**Status enum:** DETECTED, CLASSIFIED, CONTAINED, ASSIGNED, REVIEW, RESOLVED

**Indexes:** `idx_exceptions_status`, `idx_exceptions_severity`, `idx_exceptions_type`

### 5.2 `exception_transitions`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| exception_id | UUID | FK → exceptions(id) |
| from_status | VARCHAR(20) | |
| to_status | VARCHAR(20) | NOT NULL |
| actor | VARCHAR(255) | NOT NULL |
| note | TEXT | |
| created_at | TIMESTAMPTZ | NOT NULL |

---

## 6. Audit Table

### 6.1 `audit_log` (append-only)

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| actor | VARCHAR(255) | NOT NULL |
| worker_id | UUID | FK → workers(id), nullable |
| action | VARCHAR(100) | NOT NULL |
| entity_type | VARCHAR(100) | |
| entity_id | VARCHAR(255) | |
| before_state | JSONB | |
| after_state | JSONB | |
| request_id | UUID | NOT NULL |
| task_id | UUID | FK → tasks(id), nullable |
| risk | VARCHAR(20) | NOT NULL, default `LOW` |
| result | VARCHAR(20) | NOT NULL |
| ip_address | INET | |
| created_at | TIMESTAMPTZ | NOT NULL |

**Indexes:** `idx_audit_actor`, `idx_audit_action`, `idx_audit_entity`, `idx_audit_request`, `idx_audit_created`

**No UPDATE or DELETE allowed** — enforced via DB trigger or application policy.

---

## 7. Commerce Tables (AI Core side)

### 7.1 `products`

Canonical product model.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| sku | VARCHAR(100) | NOT NULL, UNIQUE |
| name | VARCHAR(500) | NOT NULL |
| ean | VARCHAR(20) | |
| gtin | VARCHAR(20) | |
| mpn | VARCHAR(100) | |
| oem | VARCHAR(100) | |
| manufacturer | VARCHAR(255) | |
| category_id | VARCHAR(50) | NOT NULL |
| attributes | JSONB | default `{}` |
| descriptions | JSONB | i18n: `{"de": "...", "en": "..."}` |
| media | JSONB | default `[]` |
| seo | JSONB | default `{}` |
| compatibility | JSONB | default `[]` |
| marketplace_mappings | JSONB | default `{}` |
| identity_hash | VARCHAR(64) | for duplicate detection |
| duplicate_of | UUID | FK → products(id), nullable |
| status | VARCHAR(20) | NOT NULL, default `DRAFT` |
| enrichment_status | VARCHAR(20) | default `PENDING` |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

**Indexes:** `idx_products_sku`, `idx_products_category`, `idx_products_ean`, `idx_products_identity_hash`, GIN on `attributes`

### 7.2 `price_history`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| sku | VARCHAR(100) | NOT NULL |
| price | DECIMAL(12,2) | NOT NULL |
| currency | VARCHAR(3) | NOT NULL, default `EUR` |
| reason | VARCHAR(100) | NOT NULL |
| calculated_margin | REAL | |
| policy_check | VARCHAR(20) | NOT NULL |
| approved_by | VARCHAR(255) | |
| task_id | UUID | FK → tasks(id) |
| created_at | TIMESTAMPTZ | NOT NULL |

**Indexes:** `idx_price_history_sku`, `idx_price_history_created`

### 7.3 `stock_levels`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| sku | VARCHAR(100) | NOT NULL, UNIQUE |
| available | INTEGER | NOT NULL, default 0, CHECK (available >= 0) |
| reserved | INTEGER | NOT NULL, default 0 |
| incoming | INTEGER | NOT NULL, default 0 |
| supplier_stock | INTEGER | NOT NULL, default 0 |
| warehouse_stock | INTEGER | NOT NULL, default 0 |
| safety_stock | INTEGER | NOT NULL, default 0 |
| lead_time_days | REAL | default 0 |
| last_feed_at | TIMESTAMPTZ | |
| is_stale | BOOLEAN | NOT NULL, default false |
| updated_at | TIMESTAMPTZ | NOT NULL |

---

## 8. Supplier Tables

### 8.1 `suppliers`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(255) | NOT NULL, UNIQUE |
| adapter_type | VARCHAR(20) | NOT NULL |
| config | JSONB | env var references only |
| country | VARCHAR(2) | |
| status | VARCHAR(20) | NOT NULL, default `PENDING` |
| health_status | VARCHAR(30) | default `NOT_CONFIGURED` |
| last_sync_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

**Adapter types:** REST, JSON, XML, CSV, WEBHOOK, FEED

### 8.2 `supplier_feeds`

Pipeline stages.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| supplier_id | UUID | FK → suppliers(id) |
| stage | VARCHAR(20) | NOT NULL |
| payload | JSONB | |
| record_count | INTEGER | |
| errors | JSONB | |
| task_id | UUID | FK → tasks(id) |
| created_at | TIMESTAMPTZ | NOT NULL |

**Stage enum:** RAW, PARSED, NORMALIZED, VALIDATED, CANONICAL

### 8.3 `supplier_offers`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| supplier_id | UUID | FK → suppliers(id) |
| sku | VARCHAR(100) | NOT NULL |
| purchase_price | DECIMAL(12,2) | NOT NULL |
| shipping_cost | DECIMAL(12,2) | default 0 |
| stock | INTEGER | NOT NULL, default 0 |
| lead_time_days | REAL | default 0 |
| observed_at | TIMESTAMPTZ | NOT NULL |

**Indexes:** `idx_supplier_offers_supplier_sku`

---

## 9. Order Tables

### 9.1 `orders`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| order_no | VARCHAR(50) | NOT NULL, UNIQUE |
| status | VARCHAR(30) | NOT NULL |
| customer_country | VARCHAR(2) | NOT NULL |
| currency | VARCHAR(3) | NOT NULL, default `EUR` |
| subtotal | DECIMAL(12,2) | NOT NULL |
| shipping | DECIMAL(12,2) | default 0 |
| fees | DECIMAL(12,2) | default 0 |
| tax | DECIMAL(12,2) | default 0 |
| total | DECIMAL(12,2) | NOT NULL |
| idempotency_key | VARCHAR(255) | UNIQUE |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

**Status enum:** CREATED, PAYMENT_PENDING, PAID, VALIDATING, STOCK_CHECK, FULFILLMENT, SUPPLIER_ORDER, SHIPPED, DELIVERED, RETURN_REQUESTED, REVIEW, APPROVED, RETURNED, REFUND_PENDING, REFUNDED, CANCELLED

### 9.2 `order_items`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| order_id | UUID | FK → orders(id) |
| sku | VARCHAR(100) | NOT NULL |
| quantity | INTEGER | NOT NULL, CHECK (quantity > 0) |
| unit_price | DECIMAL(12,2) | NOT NULL |

### 9.3 `order_transitions`

Same pattern as `task_transitions`.

---

## 10. Auth Tables

### 10.1 `api_keys`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(255) | NOT NULL, UNIQUE |
| token_hash | VARCHAR(255) | NOT NULL |
| role | VARCHAR(50) | NOT NULL |
| scopes | JSONB | NOT NULL, default `[]` |
| active | BOOLEAN | NOT NULL, default true |
| created_at | TIMESTAMPTZ | NOT NULL |
| expires_at | TIMESTAMPTZ | |

### 10.2 `sessions`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | VARCHAR(255) | NOT NULL |
| token_hash | VARCHAR(255) | NOT NULL |
| ip_address | INET | |
| user_agent | TEXT | |
| expires_at | TIMESTAMPTZ | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |

---

## 11. Kurmay Reports

### 11.1 `kurmay_reports`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| situation | TEXT | NOT NULL |
| analysis | TEXT | NOT NULL |
| risk | VARCHAR(20) | NOT NULL |
| opportunity | TEXT | |
| recommendation | TEXT | NOT NULL |
| required_approval | BOOLEAN | NOT NULL |
| action | TEXT | |
| memory_ids | JSONB | source memory entries |
| generated_at | TIMESTAMPTZ | NOT NULL |

---

## 12. Migration from Existing SQLite

### Source: `intelligence/buzzard_ai_complete/database/db.py`

| SQLite Table | Postgres Target | Notes |
|--------------|-----------------|-------|
| memory | memory | Add new fields; map namespace/key |
| memory_history | memory_history | Direct map |
| tasks | tasks | Extend status enum |
| agents | workers | Rename + extend schema |
| events | audit_log | Transform payload |
| security_events | audit_log | Filter by action type |
| products | products | Extend with JSONB fields |
| suppliers | suppliers | Add adapter_type, config |
| orders | orders | Extend lifecycle |
| competitor_prices | memory (type=SIGNAL) | Migrate as signals |

### Source: `server/lib/db.js` (Phase 3+)

Commerce tables synced via API bridge initially; direct migration optional later.

---

## 13. Seed Data

```python
# seeds/001_workers.py
# 48 category workers from buzzard_master_48_main_categories_de.json
# 1 KFZ worker from automotive_taxonomy_maximal
# 3 Bey agents: aslan_bey (orchestrator), esat_bey (security), dogu_bey (research)
# System workers: price_engine, stock_engine, exception_engine, kurmay
```

---

## 14. Indexes Summary

All foreign keys indexed. Additional:
- GIN indexes on JSONB columns used in search (`memory.content`, `products.attributes`)
- Partial indexes: `idx_tasks_active ON tasks(status) WHERE status IN ('QUEUED','RUNNING','REVIEW')`
- Partial: `idx_exceptions_open ON exceptions(status) WHERE status != 'RESOLVED'`

---

*See [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) for migration steps and [API_SPEC.md](./API_SPEC.md) for endpoint mapping.*

# BUZZARD AI CORE — PHASE 3 DATABASE ARCHITECTURE

**Version:** 1.0  
**Date:** 2026-08-22

---

## 1. Principles

1. **Additive only** — Phase 3 migrations start at `008`; never rewrite 001–007
2. **Alembic chain** — all schema changes via versioned migrations
3. **Foreign keys** — enforce referential integrity
4. **Indexes** — on all query paths used by workers and APIs
5. **Transactions** — multi-table writes in single transaction
6. **Idempotency** — dedicated table for write deduplication
7. **Audit** — append-only audit tables; no UPDATE/DELETE on audit records
8. **Event tables** — for event-driven architecture

---

## 2. Existing Schema (Phase 1/2 — frozen)

| Table | Migration | Purpose |
|-------|-----------|---------|
| `ai_core_tasks` | 001 | Task lifecycle |
| `ai_core_task_transitions` | 001 | State transition history |
| `ai_core_task_dependencies` | 001 | Task dependency graph |
| `ai_core_memory` | 001 | Versioned memory entries |
| `ai_core_memory_history` | 001 | Memory version snapshots |
| `ai_core_exceptions` | 001 | Exception records |
| `ai_core_exception_transitions` | 001 | Exception state history |
| `ai_core_audit_log` | 001 | Audit trail |
| `ai_core_worker_state` | 002 | Worker halt/resume state |
| `ai_core_workers` | 004 | Worker registry metadata |
| `ai_core_integration_status` | 005 | Integration connectivity status |
| `ai_core_kurmay_reports` | 006 | Kurmay synthesis reports |
| `ai_core_approvals` | 007 | Approval records |

---

## 3. Phase 3 New Tables

### Migration 008 — Idempotency and Events

```sql
-- Idempotency keys for write deduplication
CREATE TABLE ai_core_idempotency_keys (
    key           VARCHAR(255) PRIMARY KEY,
    resource_type VARCHAR(64)  NOT NULL,
    resource_id   VARCHAR(255),
    result        JSONB,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at    TIMESTAMPTZ  NOT NULL
);
CREATE INDEX idx_idempotency_expires ON ai_core_idempotency_keys(expires_at);

-- Event outbox for reliable event delivery
CREATE TABLE ai_core_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type      VARCHAR(128) NOT NULL,
    payload         JSONB        NOT NULL,
    correlation_id  VARCHAR(255),
    source          VARCHAR(128) NOT NULL,
    status          VARCHAR(32)  NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMPTZ,
    retry_count     INTEGER      NOT NULL DEFAULT 0
);
CREATE INDEX idx_events_status ON ai_core_events(status, created_at);
CREATE INDEX idx_events_type ON ai_core_events(event_type);
CREATE INDEX idx_events_correlation ON ai_core_events(correlation_id);
```

### Migration 009 — Suppliers

```sql
CREATE TABLE ai_core_suppliers (
    id              VARCHAR(128) PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    adapter_class   VARCHAR(255) NOT NULL,
    format          VARCHAR(32)  NOT NULL,
    status          VARCHAR(32)  NOT NULL DEFAULT 'INACTIVE',
    config          JSONB,
    priority        INTEGER      NOT NULL DEFAULT 100,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_core_supplier_credentials (
    supplier_id     VARCHAR(128) PRIMARY KEY REFERENCES ai_core_suppliers(id),
    encrypted_credentials BYTEA NOT NULL,
    rotated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_core_supplier_sync_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id     VARCHAR(128) NOT NULL REFERENCES ai_core_suppliers(id),
    sync_type       VARCHAR(64)  NOT NULL,
    records_processed INTEGER    NOT NULL DEFAULT 0,
    status          VARCHAR(32)  NOT NULL,
    started_at      TIMESTAMPTZ  NOT NULL,
    completed_at    TIMESTAMPTZ,
    error_message   TEXT
);
CREATE INDEX idx_supplier_sync ON ai_core_supplier_sync_log(supplier_id, started_at);
```

### Migration 010 — Products and Pricing

```sql
CREATE TABLE ai_core_products (
    sku             VARCHAR(128) PRIMARY KEY,
    supplier_id     VARCHAR(128) REFERENCES ai_core_suppliers(id),
    supplier_sku    VARCHAR(255),
    category_id     VARCHAR(32),
    gtin            VARCHAR(14),
    brand           VARCHAR(255),
    status          VARCHAR(32)  NOT NULL DEFAULT 'DRAFT',
    attributes      JSONB,
    content         JSONB,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_products_category ON ai_core_products(category_id);
CREATE INDEX idx_products_supplier ON ai_core_products(supplier_id);
CREATE INDEX idx_products_gtin ON ai_core_products(gtin);

CREATE TABLE ai_core_price_candidates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku             VARCHAR(128) NOT NULL REFERENCES ai_core_products(sku),
    candidate_price DECIMAL(12,4) NOT NULL,
    currency        CHAR(3)      NOT NULL DEFAULT 'EUR',
    cost_basis      DECIMAL(12,4),
    margin_pct      DECIMAL(6,2),
    policy_result   VARCHAR(32)  NOT NULL,
    approval_id     UUID REFERENCES ai_core_approvals(id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_price_candidates_sku ON ai_core_price_candidates(sku, created_at);
```

### Migration 011 — Stock and Orders

```sql
CREATE TABLE ai_core_stock_levels (
    sku             VARCHAR(128) NOT NULL,
    source          VARCHAR(64)  NOT NULL,
    quantity        INTEGER      NOT NULL,
    reserved        INTEGER      NOT NULL DEFAULT 0,
    available       INTEGER      NOT NULL,
    lead_time_days  INTEGER,
    synced_at       TIMESTAMPTZ  NOT NULL,
    PRIMARY KEY (sku, source)
);
CREATE INDEX idx_stock_sku ON ai_core_stock_levels(sku);

CREATE TABLE ai_core_orders (
    order_id        VARCHAR(128) PRIMARY KEY,
    source          VARCHAR(64)  NOT NULL,
    status          VARCHAR(32)  NOT NULL,
    customer_ref    VARCHAR(255),
    total_amount    DECIMAL(12,4),
    currency        CHAR(3)      DEFAULT 'EUR',
    payment_state   VARCHAR(32),
    payload         JSONB,
    idempotency_key VARCHAR(255) UNIQUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_orders_status ON ai_core_orders(status);
CREATE INDEX idx_orders_source ON ai_core_orders(source, created_at);
```

### Migration 012 — Decisions and Policies

```sql
CREATE TABLE ai_core_decisions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    output_type     VARCHAR(32)  NOT NULL,
    confidence      DECIMAL(4,3) NOT NULL,
    signals_count   INTEGER      NOT NULL,
    content         JSONB        NOT NULL,
    task_id         UUID REFERENCES ai_core_tasks(id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_decisions_type ON ai_core_decisions(output_type, created_at);

CREATE TABLE ai_core_policies (
    id              VARCHAR(128) PRIMARY KEY,
    policy_type     VARCHAR(64)  NOT NULL,
    rules           JSONB        NOT NULL,
    effective_from  TIMESTAMPTZ  NOT NULL,
    effective_to    TIMESTAMPTZ,
    version         INTEGER      NOT NULL DEFAULT 1,
    created_by      VARCHAR(255) NOT NULL
);
```

### Migration 013 — Logistics and Returns

```sql
CREATE TABLE ai_core_shipments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        VARCHAR(128) REFERENCES ai_core_orders(order_id),
    carrier_id      VARCHAR(64)  NOT NULL,
    tracking_number VARCHAR(255),
    status          VARCHAR(32)  NOT NULL,
    label_url       TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_core_returns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        VARCHAR(128) REFERENCES ai_core_orders(order_id),
    status          VARCHAR(32)  NOT NULL,
    reason          TEXT,
    eligibility     VARCHAR(32),
    refund_amount   DECIMAL(12,4),
    approval_id     UUID REFERENCES ai_core_approvals(id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

---

## 4. Indexing Strategy

| Query Pattern | Index |
|---------------|-------|
| Tasks by status + created | `idx_tasks_status_created` (existing) |
| Memory by namespace + key | Unique partial index (migration 003) |
| Events pending processing | `idx_events_status` |
| Products by category | `idx_products_category` |
| Stock by SKU | `idx_stock_sku` |
| Orders by status | `idx_orders_status` |
| Audit by correlation_id | `idx_audit_correlation` (new) |
| Idempotency expiry cleanup | `idx_idempotency_expires` |

---

## 5. Data Retention

| Table | Retention | Archival |
|-------|-----------|----------|
| `ai_core_audit_log` | Indefinite | Cold storage after 2 years |
| `ai_core_events` (processed) | 90 days | Archive to object storage |
| `ai_core_idempotency_keys` | 24 hours (TTL) | Auto-delete |
| `ai_core_memory` (expired) | Per namespace policy | Soft-delete via valid_to |
| `ai_core_kurmay_reports` | 1 year | Archive |
| `ai_core_supplier_sync_log` | 6 months | Archive |

---

## 6. Transaction Patterns

| Operation | Tables | Isolation |
|-----------|--------|-----------|
| Task creation + audit | tasks, audit_log | SERIALIZABLE |
| Approval + task transition | tasks, task_transitions, approvals, audit_log | SERIALIZABLE |
| Product publish | products, price_candidates, memory, audit_log | SERIALIZABLE |
| Stock sync | stock_levels, memory, events | READ COMMITTED |
| Order ingestion | orders, idempotency_keys, events | SERIALIZABLE |

---

## 7. Phase 2 Compatibility

| Rule | Detail |
|------|--------|
| No ALTER on Phase 2 tables | Unless adding nullable column with default |
| No DROP | Ever |
| Foreign keys to Phase 2 tables | Allowed (e.g., decisions → tasks) |
| Shared `DATABASE_URL` | Same connection pool |
| `init_ai_core_db()` | Deprecated in production; Alembic only (GAP-G-003) |

---

## 8. Backup and Recovery

| Component | Strategy |
|-----------|----------|
| PostgreSQL | Daily full backup + WAL archiving |
| Point-in-time recovery | WAL replay to any point in last 30 days |
| Migration rollback | Alembic downgrade scripts for each migration |
| Event replay | Re-process from `ai_core_events` after recovery |

---

**STOP — Database implementation not started.**

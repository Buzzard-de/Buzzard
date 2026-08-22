# BUZZARD AI CORE — PHASE 3 EVENT ARCHITECTURE

**Version:** 1.0  
**Date:** 2026-08-22

---

## 1. Design Principles

1. **Pragmatic** — event-driven where async decoupling adds value; synchronous where simplicity suffices
2. **Reliable** — outbox pattern for guaranteed delivery
3. **Idempotent** — all event consumers handle duplicates
4. **Traceable** — every event carries `correlation_id`
5. **No unnecessary complexity** — no full event sourcing of all state; targeted use

---

## 2. Event Types

### Domain Events (past tense — something happened)

| Event Type | Producer | Consumer(s) |
|------------|----------|-------------|
| `commerce.product.updated` | Commerce webhook | product-intelligence, stock-engine |
| `commerce.order.created` | Commerce webhook | order-engine |
| `commerce.order.status_changed` | Commerce webhook | order-engine, customer-service-ai |
| `commerce.stock.changed` | Commerce webhook | stock-engine |
| `commerce.price.changed` | Commerce webhook | price-engine, kurmay |
| `supplier.catalog.synced` | supplier-hub | product-intelligence |
| `supplier.stock.updated` | Supplier adapter | stock-engine |
| `supplier.price.updated` | Supplier adapter | price-engine |
| `product.enriched` | product-intelligence | price-engine, category worker |
| `product.published` | product-intelligence | commerce-write |
| `price.candidate.created` | price-engine | Decision Engine |
| `price.published` | price-engine | kurmay |
| `stock.below_safety` | stock-engine | Decision Engine, procurement |
| `stock.conflict_detected` | stock-engine | exception-coordinator |
| `order.ingested` | order-engine | stock-engine, procurement |
| `order.fulfilled` | logistics-intelligence | customer-service-ai |
| `return.requested` | Commerce webhook | returns-intelligence |
| `return.approved` | returns-intelligence | order-engine, stock-engine |
| `decision.recommendation` | decision-engine | kurmay |
| `decision.approval_required` | decision-engine | Orchestrator |
| `exception.created` | ExceptionService | exception-coordinator, kurmay |
| `exception.resolved` | ExceptionService | WorkerStateService |
| `integration.health_changed` | Health checker | Observability |
| `worker.health_degraded` | Health checker | kurmay, observability |
| `approval.granted` | Orchestrator | Worker (re-execute) |
| `approval.rejected` | Orchestrator | Audit |

### Commands (imperative — do something)

| Command | Producer | Consumer |
|---------|----------|----------|
| `task.create` | API, Decision Engine | Orchestrator |
| `task.transition` | API, Orchestrator | Orchestrator |
| `integration.sync` | API, Scheduler | Integration adapter |
| `memory.write` | Worker (via orchestrator) | CentralMemoryService |
| `audit.record` | All write paths | AuditService |

Commands are executed synchronously via service calls in Phase 3 Wave 1–3. Async command queue introduced in Wave 4 if needed.

---

## 3. Event Envelope

```json
{
  "event_id": "evt-uuid",
  "event_type": "commerce.order.created",
  "version": 1,
  "timestamp": "2026-08-22T10:00:00Z",
  "source": "commerce-webhook",
  "correlation_id": "req-abc-123",
  "causation_id": "evt-parent-uuid",
  "payload": {
    "order_id": "ORD-12345",
    "status": "CREATED",
    "total": 149.99,
    "currency": "EUR"
  },
  "metadata": {
    "integration_id": "commerce",
    "idempotency_key": "ord-12345-created"
  }
}
```

---

## 4. Outbox Pattern

```
Producer (worker/API)
    → Write business data + event to DB (single transaction)
        → ai_core_events table (status=PENDING)
    → EventDispatcher (background poller)
        → Read PENDING events
        → Dispatch to consumer(s)
        → Mark PROCESSED or increment retry_count
        → [if max retries] Move to DEAD_LETTER
```

### Event States

```
PENDING → PROCESSING → PROCESSED
                    → FAILED → RETRY → PENDING
                    → DEAD_LETTER (after max retries)
```

| Parameter | Default |
|-----------|---------|
| Max retries | 5 |
| Backoff | Exponential (1s, 2s, 4s, 8s, 16s) |
| Dead letter retention | 30 days |
| Polling interval | 1 second |

---

## 5. Idempotency

Every event consumer must:

1. Check `event_id` or `idempotency_key` against processed store
2. If already processed → acknowledge without re-execution
3. If new → process and record

```python
def handle_event(event: EventEnvelope) -> None:
    if event_store.is_processed(event.event_id):
        return  # idempotent skip
    process(event)
    event_store.mark_processed(event.event_id)
```

---

## 6. Ordering

| Rule | Detail |
|------|--------|
| Per-entity ordering | Events for same `order_id`/`sku` processed in timestamp order |
| Cross-entity | No ordering guarantee (parallel processing) |
| Partition key | `entity_id` from payload (order_id, sku, supplier_id) |

Phase 3 Wave 1–3: single-process dispatcher with per-entity locking.  
Phase 3 Wave 4+: partitioned queue if volume requires.

---

## 7. Dead Letter Queue

Events that fail after max retries:

1. Status → `DEAD_LETTER`
2. Alert to operations
3. Manual review via `GET /api/v1/events/dead-letter`
4. Replay via `POST /api/v1/events/{id}/replay` (admin only)

---

## 8. Replay

| Scenario | Replay Strategy |
|----------|----------------|
| Consumer bug fixed | Replay from dead letter |
| Database recovery | Replay unprocessed events from outbox |
| New consumer added | Replay historical events from archive (manual) |

Replay creates new event with `causation_id` pointing to original.

---

## 9. Correlation and Tracing

Every HTTP request, task, event, and audit record shares `correlation_id`:

```
HTTP Request (X-Request-ID)
    → Task (correlation_id in payload)
        → Worker execution (correlation_id in context)
            → Event (correlation_id in envelope)
                → Audit (correlation_id in record)
```

Enables end-to-end tracing in observability dashboards.

---

## 10. What is NOT Event-Sourced

| State | Storage | Reason |
|-------|---------|--------|
| Task lifecycle | `ai_core_tasks` (CRUD) | Existing Phase 2 model works |
| Memory | `ai_core_memory` (versioned CRUD) | Versioning already implemented |
| Worker registry | In-memory + DB sync | Low change frequency |
| Integration status | `ai_core_integration_status` | Simple status field |

Event sourcing considered only for: audit trail (append-only, already implemented) and financial transactions (future).

---

## 11. Scheduler Integration

Phase 2 `TaskQueuePoller` (in-process) handles:

- QUEUED task pickup
- RETRY task re-queue

Phase 3 adds:

- Scheduled supplier sync (cron → `task.create` with `supplier_sync`)
- Reconciliation jobs (daily → `task.create`)
- Event dispatcher (continuous → process outbox)

Phase 3 Wave 4+: optional distributed queue (Redis/RabbitMQ) replacing in-process poller.

---

**STOP — Event architecture implementation not started.**

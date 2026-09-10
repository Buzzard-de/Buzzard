# Buzzard AI Task Orchestrator Foundation

## Overview

The AI Task Orchestrator is the **central management and coordination layer** for all Buzzard AI workers. It coordinates tasks, workflows, priorities, permissions, approvals, failures, retries, escalation, auditability, and observability.

**Critical principle:** The Orchestrator is **NOT a replacement** for existing deterministic business engines. Deterministic engines remain the **source of truth**. AI may analyze, recommend, prioritize, optimize, and orchestrate — but it must **never silently override** authoritative deterministic engine results.

## Architecture

```
BUZZARD AI CONTROL LAYER
AI TASK ORCHESTRATOR
│
├── Task Registry          ├── Worker Registry
├── Task Queue             ├── Priority Engine
├── Workflow Engine        ├── Dependency Engine
├── Authority Engine       ├── Approval Engine
├── Retry/Failure Engine   ├── Escalation Engine
├── Conflict Resolution    ├── Context Manager
├── Execution Manager      ├── Event Manager
├── Audit Manager          ├── Observability Manager
├── Security Manager       └── Admin Interface
        │
        ├── Product AI, Supplier AI, Pricing AI, Inventory AI
        ├── Order AI, Marketplace AI, Customs AI
        ├── Customer Service AI, Returns AI, Finance AI
        │
        ↓
EXISTING DETERMINISTIC ENGINES
(Product, Supplier, Pricing, Inventory, Order, Marketplace, Returns, Market)
```

## Module: `lib/ai-orchestrator/`

| File | Purpose |
|------|---------|
| `types.ts` | Canonical task, worker, workflow, approval, conflict models |
| `constants.ts` | Task types, authority mappings, sensitive field sets |
| `taskRegistry.ts` | In-memory stores, ID generation, idempotency |
| `workerRegistry.ts` | Worker registration, enable/disable, health |
| `task.ts` | Task creation and cancellation |
| `taskQueue.ts` | Queue abstraction (future Redis/Kafka/SQS compatible) |
| `priority.ts` | Deterministic priority calculation |
| `dependency.ts` | Dependency resolution, circular detection |
| `workflow.ts` | Multi-step workflow orchestration |
| `authority.ts` | Authority model and deterministic validation |
| `approval.ts` | Human approval foundation |
| `execution.ts` | Task execution with validation pipeline |
| `worker.ts` | Mock AI worker adapters |
| `retry.ts` | Failure classification and retry logic |
| `escalation.ts` | Escalation foundation |
| `conflict.ts` | Conflict detection and resolution |
| `context.ts` | Minimum-context worker context builder |
| `security.ts` | Server-controlled fields, secret protection |
| `customerSafety.ts` | Customer data isolation |
| `events.ts` | Append-only events, webhook deduplication |
| `audit.ts` | Audit log (no credentials) |
| `observability.ts` | Foundation metrics |
| `admin.ts` | Admin inspection functions |
| `fixtures.ts` | Test fixtures and seed helpers |

## Deterministic Source-of-Truth Rule

```
AI recommendation
        ↓
Deterministic validation
        ↓
Allowed?
   ├── YES → continue (may require human approval)
   └── NO  → reject / escalate
```

Every execution-capable task defines:
- `aiRecommendation`
- `deterministicValidation`
- `validationStatus`
- `validationErrors`
- `finalDecision`

AI cannot overwrite deterministic truth. Examples:
- **Pricing AI** recommends a price → Pricing Engine validates authoritative price
- **Finance AI** analyzes reconciliation → cannot overwrite Returns Engine actuals
- **Order AI** analyzes order → Order Engine performs valid transitions

## Authority Model

| Level | Capability |
|-------|------------|
| `OBSERVE` | Read-only observation |
| `ANALYZE` | Analysis without action |
| `RECOMMEND` | Recommendations requiring validation |
| `EXECUTE_LOW_RISK` | Low-risk execution with validation |
| `EXECUTE_WITH_APPROVAL` | Requires human approval |
| `NEVER_EXECUTE` | Cannot execute actions |

AI must NOT silently:
- Change authoritative customer price
- Create irreversible supplier payment
- Issue uncontrolled refund
- Modify historical order data
- Override inventory source of truth

## Task Lifecycle

```
PENDING → QUEUED → READY/WAITING → RUNNING → COMPLETED
                              ↓           ↓
                          BLOCKED      FAILED → RETRY
                              ↓
                          CANCELLED
```

## Workflow Examples

**Customer Order:**
```
Supplier AI → Pricing AI → Inventory AI → Order AI → Marketplace AI
```

**Return Request:**
```
Returns AI → Finance AI → Human Approval (if required)
```

## Mock AI Workers

Foundation uses deterministic mock workers — no real AI API calls:
- `MockProductAI`, `MockSupplierAI`, `MockPricingAI`, etc.
- Real providers plug in via `registerMockWorkerHandler()` / future adapter interface

## Security

- Worker authorization enforced per task
- Customer isolation for customer-facing tasks
- Server-controlled task status and financial fields
- No credentials in AI context or logs
- AI output treated as untrusted input

## Customer Safety

Customer Service AI may access:
- Order status, shipment status, return status, refund status

Must NOT access:
- Supplier cost, Buzzard margin, supplier recovery, internal loss, credentials

## Extension Points

- Real AI provider adapter (replace mock handlers in `worker.ts`)
- Distributed queue backend (implement queue interface in `taskQueue.ts`)
- Notification integrations (escalation engine hooks)
- Policy engine for authority rules
- Real authentication for approval workflow

## Known Limitations (Foundation)

- No real AI API integration
- No autonomous production agents
- No distributed queue (in-memory only)
- No real email/SMS/push notifications
- No automatic irreversible high-risk actions

## Important Rules

**AI is an orchestration/optimization layer, not the source of truth for deterministic commercial operations.**

**Pricing Engine = authoritative customer price. Returns Engine = authoritative actual financial impact. Order Engine = authoritative order state transitions.**

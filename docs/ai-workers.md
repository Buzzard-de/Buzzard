# Buzzard AI Worker Execution Layer Foundation

## Overview

The AI Worker Execution Layer sits **between the AI Task Orchestrator (#320) and AI worker/provider implementations**. It provides a standardized, secure, and scalable execution framework for all Buzzard AI workers.

```
AI TASK ORCHESTRATOR
        ↓
AI WORKER EXECUTION LAYER  ← this module
        ↓
AI WORKER (mock foundation)
        ↓
AI PROVIDER ADAPTER (MOCK_PROVIDER)
        ↓
STRUCTURED AI RESULT
        ↓
DETERMINISTIC VALIDATION
        ↓
ALLOW / REJECT / APPROVAL / ESCALATION
        ↓
EXISTING DETERMINISTIC ENGINES
```

**Critical principle:** AI workers never directly modify authoritative business data. Deterministic engines remain the source of truth.

## Module: `lib/ai-workers/`

| File | Purpose |
|------|---------|
| `types.ts` | Execution model, worker contract, provider types |
| `constants.ts` | Statuses, permissions, context classifications |
| `executionRegistry.ts` | Execution storage, idempotency, response dedup |
| `workerExecutor.ts` | Main `executeWorker()` pipeline |
| `provider.ts` / `providerRegistry.ts` | Provider abstraction + MOCK_PROVIDER |
| `mockWorkers.ts` | 10 deterministic mock worker implementations |
| `workerContext.ts` | Minimum-required, permission-scoped context |
| `workerInput.ts` / `workerOutput.ts` | Input/output validation |
| `permissions.ts` | Least-privilege permission model |
| `capabilities.ts` | Worker capability discovery |
| `validation.ts` | Deterministic engine adapters |
| `action.ts` | Safe proposed-action model |
| `timeout.ts` | Timeout control |
| `health.ts` | Worker/provider health |
| `telemetry.ts` | Execution metrics |
| `audit.ts` | Append-only audit log |
| `security.ts` | Secret protection, impersonation prevention |

## Worker Execution Contract

```
executeWorker(task, workerContext)
    ↓ validate input
    ↓ authorize worker
    ↓ build minimum context
    ↓ select provider (deterministic)
    ↓ execute provider
    ↓ validate AI output
    ↓ deterministic validation
    ↓ produce WorkerExecutionResult
```

## Execution Statuses

`CREATED` → `VALIDATING` → `AUTHORIZED` → `CONTEXT_READY` → `RUNNING` → `OUTPUT_RECEIVED` → `VALIDATING_OUTPUT` → `DETERMINISTIC_VALIDATION` → `COMPLETED` / `REJECTED` / `FAILED` / `WAITING_APPROVAL` / `TIMED_OUT` / `ESCALATED` / `CANCELLED`

## Context Classification

| Class | Access |
|-------|--------|
| `PUBLIC` | All workers |
| `CUSTOMER_SAFE` | Customer Service AI |
| `INTERNAL` | Requires read permission |
| `FINANCIAL` | Finance AI only |
| `SENSITIVE` | Explicit permission |
| `SECRET` | Never in AI context |

## Provider Abstraction

Foundation uses `MOCK_PROVIDER` only. Future providers plug in via `registerProvider()`:
- OpenAIProvider, AnthropicProvider, GeminiProvider, LocalModelProvider

Provider selection is deterministic based on worker capability, health, and availability.

## Worker Special Rules

| Worker | May | Must Not |
|--------|-----|----------|
| Product AI | Analyze, recommend attributes | Overwrite canonical PIM data |
| Supplier AI | Recommend supplier | Invent stock/price/payments |
| Pricing AI | Recommend price | Set authoritative price |
| Inventory AI | Detect anomalies | Override stock, create reservations |
| Order AI | Analyze orders | Modify order status directly |
| Marketplace AI | Recommend listing changes | Bypass Marketplace Engine |
| Customs AI | Analyze classification | Autonomous declarations |
| Customer Service AI | Customer-safe responses | Internal margins, supplier data |
| Returns AI | Analyze returns | Invent supplier recovery |
| Finance AI | Analyze reconciliation | Overwrite historical margin/return impact |

## Integration with Orchestrator

The Orchestrator's `execution.ts` delegates to `executeWorker()` from this layer. Mock workers in `ai-orchestrator/worker.ts` also delegate here for backward compatibility.

## Extension Points

- Real AI provider adapters (`registerProvider`)
- Async execution support
- Distributed execution tracking
- Real notification hooks on escalation

## Known Limitations

- MOCK_PROVIDER only — no real LLM API calls
- Sync execution only in foundation
- In-memory execution registry
- No real provider signature verification

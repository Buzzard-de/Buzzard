# BUZZARD AI CORE — SECURITY MODEL (Esat Bey Layer)

**Date:** 2026-08-21  
**Codename:** Esat Bey Security Layer  
**Principle:** Security-by-design — AI workers protect; they do not attack. Workers cannot self-elevate.

---

## 1. Overview

Every request, task execution, worker action, and data mutation in BUZZARD AI CORE passes through the **Esat Bey Security Layer** before proceeding. This layer is the single enforcement point for authentication, authorization, policy, and audit across the unified platform.

**Canonical implementation path:** `intelligence/buzzard_ai_complete/security/` (evolved from `agents/esat_bey/`).

---

## 2. Threat Model

| Threat | Mitigation |
|--------|------------|
| Unauthorized API access | JWT + API key auth on all `/api/v1/*` |
| Worker permission escalation | Immutable permission set per worker; orchestrator enforces |
| AI self-granting permissions | Workers have no access to permission tables |
| High-risk auto-actions (price change, order, refund) | Human approval gate via exception engine |
| Credential leakage | Env vars / secrets manager only; never in source code |
| SQL injection | Parameterized queries (SQLAlchemy); input validation (Pydantic) |
| Rate abuse | Rate limiting per IP + per API key |
| Session hijacking | Short-lived JWT; MFA-ready architecture |
| Audit tampering | Append-only audit log; no UPDATE/DELETE on audit table |
| Worker isolation breach | Workers execute in scoped context; no cross-domain access |
| Stale/compromised supplier feed | Freshness checks → exception → containment |
| Fake external integration | Connection test returns real status; no simulated success |

---

## 3. Authentication

### 3.1 Human Users (Admin Dashboard)

| Method | Details |
|--------|---------|
| Primary | JWT (shared secret with Node API: `JWT_SECRET`) |
| Token lifetime | 1 hour access + 7 day refresh (configurable) |
| MFA | Architecture-ready; enforce via `BUZZARD_MFA_REQUIRED=1` when configured |
| Session | Server-side session record in `sessions` table |
| Lockout | 5 failed attempts → 15 min lockout (existing Node behavior) |

### 3.2 API Keys (Workers / Integrations)

| Field | Type |
|-------|------|
| id | UUID |
| name | string (unique) |
| token_hash | bcrypt hash |
| role | enum (admin, operator, worker, readonly) |
| scopes | string[] (e.g. `tasks:write`, `memory:read`) |
| active | boolean |
| created_at | timestamptz |
| expires_at | timestamptz (optional) |

Workers authenticate with scoped API keys. Keys are rotatable without downtime (dual-key period).

### 3.3 Service-to-Service (Node ↔ Python)

Internal bridge uses `BUZZARD_INTERNAL_API_TOKEN` (shared secret, not exposed to frontend).

---

## 4. Authorization — RBAC

### 4.1 Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `superadmin` | Platform owner | All |
| `admin` | Operations manager | All except security config |
| `operator` | Day-to-day ops | Tasks, memory read, exceptions, reports |
| `worker` | AI worker service account | Scoped per worker definition |
| `readonly` | Audit/review | Read-only all |
| `customer_service` | CS agent | Customer intents, order context read |

### 4.2 Permission Model

Permissions are **resource:action** pairs:

```
tasks:create, tasks:read, tasks:transition, tasks:approve
memory:read, memory:write
exceptions:create, exceptions:resolve
products:read, products:write, products:publish
prices:calculate, prices:publish
orders:read, orders:transition
suppliers:read, suppliers:sync
customs:classify, customs:approve
audit:read
security:read, security:configure
reports:generate
```

### 4.3 Worker Permission Boundaries

Each worker has a **fixed permission set** defined at registration:

```python
CategoryWorker.permissions = ["memory:write", "tasks:read", "categories:analyze"]
PriceWorker.permissions = ["memory:write", "prices:calculate"]  # NOT prices:publish
```

**Rules:**
- Workers cannot modify their own permissions
- Workers cannot call APIs outside their permission set
- `prices:publish` requires human approval (operator+ role)
- `orders:transition` to SHIPPED requires fulfillment permission
- Customs classification to APPROVED requires operator+ role

---

## 5. Policy Engine

### 5.1 Pre-Execution Checks (EsatBey Gate)

Before every task execution:

```python
def inspect(event: SecurityEvent) -> SecurityDecision:
    checks = [
        check_authentication(event),
        check_authorization(event),
        check_rate_limit(event),
        check_input_validation(event),
        check_risk_level(event),
        check_approval_required(event),
    ]
    return SecurityDecision(allowed=all(c.passed for c in checks), ...)
```

### 5.2 Risk Levels

| Level | Auto-execute? | Example |
|-------|---------------|---------|
| LOW | Yes | Memory write, category scan |
| MEDIUM | Yes with audit | Price calculation, stock check |
| HIGH | No — requires REVIEW | Price publish, order fulfillment |
| CRITICAL | No — requires APPROVED + human | Refund, security config change |

### 5.3 Approval Requirements

High-risk actions create a task in `REVIEW` state and an exception:

```
Action requested → Security gate → REVIEW task → Human approves → EXECUTED
                                              → Human rejects → CANCELLED + audit
```

---

## 6. Input / Output Validation

- **Input:** Pydantic v2 models on all API endpoints; max payload size 1MB
- **Output:** Response schema validation; sensitive fields redacted in logs
- **Worker I/O:** JSON Schema validation against worker's `input_schema` / `output_schema`
- **Supplier feeds:** Schema validation in NORMALIZED stage; reject on violation

---

## 7. Worker Isolation

| Isolation | Mechanism |
|-----------|-----------|
| Permission scope | Worker can only access its domain APIs |
| Memory namespace | Workers write to scoped namespaces (`category:01`, `price:engine`) |
| No direct DB access | Workers use service layer, not raw SQL |
| No cross-worker calls | All inter-worker communication via orchestrator |
| Execution timeout | Configurable per worker (default 60s) |
| Failure containment | CRITICAL exception can halt worker |

---

## 8. Secret Management

| Secret | Storage | Never |
|--------|---------|-------|
| `JWT_SECRET` | Render env / `.env` | In code, in git |
| `DATABASE_URL` | Render env | In code |
| `STRIPE_SECRET_KEY` | Render env (sync: false) | In code |
| `OPENAI_API_KEY` | Render env | In code |
| Supplier API keys | Per-supplier env or secrets manager | In source code |
| TecDoc credentials | Env when available | Mocked |

**Connection test:** `/api/v1/suppliers/{id}/health` returns configured/missing/error — never fake "connected".

---

## 9. Rate Limiting

| Scope | Limit | Window |
|-------|-------|--------|
| Public health | 60 req | 1 min |
| Authenticated API | 300 req | 1 min |
| Worker execution | 100 tasks | 1 min per worker |
| Supplier sync | 10 syncs | 1 hour per supplier |
| Login attempts | 5 failures | 15 min lockout |

Existing Node rate limit (180 req/min) remains on commerce API.

---

## 10. Audit Requirements

Every security-relevant event is logged to append-only `audit_log`:

| Event | Logged Fields |
|-------|---------------|
| Login success/failure | actor, IP, user_agent, result |
| Permission denied | actor, resource, action, reason |
| Task blocked by policy | task_id, worker, risk, reason |
| Approval granted/denied | task_id, approver, decision |
| API key created/revoked | admin, key_name |
| Worker halted | worker_id, exception_id, reason |
| Config change | actor, field, before, after |

Audit records are **immutable** — no UPDATE or DELETE. Archival via partition rotation only.

---

## 11. Anomaly Detection (Phase 4)

| Signal | Action |
|--------|--------|
| Unusual API volume | Rate limit + alert |
| Worker failure spike | Exception + optional halt |
| Permission denied spike | Security event + alert |
| Off-hours admin login | Log + optional MFA challenge |
| Price change > max threshold | Block + exception |

---

## 12. Backup & Recovery

| Asset | Frequency | Retention |
|-------|-----------|-----------|
| PostgreSQL | Daily automated | 30 days |
| Audit log | Continuous (DB) | 1 year minimum |
| Memory snapshots | Weekly export | 90 days |
| Config/secrets | On change (encrypted) | Version controlled (not values) |

Restore procedure documented in `docs/buzzard-ai-core/RUNBOOK.md` (Phase 4).

---

## 13. Security Checklist (Implementation)

- [ ] JWT auth on all `/api/v1/*` routes
- [ ] RBAC middleware with role + scope checks
- [ ] Worker permission enforcement at orchestrator level
- [ ] EsatBey gate before every task execution
- [ ] Append-only audit log
- [ ] Rate limiting per scope
- [ ] Input validation (Pydantic) on all endpoints
- [ ] Secrets from env only
- [ ] No credentials in source code (CI check)
- [ ] High-risk actions require human approval
- [ ] Worker isolation enforced
- [ ] Security events table + alerting hook
- [ ] MFA-ready session architecture

---

## 14. Integration with Existing Security

| Existing | Integration |
|----------|-------------|
| Node JWT auth (`server/server.js`) | Shared `JWT_SECRET`; Python validates same tokens |
| Node 2FA lib | MFA tokens accepted by Python auth middleware |
| Node account lockout | Shared `users` table or sync |
| Python `api_keys` table | Migrate to unified `api_keys` in Postgres |
| `agents/esat_bey/agent.py` | Promote to `security/gate.py` |
| `scripts/security-check.mjs` | Extend to check Python security config |

---

*See [API_SPEC.md](./API_SPEC.md) for auth headers and [AI_WORKER_SPEC.md](./AI_WORKER_SPEC.md) for worker permission model.*

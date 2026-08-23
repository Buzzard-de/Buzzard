# Security Audit

**Date:** 2026-08-22  
**Result:** PARTIAL (no P0; hardening gaps remain)

---

## Authentication

| Control | Status | Evidence |
|---------|--------|----------|
| API token auth (`BUZZARD_API_TOKEN`) | ✅ | `ai_core/api/deps.py` — Bearer / X-API-Key |
| JWT auth (optional) | ✅ | `BUZZARD_JWT_ENABLED` — `test_phase3_jwt_auth.py` |
| 503 when no auth configured | ✅ | `deps.py` returns 503 if token unset and JWT off |
| Worker identity | ✅ | Worker IDs in registry; task permissions enforced |
| Service identity | ✅ | Integration adapters use env tokens |

---

## Authorization

| Control | Status | Evidence |
|---------|--------|----------|
| RBAC via token roles | ✅ | `ai_core/security/token_roles.py` |
| API permission matrix | ⚠️ PARTIAL | `ENDPOINT_PERMISSIONS` — gaps on GET routes |
| Task permission matrix | ✅ | `TASK_REQUIRED_PERMISSIONS` |
| Least privilege workers | ✅ | Workers scoped to required permissions |
| Approval gates (L5) | ✅ | Commerce writes require `approval_granted` |
| Autonomy controls | ✅ | Kill switches + L4 gating |

---

## Secrets Scan

**Method:** Repository search for hardcoded passwords, tokens, API keys, private keys in `ai_core/` production code.

| Finding | Result |
|---------|--------|
| Hardcoded secrets in `ai_core/` | **None found** |
| Secrets via environment only | ✅ `config/settings.py` |
| Test-only credentials | `tests/conftest.py` — `test-token-phase1` (test scope only) |
| Credential leakage in logs | No evidence of secret logging in audit |

**No secrets printed in this report.**

---

## API Security

| Endpoint | Auth | Issue |
|----------|------|-------|
| `GET /api/v1/health` | None | Intentional liveness |
| `GET /api/v1/health/ready` | None | Intentional readiness |
| `GET /api/v1/analytics/metrics` | **None** | **P2-002** — Prometheus export unauthenticated |
| `POST /api/v1/integrations/webhooks/commerce` | HMAC if secret set | **P2-003** — unsigned when secret unset |
| `POST /api/v1/integrations/webhooks/carrier/{id}` | HMAC if secret set | **P2-004** — unsigned when secret unset |
| All other routes | Token/JWT + permissions | ✅ |

---

## Input/Output Validation

| Area | Status |
|------|--------|
| Pydantic request models | ✅ |
| Order webhook HMAC | ✅ when `ORDER_WEBHOOK_SECRET` set |
| Market source whitelist | ✅ `MarketSourceValidator` |
| Pricing policy bounds | ✅ `PricingPolicyEngine` |

---

## Replay Protection & Idempotency

| Control | Status | Evidence |
|---------|--------|----------|
| Idempotency keys (API) | ✅ | `test_phase3_idempotency.py` |
| Idempotency keys (commerce write) | ✅ | `CommerceBridge.write(idempotency_key=...)` |
| Event replay safety | ✅ | Dead-letter + replay API with audit |

---

## Rate Limiting

| Control | Status |
|---------|--------|
| Per-actor rate limit | ✅ `BUZZARD_RATE_LIMIT_PER_MINUTE` |
| Health exempt | ✅ |

---

## Bypass / Debug Risks

| Risk | Default | Severity | Finding |
|------|---------|----------|---------|
| `BUZZARD_ALLOW_ROLE_HEADER` | `false` | Medium if enabled | P3-002 |
| `BUZZARD_COMMERCE_WRITES_DISABLED` | unset | High — **not enforced** | P2-001 |
| Webhook without secret | secrets unset | High in prod | P2-003, P2-004 |

---

## Audit Logging

| Control | Status |
|---------|--------|
| Audit table | ✅ migration 001 |
| Audit API | ✅ `GET /api/v1/audit` |
| Autonomy action audit | ✅ `record_autonomy_action()` |
| Decision audit | ✅ `ai_core_decisions` table |

---

## Security Verdict

**PASS for core auth/RBAC/secrets handling.**  
**PARTIAL overall** due to unauthenticated metrics, optional webhook signing, permission mapping gaps, and inert commerce writes kill switch.

**Classification:** P0: 0 | P1: 0 | P2: 5 security-related | P3: 2

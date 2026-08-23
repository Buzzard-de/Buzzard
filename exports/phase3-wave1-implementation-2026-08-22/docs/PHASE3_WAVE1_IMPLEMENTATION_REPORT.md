# Phase 3 Wave 1 — Implementation Report

**Date:** 2026-08-22  
**Branch:** `cursor/phase3-wave1-c293`

## Wave 1 Scope (from `PHASE3_IMPLEMENTATION_PLAN.md`)

- Commerce integration adapter + Buzzard commerce connector
- JWT authentication (RS256/HS256) with bearer fallback
- API-level RBAC permission enforcement
- Idempotency service + migration 008
- Event outbox service + events admin API
- Commerce webhook ingress
- Wire domain workers to live commerce bridge path
- Kurmay trigger attribution improvement (GAP-K-002)

## Components Implemented

| Component | Path | Type |
|-----------|------|------|
| `CommerceIntegrationAdapter` | `ai_core/integrations/commerce_adapter.py` | New |
| `BuzzardCommerceConnector` | `ai_core/integrations/connectors/buzzard_commerce.py` | New |
| Integration registry factory | `ai_core/integrations/factory.py` | New |
| JWT auth | `ai_core/security/jwt_auth.py` | New |
| API permissions | `ai_core/security/api_permissions.py` | New |
| Idempotency service | `ai_core/services/idempotency_service.py` | New |
| Event service | `ai_core/services/event_service.py` | New |
| Events API | `ai_core/api/v1/events.py` | New |
| Commerce webhook | `ai_core/api/v1/integrations.py` | Extended |
| API deps (JWT + RBAC) | `ai_core/api/deps.py` | Extended |
| Commerce bridge | `ai_core/bridge/commerce.py` | Extended |
| Orchestrator Kurmay attribution | `ai_core/services/orchestrator.py` | Extended |

## Files Created

- `alembic/versions/008_ai_core_idempotency_and_events.py`
- `ai_core/models/idempotency_key.py`
- `ai_core/models/event_outbox.py`
- `ai_core/integrations/commerce_adapter.py`
- `ai_core/integrations/connectors/buzzard_commerce.py`
- `ai_core/integrations/connectors/__init__.py`
- `ai_core/integrations/factory.py`
- `ai_core/security/jwt_auth.py`
- `ai_core/security/api_permissions.py`
- `ai_core/services/idempotency_service.py`
- `ai_core/services/event_service.py`
- `ai_core/api/v1/events.py`
- `tests/test_phase3_commerce_adapter.py`
- `tests/test_phase3_jwt_auth.py`
- `tests/test_phase3_api_permissions.py`
- `tests/test_phase3_idempotency.py`

## Files Modified

- `config/settings.py` — Phase 3 flags (V3, JWT, permissions, webhook secret)
- `requirements.txt` — PyJWT, cryptography
- `ai_core/models/__init__.py`
- `ai_core/bridge/commerce.py`
- `ai_core/api/deps.py`
- `ai_core/api/v1/router.py`
- `ai_core/api/v1/integrations.py`
- `ai_core/api/v1/agents.py`, `categories.py`, `approvals.py`, `commerce.py`, `reports.py`
- `ai_core/services/orchestrator.py`
- `ai_core/workers/stock/engine_worker.py`

## Database Changes

Migration `008_ai_core_idempotency_and_events`:
- `ai_core_idempotency_keys` — write deduplication
- `ai_core_events` — event outbox with status, retry_count, correlation_id

## APIs Added

- `GET /api/v1/events`
- `GET /api/v1/events/dead-letter`
- `GET /api/v1/events/{id}`
- `POST /api/v1/events/{id}/replay` (requires `Idempotency-Key`)
- `POST /api/v1/integrations/webhooks/commerce` (HMAC when secret configured)

## Security

- JWT RS256/HS256 with issuer/audience validation
- Bearer token fallback when `BUZZARD_JWT_ENABLED=false`
- API permission matrix enforced when `BUZZARD_API_PERMISSIONS_ENABLED=true`
- Events replay: `events:admin` + idempotency
- Webhook HMAC verification when `COMMERCE_WEBHOOK_SECRET` set
- Kurmay attribution chain in task payload

## Tests

| Suite | Count |
|-------|-------|
| Phase 1/2 regression (sqlite) | 479 baseline + 11 new = 490 passed |
| Phase 3 Wave 1 new | 20 tests across 4 files |
| Skipped | 1 |
| Postgres/E2E (env) | 6 errors when postgres partially available |

## Known Limitations

1. **Commerce API staging not provisioned** — CONNECTED status requires external `COMMERCE_API_URL` + token
2. **RS256 production keys** — must be supplied via env; tests use HS256
3. **Postgres e2e tests** — require clean postgres instance (environment-dependent)
4. **Wave 1 feature flags** — `BUZZARD_AI_CORE_V3=0` disables V3 registry wiring

## External Dependencies

| Dependency | Status |
|------------|--------|
| Buzzard Commerce API staging | **NOT PROVISIONED** (blocks live CONNECTED E2E) |
| JWT IdP (production) | Optional; HS256/bearer for dev |
| `COMMERCE_WEBHOOK_SECRET` | Optional for webhook HMAC |

## Rollback

- `BUZZARD_AI_CORE_V3=0`
- `BUZZARD_JWT_ENABLED=false`
- `BUZZARD_API_PERMISSIONS_ENABLED=false`
- Alembic downgrade `008`

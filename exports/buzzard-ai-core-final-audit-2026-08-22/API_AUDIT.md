# API Audit

**Date:** 2026-08-22  
**Result:** PARTIAL

---

## Authentication Summary

- **Mechanism:** Bearer token or `X-API-Key` via `authorize()` in `ai_core/api/deps.py`
- **JWT:** Optional when `BUZZARD_JWT_ENABLED=true`
- **Permissions:** `enforce_api_permission` when `BUZZARD_API_PERMISSIONS_ENABLED=true` (auto-on for V3)

---

## Unauthenticated Endpoints (Intentional or Gap)

| Method | Path | Auth | Classification |
|--------|------|------|----------------|
| GET | `/api/v1/health` | None | OK — liveness |
| GET | `/api/v1/health/ready` | None | OK — readiness |
| GET | `/api/v1/analytics/metrics` | None | **GAP** P2-002 |
| POST | `/api/v1/integrations/webhooks/commerce` | HMAC optional | **GAP** P2-003 |
| POST | `/api/v1/integrations/webhooks/carrier/{carrier_id}` | HMAC optional | **GAP** P2-004 |

---

## Authenticated Routes

| Method | Path | Permission | Auth | Validation | Idempotency | Audit | Tests |
|--------|------|------------|------|------------|-------------|-------|-------|
| POST | `/api/v1/tasks` | tasks:create | ✅ | ✅ | ✅ | ✅ | ✅ |
| GET | `/api/v1/tasks` | — | ✅ | ✅ | — | — | ✅ |
| GET | `/api/v1/tasks/{id}` | — | ✅ | ✅ | — | — | ✅ |
| POST | `/api/v1/tasks/{id}/transition` | tasks:transition | ✅ | ✅ | — | ✅ | ✅ |
| POST | `/api/v1/tasks/run-cycle` | — | ✅ | ✅ | — | — | ✅ |
| POST/GET | `/api/v1/memory` | memory:write/read | ✅ | ✅ | — | ✅ | ✅ |
| GET | `/api/v1/memory/{id}` | memory:read | ✅ | ✅ | — | — | ✅ |
| POST | `/api/v1/exceptions` | exceptions:create | ✅ | ✅ | — | ✅ | ✅ |
| GET | `/api/v1/exceptions` | — | ✅ | ✅ | — | — | ✅ |
| POST | `/api/v1/exceptions/{id}/transition` | exceptions:transition | ✅ | ✅ | — | ✅ | ✅ |
| GET | `/api/v1/audit` | audit:read | ✅ | ✅ | — | — | ✅ |
| GET | `/api/v1/agents` | agents:read | ✅ | ✅ | — | — | ✅ |
| POST | `/api/v1/agents/{id}/health-check` | agents:execute | ✅ | ✅ | — | — | ✅ |
| GET | `/api/v1/approvals` | approvals:read | ✅ | ✅ | — | — | ✅ |
| GET | `/api/v1/categories` | categories:read | ✅ | ✅ | — | — | ✅ |
| POST | `/api/v1/categories/{id}/scan` | categories:execute | ✅ | ✅ | — | ✅ | ✅ |
| POST | `/api/v1/commerce/write` | commerce:write | ✅ | ✅ | ✅ | ✅ | ✅ |
| GET | `/api/v1/integrations/status` | integrations:read | ✅ | ✅ | — | — | ✅ |
| POST | `/api/v1/integrations/suppliers/sync` | integrations:execute | ✅ | ✅ | — | ✅ | ✅ |
| POST | `/api/v1/integrations/products/enrich` | integrations:execute | ✅ | ✅ | — | ✅ | ✅ |
| GET/POST | `/api/v1/reports/kurmay` | reports:read/create | ✅ | ✅ | — | ✅ | ✅ |
| GET/POST | `/api/v1/events` | events:read/admin | ✅ | ✅ | — | ✅ | ✅ |
| CRUD | `/api/v1/suppliers` | suppliers:* | ✅ | ✅ | — | ✅ | ✅ |
| CRUD | `/api/v1/products` | products:* | ✅ | ✅ | — | ✅ | ✅ |
| POST/GET | `/api/v1/pricing/*` | pricing:* | ✅ | ✅ | — | ✅ | ✅ |
| GET/POST | `/api/v1/stock` | stock:* | ✅ | ✅ | — | ✅ | ✅ |
| GET/POST | `/api/v1/orders` | orders:* | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST/GET | `/api/v1/returns/*` | returns:* | ✅ | ✅ | — | ✅ | ✅ |
| POST/GET | `/api/v1/decisions/*` | decisions:* | ✅ | ✅ | — | ✅ | ✅ |
| GET | `/api/v1/analytics/kpis` | analytics:read | ✅ | ✅ | — | — | ✅ |
| GET | `/api/v1/analytics/workers` | analytics:read | ✅ | ✅ | — | — | ✅ |

---

## Permission Gaps (P2-005)

Routes authenticated but missing `ENDPOINT_PERMISSIONS` entry (permission check skipped):
- `GET /api/v1/tasks`, `GET /api/v1/tasks/{id}`
- `POST /api/v1/tasks/run-cycle`
- `GET /api/v1/exceptions`, `GET /api/v1/exceptions/{id}`
- `GET /api/v1/reports/kurmay/{report_id}`
- `GET /api/v1/products/{sku}`

---

## Rate Limiting

Applied via middleware (`BUZZARD_RATE_LIMIT_PER_MINUTE`). Health endpoints exempt.

---

## API Verdict

**PARTIAL** — Core CRUD and write paths are secured. Gaps on metrics, webhooks, and some GET permission mappings.

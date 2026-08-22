# BUZZARD AI CORE — PHASE 3 API ARCHITECTURE

**Version:** 1.0  
**Date:** 2026-08-22

---

## 1. API Principles

- Base path: `/api/v1` (inherited from Phase 2)
- Phase 3 adds sub-routers; no breaking changes to existing endpoints
- All endpoints require authentication except `/health` and `/health/ready`
- Versioning via URL path; `/api/v2` reserved for future breaking changes
- Structured error responses with `request_id` correlation

---

## 2. Existing API Surface (Phase 2 — frozen)

| Group | Endpoints | Auth |
|-------|-----------|------|
| Tasks | `POST/GET /tasks`, `GET /tasks/{id}`, `POST /tasks/{id}/transition`, `POST /tasks/run-cycle` | Required |
| Memory | `POST/GET /memory`, `GET /memory/{id}` | Required |
| Exceptions | `POST/GET /exceptions`, `GET /exceptions/{id}`, `POST /exceptions/{id}/transition` | Required |
| Audit | `GET /audit`, `GET /audit/{id}` | Required |
| Health | `GET /health`, `GET /health/ready` | Public |
| Agents | `GET /agents`, `GET /agents/{id}`, `POST /agents/{id}/health-check` | Required |
| Approvals | `GET /approvals`, `GET /approvals/{id}` | Required |
| Categories | `GET /categories`, `GET /categories/{id}`, `POST /categories/{id}/scan` | Required |
| Commerce | `POST /commerce/write` | Required |
| Integrations | `GET /integrations/status`, `POST /integrations/suppliers/sync`, `POST /integrations/products/enrich` | Required |
| Reports | `GET/POST /reports/kurmay`, `GET /reports/kurmay/{id}` | Required |

---

## 3. Phase 3 New Endpoints

### 3.1 Decisions

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/decisions/evaluate` | `decisions:execute` | Trigger decision engine evaluation |
| `GET` | `/decisions` | `decisions:read` | List decisions (paginated) |
| `GET` | `/decisions/{id}` | `decisions:read` | Get decision detail |

### 3.2 Pricing

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/pricing/evaluate` | `pricing:evaluate` | Evaluate price candidate against policy |
| `POST` | `/pricing/publish` | `pricing:publish` | Publish approved price (creates task) |
| `GET` | `/pricing/candidates` | `pricing:read` | List price candidates |

### 3.3 Suppliers

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/suppliers` | `suppliers:read` | List registered suppliers |
| `POST` | `/suppliers` | `suppliers:write` | Register new supplier adapter |
| `GET` | `/suppliers/{id}` | `suppliers:read` | Supplier detail + sync status |
| `POST` | `/suppliers/{id}/sync` | `suppliers:sync` | Trigger supplier catalog sync |

### 3.4 Products

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/products` | `products:read` | List products (paginated, filterable) |
| `GET` | `/products/{sku}` | `products:read` | Product detail |
| `POST` | `/products/{sku}/enrich` | `products:enrich` | Trigger enrichment task |

### 3.5 Stock

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/stock` | `stock:read` | Stock levels (filterable by SKU) |
| `POST` | `/stock/sync` | `stock:sync` | Trigger stock sync task |

### 3.6 Orders

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/orders` | `orders:read` | List orders |
| `GET` | `/orders/{id}` | `orders:read` | Order detail |
| `POST` | `/orders/ingest` | `orders:ingest` | Ingest order (webhook/poll) |

### 3.7 Returns

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/returns/evaluate` | `returns:evaluate` | Evaluate return eligibility |
| `GET` | `/returns` | `returns:read` | List returns |
| `GET` | `/returns/{id}` | `returns:read` | Return detail |

### 3.8 Webhooks (inbound)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/integrations/webhooks/commerce` | HMAC signature | Commerce platform events |
| `POST` | `/integrations/webhooks/supplier/{id}` | HMAC/API key | Supplier push events |
| `POST` | `/integrations/webhooks/carrier/{id}` | HMAC | Carrier tracking events |

### 3.9 Analytics

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/analytics/kpis` | `analytics:read` | Platform KPIs |
| `GET` | `/analytics/workers` | `analytics:read` | Worker performance metrics |

---

## 4. Request/Response Standards

### Request Headers

| Header | Required | Purpose |
|--------|----------|---------|
| `Authorization` | Yes (except health) | Bearer JWT or API key |
| `X-Request-ID` | No | Correlation ID (generated if absent) |
| `Idempotency-Key` | Write endpoints | Deduplication |
| `Accept-Language` | No | Response locale (`de`, `en`, `fr`, `ar`) |
| `X-Actor-Role` | Deprecated | Use JWT claims instead |

### Error Response Format

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Role 'analyst' cannot execute pricing:publish",
    "request_id": "req-abc-123",
    "details": {}
  }
}
```

| HTTP Status | Error Code | When |
|-------------|------------|------|
| 400 | `VALIDATION_ERROR` | Invalid request body |
| 401 | `UNAUTHORIZED` | Missing/invalid auth |
| 403 | `PERMISSION_DENIED` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Idempotency key conflict |
| 422 | `BUSINESS_RULE_VIOLATION` | Policy rejection |
| 429 | `RATE_LIMITED` | Rate limit exceeded |
| 503 | `INTEGRATION_UNAVAILABLE` | External system down |

### Pagination

```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "page_size": 50,
  "has_next": true
}
```

Query params: `?page=1&page_size=50&sort=created_at&order=desc`

---

## 5. Idempotency

| Endpoint Category | Idempotency-Key Required |
|-------------------|--------------------------|
| Task creation | Recommended |
| Commerce write | Required |
| Order ingest | Required |
| Price publish | Required |
| Supplier sync | Recommended |
| Stock sync | Recommended |
| Return evaluate | Required |

Duplicate key within TTL returns cached `200` with original result.

---

## 6. Rate Limiting

Inherited from Phase 2 middleware (`BUZZARD_RATE_LIMIT_PER_MINUTE`, default 60).

Phase 3 extensions:

| Endpoint Group | Limit |
|----------------|-------|
| Read endpoints | 120/min per token |
| Write endpoints | 30/min per token |
| Webhook ingress | 300/min per source |
| Decision evaluate | 10/min per token |
| LLM-dependent | 20/min per token |

---

## 7. API Versioning Strategy

| Version | Status | Notes |
|---------|--------|-------|
| `/api/v1` | Current | Phase 1/2/3 endpoints |
| `/api/v2` | Reserved | Future breaking changes only |

Non-breaking additions (new endpoints, optional fields) stay in v1.

---

## 8. OpenAPI / Documentation

- Auto-generated from FastAPI route definitions
- Available at `/api/v1/docs` (dev/staging only; disabled in production)
- Contract tests validate against OpenAPI schema

---

**STOP — API implementation not started.**

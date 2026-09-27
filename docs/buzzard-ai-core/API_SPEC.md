# BUZZARD AI CORE — API SPECIFICATION

**Version:** v1  
**Base URL:** `https://<intelligence-host>/api/v1`  
**Format:** JSON  
**Auth:** Bearer JWT or `X-API-Key` header

---

## 1. Conventions

### 1.1 Authentication

```http
Authorization: Bearer <jwt_token>
```

or

```http
X-API-Key: <api_key>
```

### 1.2 Request ID

All responses include:
```http
X-Request-Id: <uuid>
```

Clients may send:
```http
X-Request-Id: <uuid>
```

### 1.3 Pagination

```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "page_size": 20,
  "has_more": true
}
```

Query params: `?page=1&page_size=20&sort=-created_at`

### 1.4 Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [{"field": "sku", "issue": "required"}],
    "request_id": "uuid"
  }
}
```

| HTTP Status | Code |
|-------------|------|
| 400 | VALIDATION_ERROR |
| 401 | UNAUTHORIZED |
| 403 | FORBIDDEN |
| 404 | NOT_FOUND |
| 409 | CONFLICT |
| 422 | POLICY_VIOLATION |
| 429 | RATE_LIMITED |
| 500 | INTERNAL_ERROR |
| 503 | EXTERNAL_INTEGRATION_PENDING |

### 1.5 Idempotency

Mutating endpoints accept:
```http
Idempotency-Key: <uuid>
```

Duplicate keys return the original response (24h window).

---

## 2. Health

### `GET /api/v1/health`
Public. Returns service status.

```json
{
  "status": "ok",
  "version": "1.0.0",
  "database": "connected",
  "workers_registered": 52,
  "uptime_seconds": 3600
}
```

### `GET /api/v1/health/ready`
Public. Returns 200 only when DB + queue are ready.

---

## 3. Agents / Workers

### `GET /api/v1/agents`
List registered AI workers.

```json
{
  "items": [{
    "id": "category-01-automotive",
    "name": "Automotive & Kfz Expert",
    "category": "category_intelligence",
    "capabilities": ["assortment_scan", "competitor_price", "trend"],
    "status": "ACTIVE",
    "risk_level": "LOW",
    "last_execution": "2026-08-21T20:00:00Z"
  }]
}
```

### `GET /api/v1/agents/{id}`
Worker detail including permissions and schemas.

---

## 4. Tasks

### `POST /api/v1/tasks`
Create task.

```json
{
  "type": "category_scan",
  "payload": {"category_id": "cat-01", "scope": "full"},
  "priority": "NORMAL",
  "requires_approval": false
}
```

Response `201`:
```json
{
  "id": "task-uuid",
  "type": "category_scan",
  "status": "QUEUED",
  "worker_id": "category-01-automotive",
  "created_at": "2026-08-21T20:00:00Z"
}
```

### `GET /api/v1/tasks`
List tasks. Filters: `?status=QUEUED&type=category_scan&worker_id=...`

### `GET /api/v1/tasks/{id}`
Task detail with transition history.

### `POST /api/v1/tasks/{id}/transition`
Advance task lifecycle.

```json
{
  "action": "approve",
  "note": "Reviewed pricing recommendation"
}
```

Valid actions: `assign`, `start`, `complete`, `approve`, `reject`, `retry`, `cancel`, `escalate`

### `POST /api/v1/tasks/run-cycle`
Trigger orchestrator cycle (process next queued task). Admin only.

---

## 5. Products

### `POST /api/v1/products`
Create canonical product.

```json
{
  "name": "Brake Pad Set",
  "ean": "4012345678901",
  "mpn": "BP-123",
  "category_id": "cat-05",
  "attributes": {"position": "front"},
  "auto_enrich": true
}
```

### `GET /api/v1/products`
List/search products. `?q=brake&category_id=cat-05`

### `GET /api/v1/products/{id}`
Product detail with enrichment status.

### `POST /api/v1/products/{id}/enrich`
Trigger product AI enrichment task.

### `POST /api/v1/products/{id}/classify`
Trigger category classification.

### `GET /api/v1/products/{id}/duplicates`
Duplicate detection results.

---

## 6. Categories

### `GET /api/v1/categories`
List taxonomy (48 L1 DE + KFZ).

### `GET /api/v1/categories/{id}`
Category detail with intelligence status.

### `POST /api/v1/categories/{id}/analyze`
Trigger category intelligence worker.

```json
{
  "analysis_types": ["gap", "competitor", "trend", "supplier_opportunity"]
}
```

---

## 7. Suppliers

### `POST /api/v1/suppliers`
Register supplier adapter.

```json
{
  "name": "Supplier ABC",
  "adapter_type": "REST",
  "config": {
    "endpoint_env": "SUPPLIER_ABC_URL",
    "auth_env": "SUPPLIER_ABC_KEY"
  }
}
```

Note: credentials referenced by env var name, never inline.

### `GET /api/v1/suppliers`
List suppliers with health status.

### `GET /api/v1/suppliers/{id}/health`
Connection test. Returns real status:

```json
{
  "status": "EXTERNAL_INTEGRATION_PENDING",
  "configured": false,
  "last_sync": null,
  "message": "SUPPLIER_ABC_KEY not set"
}
```

### `POST /api/v1/suppliers/{id}/sync`
Trigger supplier feed sync. Returns task ID.

---

## 8. Prices

### `POST /api/v1/prices/calculate`
Calculate recommended price.

```json
{
  "sku": "SKU-001",
  "purchase_cost": 25.00,
  "shipping_cost": 5.00,
  "target_margin": 0.15,
  "competitor_price": 45.00
}
```

Response:
```json
{
  "sku": "SKU-001",
  "recommended_price": 38.24,
  "net_margin": 0.15,
  "policy_check": "PASS",
  "requires_approval": false
}
```

If policy violated:
```json
{
  "recommended_price": 28.00,
  "policy_check": "FAIL",
  "reason": "Below minimum margin (0.10)",
  "requires_approval": true,
  "exception_id": "exc-uuid"
}
```

### `GET /api/v1/prices/history/{sku}`
Price change history.

### `POST /api/v1/prices/publish`
Publish approved price. Requires `prices:publish` permission + approval.

---

## 9. Stock

### `GET /api/v1/stock/{sku}`
```json
{
  "sku": "SKU-001",
  "available": 50,
  "reserved": 5,
  "incoming": 20,
  "supplier_stock": 200,
  "safety_stock": 10,
  "lead_time_days": 3,
  "freshness": "2026-08-21T18:00:00Z",
  "is_stale": false
}
```

### `POST /api/v1/stock/adjust`
Manual adjustment (requires operator role).

---

## 10. Orders

### `POST /api/v1/orders`
Create order (idempotent).

```json
{
  "customer_country": "DE",
  "items": [{"sku": "SKU-001", "quantity": 2, "unit_price": 38.24}],
  "idempotency_key": "order-uuid"
}
```

### `GET /api/v1/orders/{id}`
Order with lifecycle state.

### `POST /api/v1/orders/{id}/transition`
```json
{"action": "mark_paid"}
```

Valid transitions per order lifecycle (see DATABASE_SCHEMA.md).

---

## 11. Customers (Service AI)

### `POST /api/v1/customers/service/analyze`
Analyze customer message.

```json
{
  "message": "Meine Bestellung ist noch nicht angekommen",
  "customer_id": "cust-uuid",
  "channel": "chat"
}
```

Response:
```json
{
  "intent": "SHIPPING",
  "intent_label": "Versand",
  "risk": "LOW",
  "order_context": {"order_id": "ord-123", "status": "SHIPPED"},
  "recommended_action": "Provide tracking info",
  "requires_escalation": false,
  "draft_response": "..."
}
```

---

## 12. Customs

### `POST /api/v1/customs/classify`
```json
{
  "product_id": "prod-uuid",
  "description": "Ceramic brake pads for passenger cars",
  "country_of_origin": "DE"
}
```

Response:
```json
{
  "hs_candidates": [{"code": "8708.30", "confidence": 0.82}],
  "status": "REVIEW",
  "risk": "MEDIUM",
  "message": "Decision support only — not a customs declaration",
  "exception_id": "exc-uuid"
}
```

### `POST /api/v1/customs/{id}/approve`
Human approval of classification. Operator+ only.

---

## 13. Memory

### `GET /api/v1/memory`
Search memory. `?q=brake&type=SIGNAL&category=cat-05&impact=HIGH`

### `POST /api/v1/memory`
Write memory entry.

```json
{
  "source": "category-01-automotive",
  "entity": "cat-05",
  "category": "category_intelligence",
  "type": "SIGNAL",
  "content": {"signal": "competitor_price_drop", "value": -12},
  "confidence": 0.85,
  "impact": "MEDIUM",
  "related_task": "task-uuid"
}
```

### `GET /api/v1/memory/{id}`
Entry with version history.

---

## 14. Exceptions

### `GET /api/v1/exceptions`
List. Filters: `?status=OPEN&severity=HIGH`

### `POST /api/v1/exceptions`
Create (manual or system).

```json
{
  "severity": "HIGH",
  "type": "LOW_MARGIN",
  "message": "SKU-001 price below minimum margin",
  "entity": "SKU-001",
  "owner": "price-engine"
}
```

### `POST /api/v1/exceptions/{id}/transition`
```json
{"action": "resolve", "resolution": "Price adjusted to minimum margin"}
```

Lifecycle: DETECTED → CLASSIFIED → CONTAINED → ASSIGNED → REVIEW → RESOLVED

---

## 15. Audit

### `GET /api/v1/audit`
Query audit log. `?actor=admin&action=price_publish&from=2026-08-01`

Append-only. No POST/PUT/DELETE.

---

## 16. Reports

### `GET /api/v1/reports/kurmay`
Kurmay synthesis report.

```json
{
  "situation": "48 category workers active, 3 exceptions open",
  "analysis": "Automotive category shows competitor price pressure",
  "risk": "MEDIUM — margin compression in cat-05",
  "opportunity": "Supplier ABC offers 15% lower cost on brake pads",
  "recommendation": "Review supplier switch for top 20 SKUs",
  "required_approval": true,
  "action": "Create supplier evaluation task"
}
```

### `POST /api/v1/reports/generate`
Generate custom report. `{"type": "daily_summary", "format": "json"}`

### `GET /api/v1/reports/{id}/download`
Download generated report.

---

## 17. Node Bridge (Existing)

Node API proxies selected calls for admin/frontend compatibility:

| Node Route | Proxies To |
|------------|------------|
| `GET /api/intelligence/status` | `/api/v1/health` |
| `GET /api/intelligence/production/readiness` | Production bridge gates |
| `POST /api/intelligence/tasks` | `/api/v1/tasks` |
| `GET /api/intelligence/memory` | `/api/v1/memory` |

Embedded fallback remains when Python service unavailable.

---

## 18. Existing Python Routes (Migration)

Current module-scoped routes in `api/app.py` will be **wrapped or redirected** to `/api/v1/*`:

| Current | Target v1 |
|---------|-----------|
| `/category-intelligence-43/*` | `/api/v1/categories/{id}/analyze` |
| `/supplier-intelligence/*` | `/api/v1/suppliers/*` |
| `/production/*` | `/api/v1/health/ready` + gates endpoint |
| `/commerce/*` | `/api/v1/products`, `/api/v1/orders` |
| `/bey/*` | `/api/v1/agents` |

Old routes deprecated with `Sunset` header after Phase 2.

---

## 19. OpenAPI

Auto-generated at `/api/v1/docs` (FastAPI) when `BUZZARD_OPENAPI_ENABLED=1`.

---

*See [SECURITY_MODEL.md](./SECURITY_MODEL.md) for auth details and [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for data models.*

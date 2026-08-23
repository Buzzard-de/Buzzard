# External Dependencies — Buzzard AI Core Baseline

**Date:** 2026-08-22

> AI Core implementation is frozen. Only external provisioning and final E2E verification remain.

---

## P1 — Blocking Go-Live

### P1-001: Commerce API Staging E2E

| Dependency | Required | Current |
|------------|----------|---------|
| `COMMERCE_API_URL` | Yes | NOT_PROVISIONED in agent runtime |
| `COMMERCE_API_TOKEN` | Yes | NOT_PROVISIONED in agent runtime |
| `COMMERCE_WEBHOOK_SECRET` | Yes | NOT_PROVISIONED in agent runtime |
| `BUZZARD_AI_CORE_V3` | `1` | NOT_PROVISIONED in agent runtime |

**Provisioning location:** Cursor Cloud Agent Environment dashboard  
**Environment ID:** `644dae45-9422-11f1-ba66-0e7d0216e441`  
**URL:** https://cursor.com/dashboard/cloud-agents/environments/e/644dae45-9422-11f1-ba66-0e7d0216e441

**Do not** commit secrets to Git or paste values in chat.

**Staging API must expose:**
```
GET  /health
GET  /products
GET  /products/{sku}
GET  /stock
GET  /stock/{sku}
GET  /orders
GET  /orders/{id}
POST /actions/{action}
```

**Minimum data:** ≥1 product SKU, ≥1 stock record

**Closure command (after `COMMERCE_RUNTIME_READY`):**
```bash
cd intelligence/buzzard_ai_complete
python3 -m pytest tests/test_phase3_commerce_staging_e2e.py -v
```
Requirement: **6/6 PASS** (skipped does not count)

---

## P2 — External (Non-Blocking for Code Freeze)

| ID | Dependency | Variables | Status |
|----|------------|-----------|--------|
| P2-006 | WMS | `WMS_API_URL`, `WMS_API_TOKEN` | NOT_CONNECTED |
| P2-007 | CRM | `CRM_API_URL`, `CRM_API_TOKEN` | NOT_CONNECTED |
| P2-008 | DHL Live | `DHL_API_URL`, `DHL_API_KEY`, `DHL_USE_MOCK=false` | MOCK ONLY |

---

## P3 — Documented / Deferred

| ID | Item | Classification |
|----|------|----------------|
| P3-001 | Circular import on direct commerce_config import | DEFER |
| P3-002 | `BUZZARD_ALLOW_ROLE_HEADER` if misconfigured | DOCUMENTED_LIMITATION |
| P3-003 | Exception coordinator wiring | DEFER |
| P3-004 | Customs authority integration | EXTERNAL_DEPENDENCY |
| P3-005 | Alembic deprecation warning | DEFER |
| P3-006 | Category audit taxonomy gap | DOCUMENTED_LIMITATION |

---

## Provisioning Owners

| Role | Responsibility |
|------|----------------|
| Commerce / Platform team | Deploy staging Commerce API, issue token + webhook secret |
| DevOps | Inject secrets into Cursor environment `644dae45-9422-11f1-ba66-0e7d0216e441` |
| AI Core team | Verify `COMMERCE_RUNTIME_READY`, run 6/6 E2E, close P1-001 |

---

## What the Cloud Agent Cannot Do

- Create or inject Cursor Environment secrets
- Verify dashboard secret configuration from inside the pod
- Close P1-001 without live Commerce E2E PASS

---

## After P1-001 Closure

| Item | Current | Target |
|------|---------|--------|
| P1 | 1 | 0 |
| COMMERCE | NOT_CONNECTED | CONNECTED |
| GO-LIVE | GO_LIVE_READY_WITH_EXTERNAL_DEPENDENCIES | GO_LIVE_READY |

---

*No Wave 6. No code changes while Commerce provisioning is pending.*

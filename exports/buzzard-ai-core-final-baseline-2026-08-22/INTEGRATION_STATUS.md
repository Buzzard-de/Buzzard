# Integration Status — Buzzard AI Core Baseline

**Date:** 2026-08-22  
**Freeze:** Implementation complete; external connectivity pending

---

## Summary Matrix

| Integration | CODE_READY | CONFIGURED | CONNECTED | E2E_VERIFIED | Status |
|-------------|------------|------------|-----------|--------------|--------|
| **Commerce** | ✅ | ❌ | ❌ | ❌ | **NOT_CONNECTED** |
| WMS | ✅ | ❌ | ❌ | ❌ | NOT_CONNECTED |
| CRM | ✅ | ❌ | ❌ | ❌ | NOT_CONNECTED |
| DHL Carrier | ✅ | ✅ (mock) | ❌ | ❌ | NOT_CONNECTED (mock) |
| Supplier Feeds | ✅ | Optional | Optional | Partial | OPTIONAL |
| Market Data | ✅ | Whitelist | ❌ | Partial | PARTIAL |
| LLM Provider | ✅ | Optional | Optional | Partial | OPTIONAL |
| Customs Authority | ✅ | ❌ | ❌ | ❌ | PENDING |

---

## Commerce (P1-001 Blocker)

| Item | Status |
|------|--------|
| Adapter | `CommerceIntegrationAdapter` / `BuzzardCommerceConnector` |
| Bridge | `CommerceBridge` |
| Unit tests | PASS |
| Staging E2E | **6/6 SKIPPED** — BLOCKED |
| Runtime | `COMMERCE_RUNTIME_NOT_READY` |
| Environment | `644dae45-9422-11f1-ba66-0e7d0216e441` |

**Required env vars (not visible in agent shell):**
- `COMMERCE_API_URL`
- `COMMERCE_API_TOKEN`
- `COMMERCE_WEBHOOK_SECRET`
- `BUZZARD_AI_CORE_V3=1`

---

## WMS / CRM

Adapters implemented and unit-tested. Staging E2E skipped without credentials.

| Variable | Purpose |
|----------|---------|
| `WMS_API_URL`, `WMS_API_TOKEN` | Stock reconciliation |
| `CRM_API_URL`, `CRM_API_TOKEN` | Customer service AI |

---

## DHL / Carrier

Mock mode default (`DHL_USE_MOCK=true`). Live API stub; not production-connected.

---

## Cloud Agent Environment

| Field | Value |
|-------|-------|
| Environment ID | `644dae45-9422-11f1-ba66-0e7d0216e441` |
| Dashboard | https://cursor.com/dashboard/cloud-agents/environments/e/644dae45-9422-11f1-ba66-0e7d0216e441 |
| Secret injection | **Pending** — agent cannot inject secrets |

---

*No fabricated connectivity. NOT_CONNECTED means not verified in runtime.*

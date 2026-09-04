# Part 25 — Production Next Readiness

## Overview

Part 25 wires the Part 24 release readiness library into the existing production architecture. It adds a **runtime diagnostic center**, **admin API endpoints**, and a **public health endpoint** — all fail-closed and diagnostic-only.

No parallel systems are created. Sales, payments, supplier live import, and publish remain **OFF**.

## Architecture

Part 25 extends the existing readiness stack (Parts 17–24):

```
Part 24 lib (releaseReadiness, releaseSafetyGate, releaseManifest, releaseRollbackReadiness)
  └── Part 25 runtime wiring
        ├── releaseReadinessCenter.js   — aggregates config, commerce, supplier, deployment
        ├── releaseAudit.js             — audit wrapper (Part 17 operationsAudit)
        ├── releaseReadinessPlugin.js   — admin diagnostic endpoints
        └── productionHealthPlugin.js   — public GET /api/health/release-readiness
```

## Modules

| Module | Purpose |
|--------|---------|
| `server/lib/release/releaseReadinessCenter.js` | Runtime aggregator — 12-gate readiness report |
| `server/lib/release/releaseAudit.js` | Audit wrapper with secret redaction |
| `server/lib/release/releaseSafetyGate.js` | Enhanced: accepts `runtime.productionSafetyLock` |
| `server/plugins/releaseReadinessPlugin.js` | Admin release diagnostic API |
| `server/core/releaseReadinessConstants.js` | Version bumped to `part25` |

## Endpoints

### Public (no auth)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health/release-readiness` | Full release readiness snapshot (`diagnosticOnly`, `autoActivate: false`) |

### Admin (RBAC `system.read`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/release/readiness` | Full production release readiness report |
| GET | `/api/admin/release/manifest` | Immutable release manifest |
| GET | `/api/admin/release/rollback` | Rollback readiness evaluation |
| POST | `/api/admin/release/validate` | Dry-run validation only (uses `adminSafetyGate`) |

All admin POST endpoints are **validation/dry-run only**. They do not activate sales, payments, supplier import, or publish.

## 12-Gate Readiness Model

Inherited from Part 24 `buildReleaseReadiness()`:

1. build  
2. typecheck  
3. lint  
4. tests  
5. configuration  
6. safety  
7. payments  
8. supplier  
9. database  
10. observability  
11. rollback  
12. goLive — always **BLOCKED** pending human approval  

## Safety Policy

| Control | Default |
|---------|---------|
| `BUZZARD_SALES_ENABLED` | `0` |
| `NEXT_PUBLIC_SALES_ENABLED` | `0` |
| `PRODUCTION_SAFETY_LOCK` | `true` |
| `REAL_SUPPLIER_LIVE_IMPORT` | `0` |
| `REAL_SUPPLIER_DRY_RUN` | `1` |
| Stripe | OFF |
| PayPal | OFF |
| Supplier connected | NO |
| `autoActivate` | `false` |
| `diagnosticOnly` | `true` |

## Tests

```bash
npm run test:part25   # 20 tests (vitest)
npm run test:part24   # 10 tests (node --test) — regression
```

Coverage areas:

- Release readiness center (diagnostic, 12 gates, go-live BLOCKED)
- Safety gate with runtime `productionSafetyLock`
- Rollback and manifest immutability
- Audit secret redaction
- RBAC route permissions
- Part 24 regression
- Commerce/supplier/safety regression

## What Part 25 Does NOT Do

- Does not connect supplier or add credentials
- Does not run live import or publish
- Does not enable sales, Stripe, or PayPal
- Does not bypass `adminSafetyGate` or `goLiveApproval`
- Does not start Part 26

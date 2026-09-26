# BINDING: Buzzard ist das Hauptsystem / Production Source of Truth

**Status:** Binding architecture — documentation only  
**Date:** 2026-09-26  
**Authority:** Operator statement; aligned with `PUSAT_ORCHESTRATION_FACADE_CONTRACT.md`, `PUSAT_ORCHESTRATION_FACADE_ADR.md`, `PUSAT_IDEMPOTENCY_CONTRACT.md`, `PUSAT_ORDER_READ_SOT_ADR.md`, `PUSAT_PHASE_C_REVIEW.md`

This document does **not** authorize code, routes, migrations, flags, deploy, or `PUSAT_RUNTIME_ENABLED=1`.

---

## Canonical tree

```
BUZZARD = HAUPTSYSTEM / PRODUCTION SOURCE OF TRUTH
│
├── Buzzard Core
├── AI Orchestrator
├── Control Center
├── core_ai_tasks
├── core_approvals
├── core_system_events
├── Commerce
├── Orders
├── Payments
├── Marketplace
├── RBAC / Security
│
└── Pusat AI Runtime
    └── unterstützende Runtime / Voice / Policy / Facade
```

---

## 1. Buzzard is the production system

| Rule | Binding |
|---|---|
| Production SoT | Buzzard (`buzzard.db` + existing Node APIs) |
| Task SoT | `core_ai_tasks` via `controlCenter.createAiTask` |
| Task processor | `aiOrchestrator` only (`enqueueTaskProcessing` / `processTask`) |
| Approval SoT | `core_approvals` via `controlCenter.createApproval` |
| Audit SoT | `core_system_events` via `controlCenter.recordSystemEvent` |
| Commerce / orders / payments / marketplace | Existing Buzzard engines only |
| RBAC / security | Existing `rbac.js` / `routePermissions.js` / admin session |

Pusat **does not** become a second production system.

---

## 2. Pusat is supporting only

Pusat AI Runtime may later provide:

- Voice / persona session (not production telephony SoT)
- Policy / authorization **pre-check** against existing Buzzard RBAC
- Facade composition (`server/lib/orchestrationFacade.js` — flag default OFF)
- Optional specialist behind a flag that stays **OFF**

Pusat **must not**:

- Own production tasks, approvals, orders, payments, or marketplace writes
- Create `pusat.db`
- Replace `aiOrchestrator`
- Act as a fourth orchestrator
- Persist its own retry queue or task DB
- Treat in-memory Maps as durable SoT
- Use the Python orchestrator as a parallel task processor

---

## 3. Ownership map

| Concern | Owner | Not owner |
|---|---|---|
| AI tasks | Buzzard `controlCenter` + `core_ai_tasks` | Pusat, Python `tasks`, facade |
| Task processing | Buzzard `aiOrchestrator` | Facade, Pusat, Python |
| Human approval | Buzzard `controlCenter` + `core_approvals` | Pusat, Python `approvals`, Guardian |
| Audit | Buzzard `recordSystemEvent` | Pusat-only audit DB |
| Idempotency (AI dispatch) | Facade lookup on `payload_json.idempotencyKey` → `core_ai_tasks` | Pusat in-memory Map |
| Order read (Phase-C MVP) | Interim `orders.json` via existing phone adapter | Pusat store |
| Order write | Buzzard order/OMS/commerce writers | Facade / Pusat |
| Payments / marketplace | Buzzard commerce engines | Facade / Pusat |
| RBAC | Buzzard admin + `ai.assign` / `ai.read` / `ai.execute` | Pusat JWT realm |

---

## 4. Facade position

`orchestrationFacade.js` (future) sits **under** Buzzard, as a composer:

```
Caller
  → orchestrationFacade (flag OFF by default)
    → controlCenter.createAiTask / createApproval / recordSystemEvent
    → aiOrchestrator.enqueueTaskProcessing
    → pusatPolicyAdapter.executeReadOnlyBuzzardAction (GET_ORDER only in MVP)
```

The facade is **not** a sibling of Buzzard Core. It is **not** the Pusat Runtime. Pusat may be invoked later as a specialist **inside** that composer, never as the public production face.

---

## 5. Production safety

- `BUZZARD_ORCHESTRATION_FACADE` default **OFF**
- `PUSAT_RUNTIME_ENABLED` must remain **not** `"1"`
- No production activation
- No second SoT
- Implementation ≠ activation

---

SYSTEM HIERARCHY:  
READY

PRODUCTION SoT:  
BUZZARD

PUSAT ROLE:  
SUPPORTING ONLY (voice / policy / facade)

TASK OWNER:  
`controlCenter.createAiTask` + `aiOrchestrator`

APPROVAL OWNER:  
`controlCenter.createApproval`

AUDIT OWNER:  
`controlCenter.recordSystemEvent`

PRODUCTION FLAG:  
OFF

NO CODE CHANGES MADE  
NO DATABASE CHANGES MADE  
NO DEPLOYMENT MADE  
NO PRODUCTION ACTIVATION MADE

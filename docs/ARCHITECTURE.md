# Buzzard Architecture

**Stand:** Part 5 (August 2026)  
**Modus:** Katalogmodus (`BUZZARD_SALES_ENABLED=0`)

## Stack

| Layer | Technology |
|-------|------------|
| Storefront | Next.js 15 (static export) → buzzard24.de |
| API | Node.js HTTP router + Plugin-Architektur |
| Database | SQLite (better-sqlite3) + JSON-Dateien |
| AI Services | Python Orchestrator + Guardian (extern) |
| Deploy | Render (Frankfurt), GitHub Pages |

## Request Flow

```
Browser → buzzard24.de (static)
       → buzzard-api.onrender.com/api/*
            → Global Auth Middleware (Part 3)
            → Plugin Handler
            → SQLite / JSON
```

## Core Modules (Part 2 + 3 + 4)

| Modul | Pfad | Zweck |
|-------|------|-------|
| Unified Auth Facade | `server/core/auth/` | Admin, Customer, Service, AI Realms |
| Global RBAC | `server/lib/routePermissions.js` | Route → Permission Map |
| Auth Middleware | `server/lib/globalAuthMiddleware.js` | Wraps alle registrierten Routes |
| Admin Guard | `server/lib/adminGuard.js` | Central plugin guard helpers |
| Nav Permissions | `lib/admin/navPermissions.mjs` | Role-based admin nav (UX) |
| Control Center | `server/lib/controlCenter.js` | AI, Status, Approvals |
| Job Queue | `server/lib/jobQueue.js` | Background job foundation |
| Rate Limit Store | `server/lib/rateLimitStore.js` | memory/file/redis backends |
| Job Worker | `server/lib/jobWorker.js` | Background job execution |
| Job Scheduler | `server/lib/jobScheduler.js` | One-time / recurring / delayed |
| Supplier Adapters | `server/lib/supplier/` | REST/XML/CSV/JSON foundation |
| Sync Pipelines | `server/lib/sync/` | Product / price / stock |
| Category Readiness | `server/lib/categoryReadiness.js` | Real PASS/FAIL/WARNING checks |
| Redis Client | `server/lib/redisClient.js` | Upstash REST |
| **Product Core (PIM)** | `server/lib/pim/` | Category-agnostic PIM (Part 6) |
| **Storefront Bridge** | `server/lib/storefront/` | PIM → public catalog API (Part 7) |
| RBAC | `server/lib/rbac.js` | Rollen + Permissions |

## Auth Realms

| Realm | Legacy-Quelle | Verwendung |
|-------|---------------|------------|
| admin | `server/lib/auth.js` | `/api/admin/*` |
| customer | `server/lib/customerAuth.js` | `/api/account/*` |
| service | `server/lib/dbAuth.js` | `/api/auth/*`, JWT |
| ai | `core_ai_employees` | Interne AI-Kontexte |

Legacy-Systeme bleiben aktiv; die Facade abstrahiert sie.

## Daten

- Produkte/Kategorien: JSON + SQLite
- Admin-User: `server/data/admin-users.json`
- Sessions: In-Memory + `admin-sessions.json`
- Security Events: `server/data/security-log.json`
- Core AI/Tasks: SQLite `core_*` Tabellen

## Testing (Part 4)

| Script | Purpose |
|--------|---------|
| `npm run test:part2` | Control Center smoke |
| `npm run test:part3` | Security / RBAC smoke |
| `npm run test:part4` | Governance / jobs / nav smoke |
| `npm run test:unit` | Vitest unit tests (36) |
| `npm run test:part5` | Automation / worker smoke |
| `npm run test:part6` | Product Core / PIM smoke |
| `npm run test:part7` | Storefront bridge smoke |
| `npm run test:part8` | Commerce readiness smoke |
| `npm run test:part9` | Storefront commerce bridge smoke |
| `npm run test:part10` | Production hardening smoke |
| `npm run test:production-safety` | Sales-off safety guard |
| `npm run test:e2e` | Playwright E2E (starts API + storefront) |

## Deployment

Siehe `docs/PART4_DEPLOY_CHECKLIST.md`. Katalogmodus-Env-Vars dürfen nicht geändert werden.

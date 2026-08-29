# Buzzard Architecture

**Stand:** Part 3 (August 2026)  
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

## Core Modules (Part 2 + 3)

| Modul | Pfad | Zweck |
|-------|------|-------|
| Unified Auth Facade | `server/core/auth/` | Admin, Customer, Service, AI Realms |
| Global RBAC | `server/lib/routePermissions.js` | Route → Permission Map |
| Auth Middleware | `server/lib/globalAuthMiddleware.js` | Wraps alle registrierten Routes |
| Control Center | `server/lib/controlCenter.js` | AI, Status, Approvals |
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

## Deployment

Siehe `render.yaml`. Katalogmodus-Env-Vars dürfen in Part 3 nicht geändert werden.

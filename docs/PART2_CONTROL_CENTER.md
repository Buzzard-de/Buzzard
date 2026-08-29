# BUZZARD Part 2 — Central Control Center + AI Task Orchestration

## Overview

Part 2 builds on Core Foundation (Part 1 analysis + minimal scaffold) and adds:

- **Central Control Center** admin UI (`/admin/control-center/`)
- **System status** from real health checks
- **AI Employee Center** with permissions
- **AI Task Center** with assignment and status
- **AI Orchestrator** (`server/lib/aiOrchestrator.js`) with provider abstraction (`server/lib/aiProviders.js`)
- **Human Approval Center**
- **Escalation + Notification** framework (`server/lib/notificationHub.js`)
- **Category visibility** admin + customer filtering
- **Integration Center** with live status refresh
- **Activity stream** + global admin search

## API Routes

| Route | Auth | Description |
|-------|------|-------------|
| `GET /api/health/db` | Public | Database health |
| `GET /api/health/ai` | Public | Orchestrator + Guardian |
| `GET /api/categories/visibility` | Public | Customer visibility map |
| `GET /api/admin/control-center/status` | Admin + `system.read` | Live service status |
| `GET /api/admin/control-center/summary` | Admin + `system.read` | Dashboard counts |
| `GET /api/admin/control-center/integrations` | Admin + `integrations.read` | Integration registry |
| `GET /api/admin/control-center/escalations` | Admin + `security.read` | Escalations |
| `GET /api/admin/control-center/background-jobs` | Admin + `system.read` | Background jobs |
| `GET /api/admin/ai/employees` | Admin + `ai.read` | AI employees |
| `POST /api/admin/ai/tasks` | Admin + `ai.assign` | Create task (orchestrator enqueued) |
| `GET /api/admin/approvals` | Admin + `ai.read` | Pending approvals |
| `POST /api/admin/approvals/:id/decide` | Admin + `ai.execute` | Approve/reject |
| `PATCH /api/admin/categories/:id/visibility` | Admin + `categories.write` | Set ACTIVE/HIDDEN/etc. |

Note: `/api/admin/integrations` remains the commercial integrations config endpoint (existing plugin).

## Commands

```bash
npm run test:part2          # Smoke tests (API must run)
npm run typecheck
npm run build
```

## Catalog mode

No sales, payments, or real supplier orders enabled. AI tasks run in stub provider mode (`BUZZARD_AI_PROVIDER=stub`).

## Database

SQLite tables prefixed `core_*` — see `migrateCoreFoundationPart2()` in `server/lib/db.js`.

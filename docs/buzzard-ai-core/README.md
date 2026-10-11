# BUZZARD AI CORE — Documentation Index

**Status:** Analysis phase complete — implementation not started  
**Date:** 2026-08-21

## Documents

| Document | Purpose |
|----------|---------|
| [CURRENT_STATE.md](./CURRENT_STATE.md) | Full repository analysis — what exists, what's demo, what's missing |
| [ARCHITECTURE_PLAN.md](./ARCHITECTURE_PLAN.md) | Target architecture — ONE platform, ONE core, ONE database |
| [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) | Phased migration from fragmented state to unified platform |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Target PostgreSQL schema |
| [API_SPEC.md](./API_SPEC.md) | `/api/v1/*` endpoint specification |
| [AI_WORKER_SPEC.md](./AI_WORKER_SPEC.md) | Standard worker interface contract |
| [SECURITY_MODEL.md](./SECURITY_MODEL.md) | Esat Bey security layer |

## Key Decisions

1. **Canonical backend:** `intelligence/buzzard_ai_complete/` (Python FastAPI)
2. **Canonical database:** PostgreSQL (migrate from dual SQLite)
3. **No new HTML demos** — extend existing admin dashboard
4. **Website i18n unchanged** — de/en/tr/ar storefront remains independent
5. **Preserve all existing features** — consolidate, don't delete

## Next Step

Begin **Phase 1** (see MIGRATION_PLAN.md): PostgreSQL + unified orchestrator + central memory + exception engine + audit.

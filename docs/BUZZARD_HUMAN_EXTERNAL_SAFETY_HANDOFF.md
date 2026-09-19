# BUZZARD — Human / External Safety Handoff

**Purpose:** Separate what Cloud Agent / repository work can complete from what only the operator can do on Render, suppliers, and payment/carrier accounts.

**Golden rule:** Nothing is simulated, invented, or reported as live unless externally verified.

---

## Cursor / Repository (allowed)

- Analyze and fix existing code
- Prepare `render.yaml`, env key names, health checks, preflight gates
- Local SQLite persistence tests (isolated temp DB only)
- Local backup/restore dry-run (`scripts/restore-db.mjs --dry-run`)
- Status matrices: PASS / WARNING / BLOCKED / UNVERIFIED
- Document **HUMAN_REQUIRED** and **BLOCKED_EXTERNAL_ACCESS** clearly

## Operator only (never simulated by Cursor)

| Domain | Examples |
|--------|----------|
| **Render** | Create/mount persistent disk, production deploy, env secrets, production restart, live `/api/health/db` confirmation |
| **Inter Cars** | B2B contract, OAuth2 production credentials, API rights |
| **Payment** | Provider account, KYC, production credentials, webhooks |
| **Carrier** | DHL, DPD, GLS, UPS, DHL Express business accounts |
| **Other** | Returns, AI, marketing, marketplaces |

---

## Evidence rule

Use **VALIDATED / READY / COMPLETE** for production only when real external evidence exists.

Unit tests, fixtures, sandbox, and correct `render.yaml` are **software complete** — not production evidence.

---

## Status mapping (current Buzzard preflight)

| Your label | Buzzard preflight (example) |
|------------|-------------------------------|
| SOFTWARE complete | `BLUEPRINT_CONFIGURATION=PASS`, `SOFTWARE_SUPPORT=PASS` |
| EXTERNAL_ACCESS human | `MANUAL_RENDER_ACTION=BLOCKED` (action required), Render disk → operator |
| LIVE_VALIDATION blocked | `LIVE_RENDER_DISK=UNVERIFIED`, `RENDER_PERSISTENCE_READY=UNVERIFIED` |
| BLOCKED_EXTERNAL_ACCESS | Inter Cars / payment / carrier in external access matrix |

**Important:** `RENDER_BLUEPRINT_DISK_CONFIGURED=PASS` means **declarative YAML only**, not a mounted Render disk.

Live disk PASS only when `GET /api/health/db` returns `persistent=true` and path under `/var/data/buzzard.db` on the **actual** production instance (operator-verified or probe with real response — never assumed).

---

## Commands (read-only)

```bash
npm run preflight:production-storage
npm run preflight:render-persistent-disk-blueprint
npm run status:buzzard-final
```

Reports:

- `docs/BUZZARD_RENDER_PERSISTENT_DISK_BLUEPRINT.md`
- `docs/BUZZARD_PRODUCTION_STORAGE_PREFLIGHT.md`
- `docs/BUZZARD_FINAL_INTERNAL_PRODUCTION_READINESS_AUDIT.md`

---

## SALES safety

This chain must keep **`SALES_ENABLED=0`** until human go-live steps (#342–#346) and external validation are explicitly complete.

Cursor must **never** set `SALES_ENABLED=1` in this workflow.

---

## Current expected state (repo-only, no Render sync)

```
SOFTWARE_SUPPORT          = PASS
BLUEPRINT_CONFIGURATION   = PASS
DATABASE_CONFIGURATION    = PASS
BACKUP_CONFIGURATION      = PASS
LIVE_RENDER_DISK          = UNVERIFIED_EXTERNAL
LIVE_PERSISTENCE          = UNVERIFIED_EXTERNAL
MANUAL_RENDER_ACTION      = HUMAN_REQUIRED
EXTERNAL_ACCESS (global)  = BLOCKED_EXTERNAL_ACCESS / HUMAN_REQUIRED
LIVE_VALIDATION           = BLOCKED
SALES_ENABLED             = 0
```

This is **correct** — not a failure of software.

# Part 2 — API-Referenz & Befehle

## Öffentliche Endpoints

| Methode | Route | Beschreibung |
|---------|-------|--------------|
| GET | `/api/health/db` | SQLite-Status, Produkt-/User-Zähler |
| GET | `/api/health/ai` | Orchestrator + Guardian Status |
| GET | `/api/categories/visibility` | Sichtbarkeits-Map für Storefront |

## Admin Endpoints (Bearer Token erforderlich)

| Methode | Route | Permission | Beschreibung |
|---------|-------|------------|--------------|
| GET | `/api/admin/control-center/status` | system.read | Live Service-Status |
| GET | `/api/admin/control-center/summary` | system.read | Dashboard-Zähler |
| GET | `/api/admin/control-center/activity` | audit.read | Aktivitätsstream |
| GET | `/api/admin/control-center/search?q=` | system.read | Globale Suche |
| GET | `/api/admin/control-center/security` | security.read | Security-Zusammenfassung |
| GET | `/api/admin/control-center/config` | system.read | Öffentliche Config |
| PUT | `/api/admin/control-center/config/:key` | system.configure | Config setzen |
| GET | `/api/admin/control-center/integrations` | integrations.read | Integration Registry |
| GET | `/api/admin/control-center/escalations` | security.read | Eskalationen |
| GET | `/api/admin/control-center/background-jobs` | system.read | Hintergrundjobs |
| GET | `/api/admin/control-center/notifications` | system.read | Benachrichtigungen |
| GET | `/api/admin/ai/employees` | ai.read | AI-Mitarbeiter |
| PATCH | `/api/admin/ai/employees/:id/status` | ai.assign | Status ändern |
| GET | `/api/admin/ai/tasks` | ai.read | Aufgabenliste |
| POST | `/api/admin/ai/tasks` | ai.assign | Aufgabe erstellen |
| PATCH | `/api/admin/ai/tasks/:id/status` | ai.execute | Status ändern |
| GET | `/api/admin/approvals` | ai.read | Approvals |
| POST | `/api/admin/approvals` | ai.assign | Approval anlegen |
| POST | `/api/admin/approvals/:id/decide` | ai.execute | Approve/Reject |
| GET | `/api/admin/categories/visibility` | categories.read | Admin-Sichtbarkeit |
| PATCH | `/api/admin/categories/:id/visibility` | categories.write | Status setzen |

## Service-Status-Werte

`ONLINE` | `WARNING` | `OFFLINE` | `UNKNOWN`

## Kategorie-Sichtbarkeit

`ACTIVE` | `HIDDEN` | `COMING_SOON` | `DRAFT`

- **Kunde sieht:** ACTIVE, COMING_SOON
- **Admin sieht:** alle

## AI Task Status

`PENDING` | `ASSIGNED` | `RUNNING` | `WAITING_APPROVAL` | `COMPLETED` | `FAILED` | `CANCELLED`

## AI Task Priority

`CRITICAL` | `HIGH` | `NORMAL` | `LOW`

## Befehle

```bash
# Part 2 Smoke Tests (API muss laufen)
npm run test:part2

# Typecheck, Build, Lint
npm run typecheck
npm run build
npm run lint

# API lokal starten
node server/server.js
# → http://localhost:3001

# Admin Login (Seed)
# E-Mail: admin@buzzard.de
# Passwort: BuzzardAdmin2026!
```

## Admin UI

- Control Center: `/admin/control-center/`
- Dashboard: `/admin/`
- Security: `/admin/security-dashboard/`

## Env-Variablen (AI)

```
BUZZARD_AI_PROVIDER=stub          # Default, kein externer Call
BUZZARD_ORCHESTRATOR_URL=…        # Python Orchestrator (optional)
BUZZARD_GUARDIAN_URL=…            # Python Guardian (optional)
```

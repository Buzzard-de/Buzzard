# Buzzard Admin Panel

**Stand:** Part 4

## Zugang

- URL: `/admin/login/` → nach Login `/admin/`
- Control Center: `/admin/control-center/`
- Auth: Bearer Token in `sessionStorage` (`buzzard_admin_token`)

## Rollen (RBAC)

| Rolle | Beschreibung |
|-------|--------------|
| administrator | Vollzugriff (`*`) |
| admin | Breite Admin-Rechte |
| catalog_manager | Produkte, Kategorien, SEO |
| order_manager | Bestellungen, Logistik |
| staff | Lesen + eingeschränkte Aktionen |
| read_only | Nur Lesen |
| ai_agent | AI-intern (kein Admin-Panel) |

Seed-User: `data/buzzard_admin_users.seed.json`

## Global RBAC (Part 3)

Jede `/api/admin/*` Route wird serverseitig geschützt:

1. Authentication (Unified Auth Facade)
2. Authorization (Permission aus `routePermissions.js`)

Nav-Sichtbarkeit allein ist **kein** Schutz — Backend prüft immer.

## Role-Based Navigation (Part 4)

Frontend nav is filtered by role via `lib/admin/navPermissions.mjs`:

- `catalog_manager` → Catalog / Products / Categories
- `order_manager` → Orders / Commerce / Logistics
- `read_only` → read-permitted screens only
- `administrator` / `super_admin` → all permitted areas

**Important:** Nav hiding is UX only — backend RBAC always enforces permissions.

## Session Management UI

- Page: `/admin/sessions/`
- List active sessions (ID, user, IP, user-agent, created, expiry)
- Revoke via UI → audit logged

## Session Management API

- TTL: 8 Stunden
- API: `GET /api/admin/sessions` (security.read)
- Revoke: `DELETE /api/admin/sessions/:sessionId` (security.manage)
- Metadaten: IP, User-Agent, createdAt

## 2FA

- TOTP optional für Administrator
- Setup über `/api/admin/security/2fa/*`

## Control Center Tabs

Status, AI Employees, Tasks, Approvals, Categories, Integrations, Activity

## Hinweis Katalogmodus

Commerce-Module sind geladen, aber Verkauf/Zahlung bleiben deaktiviert.

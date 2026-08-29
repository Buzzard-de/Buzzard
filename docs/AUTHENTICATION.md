# Buzzard Authentication

**Stand:** Part 4 — Unified Auth Facade + Session UI

## Facade API

Pfad: `server/core/auth/index.js`

| Funktion | Beschreibung |
|----------|--------------|
| `authenticate(req, { realm })` | Identität ermitteln + an req hängen |
| `getCurrentUser(req)` | Aktuelle Identität (alle Realms) |
| `requireAuth(req, res, { realm })` | 401 wenn nicht authentifiziert |
| `requireRole(req, res, roles)` | Rollen-Check |
| `requirePermission(req, res, permission)` | RBAC-Check + Event bei Deny |
| `logout(req, realm)` | Session beenden |
| `verifyMFA(req, res, { code, challengeToken })` | Admin 2FA |
| `getSession(req, realm)` | Session-Objekt |

## Realms

### admin
- Legacy: `server/lib/auth.js`
- Bearer Token → JSON Session oder JWT-Admin-Fallback
- `/api/admin/*`

### customer
- Legacy: `server/lib/customerAuth.js`
- `/api/account/*`

### service
- Legacy: `server/lib/dbAuth.js`
- JWT für SQLite-User
- `/api/auth/*`

### ai
- `x-buzzard-ai-employee-id` Header
- Nur aktive AI Employees
- Keine Admin-Permissions

## Migration

Bestehende `requireAuth()` in `auth.js` bleibt kompatibel.  
Neue Code sollte die Facade nutzen:

```javascript
const auth = require("../core/auth");
auth.requireAuth(req, res, { realm: "admin" });
auth.requirePermission(req, res, "products.read");
```

## Session Security

- 8h TTL, sessionId pro Session
- IP + User-Agent gespeichert
- Revocation via Admin API
- Logout invalidiert Token sofort

## Nicht implementiert

- Unified Refresh für JSON-Admin-Sessions (JWT Refresh über Identity Security v2.0)

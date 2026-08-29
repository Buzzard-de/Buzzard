# Buzzard Security

**Stand:** Part 3

## Schutzmaßnahmen (implementiert)

| Maßnahme | Status | Details |
|----------|--------|---------|
| Global RBAC | ✅ | Alle `/api/admin/*` Routes |
| Unified Auth Facade | ✅ | `server/core/auth/` |
| Rate Limiting | ✅ | 180/min API; Login-Limits |
| Account Lockout | ✅ | 5 Fehlversuche → 30 Min |
| Admin 2FA | ✅ | TOTP |
| Security Headers | ✅ | HSTS, X-Frame-Options, CSP, COOP, CORP |
| Audit Log | ✅ | JSON + coreAudit |
| Security Events | ✅ | `security-log.json` |
| AI Permission Gate | ✅ | Blockierte Admin-Permissions |
| IDOR Guards | ✅ | `server/lib/idorGuard.js` |
| Session Revocation | ✅ | Admin API |

## CSRF-Strategie

**Bearer-Token APIs (Admin-Panel):** Kein CSRF-Token nötig.  
Der Browser sendet `Authorization: Bearer …` per JavaScript — Cookies werden nicht für Auth verwendet. CSRF-Angriffe auf Bearer-Header sind nicht möglich.

**Cookie-basierte Flows (falls aktiviert):**  
Wenn `BUZZARD_CSRF_ENFORCE=1` und kein Bearer-Header:

- State-changing Requests (POST/PUT/PATCH/DELETE) erfordern
- Header `X-Buzzard-Csrf-Token` = Cookie `buzzard_csrf`
- Fehler → Event `csrf_failure`, HTTP 403

**Öffentliche Auth-Endpoints** (login) sind von CSRF-Enforcement ausgenommen.

## Rate Limiting

- **Aktuell:** In-Memory (+ optional File-Persist via `BUZZARD_RATE_LIMIT_PERSIST=1`)
- **Problem:** Restart setzt Buckets zurück (Dokumentiert)
- **Zukunft:** `BUZZARD_RATE_LIMIT_STORE=redis` (Abstraction in `rateLimitStore.js`)

## Security Events

Typen u.a.: `admin_login`, `admin_login_failed`, `permission_denied`, `privilege_escalation_attempt`, `csrf_failure`, `idor_attempt`, `ai_permission_violation`, `session_revoked`, `api_rate_limited`

API: `GET /api/admin/security/events` (security.read)

## Secret Management

- Keine echten Secrets im Repo
- `.env.example` listet alle Variablen
- Config-API blockiert Keys mit secret/password/token
- Frontend erhält keine JWT_SECRET / API Keys

## Katalogmodus

`BUZZARD_SALES_ENABLED=0` — keine echten Zahlungen oder Lieferanten-Orders.

# Buzzard Security

**Stand:** Part 12

## Part 12 additions

- **Supplier order blocked** event (`supplier_order_blocked`, CRITICAL) on all paths when SALES=0
- **Legacy fulfillment** gated — no demo auto-submit without sales + supplier flags
- **Test rate limits:** `BUZZARD_TEST_MODE=1` disables rate limiting in smoke/E2E only
- **Production restore guard:** `BUZZARD_ALLOW_PRODUCTION_RESTORE=1` required for `/var/data` targets

## Schutzmaßnahmen (implementiert)

| Maßnahme | Status | Details |
|----------|--------|---------|
| Global RBAC | ✅ | Alle `/api/admin/*` Routes |
| Unified Auth Facade | ✅ | `server/core/auth/` |
| Rate Limiting | ✅ | memory / file / redis abstraction |
| Persistent Rate Limit | ✅ | `BUZZARD_RATE_LIMIT_STORE=file` |
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

## Rate Limiting (Part 4)

```
BUZZARD_RATE_LIMIT_STORE=memory|file|redis
```

- **memory:** default — resets on restart
- **file:** persists buckets to `server/data/rate-limit-buckets.json`
- **redis:** stub — falls back to file until Upstash configured

Health: `GET /api/security/health` → `protections.rateLimitBackend`

## Security Dashboard (Part 4)

- Filters: severity, event type, user, date range, search
- Pagination: server-side (max 200 per page)
- CRITICAL events highlighted in admin UI
- API: `GET /api/admin/security/events?severity=CRITICAL&page=1&limit=50`

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

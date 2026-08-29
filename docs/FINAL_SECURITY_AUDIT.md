# Buzzard — Final Security Audit (Part 11)

**Audit date:** 2026-08-29  
**Overall security posture:** **PASS** (with documented P1/P2 items)  
**Commerce safety:** **PASS** (`BUZZARD_SALES_ENABLED=0` enforced)

---

## 1. Authentication Audit

| Path | Mechanism | Authoritative? |
|------|-----------|----------------|
| `/api/admin/*` | Admin session token (Bearer/cookie) via unified facade | Yes (admin realm) |
| `/api/admin/login` | Email/password + optional 2FA | Entry point |
| `/api/account/*`, `/api/customer/*` | Customer session | Yes (customer realm) |
| `/api/auth/*`, `/api/me` | JWT (dbAuth) | Service/customer legacy |
| `/api/ai/internal/*` | AI employee header token | Yes (ai realm) |
| Public catalog | None | Intentional |

**Bypass paths:** No unauthenticated `/api/admin/*` access confirmed (401/403).  
**Legacy auth:** Still registered for compatibility; wrapped by providers in unified facade.

**Status:** **GO WITH CONDITIONS** — consolidate legacy JWT usage over time.

---

## 2. RBAC Audit

- Global `wrapRouteHandler` enforces authentication on `/api/admin/*`.
- Per-route `requirePermission(req, res, "permission.key")` for fine-grained control.
- Tested roles (Part 3/4): administrator ✓, read_only denied configure ✓, AI blocked permissions ✓.

| Role | Control Center | Products | Orders | system.configure |
|------|----------------|----------|--------|------------------|
| administrator | ✓ | ✓ | ✓ | ✓ |
| catalog_manager | partial | ✓ | ✗ | ✗ |
| order_manager | partial | ✗ | ✓ | ✗ |
| read_only | read | read | read | ✗ |
| anonymous | ✗ | ✗ | ✗ | ✗ |

**Status:** **PASS**

---

## 3. IDOR Audit

| Resource | Test | Result |
|----------|------|--------|
| Commerce cart | Cross-customer GET | **403/404** |
| Admin sessions | Invalid session ID | Rejected (Part 3) |
| Orders | Commercial blocked | N/A when SALES=0 |

**Status:** **PASS** for commerce cart (verified in final-audit + Part 8/9)

---

## 4. CSRF Audit

- Bearer token flows: CSRF exempt on login paths (Part 3 verified).
- Cookie-based admin flows: `BUZZARD_CSRF_ENFORCE` policy in security module.
- Malicious origin: CORS allowlist in `server.js` (localhost + buzzard24.de).

**When CSRF required:** Cookie-authenticated mutating requests to admin when `BUZZARD_CSRF_ENFORCE=1`.

**Status:** **PASS** (consistent policy; full malicious-origin browser test **DEFERRED**)

---

## 5. Session Security

- Admin sessions: file-backed, TTL, revocation via `/api/admin/sessions/:id` DELETE
- Invalid/expired sessions rejected (Part 3)
- Secrets not returned in API responses

**Status:** **PASS**

---

## 6. Rate Limiting

| Limiter | Scope | Backend |
|---------|-------|---------|
| Global API | 180/min | memory/file |
| Commerce cart | 30/min | memory |
| Commerce checkout complete | 10/min | memory |
| Checkout attempt (readiness) | 60/min | memory (Part 11 fix) |

**Multi-instance:** Redis optional (`rateLimitStore`); not validated in production.  
**E2E flake:** Running full smoke suite then `test:e2e:api` can hit 429 — **P2**.

**Status:** **GO WITH CONDITIONS**

---

## 7. Security Events

Verified event types in `securityLog.js`:

| Event | Severity | Verified |
|-------|----------|----------|
| permission_denied | HIGH | Part 3 |
| idor_attempt | HIGH | final-audit |
| price_tampering | CRITICAL | Part 8/10 |
| coupon_tampering | CRITICAL | Part 10/11 |
| order_creation_blocked | HIGH | production-safety |
| checkout_blocked | HIGH | Part 8 |
| commercial_order_blocked | CRITICAL | Part 8/9 |

Sensitive data (passwords, full tokens) not logged in sampled events.

**Status:** **PASS**

---

## 8. Secret Audit

Repository scan (patterns):
- No `sk_live_` / `rk_live_` Stripe keys in source (excluding audit script self-reference)
- Test fixtures contain demo passwords (`admin123`, seed users) — **expected, not production**
- `.env` not committed (gitignored)

**Status:** **PASS** — no CRITICAL secret exposure in repo

---

## 9. AI Security

AI employees cannot:
- Grant themselves permissions (Part 3: blocked)
- Enable sales (`goLiveApproval.PRODUCTION_SAFETY_LOCK`)
- Create commercial orders (commerceGuards)
- Submit supplier orders (assertCanSubmitSupplierOrder → 403)

**Status:** **PASS**

---

## 10. Payment & Supplier Safety

| Check | Result |
|-------|--------|
| Stripe enabled while SALES=0 | **Blocked** |
| PayPal enabled while SALES=0 | **Blocked** |
| Real payment execution | **Mock only** |
| `submitSupplierOrder()` commerce | **403** |
| Legacy fulfillment demo path | Exists without SUPPLIER_API_SECRET — **P1 monitor** |

**Status:** **PASS** (commerce paths); **GO WITH CONDITIONS** (legacy fulfillment)

---

## 11. Commerce Safety (SALES=0)

All attempts to create COMMERCIAL orders, enable payment, or submit supplier orders via commerce API: **BLOCKED**.

Child flags (`BUZZARD_PAYMENT_ENABLED`, etc.) cannot bypass parent `BUZZARD_SALES_ENABLED=0` — verified in production-safety (7/7).

**Status:** **PASS**

---

## Security Summary

| Audit Area | Result |
|------------|--------|
| Auth | GO WITH CONDITIONS |
| RBAC | PASS |
| IDOR | PASS |
| CSRF | PASS |
| Sessions | PASS |
| Rate limits | GO WITH CONDITIONS |
| Security events | PASS |
| Secrets | PASS |
| AI boundaries | PASS |
| Payment/Supplier | PASS / GO WITH CONDITIONS |
| Commerce safety | PASS |

# BUZZARD — Security & Data Integrity Audit

**Date:** 2026-11-19 · Read-only inspection · Ports **not** restarted

## Environment flags (confirmed)

`SALES=LOCKED` · `EGRESS=DENY` · `productionReady=false` · `live=false`

## JWT & secrets

| Check | Worktree file | HEAD | Notes |
|-------|---------------|------|-------|
| Static JWT fallback removed | `server/lib/jwtSecret.js` | Same at HEAD | Uses env or `crypto.randomBytes(48)` |
| Weak secret detection | `environmentValidation.js` | Same | Blocks `DEV_ONLY_CHANGE_ME` in production validation |
| Session signing | `dbAuth.js` | Worktree may differ from HEAD | Revocation tests in security sprint |
| Hardcoded secrets in server grep | — | — | Only test fixtures reference `DEV_ONLY_CHANGE_ME` |

## Admin authentication

| Control | Evidence |
|---------|----------|
| Login + 2FA routes | `adminAuthPlugin.js`, `adminTwoFactor.js` |
| Lockout | `accountLockout.js` |
| Rate limit | `rateLimitStore.js` |
| Password policy | `passwordPolicy.js` |

## Authorization

| Asset | Count | Evidence |
|-------|------:|----------|
| Route permission map | 188 EXACT entries | `server/lib/routePermissions.js` (379 lines) |
| Admin matrix tested routes | 122 | `adminRouteMatrix.test.mjs` |
| Policy groups cited in directive | 79 admin + 6 write + 5 webhook + 8 AI Center write | Verified via **matrix test file** `OTHER_WRITES`, webhook section, AI center plugin tests — **not manually re-counted line-by-line in this audit** |
| Global middleware | `globalAuthMiddleware.js` | Applied in `server.js` |

**Current test execution:** `adminRouteMatrix.test.mjs` — **124 tests PASS** (isolated API, 2026-11-19).

## Webhooks

| Control | Evidence |
|---------|----------|
| Signature gate | `webhookGate.js`, `webhookSecurity.test.mjs` |
| Live secret | **NOT_VERIFIED** on running :3001 |

## Static file exposure

| Control | Evidence |
|---------|----------|
| Policy engine | `staticFilePolicy.js` |
| HTTP tests | `staticFileAccessHttp.test.mjs`, `staticFilePolicy.test.mjs` — PASS in full suite |

## Audit & security logs

| Store | Redaction | Test |
|-------|-----------|------|
| `audit-log.json` | `coreAudit.js` | `auditSecurityLogging.test.mjs` |
| `security-log.json` | `securityLog.js` | PASS |

## JSON data integrity

| Control | Evidence |
|---------|----------|
| Atomic write + backup | `jsonFileStore.js` |
| Migration guard | `scripts/migrate-json-stores.mjs` (worktree) |
| Tests | `jsonStoreIntegrity.test.mjs` — **PASS** |

## GDPR / customer data

| Control | Status |
|---------|--------|
| Customer JSON store | `customerStore.js` |
| Identity security plugin | `identitySecurityPlugin.js` |
| Full GDPR workflow live | **PARTIAL** — sandbox tests only |

## Egress

| Control | Evidence |
|---------|----------|
| Job egress gate | `jobEgressGate.js` |
| Inventory | `egressPolicy.js` in security audit |
| Live deny | env + tests |

## State matrix

| Layer | Security posture |
|-------|------------------|
| **Worktree + vitest** | Matrix + webhook + JSON tests **PASS** |
| **Committed HEAD** | Lacks some worktree-only fixes (order route, etc.) |
| **Live API** | **NOT_VERIFIED** — PR #507 server patch **not applied** to running watcher |
| **Protected DB hash** | Unchanged during inventory test run |

## Critical findings (P0/P1)

| ID | Severity | Finding |
|----|----------|---------|
| SEC-01 | P1 | Live API parity with tested worktree **unknown** (no restart) |
| SEC-02 | P1 | PR #507 / #508 merge conflicts (**dirty**) — security + phases not integrated on `main` |
| SEC-03 | P2 | Prior `buzzard.db` hash drift vs older baseline — restore status **operator-dependent** |
| SEC-04 | P2 | Duplicate auth paths (`auth.js`, `dbAuth.js`, `identitySecurity.js`, `customerAuth.js`) — consistency risk |

## Security completion score

| Metric | % |
|--------|--:|
| **Software (isolated tests + worktree code)** | **72** |
| **Live production API** | **NOT_VERIFIED (~35% assumed from partial prior smoke only)** |
# Working notes — BUZZARD_SECURITY_ADMIN_DATA_INTEGRITY_FINAL_MASTER_SPRINT

## Phase 0 (done 2026-11-18 05:43–05:51 UTC)
- branch cursor/dev-list-51-remainder-c293, HEAD fdc3132c; 13 modified + untracked, stash empty
- protected hashes recorded: /tmp/buzzard-final-sprint/baseline-hashes.json
- /tmp/buzzard-eu27/server/data/buzzard.db and memory/pusat absent
- previous patch: 43 files, applies cleanly; staging = ws-snapshot + patch in /tmp/buzzard-final-sprint/work
- isolation: scripts/isolated/run.sh --no-network (65 tests passed; 3001 + internet unreachable inside)
- process identity: 1931→394, 1933→396, 1944→404, 1945→404, 2092→0, 10152→169477 (start ticks)

## Phase 1 — patch review
Per-change table: see report section. New findings while reviewing (P1-xx):
- P1-01 CRITICAL (pre-existing, file touched by patch): GET /api/%E0%A4%A → URIError in matchRoute inside async
  request callback → unhandled rejection → process exit. One anonymous request stops the API.
  Reproduced on the isolated staging API (curl 000 afterwards, process gone). Fixed: handleRequest().catch → 400.
- P1-02 HIGH: rejected async route handler (route.handler not awaited) → same crash path. Fixed: awaited, caught.
- P1-03 MEDIUM: jsonFileStore had no cross-process lock, no backup; documented as known gap in the patch.
  Fixed: withFileLock/updateJsonArray, .bak of the previous version, refuse overwrite when a corrupt file cannot be preserved.
- P1-04 LOW: CORS allow-list contained "null" in production. Now only outside production.
- P1-05 LOW: invalid JSON body → 500 + api_error log entry (log flooding). Now 400 security.invalidJson.
- P1-06 LOW: api_rate_limited logged the raw X-Forwarded-For header. Now getClientIp().
- P1-07 (→ Phase 3): production start without ADMIN_* and without users file only logs; no ADMIN_PASSWORD strength rule.
- P1-08 (→ Phase 4): tokens stored in clear in admin-sessions.json; tokenPreview; token accepted as sessionId;
  sessions not re-validated against the user record; JWT admin path not revocable; sessions map not shared between processes.
- P1-09 (→ Phase 6): 8 webhook-like routes, 7 without any signature check, 1 with HMAC over re-serialised body.
- P1-10 (→ Phase 7): 9 /api/ai-center routes without authentication.
- P1-11 (→ Phase 8/9): logs: slice(-5000) drops history silently; e-mail of failed logins stored in clear; audit has no chain.
- P1-12 (→ Phase 3): getClientIp trusts leftmost X-Forwarded-For (spoofable → limiter bypass, log forgery).
- P1-13 (→ Phase 3): accountLockout store written non-atomically, unbounded.

## Phase 2 — static file access (VERIFIED 05:56 UTC)
- staticFilePolicy: + refusal of residual %2e/%2f/%5c/%00/%25 after one decode (double/triple encoding)
- tests: staticFilePolicy.test.mjs 65 passed (was 35), staticFileAccessHttp.test.mjs 79 passed (real server child process,
  raw sockets so ".." is not normalised by the client)
- probe logs/p2-static-probe.log: 24 anonymous requests for store files that exist under server/data → all 404; intended asset 200;
  store admin routes anonymous → 401
- no API handler builds a file path from request input (rg over plugins/lib/core)

## Phase 3 — admin login and account security (VERIFIED 06:07 UTC)
Changes: auth.js (dummy scrypt for unknown address, input caps, per-address limiter 40/15 min, bootstrap status, policy),
passwordPolicy.js (new), runtimeEnv.js (new: NODE_ENV=production | RENDER=true | BUZZARD_ENV=production),
accountLockout.js (atomic, locked, pruned after 24 h, capped at 5000), rateLimitStore.js (bucket pruning, no sync write per request),
security.js getClientIp (BUZZARD_TRUSTED_PROXY_HOPS), environmentValidation.js (jwt weakness, admin bootstrap errors, proxy warning),
dbAuth.js ensureAdmin (policy in production, no re-hash per start), server.js (isProduction exits), AdminLoginForm hint without password.
Tests: adminLoginHardening 61, jwtSecretHardening 22 (was 12), adminSessionSecurity 14, productionStartup 13 (real child processes:
9 refusal cases exit 1 before listening, production start, restart on same data, development start) → 110 passed.

## Phase 4 — session security (VERIFIED 06:13 UTC)
Implementation (auth.js, dbAuth.js, adminAuthPlugin.js, server.js no-store): token hash at rest, sessionId for revocation, credential stamp
(role + password hash) checked on every request, max 10 sessions/account, cross-process sync by file stamp, admin JWT with jti+cv, HS256 pinned.
Tests: adminSessionLifecycle 51 (valid, invalid ×10, expired, tampered expiry, revoked, logout ×3, password changed, role changed, account removed,
unreadable users file, concurrent sessions, session cap, fixation, legacy file, two processes, 2FA challenge), adminSessionHttp 19 (bearer handling ×13 header
variants, no query/cookie/body token, no-store, logout repeat, revoke by id, read_only scope, password change, role change, 25 parallel reads + 8 parallel logins,
no token in stores/output, DB admin JWT: logout, forged ×3, promoted customer, wrong secret / alg none / HS512 / expired).
Evaluation sessionStorage vs HttpOnly cookie: frontend https://buzzard24.de (GitHub Pages, static export) and API https://buzzard-api.onrender.com are
different sites → an auth cookie would be a third-party cookie (SameSite=None; blocked by Safari/Firefox, partitioned in Chrome) → login would break for real
browsers; not safely supportable in the existing architecture. Prerequisite for cookies: API on a same-site hostname (api.buzzard24.de) = DNS + Render custom
domain = external. Until then: bearer in sessionStorage (tab-scoped, gone on close), 8 h absolute TTL, server-side revocation, hash at rest, no token in URLs,
logs or lists, Cache-Control no-store. CSRF: not applicable to bearer auth (the browser never attaches it by itself); no route authenticates by cookie
(verified: cookie/query/body token → 401). XSS exposure: only dangerouslySetInnerHTML sink is JsonLd → fixed (</script> breakout from catalog data), test added.
Residual (MEDIUM, not critical): CSP of the static export needs script-src 'unsafe-inline' (Next inline bootstrap, no nonce on GitHub Pages).

## PHASE 5 — Authorization and admin routes — VERIFIED 2026-11-18 06:32 UTC

Inventory (child process, staging tree): 761 routes; 475 guarded by the central policy, 40 public by policy, 246 without central policy
(storefront reads, customer/guest routes, webhooks, AI Center — the last two are Phases 6 and 7).

Route table (`server/__tests__/support/adminRouteTable.mjs`): 102 rows, each tested individually over HTTP with 9 callers
(anonymous, forged token, 7 roles): 79 routes closed by the first patch, 16 closed in this sprint, 7 with own handler check
(group × since counts are in route-matrix.json). Matrix output: `/tmp/buzzard-final-sprint/route-matrix.json`.

New findings fixed in staging (all with tests):
- P5-1 CRITICAL: 15 back-office record routes (CRM customers/tickets, OMS orders, RMA, loyalty accounts/referrals/preferences) answered
  anonymous callers by sequential id, read and write → central policy `BACK_OFFICE_RECORDS` (orders.read / orders.write).
- P5-2 HIGH: `GET /api/orders/:orderNumber` returned name, e-mail, phone, addresses for a guessable sequential order number →
  identity only for the owning customer or a session with orders.read; everyone else gets status/lines/totals with `identityWithheld`.
  `CheckoutSuccess.tsx` fills the identity from the tab's own cached order.
- P5-3 MEDIUM: `POST /api/wms-inventory/scan` (stock + bin by barcode) accepted any signed-in customer → `logistics.read`.
- P5-4 MEDIUM: `POST /api/payments/session` open to any signed-in caller with client-chosen amount, no sales gate, raw `error.message`
  → refused while sales are locked (`sales_disabled`), provider lookup via own property, generic 500.
- P5-5 MEDIUM: identity-security account routes accepted a back-office session as if it were a customer account → JWT subject required.
- P5-6 MEDIUM: shipment tracking by order number for any signed-in caller → owner or logistics.read, otherwise 404 like unknown.
- P5-7 MEDIUM: no budget for anonymous writes → 60/min per address (`api-anon-write:`), security event `api_rate_limited`.
- P1-14 MEDIUM: correlation-context map grew with every request and stored client-chosen ids → ids validated, map bounded (2000), released on close.
- P5-8 LOW: database constraint rejections (4 routes) answered 500 → 400 `security.invalidInput`; merchant feed handler crashed (`res.set`) → fixed, XML type kept.
- P5-9 LOW: public health routes disclosed absolute host paths → replaced by `[data]`, `[backups]`, `[app]` for anonymous callers in production.

Recorded, not changed (LOW): public health/status routes name unconfigured integrations and their variable names (no values); smoke
scripts and the storefront read them. `admin` role has no logistics.read in the existing role table (left as designed).

Evidence:
- `adminRouteMatrix.test.mjs` 123 tests, `adminAuthorizationHardening.test.mjs` 31 tests — passed.
- 7-role sweep over 759 routes on the isolated staging API (`sweep-p5.json`): no anonymous access to /api/admin or /api/security/admin;
  read_only reaches 14 dry-run validation POSTs only (row counts of business tables unchanged, asserted in the matrix test);
  only 2 routes without central policy serve an admin session (`POST /api/tax/quote` calculation, `GET /api/submissions` own permission check).
- Anonymous-read scan of 108 public GET routes for paths, secret-like keys, hashes, e-mail addresses, stack traces: only the path findings above.
- Full vitest on the staging tree: 133 files, 1412 tests passed, 0 failed, 0 skipped (`logs/p5-full-vitest.log`).
- Guard 06:32:26Z: 7 protected files identical, 6 developer processes unchanged, 3000/3001 answer 200.

## PHASE 6 — Webhook security — VERIFIED 2026-11-18 06:42 UTC

Inventory: 8 inbound webhook routes exist (the earlier report counted 5 that changed state without any check; the other three are the
commerce route, which is locked while sales are off, the generic provider stub that answers 501, and one of the payment routes).
All 8 are now behind one gate (`server/lib/webhookGate.js`, policy kind `{ webhook: scope }` in `routePermissions.js`, enforced in
`globalAuthMiddleware.wrapRouteHandler` on the raw request bytes).

Before (unpatched): anonymous POST could set a payment intent to any status, mark an order paid and queue its fulfilment job,
insert payouts and disputes, import marketplace orders and change shipment status. P6-1 CRITICAL.

Gate: `X-Buzzard-Signature: t=<unix>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>`; secret per scope from
`BUZZARD_WEBHOOK_SECRET_<SCOPE>` (≥ 32 chars, placeholders refused, `_PREVIOUS` for rotation); no secret → 503 for every request;
timestamp ±300 s; signature receipt (UNIQUE) → replay 409; event receipt (sender's event id, else SHA-256 of the body) → duplicate 200
without running the handler; only a 2xx answer marks the event processed; 30 rejected signatures/min per address → 429; unsigned
webhook requests count against the anonymous write budget; session tokens and legacy headers are not credentials here.
Handlers: payload shape checks (`server/lib/webhookInput.js`); commerce handler checks duplicates only after authenticity.
Production start: weak webhook secret → refuses to start; unset → warning, route refuses.

| Route | Scope | Unsigned | Bad signature | Stale/future | Replay | Duplicate | Valid synthetic |
| POST /api/payments-finance/webhook | payment | 401 | 401 | 401 | 409 | 200 duplicate | 202, intent updated once |
| POST /api/webhooks/payment | payment | 401 | 401 | 401 | 409 | 200 duplicate | 200, one integration event |
| POST /api/payments-finance/provider/payout-webhook | payout | 401 | 401 | 401 | 409 | 200 duplicate | 202, one payout |
| POST /api/payments-finance/provider/dispute-webhook | dispute | 401 | 401 | 401 | 409 | 200 duplicate | 202, one dispute |
| POST /api/marketplace-hub/order-webhook | marketplace | 401 | 401 | 401 | 409 | 200 duplicate | 202, one channel order |
| POST /api/logistics-fulfillment/carrier/webhook | carrier | 401 | 401 | 401 | 409 | 200 duplicate | 202, shipment status updated |
| POST /api/commerce/webhooks/:provider | commerce | 401 | 401 | 401 | 409 | handler again (not completed) | passes the gate; handler answers 403 webhook_blocked because sales are locked |
| POST /api/webhooks/:provider | provider | 401 | 401 | 401 | 409 | handler again (not completed) | passes the gate; handler answers 501 (no adapter exists) |

Evidence: `webhookSecurity.test.mjs` 178 tests (real server process, synthetic secrets generated per run, no provider contacted):
per route unsigned / session token / legacy headers / 9 malformed headers / foreign-scope and guessed secrets / tampered body ×4 /
timestamps −301, −3600, −86400, +301, +3600 and swapped timestamp / valid + replay + duplicate; 10 parallel identical deliveries → 1 processed;
10 retries → 1 processed; event id from header; scopes separate; retry after failed delivery; rotation; 14 payload-shape cases;
log content (reasons present, no secret, no signature); unconfigured instance (8 routes × 5 attempts → 503); failure budget; production start.
Full vitest on staging: 134 files, 1591 passed, 0 failed, 0 skipped (`logs/p6-full-vitest.log`). Guard 06:42:39Z identical/unchanged.

BLOCKED for production use (does not block the code-level acceptance): real secrets must be set by the operator; providers that sign in
their own format (Stripe `Stripe-Signature` has the same construction; PayPal, marketplaces and carriers do not) need a relay or adapter that
verifies the provider's signature and re-signs — no adapter exists in this repository (`/api/webhooks/:provider` answers 501).

## PHASE 7 — AI Center security: VERIFIED 06:49 UTC

Finding P7-1 (CRITICAL before): the nine /api/ai-center/* routes (8 POST + 1 GET) had no policy. Anonymous callers could
create sessions, write chat messages, create held jobs and approval requests, pass the library's `deps` test hook in the
request body (switching off the approval hold), read any session by token, and set jobs to `refused`.

Fix (staging): central policy AI_CENTER_ROUTES; plugin rewritten (actor required, per-account budget 30/min, strict
allow-list input validation, output check, audit entry per operation without message content, session ownership,
retry never executes); aiCenterAuthority own-property lookup; client sends admin bearer.

| Route | Method | Permission | Roles allowed | Anonymous | Without permission | Allowed synthetic result |
|---|---|---|---|---|---|---|
| /api/ai-center/sessions | POST | ai.execute | administrator, admin, ai_agent | 401 | 403 | 201 |
| /api/ai-center/sessions/:token | GET | ai.read (+ owner or ai.assign) | all 7 pass policy; only owner/supervisor see content | 401 | 404 (not owner) | 200 owner / 404 unknown |
| /api/ai-center/chat | POST | ai.execute | administrator, admin, ai_agent | 401 | 403 | 200 informational / 202 held |
| /api/ai-center/recommend | POST | ai.execute | same | 401 | 403 | 200 / 202 held |
| /api/ai-center/product-copy | POST | ai.execute | same | 401 | 403 | 202 pendingApproval, job APPROVAL_REQUIRED |
| /api/ai-center/translate | POST | ai.execute | same | 401 | 403 | 202 pendingApproval |
| /api/ai-center/review-sentiment | POST | ai.execute | same | 401 | 403 | 202 pendingApproval |
| /api/ai-center/smart-search | POST | ai.execute | same | 401 | 403 | 200 / 202 held |
| /api/ai-center/jobs/:id/retry | POST | ai.assign | administrator, admin | 401 | 403 | 404 unknown / 409 APPROVAL_REQUIRED (never runs) |

Evidence: logs/p7-aicenter.log -> aiCenterSecurity.test.mjs 109 tests (per route: anonymous, forged/customer token, 7 roles,
headers; 29 invalid inputs; held jobs; no completed/running/queued job; no model answer; ownership; audit entries; budget on
limiter-on instance; output check). Full vitest logs/p7-full-vitest.log: 135 files / 1700 passed / 0 failed / 0 skipped.
No worker, no provider call, run without network. guard 06:49:17Z identical/unchanged.

## PHASE 8 — JSON data integrity: VERIFIED 07:09 UTC

Findings (all fixed in staging):
- P8-1 HIGH: store lock could be taken from a live writer (waiter deadline removed the holder's lock; a lock file read between
  create and write counted as abandoned). Found by the new multi-process test under full-suite load (239 of 240 audit entries).
  Lock rewritten: created atomically with content (hard link), only cleared when the owning process is gone (pid + start time),
  takeover re-checked, release only by the owner, timeout -> STORE_LOCK_TIMEOUT without writing.
- P8-2 HIGH: audit log, security log and automation events were read-modify-write WITHOUT a lock (two audit modules on one file).
  Now one writer path (recordStore.appendRecord) under the lock.
- P8-3 MEDIUM: silent history loss: slice(-5000)/slice(-2000) dropped the oldest entries. Now moved to <name>.archive.jsonl
  before they leave the working file (rotated at 32 MB, never deleted).
- P8-4 MEDIUM: admin-2fa.json written non-atomically; unreadable file was read as {} = second factor silently off for everyone.
  Now atomic + lock; unreadable -> sign-in answers 503 admin.auth.unavailable before the password is looked at.
- P8-5 MEDIUM: a removed/emptied store with a previous version beside it started empty (production would create a new first
  administrator over lost accounts). Now the previous version is used. Sessions are the exception: only the file itself counts
  (the previous version may hold a session the last write ended).
- P8-6 MEDIUM: production could run with the stores in the app directory (lost at every deploy). Now BUZZARD_DATA_DIR must be set
  and usable; checked before any module opens a store.
- P8-7 LOW: every rate-limited request rewrote the whole security log. Now one entry per minute and key + a count.
- P8-8 LOW: security log kept e-mail addresses in full, also for customer sign-in failures, and whatever was typed into the
  e-mail field. Now masked + reference hash; non-addresses are not kept. Redaction extended (keys and credential-shaped values).
- P8-9 LOW: repeated automation events not recognisable. Named key -> answered from the record; derived key -> recorded with duplicateOf.
- New: tamper evidence (prev/hash chain per record list), store state report (GET /api/admin/security/stores, security.read),
  production warnings store_unhealthy / store_world_readable, scripts/migrate-json-stores.mjs.

Real stores, read-only structure check (no values read out): admin-users 4 entries, all valid under the new schema;
admin-sessions 2 entries, old format (raw token + session), both expired; audit-log 6, security-log 931, automation-events 18,
all accepted as old entries (chain legacy); file modes 644 (tightened to 600 by the first write after the change).

Demo administrator sessions: identity = created 17 Nov 16:52:15Z and 17:28:21Z by the Playwright desktop browser from 127.0.0.1
for the seed demo administrator (test origin). Validity = both expired (01:52 / 02:28 Europe/Berlin, 18 Nov); cannot authenticate.
Not revoked, not deleted. Impact of the change once applied: at the first sign-in they are written to admin-sessions.archive.jsonl
(who/when/from where, no token) and leave the working file; the raw tokens leave the disk with the second write (.bak replaced).
Proved on a synthetic replica of that file format.

Persistent disk migration plan (NOT executed; production untouched):
 render.yaml: disk buzzard-data mounted at /var/data (1 GB); BUZZARD_DB_PATH=/var/data/buzzard.db; BUZZARD_BACKUP_DIR=/var/data/backups;
 BUZZARD_DATA_DIR=/var/data/state.
 1. Before: note GET /api/admin/security/stores and the DB backup (npm run backup:db); take a Render disk snapshot.
 2. Stop writes (deploy window). 3. node scripts/migrate-json-stores.mjs --from <old dir> --to /var/data/state (dry run), then --apply.
    The tool refuses collisions, unreadable stores and locked stores, verifies SHA-256 per file, sets 600/700, writes a manifest,
    never changes the source. 4. Set BUZZARD_DATA_DIR=/var/data/state, deploy. Start refuses without a usable directory.
 5. Verify: /api/admin/security/stores healthy, entry counts = step 1, sign-in works, chain ok.
 Rollback: point BUZZARD_DATA_DIR back at the old directory (unchanged) or restore the disk snapshot.
 BLOCKED (external): needs Render access and a deploy = human decision.

Evidence: logs/p8-integrity.log (jsonStoreIntegrity.test.mjs 101 tests: chain + 5 tamper cases, archive, crash between archive and write,
legacy continuation, 6 processes x 40 entries x 3 lists, concurrent sign-ins, lock (live holder / dead / reused pid / release),
4 kinds of damage x 5 stores, missing/empty with previous version, schema 19 cases, redaction, coalescing, duplicates, 2FA store,
HTTP store report, production start without/with unusable data dir, migration tool 5 cases + server start on migrated copy).
logs/p8-lock-stress.log: 3 rounds, 16 processes x 100 entries with CPU load: 1600/1600, chain ok, no leftovers.
Full vitest logs/p8-full-vitest.log: 136 files / 1801 passed / 0 failed / 0 skipped (run 3 times after the lock fix). guard 07:09:17Z unchanged.
Out of scope, recorded: customers.json, orders.json, abandoned-carts.json, submissions and other non-admin JSON files are still written
non-atomically with default permissions (not among the five stores; unrelated modules left unchanged).

## PHASE 9 — Audit and security logging: VERIFIED 07:32 UTC

Findings and corrections (all in staging, synthetic instances only):
- P9-1 CRITICAL (found here, proven on the unpatched tree in production mode, logs/p9-reset-probe-before.log):
  anonymous caller received a password-reset token for ANY account incl. the database administrator
  (`/api/identity-security/auth/password-reset-request` → reset → sign-in with role admin → admin routes 200).
  Also: customer store reset route returned the token (customer takeover + address enumeration),
  identity registration returned the e-mail verification token, identity sign-in had no lockout/limiter.
  Fixed: back-office accounts are never reset through self-service (no token, existing token refused and used up,
  HIGH event `password_reset_refused`); production creates/returns no reset or verification token (no delivery
  channel); uniform answers; lockout (5 failures → 423) + limiter (8/15 min per address+account) on identity sign-in;
  customer reset tokens and customer session tokens stored as SHA-256 only, files 0600, no .bak; customer sessions end on
  password reset; non-string tokens refused. After: logs/p9-reset-probe-after.log; tests accountRecoverySecurity (15).
  BLOCKED (external): password reset / e-mail verification in production need mail delivery (provider + egress).
- P9-2 HIGH: back-office writes had no general audit trail (only a few handlers wrote entries). Now every authenticated
  back-office write (223 guarded write routes) and sensitive reads (accounts, logs, exports; once a minute per reader
  and route) produce one audit entry BEFORE the answer leaves: actor id, role, action = method + route pattern,
  result (success/rejected/denied/error/aborted), status, permission, route params, ip, user agent, request id,
  correlation id, hash chain. Never the request body.
- P9-3 MEDIUM: role change and password change now have explicit audit entries (old/new role; password values never).
- P9-4 MEDIUM: entries written while reporting an error lost their request ids (error answer was produced outside the
  request scope) → error answers are produced inside the scope.
- P9-5 MEDIUM: `permission_denied` event was written after the refusal had been sent → written before.
- P9-6 MEDIUM: four call sites took the client address from a header the sender controls (contact-form limiter —
  bypassable —, import failure event, checkout risk input, commerce block events) → trusted client address everywhere.
- P9-7 MEDIUM (privacy): contact form printed sender name + e-mail to the server output; customer e-mail was the actor in
  the operations audit table and in three audit calls → removed; customer actor is the customer id.
- P9-8 MEDIUM: contact submissions ignored BUZZARD_DATA_DIR (always server/data: lost on redeploy, not isolatable in
  tests), were written non-atomically, a damaged file was silently replaced, and write errors still answered
  "received" → data dir, atomic + locked + durable, corrupt copy kept, 503 when not stored.
- P9-9 MEDIUM: migration tool copied only the administrator stores although BUZZARD_DATA_DIR moves every data file
  (customers, orders, submissions … would have been left behind) → copies every data file, lists what is not copied
  and why (database, directories, temp/lock files), refuses any unreadable JSON file.
- P9-10 LOW: requests without credentials could fill the security log (one entry per request) → 30 individual
  entries per address and minute, the rest counted in one summary (`unauthenticated_requests_summarised`).
  Events that concern an account are always written individually.
- commerce modules' field names (actorType/actorId/resourceType/resourceId) are now kept in audit entries.

Evidence: logs/p9-logging.log + logs/p9-suites.log (auditSecurityLogging 29 tests), logs/p9-recovery.log (15),
logs/p9-full-vitest-final.log: 138 files / 1847 passed / 0 failed / 0 skipped; guard 07:31:56Z unchanged.
Mutation check: restoring the old customer-actor line makes the customer-data test fail.

Residual / recorded:
- Development and test stacks still return customer reset / verification tokens in the answer (no mail delivery;
  needed by the existing flows). Any hosted runtime counts as production. LOW.
- Security log keeps full IP addresses (needed for lockout/forensics); retention period = operator decision.
- Admin e-mail addresses are recorded as actor identity in audit entries (business accounts).
- `lib/customer/customerOrderBridge.js` reads legacy orders from a path that does not exist (server/lib/data/orders.json):
  customer order list shows only commerce_orders. Functional defect, fails closed, not changed in this sprint.
- customers.json, orders.json, abandoned-carts.json, fulfilment files: still non-atomic writers (outside the five stores).

## PHASE 10 — Test isolation — VERIFIED 07:54 UTC (18 Nov)

Baseline for this phase: `diff -rq` /workspace vs Phase 0 snapshot = only the deliberately uncopied server/data files,
pre-sprint git-ignored __pycache__ dirs and tsconfig.tsbuildinfo of 17 Nov. Nothing in /workspace modified by this sprint.

Findings and corrections
- P10-1 HIGH (pre-existing): tests could rewrite catalog files of the checkout. `data/buzzard_suppliers.json`,
  `buzzard_supplier_category_mappings.json`, `buzzard_products.json`, `buzzard_seo_overrides.json`,
  `buzzard_category_visibility.json` are written by the API at runtime (import pipeline, admin catalog routes, start-up
  visibility sync). run.sh only hid server/data. Found by a marker check (`find -newer`) after a full vitest run in the
  private copy: buzzard_suppliers.json had been rewritten (sync_status / last_sync_at) by an API started from a test.
  (Private copy only; restored from the snapshot. /workspace/data untouched: tree digest unchanged.)
  Fix: `server/lib/catalogFiles.js` (`runtimeCatalogFile(name)`): BUZZARD_CATALOG_DIR -> working copy there;
  automated test process -> private temp copy, fresh per process; otherwise data/ as before (no behaviour change for
  the running stack). Used by supplierStore, productStore, seoStore, categoryVisibility and the six readers of the
  product catalog (ordersPlugin, catalogProductSync, advancedSearch, productCatalogMigration, feedAdapters,
  analyticsEngine). run.sh: data/ is bind-mounted read-only inside (write probe must fail, else exit 91),
  BUZZARD_CATALOG_DIR exported, data/ hashed before/after (exit 90 on change). isolatedApi.mjs and e2e-webserver.mjs set
  BUZZARD_CATALOG_DIR. Tests: `testIsolation.test.mjs` (8).
- P10-2 MEDIUM: run.sh allowed the host network unless `--no-network` was passed. Now loopback-only by default with a
  proof step (only `lo`, 192.0.2.1 unreachable; exit 94 otherwise); `--allow-network` is the explicit exception.
- P10-3 MEDIUM: Playwright global setup trusted `BUZZARD_ISOLATED=1` of its own process and did not check which API the
  storefront talks to. Now: the API itself must report throwaway storage (database below the temp directory,
  adminData.isolated); the storefront's API origin is determined by intercepting its login request in a browser (the
  request is aborted, never sent); override only for loopback addresses.
- P10-4 MEDIUM (pre-existing): `scripts/part3-security.mjs`, `final-audit.mjs`, `production-safety.mjs` send write
  requests to http://localhost:3001 by default = the developer stack with real data; part3 carried the demo account
  names and password. Now: `scripts/lib/requireIsolatedApi.mjs` (exit 78 before the first write unless the API reports
  throwaway storage; no override), synthetic accounts from BUZZARD_SYNTHETIC_ADMINS, runner `scripts/isolated/api.sh`.
  The other smoke scripts go through smokeFetch (in-process mock, never the network) — unchanged.
- P10-5 LOW: `resolveBackupDir()` fell back to server/data/backups in a test process. Now a temp directory.
- P10-6 LOW (pre-existing, stale check): final-audit / production-safety looked for the demo product `BZ-CORE` in the
  public catalog; it is hidden on purpose -> "demo product missing" (same failure on unpatched code in isolation).
  Now any offered product is used; the price-tampering assertion itself is unchanged.
- e2e.sh: `--host 127.0.0.1|localhost`, port validation (never 3000/3001), busy port -> 95, API must report throwaway
  storage below the run root -> else 96, BUZZARD_DATA_DIR/BUZZARD_BACKUP_DIR/BUZZARD_BIND_HOST set.
- ENOENT failures of the previous sprint: `dryOrderDraft` / `devList51Remainder` compared size+mtime of
  server/data/buzzard.db, which does not exist in an isolated run. `support/protectedDb.mjs` treats "absent before and
  after" as unchanged. Verified in both situations (absent; synthetic file present and unchanged): 14/14 each.

Evidence (all in the private copy, loopback-only namespace)
- logs/p10-selftest.log: isolation self-test 51 passed / 0 failed / 0 skipped (run.sh data + network, e2e.sh and api.sh
  refusals incl. ports 3000/3001, global setup accept/refuse cases, three scripts refuse shared/unreadable/absent API,
  stand-in APIs received no write). Mutation checks: storefront check disabled -> 2 FAIL; storage check disabled -> 6 FAIL.
- logs/p10-limiter-on.log: 2 passed, 1 skipped (the "limiter off" case, not applicable in this mode).
  logs/p10-limiter-off.log: 2 passed, 1 skipped (the "limiter on" case). Lockout passes in both modes.
- logs/p10-full-vitest.log: 139 files, 1856 passed, 0 failed, 0 skipped; no file in the tree written during the run.
- logs/p10-full-vitest-netspy.log + bin/netspy.cjs: same run with a recorder for non-loopback connects/DNS lookups in
  every Node process: 0 attempts (recorder proven active in a vitest worker: logs/p10-netspy-probe.txt).
- logs/p10-parts.log: Part 24 + Parts 27–35 (node --test): 221 passed, 0 failed, 0 skipped.
- logs/p10-python-egress.log: 9 tests OK.
- logs/p10-script-*.log: part3-security 11/11, final-audit 18/18, production-safety 7/7 against an isolated API.
- logs/p10-enoent.log, logs/p10-typecheck.log (tsc --noEmit clean).
- guard 07:53:20Z: 7 protected hashes identical, 6 process start ticks unchanged, 3001=200, 3000=200, tree digest and
  .next inode unchanged.

Residual / for later phases
- Plain `npx playwright test` without the wrapper still relies on scripts/e2e-webserver.mjs (refuses foreign listeners
  on 3000/3001) plus the global setup; the sanctioned way is scripts/isolated/e2e.sh.
- Production: runtime edits of the five catalog files are stored in the application directory (lost on redeploy, not on
  the persistent disk). BUZZARD_CATALOG_DIR can place them on the disk, but then they shadow newer files of a deploy —
  operator decision, not set in render.yaml.
- Phase 14: demo account name + password literals remain in mock-only smoke scripts (part2/4/5/6/7, smoke-core).

## PHASE 11 — Admin UI and PIM — VERIFIED 2026-11-18 12:27 UTC

Scope: login, logout, session persistence, expiration, revocation, unauthorized redirects, role-based navigation,
permission-based buttons, error messages, Control Center access, PIM import dry-run, pending approval state;
localhost and 127.0.0.1. All runs on the isolated stack (scripts/isolated/e2e.sh), synthetic accounts for all 7 roles.

### Findings and corrections
- P11-1 (MEDIUM, UI/authorization consistency): the role table of the admin pages differed from the API's in 14 places
  (role `admin` was offered Suppliers/Sync/Imports/Analytics/SEO/Logistics/Automation pages, `read_only` Integrations/SEO
  pages that the API refuses). Fixed: lib/admin/navPermissions.mjs carries the API's table; server/__tests__/adminUiPermissions.test.mjs
  fails when the two differ (also for the answer to every single permission question).
- P11-2 (MEDIUM): a page opened by its address was rendered for a role without access (only "signed in" was checked);
  the page then showed errors from refused requests. Fixed: components/admin/AdminPageAccess.tsx (notice `admin-forbidden`,
  no request of the page is sent; a role without dashboard access is taken to its first page).
- P11-3 (MEDIUM): Control Center failed completely for `read_only` and `staff` (one refused request rejected the combined load).
  Fixed: each section is requested only with its permission; sections without permission say which permission is missing;
  decisions (approve/reject), task creation, category status, worker/job/sync/go-live actions are offered only with the permission the API asks for;
  a refused action is shown (`cc-action-error`) instead of ending as an unhandled rejection.
- P11-4 (MEDIUM): PIM import dry run was offered to roles the API refuses, and the pending state did not name approval and job as fields.
  Fixed: button only with products.write AND imports.run; pending block shows state `pendingApproval`, approvalId, approval status, risk,
  reserved importJobId ("reserved, not started"), validation "not run". The API answer additionally carries `approvalId` and `importJobId`
  (same values as approval.id / approval.metadata.jobId; `job: null`, `executed: false` unchanged).
- P11-5 (LOW): login form reported a failing sign-in service (503 `admin.auth.unavailable`) and non-JSON answers as wrong credentials. Fixed.
- P11-6 (LOW): login form of the production build pre-filled an administrator e-mail address. Fixed: empty in production builds.
- P11-7 (MEDIUM, found by the page sweep): pages asked for routes the API refuses for the role:
  contact-submissions (nav said audit.read, API asks orders.read) -> nav corrected;
  analytics hub had its own role table and always asked for sales on the overview -> lib/analytics/sections.mjs mirrors the API's sections (drift test);
  PIM Core asked for supplier mappings (handler asks suppliers.read on top of products.read) -> requested only with suppliers.read;
  Control Center asked for commerce security events (handler asks security.read) -> requested only with security.read;
  identity-security page sent the administrator token to the customer account route (always 401) -> request removed.
- P11-8 (LOW): refused changes on pages without role-aware buttons were reported as a generic failure or not at all.
  Fixed centrally: lib/admin/refusals.ts + browserFetch report a 403 on a change made with the administrator session; the shell shows
  `admin-action-refused` with role, method and path. A 401 on an administrator request makes the page ask the API at once and return to the login form.
- P11-9 (test infrastructure, HIGH for the protected stack): two isolated stacks at once exhausted memory; the kernel ended the isolated Next.js server
  and browser processes. The developer stack was not affected (guard 09:26:39Z: start ticks, hashes, 3000/3001 unchanged).
  Fixed: scripts/isolated/run.sh sets oom_score_adj=1000 for everything it starts (the developer processes have 0), e2e.sh limits the heap of its
  Next.js server (BUZZARD_E2E_WEB_HEAP_MB, default 3072); isolated stacks are run one at a time.

- P11-10 (application defect, found by the final runs): `/admin/catalog/` stopped with "categories.map is not a function" for every
  role that may open it. The page asked `GET /api/catalog/categories` for the catalog's category list; that path is registered by two
  plugins and the storefront bridge answers it (`{ categories: [...] }`, taxonomy ids "cat-01"), not the SQLite catalog (array, numeric ids).
  Unchanged code of the workspace, so the page is broken on the running stack as well. Correction: new route
  `GET /api/admin/catalog/categories` (catalog's own list, products.read through the central policy; server patch), the client asks that
  route and accepts only a list, the page loads the categories separately and shows `catalog-categories-unavailable` instead of stopping.
  Against the unpatched API the page now shows the products and that notice.
- P11-11 (test defect, mine): `openAdminPage` repeated any failed navigation up to three times. That hid P11-10 — the browser reloaded
  the crashed page, the next navigation was aborted (net::ERR_ABORTED), the repetition succeeded. Corrected: a step is repeated only when
  the isolated Next.js development server demonstrably restarted during it (count of "approaching the used memory threshold" in web.log
  of the run), each repetition is noted on the test; and the page sweeps now fail on every error a page throws (`pageerror`).
  Runs that showed it: logs/p11-final-admin-localhost.log (1 failed: login fell into a development-server restart, blank page),
  logs/p11-final2-admin-127.log (2 failed: ERR_ABORTED at /admin/pim-catalog/ after the crash of /admin/catalog/),
  logs/p11-debug-runtime.log (the page error itself).

### Observations (not changed, for the owner)
- O11-1: `POST /api/admin/import` and `POST /api/admin/sync/retry` (supplier import into the JSON catalog, page /admin/sync/) execute directly for roles with
  imports.run / sync.run (administrator, catalog_manager); the human approval exists only for the PIM Core import. Not a bypass introduced here; no test covers the route.
- O11-2: an administrator can approve an import request they submitted themselves (no four-eyes rule). A catalog_manager cannot decide (403).
- O11-3 (measured on the isolated API, bin/p11-after-approval.mjs and bin/p11-resubmit.mjs, and read in server/plugins/pimCorePlugin.js):
  the PIM import route only files an approval request. It always answers 202 with `dryRun: true` (also when `dryRun: false` is sent),
  does not record the submitted product data, and creates no job. After an approval the record is APPROVED with `consumed: false`,
  the job list is unchanged, the reserved id answers 404, the worker is STOPPED, products are unchanged. Sending the approved request
  again opens a new PENDING request instead of using the approval; every click therefore adds a request (no de-duplication).
  `consumeApproval` is used by the price/stock queue only. Consequence: through this route no import — dry or real — can run today;
  the approval is a record without an executor. The page says so (`pim-import-after-approval`). The page's block for a finished run
  (`pim-import-result`) cannot be reached with the current API and is not exercised by any end-to-end test.
- O11-4: pages /admin/returns/ and /admin/analytics-foundation/ ask for API routes that do not exist (404); shown to administrators only (returns) / administrator+admin.
- O11-5: admin pages also send the storefront's page-view events (/api/analytics/events, /api/marketing-center/events).
- O11-6: write buttons on the other admin pages (suppliers, products, orders, logistics, CRM, marketing, …) are not role-aware; the API refuses (Phase 5) and the shell announces the refusal.
- O11-7: no role but administrator/super_admin holds suppliers.write or returns.read.
- O11-8: every page logs "X-Frame-Options may only be set via an HTTP header… It may not be set inside <meta>": the frame protection the
  pages declare in a meta tag has no effect in browsers; it has to be sent as a response header by the host (Phase 14 / production configuration).

### Phase 11 evidence (final code, one isolated stack at a time)
| Run | Log | Result |
|---|---|---|
| Admin UI, 127.0.0.1 (admin, admin-session, admin-pim-core, admin-roles; chromium-desktop) | logs/p11-final3-admin-127.log | 56 passed, 1 skipped, 0 failed |
| Admin UI, localhost (same specs) | logs/p11-final3-admin-localhost.log | 56 passed, 1 skipped, 0 failed |
| Limiter on, 127.0.0.1 (limiter spec + login form messages + locked account) | logs/p11-final3-limiter-on-127.log | 8 passed, 1 skipped |
| Limiter on, localhost | logs/p11-final3-limiter-on-localhost.log | 8 passed, 1 skipped |
| Limiter off, 127.0.0.1 (limiter spec) | logs/p11-final3-limiter-off-127.log | 2 passed, 1 skipped |
| Vitest, all files | logs/p11-vitest-full-final.log | 140 files, 1910 passed |
| Isolation self-test | logs/p11-selftest.log | 51 passed |
| Typecheck, lint | — | clean |
| Guard | 12:27:07Z | protected files identical (7), processes unchanged, 3001=200, 3000=200 |

Skips, all intended:
- "administrator: a page of another role shows a notice and loads nothing" — the administrator may open every page, there is no hidden page to test.
- Limiter spec: the "limiter on" test is skipped in the limiter-off run and the "limiter off" test in the limiter-on runs; each is executed in the other run.

Earlier runs of this phase that failed are kept and explained in P11-10 / P11-11
(logs/p11-final-admin-localhost.log, logs/p11-final2-admin-127.log); logs/p11-final2-admin-localhost.log passed (55/1) before the page-error check was added.

Requirement → test: login, logout, persistence, expiry, revocation, unauthorized redirect → admin-session.spec, admin-roles.spec ("expired session", "session survives a reload", "Sessions: ending a session");
role-based navigation → "is shown exactly the pages of the role" ×7; permission-based buttons → PIM, Control Center, Sessions, AI Center tests;
error messages → "login form message" ×5, "locked account", "a change the API refuses is announced"; Control Center access → 3 tests;
PIM dry run and pending approval → admin-pim-core.spec "Import dry-run is held for approval", admin-roles "catalog manager submits a dry run",
adminUiPermissions.test.mjs (approvalId, importJobId, approval recorded without a run, new request on resubmission, `dryRun:false` held as dry run).

## Checkpoint 2026-11-18 (Europe/Berlin evening)
User asked to persist work. Committed and pushed branch `cursor/security-admin-final-checkpoint-c293` (PR #507).
Artifacts: patch, scrubbed work-tree.tgz, NOTES, Phase 11 logs. Live 3000/3001 untouched; protected SHA-256 identical (7/7).
Working-tree content digest after commit: e3b0c44298fc1c14/e3b0c44298fc1c14. Guard EXPECT_CONTENT updated accordingly.
Phase 12+ continues in /tmp/buzzard-final-sprint/work.

## PHASE 12 — Storefront and device regression — VERIFIED 2026-11-18 16:50 UTC

### Corrections
- P12-1 (HIGH): public catalog accepted `?preview=1` and showed HIDDEN demo products to anonymous callers.
  Fixed in `storefrontBridgePlugin.js` + `storefrontSearchService.js` (preview only on `/api/admin/storefront/preview/*`).
- P12-2: `/api/catalog/products/slug/:slug` 404 for title-derived slugs (fixture `synthetic-shelf-item`).
  Fixed via `storefrontSlugOf` in mapper + catalogReadService lookup.
- P12-3: production accepted `BUZZARD_E2E_DB=1`. Now refused in `environmentValidation.js` (+ productionStartup test).
- P12-4: PDP for live-only PIM slugs 500 under `output: "export"` (missing generateStaticParams).
  Isolated E2E sets `NEXT_PUBLIC_BUZZARD_E2E_FIXTURE=1` so the fixture slug is listed; production builds do not.
- P12-5: public UI/JSON-LD no longer invent empty brand or the sentinel category `"catalog"`.

### Evidence
| Run | Log | Result |
|---|---|---|
| catalog-fixture (api) | logs/p12f-fixture-api.log | 3 passed |
| device desktop 127 | logs/p12f-device-desktop-127.log | 7 passed |
| device desktop localhost | logs/p12f4-localhost.log | 10 passed (device+fixture) |
| device mobile 127 | logs/p12f4-devices.log | included in 21 passed |
| device tablet 127 | logs/p12f4-devices.log | included in 21 passed |
| All devices combined | logs/p12f4-devices.log | 21 passed, 0 failed |
| catalogFixtureSecurity vitest | logs/p12-vitest-fixture.log / re-run | 7 passed |
| productionStartup (+ E2E_DB refusal) | with fixture vitest | included in 21 earlier |
| selftest | logs/p12-selftest.log | (see below) |
| Guard | 16:50:05Z | protected 7 identical, processes unchanged |

### BZ-E2E-VISIBLE-001
- Present only with `BUZZARD_E2E_DB=1`; absent without the flag.
- Public fields: ean/gtin/brand/categoryId/categorySlug all null; title "Synthetic shelf item"; no invented identity.
- Reachable by id and by slug after P12-2.
- Demo SKU BZ-CORE-DEMO-001 stays HIDDEN from public routes even with `?preview=1`.

## PHASE 13 — Complete regression — VERIFIED 2026-11-18 17:14 UTC

| Suite | Log | Result |
|---|---|---|
| Vitest (all) | logs/p13-vitest-full.log | 141 files, 1918 passed |
| Parts 24, 27–35 | logs/p13-parts-24-35.log | 221 passed |
| Python egress | logs/p13-python-egress.log | 9 passed |
| Typecheck | logs/p13-typecheck.log | EXIT=0 |
| Lint | logs/p13-lint.log | clean |
| Isolation selftest | logs/p13-selftest.log | 51 passed |
| Playwright api | logs/p13-e2e-api.log | 25 passed, 1 skip (limiter-on test under limiter-off) |
| Playwright desktop | logs/p13-e2e-desktop.log | 81 passed, 1 skip (admin has no hidden pages) |
| Playwright mobile | logs/p13-e2e-mobile-rerun.log | 17 passed, 3 skip (desktop viewport checks on mobile project) |
| Playwright tablet | logs/p13-e2e-tablet.log | 16 passed, 3 skip (same desktop viewport skips) |
| Limiter on | logs/p13-e2e-limiter-on.log | 2 passed, 1 skip (limiter-off test) |
| part3-security | logs/p13-part3-security.log | 11/11 |
| final-audit | logs/p13-final-audit.log | 18 passed |
| production-safety | logs/p13-production-safety.log | 7 passed |
| Guard | 17:14:24Z | protected identical, processes unchanged |

Skips (documented, not failures):
- Limiter-on test when run with `--limiter off`, and limiter-off test when run with `--limiter on` — each executed in the matching run.
- Administrator "hidden pages" test — role may open every page.
- customer-journey desktop1280/1440/1920 checks skipped on chromium-mobile and chromium-tablet projects by design of that spec.

One intermittent mobile homepage search-toggle miss was fixed (hydration retry) and the mobile suite re-run green.

## PHASE 14 — Final independent security review — VERIFIED 2026-11-18 17:16 UTC

### Searches performed
Anonymous catalog preview, unprotected admin writes (handler-level requireAuth+requirePermission present on adminCatalogPlugin), hardcoded secrets/JWT fallbacks (no built-in JWT fallback; weak list in environmentValidation), demo password literals (committed seed + DEV_ADMIN denylist; e2e fallbacks env-only after scrub), token leakage in logs (prior Phase 9), path traversal (Phase 2 static policy), BUZZARD_E2E_DB in production (refused), git stderr noise in isolated API.

### Critical / high fixed this phase
- P14-1: `listProducts` now accepts preview only as boolean `true` (query string `preview=1` ignored even if a public handler forgets to strip it).
- P14-2: `deploymentIdentity` git calls use stdio ignore for stderr (stops `fatal: not a git repository` spam in isolated api.log without changing identity behaviour).
- P14-3: removed ineffective `<meta http-equiv="X-Frame-Options">` from `app/layout.tsx` (browsers ignore meta; header remains from `server/lib/security.js`).

### Remaining (not claimed fixed; not sprint-blocking for code-complete verification where external)
- Committed seed file still holds bootstrap password literals (denylisted in production admin bootstrap).
- DEV_ADMIN_PASSWORD constant remains as development denylist/bootstrap source (production refuses it).
- Administrator may approve own Control Center request (O11-2).
- Legacy `/api/admin/import` and `/api/admin/sync/retry` without approval gate (O11-1).
- TOTP secrets at-rest encryption, non-atomic writers for some JSON stores, mail delivery for password reset — external/ops.
- Applying the server patch to the live watched stack requires a human restart decision (BLOCKED for live apply).

### Evidence
catalogFixtureSecurity + webhookSecurity re-run after hardenings; preview probe shows demo still 404 with `?preview=1`.

## Evidence recovery — Phases 8–10 (2026-11-18 17:46 UTC)

Raw logs were missing from the committed `artifacts/.../logs/` bundle but still present under `/tmp/buzzard-final-sprint/logs/`. Copied into `artifacts/buzzard-security-admin-final-sprint-checkpoint-2026-11-18/logs/` **without re-running** tests (no invented evidence).

| Phase | Files recovered |
|---|---|
| 8 JSON integrity | `p8-full-1.log`, `p8-full-2.log`, `p8-full-3-1.log`, `p8-full-3-2.log`, `p8-integrity.log`, `p8-lock-stress.log`, `p8-full-vitest.log` |
| 9 Audit / logging | `p9-logging.log`, `p9-recovery.log`, `p9-reset-probe-before.log`, `p9-reset-probe-after.log`, `p9-suites.log`, `p9-full-vitest.log`, `p9-full-vitest-final.log` |
| 10 Isolation | `p10-full-vitest.log`, `p10-full-vitest-netspy.log`, `p10-parts.log`, `p10-python-egress.log`, `p10-selftest.log`, `p10-limiter-on.log`, `p10-limiter-off.log`, `p10-typecheck.log`, `p10-enoent.log`, `p10-script-part3-security.log`, `p10-script-final-audit.log`, `p10-script-production-safety.log` |

See `BUZZARD_PR507_FINAL_REVIEW.md` for PR/CI status and live vs staging distinctions.

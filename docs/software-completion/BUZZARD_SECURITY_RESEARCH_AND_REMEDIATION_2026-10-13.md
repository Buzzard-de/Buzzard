# Buzzard — Security Research and Remediation

Date: 2026-10-13  
Mode: evidence-first, local-only  
Branch: `cursor/final-completion-execution-c293`  
HEAD (unchanged): `7561ad3d8c4179c714ab35b6c86cfc1c07abbd9b`  
Remote: `origin/cursor/final-completion-execution-c293` **ahead 29**  
This report does **not** overwrite Phase 8–13 or the master command audit.

No finding is `LIVE_VERIFIED`. Production was not contacted.

---

## 1. Executive summary

The master audit was re-checked against **current** files. Phase 13 working-tree guards were **still present** and were **kept**. Additional confirmed gaps were closed locally:

1. **Finance confirm/refund** no longer write `succeeded` / refund rows from an API or library call. They fail closed (`PROVIDER_CONFIRMATION_REQUIRED` / `PROVIDER_REFUND_REQUIRED`).
2. **`wrapRouteHandler`** no longer returns the raw handler for **unlisted write** methods. Missing policy on POST/PUT/PATCH/DELETE is **401**.
3. Storefront writes that must stay anonymous are now **explicit PUBLIC_ROUTES**.
4. `POST /api/commerce/payments/:id/fail` and `reconcile` require `orders.write`.
5. Prior Phase 13 CORS / public health sanitization remains in the working tree.

**HEAD and origin are unchanged.** All remediations exist **only in the working tree**.

Sales / SoT / live payments remain disabled in this environment.

---

## 2. Starting branch, HEAD, and working-tree state

Recorded **before** this turn’s new edits (same HEAD after):

| Field | Value |
| --- | --- |
| Branch | `cursor/final-completion-execution-c293` |
| HEAD | `7561ad3d8c4179c714ab35b6c86cfc1c07abbd9b` |
| Staged | empty |
| Ahead/behind | +29 / 0 |
| Flags | `BUZZARD_SALES_ENABLED=0`, SoT unset, live payments unset |

Phase 11 leftovers (preserved): languageIndependence test, production-safety, part8Foundation, softwareMasterCompletion, untracked backupRestoreIntegrity + Phase 11 report.

Phase 13 leftovers (preserved, then extended): routePermissions, corsOrigins, db public health, paymentsFinancePlugin `requireAnyAdmin`, health plugins, fortressAuthz tests, Phase 13 report.

`git reset` / `git clean` were not used.

---

## 3. Previous audit vs current code

| Audit ID | HEAD at start | Working tree at start | This turn |
| --- | --- | --- | --- |
| MCA-01 wrap fail-open | `if (!policy) return handler` | same | **Writes fail closed**; GETs still skip if unlisted |
| MCA-02 P13 not in HEAD | confirm unauth | `requireAnyAdmin` + PREFIX | Preserved + confirm/refund library fail-closed |
| MCA-03 P8–11 missed finance | true | PREFIX present | Confirmed; further fail-closed |
| MCA-07 HttpOnly | sessionStorage | unchanged | **No cookie migration** (blocker unchanged) |
| MCA-08 braces | 3.0.3 eslint chain | same | No compatible fix; not force-patched |
| MCA-16 seed password | seed file + non-prod default | same | Classified; production `ensureAdmin` already fail-closed. **Not rewritten** (would break local smoke) |
| CORS null | in DEFAULT_ORIGINS | already removed | Kept; extra `*` test |
| Health path | leaked on `/api/health/db` | `toPublicDatabaseHealth` | Kept |

---

## 4. Critical financial authorization

**Actual routes** (not `/confirm` at collection root):

- `POST /api/payments-finance/intents`
- `POST /api/payments-finance/intents/:id/confirm`
- `POST /api/payments-finance/intents/:id/refunds`
- `POST /api/payments-finance/invoices`

| Check | Result |
| --- | --- |
| Wrapper | PREFIX `orders.write` (WT) |
| Handler | `requireAnyAdmin` on those four (WT) |
| Library confirm | **Was** marking `succeeded` without a provider even after admin. **Now** 409, `applied: false` |
| Library refund | **Was** inserting `succeeded` refunds. **Now** 409, `financialEffect: false` |
| Real money | Not executed; live payments off |
| Tests | fortressAuthz 401 wrap; confirm/refund do not change status |

Severity: **P0/P1**. Reproduced by test. Fix implemented (WT). Regression: yes. Residual: official Stripe/PayPal path **NOT_VERIFIABLE_LOCALLY**.

---

## 5. wrapRouteHandler and missing policy

`server/lib/globalAuthMiddleware.js` still used by every `addRoute` in `server/server.js`.

**Before this turn:** missing policy → raw handler (all methods).  
**After:** missing policy + write method → **401**. GET/HEAD without policy still unguarded (intentional public reads not all listed).

Public storefront writes are **explicit** `PUBLIC_ROUTES` (cart, checkout, contact, auth login/register, reviews, etc.).

Customer `/api/account/*`, `/api/me` → `{ authenticated, realm: "customer" }`.  
Identity account/privacy → `realm: "service"`.

| Test | Result |
| --- | --- |
| Unlisted `POST /api/vehicles/seed` | 401, handler not run |
| `POST /api/commerce/cart` | public, handler runs |
| Finance writes | 401 unauth |

Severity: **P1**. Residual: unlisted **GET** diagnostics; any storefront write we failed to list will now 401 (see inventory).

---

## 6. CORS and health disclosure

CORS: opaque `null` not in defaults; allowed only via explicit `BUZZARD_CORS_ORIGINS`. No `*`. CORS is not authentication (`server/server.js` only sets ACAO when `isAllowedOrigin`).

Health: `toPublicDatabaseHealth()` omits `path`, user/product/order counts, backupDir, renderDisk. Used on `/api/health` (collectHealth), `/api/health/db`, `/api/health/pusat` (path stripped), `/api/health/production` (path/users stripped).

Severity: **P2**, fix in WT, tests pass. Residual: other readiness JSON may still be verbose (**P3**).

---

## 7. Session and CSRF

Unchanged architecture:

- Admin token: 8h, `sessionStorage` `buzzard_admin_token`, Bearer.
- CSRF: Bearer exempt; cookie CSRF only if `BUZZARD_CSRF_ENFORCE=1`.
- Cross-origin `:3000` → `:3001`.

**HttpOnly not implemented.** 40+ clients. Partial migration refused.

Concrete migration (unchanged from Phase 11/13): Set-Cookie HttpOnly Secure SameSite; stop JSON token; `credentials: 'include'` on all admin fetches; CSRF on; logout clears cookie; Playwright via cookie jar; CORS credentials + fixed origin.

---

## 8. Seed / default credentials

| Location | Class | Action |
| --- | --- | --- |
| `data/buzzard_admin_users.seed.json` | Development / test fixture (plaintext in repo) | **Not rewritten** (e2e/smoke depend on it). Values not copied here. |
| `server/lib/dbAuth.js` `ensureAdmin` fallback | Development-only default; **null in production** if env unset | Left; production already fail-closed |
| `JWT_SECRET` fallback when unset | Development-only; `isDefaultJwtSecret()` exists | Production should set env. Not printed. |
| Smoke/e2e hardcoded login | Test-only | Left |

**Not** confirmed production exposure. Evidence needed later: whether production `ADMIN_PASSWORD` / `JWT_SECRET` were ever the repo defaults (authorized operator check only).

---

## 9. Dependency advisory

Re-checked this turn: `npm audit --omit=dev` exit **0**; `npm --prefix server audit` exit **0**.  
Root HIGH remains **braces@3.0.3** via `eslint-config-next` (dev lint). Latest braces still 3.0.3. No compatible Next 15 fix. **Not** force-fixed. **Not** a confirmed production runtime exploit.

---

## 10. Route authorization inventory (relevant)

Classification after this turn’s policy map:

| Class | Examples |
| --- | --- |
| A Public read | `/api/health*`, commerce status, payment methods |
| B Public write + safeguards | commerce cart/checkout (sales lock), contact, AI chat (rate limit), reviews, QR scan, official webhooks |
| C Authenticated customer | `/api/account/*`, `/api/me`, `/api/customer/*` |
| D Admin-only | `/api/admin/*` (wrapper + often handler) |
| E Finance-restricted | payments-finance mutations; v3x payments/logistics/order records |
| F Internal/worker | v3x jobs now PREFIX-protected |
| G Webhook + signature | official `/api/commerce/webhooks/:provider`; unsigned legacy isolated |
| H Unknown writes | now **401** if unlisted (e.g. `/api/vehicles/seed`) |

`POST /api/commerce/payments` remains public **create** (sales-locked engine). `fail` / `reconcile` are **E/D**.

---

## 11. Webhook findings

Unsigned `/api/payments-finance/webhook` and `/api/webhooks/payment`: `applied: false`.  
Official path unchanged. Live signatures **NOT_VERIFIABLE_LOCALLY**.

---

## 12. Logging, rate limits, incident response

- `logSecurityEvent` on admin auth required, CSRF fail, guardian deny.
- Finance rejects write `finance_audit` rows (`manual_confirm_rejected`, `manual_refund_rejected`).
- Rate limits: global 180/min; cart 120; admin login 8/15min; AI chat 30; payment routes have a limiter in commerce plugin.
- No new monitoring platform added.
- Alerting / autonomous containment: **not** proven live.

---

## 13. Esat Bey / Guardian status

| Component | Status |
| --- | --- |
| `server/lib/pusat/guardian.js` evaluate/deny | **CODE_READY** / unit **SANDBOX_VERIFIED** (`softwareCompletion` Guardian cases passed) |
| Permission + tool allow-list | **CODE_READY** (denies missing perms; fail-closed on exception) |
| Remote Python Guardian | Health signal only — **PARTIAL** / **NOT CONFIGURED** here |
| Self-privilege escalation | No grant-self API found in guardian evaluate |
| Human approval for sensitive actions | **CODE_READY** (`actionRequiresApproval`) |
| Live autonomous defense | **NOT_IMPLEMENTED** as proven live; **not** LIVE_VERIFIED |

Pusat remains the orchestrator. No new AI provider added.

---

## 14. Exact fixes implemented (working tree)

| File | Why |
| --- | --- |
| `server/lib/globalAuthMiddleware.js` | Write methods without policy → 401; honor `policy.realm` |
| `server/lib/routePermissions.js` | Explicit public storefront writes; customer/service realms; commerce fail/reconcile `orders.write` |
| `server/lib/paymentsFinance.js` | confirm/refund fail closed without provider result |
| `server/plugins/paymentsFinancePlugin.js` | Kept Phase 13 `requireAnyAdmin` |
| `server/lib/corsOrigins.js` | Kept Phase 13 no default `null` |
| `server/lib/db.js` + health plugins | Kept Phase 13 public health sanitization |
| Tests | fortressAuthz, routePermissions, corsOrigins extended |

Phase 11 user files were not overwritten beyond already-dirty test files from prior phases.

---

## 15. Tests run and results

| Command | Exit | Result |
| --- | --- | --- |
| `npx vitest run` routePermissions + corsOrigins + fortressAuthz + csrf + softwareMasterCompletion | **0** | **45 passed** |
| `npx vitest run softwareCompletion` | **0** | **72 passed** |
| `npm audit --omit=dev` | **0** | 0 vulns |
| `npm --prefix server audit` | **0** | 0 vulns |
| Full `test:unit` | **not run** | — |
| Playwright / lint / tsc / `next build` | **not run** | Build skipped to avoid `.next` clobber |

No skipped-as-pass claims.

---

## 16. Findings not fixed, and why

| Item | Why |
| --- | --- |
| HttpOnly cookie cutover | Incomplete migration unsafe |
| braces GHSA | No compatible patched braces / Next 15 eslint |
| Seed JSON plaintext | Changing it breaks documented local smoke/e2e; production insert already gated |
| CSRF default-off | Coupled to cookie sessions |
| GET unlisted diagnostics | Listing every GET would be a large behavior change |
| Production TLS/WAF/exposure | Forbidden to probe |
| Live Guardian/Esat | No production evidence |

---

## 17. Remaining risks and decisions

1. **Deployability:** none of this is in HEAD or origin. A process started from HEAD still has unauth finance confirm-as-success.
2. **Public write list:** if a legitimate storefront POST was omitted, it will now 401 locally until added to PUBLIC_ROUTES.
3. Operator must decide whether to **commit** these WT files later (not done).
4. Confirm production never used seed/default admin material.

---

## 18. Local vs HEAD vs remote

| Location | Finance confirm | Wrap missing write | CORS null | Health path |
| --- | --- | --- | --- | --- |
| Working tree | fail-closed + admin | 401 | rejected | sanitized |
| HEAD `7561ad3` | unauth + marks succeeded | raw handler | allowed | leaked |
| origin (behind 29) | same as last push; **not** this WT | unknown vs local 29 commits | — | — |

Production: **untouched**.

---

## 19. Top five next actions

1. Authorized **commit** of this working tree when change-control allows (do not push until asked).
2. Start a local API from **this WT** and re-hit finance/cart (sales still off).
3. HttpOnly complete-or-never decision.
4. Authorized production secret/flag/CORS check.
5. Watch braces / eslint-config-next for a compatible patch.

---

## Finding register

| ID | Severity | Evidence | Test | Fix | Residual |
| --- | --- | --- | --- | --- | --- |
| SR-01 Finance unauth + fake confirm | P0/P1 | paymentsFinance.js / plugin | fortressAuthz | WT yes | HEAD still old |
| SR-02 Wrap write fail-open | P1 | globalAuthMiddleware.js | vehicles/seed 401 | WT yes | GET still open |
| SR-03 Commerce fail/reconcile public | P1 | commerceCorePlugin + routePermissions | 401 wrap | WT yes | — |
| SR-04 CORS null | P2 | corsOrigins.js | corsOrigins tests | WT (Phase 13) | extras can re-add |
| SR-05 Health path | P2 | db.js / plugins | toPublicDatabaseHealth | WT (Phase 13) | other readiness JSON |
| SR-06 sessionStorage | P1 | lib/admin/client.ts | prior E2E | No | XSS readable token |
| SR-07 Seed/default admin | P1 if deployed | seed json / dbAuth | not rotated | No rewrite | Operator confirm |
| SR-08 braces | P2 paper | npm audit | omit-dev clean | No | Dev lint |
| SR-09 Esat live defense | INFO | pusat/guardian.js | softwareCompletion | N/A | Not LIVE_VERIFIED |

---

## Safety confirmation

- No production access.  
- No real payments/orders/messages.  
- Sales / SoT / live payments not enabled.  
- No commit, push, PR, merge, deploy.  
- No `git reset --hard` / `git clean -fd`.  
- No `npm audit fix --force`.  
- No secrets printed.  
- Prior reports not overwritten.  
- Buzzard is **not** production-ready.  
- Esat Bey is **not** declared fully operational.

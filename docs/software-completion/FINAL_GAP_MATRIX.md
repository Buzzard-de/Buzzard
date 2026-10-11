# Final Gap Matrix

Statuses used only: PASS, PARTIAL, FAIL, BLOCKED_EXTERNAL_ACCESS, BLOCKED_HUMAN_APPROVAL, NOT_CONFIGURED, NOT_VERIFIED, NOT_APPLICABLE.

| Requirement | Existing path | Missing before this pass | Risk | Code possible? | Implementation | Test | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pusat sole orchestrator | `server/lib/pusat` | none | high | yes | preserved | `test:ai` | 58/58 | PASS |
| Task cancel | lifecycle | none this pass | med | yes | preserved | software 40 | cancelled, no side effects | PASS |
| Durable memory | `pusat/memory` SQLite | /var/tmp honesty | med | yes | ephemeral path + startup fail-closed | software 43 | sqlite, not /tmp | PARTIAL (production disk NOT_VERIFIED) |
| Guardian / approval | `pusat/guardian` + `approval` | circular hang / throw | high | yes | WeakSet + wrap | software 42 + `test:ai` | deny / expire / bind | PASS |
| Pricing €0.50 after fees | `software/pricing` | none this pass | high | yes | preserved | software 3, 37 | net ≥ 0.50 when precise | PASS |
| €0.10 undercut | constants | intentionally absent | n/a | no | not implemented | software 3 | `implemented:false` | NOT_APPLICABLE |
| Sales lock | `salesMode` | none | high | yes | preserved | health + journey | salesEnabled false | PASS |
| Product SoT inactive | productCore | none | high | yes | preserved | software 2 | ACTIVE throw | PASS |
| Provider diagnostics | `providerDiagnostics` | none this pass | med | yes | preserved | software 39 | dry-run, prod URL rejected | PASS |
| Live providers | adapters | credentials | high | no | checklist only | inventory counts.live=0 | no probe | NOT_CONFIGURED / NOT_VERIFIED |
| Next RCE <15.5.24 | next 15.5.27 | none | high | yes | already on 15.5.27 | lint/typecheck/build | RCE GHSA out of range | PASS |
| Vitest/tinypool RCE | vitest 3.2.7 | Node 20 vs Vitest 5 Node 22.12 | high | yes after `.nvmrc` 22 | vitest **5.0.3**, tinypool removed | unit/ai/software | 743/743 | PASS (dev toolchain) |
| Next postcss / sharp | 8.4.31 / 0.34.5 | bundled vulns | high | yes override | postcss 8.5.29, sharp 0.35.5 | build | `npm audit --omit=dev` 0 | PASS |
| braces/micromatch | eslint-config-next 15.5.27 | no 3.x patch | high | no | not downgraded to 14.2.35 | lint | advisory remains | BLOCKED_HUMAN_APPROVAL (dev-only) |
| Production DB / Render disk | `dbPaths.js` | no production access | high | code yes | missing path fail-closed | software 50 | operator procedure | BLOCKED_EXTERNAL_ACCESS |
| Production verification | — | no prod access | high | no | — | — | score 0 | NOT_VERIFIED |
| Contact time-trap | ContactForm + contact plugin | missing field; missing stamp allowed | med | yes | `_formStarted` + fail-closed | software 41 | security:check OK | PASS |
| Payment HTTP ≠ paid | `software/payments` | HTTP 200 treated as ambiguous | high | yes | `interpretHttpStatus` | software 44 | UNCERTAIN, not paid | PASS |
| Live capture/refund throw | Stripe/PayPal providers | `Not implemented` throw | high | yes | fail-closed blocked result | software 44 | executed:false | PASS |
| Marketplace required fields / fake IDs | `software/marketplace` | missing fields accepted; no persist | med | yes | validate + idempotent draft | software 45 | listingId null | PASS |
| Return refund transitions | `software/returns` | any status accepted for customer side | high | yes | transition table | software 46 | RECEIVED blocked | PASS |
| Supplier live fetch | `software/supplierFeeds` | URL path undefined | high | yes | `rejectLiveFetch` | software 47 | LIVE_FETCH_BLOCKED | PASS |
| Financial job retry | `jobQueue` + worker | stale lock retried payment jobs | high | yes | maxRetries=0 + DLQ | software 48 | DEAD_LETTER | PASS |
| Health env ≠ live | `software/health` | stripe dropped from blocked if env set | med | yes | always-blocked live ids | software 21, 44 | stripe/twilio blocked | PASS |

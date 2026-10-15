# Buzzard 237 — Final handover (this execution)

Date: 2026-10-15  
This document is a session handover, not a claim that 237/237 items are complete.

## Git

| Field | Value |
| --- | --- |
| Branch | `cursor/software-completion-local-c293` |
| Starting HEAD | `12e24c5` |
| Ending HEAD (code) | `af95675` plus register evidence commit |
| Push / merge / deploy / PR | **not performed** (KOMUT 6) |

## Totals

Canonical original titles: **UNKNOWN**.

| Final state | Count | % of 237 |
| --- | --- | --- |
| VERIFIED_100 | 0 | 0.0% |
| PARTIAL | 216 | 91.1% |
| HUMAN_APPROVAL_REQUIRED | 13 | 5.5% |
| BLOCKED_EXTERNAL_DEPENDENCY | 7 | 3.0% |
| NOT_APPLICABLE_WITH_EVIDENCE | 1 | 0.4% |

Mean established-scope completion: **73.20%** (was 73.12%). This pass **+0.08 pp**. Target +0.30 **NOT MET**.

## What was implemented this pass

- `/api/account/password-reset/request` no longer returns `resetToken`.
- Identity HTTP reset-request returns `{ ok: true }` only.
- Same success body for existing and missing emails.
- Reset request/confirm marked public; CSRF allow-list updated.
- HTTP reset rate limit 5/hour before account lookup.
- `createRateLimiter` honors TEST_MODE per call.
- GET `/api/submissions` requires `security.read`.
- Storefront reset UI no longer displays a demo token.
- Confirm still works when tests mint via `createResetToken`.
- No live email delivery (none was configured).

## Highest-priority remaining work

1. Hash/at-rest protection for `password-reset-tokens.json`.
2. Identity `secretForDevelopment` on 2FA setup HTTP.
3. `/api/account/login` and `/register` still sit under the customer-auth catch-all (reset is public).
4. Marketplace/carrier BLOCKED_EXTERNAL; Esat Bey 227–237 not started.

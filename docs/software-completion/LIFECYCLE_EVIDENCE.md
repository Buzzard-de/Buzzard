# End-to-End Commercial Lifecycle Evidence

Implementation HEAD: `0d763301c45f26be67a499d742c8bfdde2057fc0`  
Harness: `server/lib/software/lifecycle.js`  
Tests: `server/__tests__/softwareLifecycle.test.mjs`  
This is a **non-production fixture harness**. Passing stages are **TEST_VERIFIED**, not LIVE_VERIFIED.

## What ran

`software.lifecycle.runCommercialLifecycle()` executes stages A–K against the existing engines. Every stage returns a trace: initial state, events, expected/actual transition, ledger, security decision, final state, pass/fail, evidence path.

Local result on `0d76330`: `npm run test:software` **61/61** (55 software + 6 lifecycle).

## Stage results

| ID | Stage | Pass | Verification | Commercial write |
| --- | --- | --- | --- | --- |
| A-product | Dry-run create; ACTIVE rejected | yes | TEST_VERIFIED | none |
| B-pricing | €0.50 net-profit; missing inputs fail-closed; no €0.10 undercut | yes | TEST_VERIFIED | none |
| C-inventory | Fresh reserve + idempotent key; stale stock fail-closed; conflicting supplier offers fail-closed; no speculative buy | yes | TEST_VERIFIED | reservation fixture only |
| D-order | Draft + PO draft; sales lock; no send | yes | TEST_VERIFIED | none |
| E-payment | HTTP 200 ≠ paid; timeout UNCERTAIN; webhook missing signature blocked | yes | TEST_VERIFIED | none |
| F-supplier | Guardian deny submit; live feed fetch blocked | yes | TEST_VERIFIED | none |
| G-carrier | Tracking fixture; no invented GPS; IDOR denied; out-of-order held; duplicates idempotent; simulated labelled; empty tracking invalid | yes | TEST_VERIFIED | fixture row only |
| H-returns | Customer refund drafted, RECEIVED blocked; supplier credit rejected independently | yes | TEST_VERIFIED | ledger only |
| I-communications | de/ar/tr drafts; RTL detect; queue ≠ delivered; send BLOCKED; idempotent | yes | TEST_VERIFIED | draft only |
| J-marketplace | Amazon draft unpublished; OTTO safe interface; publish BLOCKED | yes | TEST_VERIFIED | draft only |
| K-reporting | inventedRevenue false; readiness states not collapsed | yes | TEST_VERIFIED | none |

Audit row: `software_audit.kind=commercial_lifecycle`. Summary flag: `verification=TEST_VERIFIED`, `liveVerified=false`.

## What this does not prove

Live provider auth, production storage, real payments, real POs, real listings, real messages, or production verification.

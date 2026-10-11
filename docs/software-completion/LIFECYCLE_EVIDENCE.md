# End-to-End Commercial Lifecycle Evidence

Implementation HEAD: `8ed00ba2f416cbfa9e927d7fe87f1b4de23a960b`  
Harness: `server/lib/software/lifecycle.js`  
Tests: `server/__tests__/softwareLifecycle.test.mjs`  
This is a **non-production fixture harness**. It is not live commerce.

## What ran

`software.lifecycle.runCommercialLifecycle()` executes stages A–K against the existing engines. Every stage returns a trace: initial state, events, expected/actual transition, ledger, security decision, final state, pass/fail, evidence path.

Local result on `8ed00ba`: `npm run test:software` **56/56** (51 software + 5 lifecycle).

## Stage results

| ID | Stage | Pass | Commercial write |
| --- | --- | --- | --- |
| A-product | Dry-run create; ACTIVE rejected | yes | none |
| B-pricing | €0.50 net-profit; missing inputs fail-closed; no €0.10 undercut | yes | none |
| C-inventory | Fresh reserve + idempotent key; stale stock fail-closed; no speculative buy | yes | reservation fixture only |
| D-order | Draft + PO draft; sales lock; no send | yes | none |
| E-payment | HTTP 200 ≠ paid; timeout UNCERTAIN; webhook missing signature blocked | yes | none |
| F-supplier | Guardian deny submit; live feed fetch blocked | yes | none |
| G-carrier | Tracking fixture; no invented GPS; IDOR denied | yes | fixture row only |
| H-returns | Customer refund drafted, RECEIVED blocked; supplier credit rejected independently | yes | ledger only |
| I-communications | de/ar/tr drafts; RTL detect; send BLOCKED; idempotent | yes | draft only |
| J-marketplace | Amazon draft unpublished; OTTO safe interface; publish BLOCKED | yes | draft only |
| K-reporting | inventedRevenue false; readiness states not collapsed | yes | none |

Audit row: `software_audit.kind=commercial_lifecycle`.

## What this does not prove

Live provider auth, production storage, real payments, real POs, real listings, real messages, or production verification.

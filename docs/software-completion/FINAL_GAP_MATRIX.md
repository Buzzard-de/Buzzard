# Final Gap Matrix

Statuses used only: PASS, PARTIAL, FAIL, BLOCKED_EXTERNAL_ACCESS, BLOCKED_HUMAN_APPROVAL, NOT_CONFIGURED, NOT_VERIFIED, NOT_APPLICABLE.

| Requirement | Existing path | Missing before this pass | Risk | Code possible? | Implementation | Test | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pusat sole orchestrator | `server/lib/pusat` | none | high | yes | preserved | `test:ai` | 58/58 | PASS |
| Task cancel | lifecycle had no export | cancel missing | med | yes | `cancelTask` | software 40 | cancelled, no side effects | PASS |
| Durable memory | `pusat/memory` SQLite | /tmp honesty | med | yes | `tmpPath`/`productionPersistent` | software 40 + restart tests | sqlite, not /tmp | PARTIAL (production disk NOT_VERIFIED) |
| Guardian / approval | `pusat/guardian` + `approval` | none critical | high | yes | preserved | `test:ai` + software 10–12 | deny / expire / bind | PASS |
| Pricing €0.50 after fees | `software/pricing` | sale not lifted for commission+VAT | high | yes | lift + `saleApproved` | software 3, 37 | net ≥ 0.50 when precise | PASS |
| €0.10 undercut | constants | intentionally absent | n/a | no | not implemented | software 3 | `implemented:false` | NOT_APPLICABLE |
| Sales lock | `salesMode` | none | high | yes | preserved | health + journey | salesEnabled false | PASS |
| Product SoT inactive | productCore | none | high | yes | preserved | software 2 | ACTIVE throw | PASS |
| Provider diagnostics | missing harness | no dry-run CLI | med | yes | `providerDiagnostics` + script | software 39 | dry-run, prod URL rejected | PASS |
| Live providers | adapters | credentials | high | no | checklist only | inventory counts.live=0 | no probe | NOT_CONFIGURED / NOT_VERIFIED |
| Next RCE <15.5.24 | next 15.5.23 | unpatched | high | yes | 15.5.27 | lint/typecheck/build/unit | RCE GHSA out of range | PARTIAL (bundled postcss/sharp remain) |
| Vitest/tinypool RCE | vitest 3.2.7 | major upgrade | high | no (breaking) | isolated plan | — | remains | BLOCKED_HUMAN_APPROVAL |
| Production DB / Render disk | `dbPaths.js` | no production access | high | no | unchanged | local path only | — | BLOCKED_EXTERNAL_ACCESS |
| Production verification | — | no prod access | high | no | — | — | score 0 | NOT_VERIFIED |

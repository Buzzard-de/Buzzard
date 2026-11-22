# Test results

Date of this run: 22 November 2026, 21:40 Europe/Berlin.
Command host clock was UTC. The vitest start line `20:40:46` converts to 21:40 Europe/Berlin.
HEAD: `63e55af5`.
Environment: `BUZZARD_SALES_ENABLED=0`, `VITEST=true`, database under `/tmp`. No live URL was set.

The historical suite was not rerun. A passing local test is not a live integration.

| Test file | Tests | Result | Module | Failure |
|---|--:|---|---|---|
| `server/__tests__/pusatCouncil.test.mjs` | 6 | PASS | Pusat memory, meetings, research | None |
| `server/__tests__/pusatOrchestrator.test.mjs` | 11 | PASS | Routing, approval, restart of the isolated queue | None |
| `server/__tests__/phase7CaptureRoute.test.mjs` | 1 | PASS | Payment capture and refund HTTP | None. Sales lock returned 403. |
| `server/__tests__/unstartedLocalSurfaces.test.mjs` | 8 | PASS | Textile, camera, holiday, supplier dry forward, device claim, ads, budget | None |

Total this pass: 4 files, 26 tests, 26 passed, 0 failed.

## Not run, and why

| Suite | Status |
|---|---|
| Full Vitest tree | Not run. Too broad for a live-safety review in one pass, and several files can open network-shaped paths. |
| Playwright end-to-end | Not run. Would need the storefront and API servers. Ports 3000 and 3001 were left untouched. |
| `npm run verify:go-live` and `production:verify:live` | Not run. They target a deployed API. |
| Carrier, supplier, and payment provider sandboxes | Not run. LIVE_VERIFICATION_REQUIRED. |
| npm registry audit | Not run in this pass. No new dependency scan is claimed. |

## How to read older green runs

Earlier registers say large local suites passed. Those results are historical evidence. They were not reproduced today, so they do not raise any task to VERIFIED_COMPLETE.

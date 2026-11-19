# BUZZARD — False Completion & Test Quality

## How completion is overstated

### 1. Phase gate denominator manipulation

`server/lib/platform/phaseGateFinalize.js`:

```javascript
const software = checks.filter((c) => !blocked.has(c.id));
```

Checks with `id` listed in `blockedExternalIds` are **removed from the denominator**, not counted as failures. Any phase can reach **100%** while live requirements remain permanently open.

### 2. `phases6to21Gate.test.mjs` — meta-test only

File: `server/__tests__/phases6to21Gate.test.mjs`

- Single assertion per phase: `percentComplete === 100` and `ok === true`.
- **Does not:** call HTTP APIs, assert DB rows, verify permissions, or compare to product requirements.
- **Effect:** Passing this file **proves gate function returns 100**, not that Phase N is implemented.

### 3. Ledger JSON

`data/master/buzzard_ordered_phases.v1.json` v1.3.0 marks phases 6–21 `COMPLETE` / `percent: 100` with evidence pointing at the meta-test above — **circular documentation**.

### 4. Shallow phase modules (examples)

| Phase | File | What “100%” actually exercises |
|-------|------|--------------------------------|
| 13 | `phase13Pusat.js` | `automationHealth.snapshot`, roster length |
| 18 | `phase18Marketing.js` | 2 `IDENTITIES`, `campaignDraft` |
| 20 | `phase20Performance.js` | 2000 in-memory items, `ms < 500` |
| 19 | `phase19AdminReporting.js` | `getIntegrationStatus()` object presence |

### 5. Phase 11 duplicates Phase 3

`phase11PimSot.js` includes check `PIM_SOT_PHASE3` requiring `evaluatePhase3ProductPim().percentComplete === 100` — **double-counting**, not new SoT proof.

### 6. Phase 17 vs security sprint

Gate passes readiness diagnostics; **committed** JWT remains weak (`HEAD:dbAuth.js`). Security sprint fixes sit in **uncommitted** diff — reporting “Phase 17 complete” on gates **misrepresents** production auth.

---

## Test suite quality (full `server/__tests__` run)

| Metric | Value | Date (UTC) |
|--------|-------|------------|
| Files | 158 | 2026-11-19 |
| Passed tests | 1937 | |
| Failed tests | 9 | |
| Skipped | 1 | |
| Pass rate | 99.5% | **Misleading for production readiness** |

### Failing files (regressions on this worktree)

1. `jsonLdSerialization.test.mjs` — load/collection error
2. `adminRouteMatrix.test.mjs` — write route policy gaps
3. `jsonStoreIntegrity.test.mjs` — 6× disk migration scenarios
4. `special16Phase4.test.mjs` — textile/holiday `completeClaim` false

Failures indicate **documented capabilities not met** even in CI-isolated runs.

---

## Tests that are valuable (contrast)

| Test | Why it matters |
|------|----------------|
| `phase5PricingProfit.test.mjs` | Exercises margin policy numbers |
| `devList51Remainder.test.mjs` | 51-item closure with live blocks |
| `syntheticCustomerJourney.test.mjs` | Multi-step dry pipeline |
| `part21SecurityObservabilityReadiness.test.mjs` | Security readiness gates |
| `webhookSecurity.test.mjs` | Webhook signature behavior |
| `phase1CoreIntegrity.test.mjs` | Protected data + sales lock |

---

## Patterns of weak tests (samples)

| Pattern | Example |
|---------|---------|
| Existential export test | Some platform tests only `require` evaluators |
| Hard-coded env in `beforeEach` | `phases6to21Gate.test.mjs` — always sales off |
| No failure path | Phase 20 never asserts behavior under `ms >= 500` |
| Mock-heavy readiness | Security audit never hits running server |

---

## Skipped / flaky

- **1 skipped** in full run (file not expanded in audit log — treat as **G** until enumerated).

---

## Conclusion

**Phase gate 100% ⊄ Platform complete.**

Minimum bar to reduce false completion:

1. Separate **GATE_SCORE** from **VERIFIED_CAPABILITY_SCORE** in ledger.
2. Require HTTP/integration tests per phase for any “A” classification.
3. Fail CI if `adminRouteMatrix` or `jsonStoreIntegrity` migration tests fail (currently failing on worktree).
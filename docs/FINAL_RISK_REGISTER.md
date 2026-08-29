# Buzzard — Final Risk Register (Part 11)

**Audit date:** 2026-08-29  
**Classification:** P0 = catastrophic blocker | P1 = serious production blocker | P2 = important manageable | P3 = cosmetic/future

---

## P0 — Catastrophic / Immediate Blocker

| ID | Finding | Status |
|----|---------|--------|
| — | *None confirmed* while `BUZZARD_SALES_ENABLED=0` and go-live lock active | — |

> No path found to execute real Stripe/PayPal payment or create commercial orders while SALES=0 in commerce core.

---

## P1 — Serious Production Blocker

| ID | Finding | Area | Mitigation |
|----|---------|------|------------|
| R-P1-01 | Ephemeral SQLite on Render free tier — data loss on redeploy | Deployment | Paid plan + persistent disk at `/var/data` |
| R-P1-02 | Legacy `fulfillmentPipeline.submitSupplierOrder()` demo path exists separate from commerce guards | Supplier | Gate on SALES flag + remove demo auto-success; route through commerce |
| R-P1-03 | Multiple parallel auth systems (JWT, admin sessions, customer) increase bypass risk | Auth | Migration plan to unified facade; audit direct legacy usage |
| R-P1-04 | E2E API tests flaky under cumulative rate limiting (429) | Testing | Separate test rate limits or reset between suites |
| R-P1-05 | Live Render production not verified in this audit | Deployment | Post-deploy smoke + final-audit against live URL |

---

## P2 — Important but Manageable

| ID | Finding | Area | Mitigation |
|----|---------|------|------------|
| R-P2-01 | Legacy commerce endpoints still active (`/api/cart`, `/api/orders`) | Commerce | Deprecation headers added; migrate all clients to `/api/commerce/*` |
| R-P2-02 | Full browser checkout journey E2E deferred (Part 10) | Testing | Complete Playwright cart hydration flow |
| R-P2-03 | 320px horizontal overflow on storefront (Part 10 deferred) | UX | CSS audit ProductCard/ProductList |
| R-P2-04 | Dual taxonomy (48-category engines vs 53 L1 shop categories) | Catalog | Document canonical source; consolidate |
| R-P2-05 | Redis rate-limit backend optional, not production-validated | Infrastructure | Validate or document single-instance requirement |
| R-P2-06 | ~59 plugins with overlapping versioned routes | Architecture | Inventory ACTIVE vs DEPRECATED plugins |
| R-P2-07 | Backup/restore procedures TBD | Operations | Document before go-live |
| R-P2-08 | Public legacy `/api/products` may differ from catalog visibility rules | Catalog | Audit callers or deprecate |

---

## P3 — Cosmetic / Future Improvement

| ID | Finding | Area |
|----|---------|------|
| R-P3-01 | Client-side coupon fallback in non-commerce cart mode | Frontend |
| R-P3-02 | Duplicate export snapshots in `exports/` directory | Repo hygiene |
| R-P3-03 | Accessibility audit not fully automated | A11y |
| R-P3-04 | Performance N+1 not measured on all catalog paths | Performance |

---

## Risk Counts

| Severity | Count |
|----------|-------|
| P0 | 0 |
| P1 | 5 |
| P2 | 8 |
| P3 | 4 |

---

## Open Issues from Part 10 (Re-tested)

| Issue | Re-test Result |
|-------|----------------|
| Full browser checkout E2E | **DEFERRED** — not resolved |
| 320px horizontal overflow | **DEFERRED** — not resolved |
| Live Render verification | **DEFERRED** — not resolved |

---

## Safety Controls Verified

- `BUZZARD_SALES_ENABLED=0` ✓
- Go-live lock active ✓
- Commercial checkout blocked ✓
- Supplier orders blocked (commerce) ✓
- Mock payment only ✓
- Price/coupon tampering blocked ✓
- IDOR cart denied ✓
- Admin RBAC enforced ✓

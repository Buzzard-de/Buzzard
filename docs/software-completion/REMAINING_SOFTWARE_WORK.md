# Remaining Software Work

Independent of BLOCKED externals. Do not treat this as a feature backlog of new products.

## CRITICAL

None that currently stop isolated software tests. Sales lock, ACTIVE reject, and Guardian deny are in place.

## HIGH

1. Full admin/Control Center click-through: bind remaining display-only screens to real APIs or mark them inert.
2. Returns financial consistency (customer refund vs supplier receivable) beyond mock payment safety.
3. Frontend dependency CVEs (Next/sharp/vitest) — needs a planned upgrade, not `audit fix --force`.
4. Storefront e2e on desktop + mobile + RTL overflow (Playwright / browser). Not done this session.
5. Broader API contract tests (auth, rate limit, error shape) beyond the new health routes.

## MEDIUM

1. Search: wire `software.searchCatalog` to the real catalog index; keep empty/invalid query behavior.
2. WMS `reserveInventory` vs `software.inventory.reserve` — two reservation tables; document operator path and eventually share events.
3. Returns RMA + order engine state machine integration tests.
4. Supplier feed validation (CSV/XML) on fixtures, still mock.
5. Observe GitHub Actions for `test:software` on the PR.

## LOW

1. Contact form time-trap (pre-existing security warning).
2. Reduce duplicate marketplace list sources (`marketplaceHub` 4 channels vs software 11 classified).
3. Voice Python leftovers: keep or quarantine so operators do not assume live telephony.

## Explicitly out of scope here

- €0.10 undercut rule.
- Opening sales.
- Activating Product SoT.
- Inventing catalog images or live prices.
- Production deploy or production DB changes.

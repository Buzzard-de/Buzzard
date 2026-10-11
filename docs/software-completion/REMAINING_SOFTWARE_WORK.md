# Remaining Software Work

Independent of BLOCKED externals. Do not treat this as a feature backlog of new products.

## CRITICAL

None that currently stop isolated software tests. Sales lock, ACTIVE reject, and Guardian deny are in place.

## HIGH

1. Admin Control Center and Sessions in a **session-aware** browser (Next or authenticated static). On static `:3040` both pages re-show the login form after a successful dashboard login. Not verified.
2. Returns financial consistency (customer refund vs supplier receivable) beyond mock payment safety.
3. Frontend dependency CVEs (Next/sharp/vitest) — needs a planned upgrade, not `audit fix --force`.
4. CI `quality` does not run `test:unit` or Playwright. Local 713 and 18 homepage tests are not GitHub-proven.
5. Broader API contract tests (auth, rate limit, error shape) beyond health + commerce e2e.
6. Local SQLite contains public PIM rows. Catalog-mode is on and sales are off; operators must not read that as “0 public products in every environment”.

## MEDIUM

1. Search: wire `software.searchCatalog` to the real catalog index; keep empty/invalid query behavior. Mobile search → `/products/?q=` was Playwright-verified; the software helper remains isolated.
2. WMS `reserveInventory` vs `software.inventory.reserve` — two reservation tables; document operator path and eventually share events.
3. Returns RMA + order engine state machine integration tests.
4. Supplier feed validation (CSV/XML) on fixtures, still mock.
5. `customer-journey` and `admin-pim-core` Playwright projects were not used as proof this session.
6. Arabic homepage does not show the German photo band (expected locale-specific). Confirm that is intentional for every RTL market.

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
- Auto-merging PR #425 or #426.

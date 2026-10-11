# Remaining Software Work

Independent of BLOCKED externals. Do not treat this as a feature backlog of new products.

## CRITICAL

None that currently stop isolated software tests or the observed `7f81585` CI jobs. Sales lock, ACTIVE reject, and Guardian deny remain in place.

## HIGH

1. Admin Control Center, Sessions, and PIM Core in a **session-aware** browser (Next runtime, not only static export). On static `:3040` those pages re-show the login form. APIs work with bearer.
2. Frontend dependency CVEs (Next/sharp/vitest) — needs a planned upgrade, not `audit fix --force`.
3. Broader API contract tests (auth, rate limit, error shape) beyond health + commerce e2e.
4. Local SQLite contains public PIM rows. Catalog-mode is on and sales are off; operators must not read that as “0 public products in every environment”.

## MEDIUM

1. Full `customer-journey` checkout UI (product → cart → checkout form) was not executed. Homepage + warenkorb page loads passed.
2. WMS `reserveInventory` vs `software.inventory.reserve` — two reservation tables; document operator path and eventually share events.
3. Supplier feed validation (CSV/XML) on fixtures, still mock.
4. Arabic homepage does not show the German photo band (expected locale-specific). Confirm that is intentional for every RTL market.
5. Authenticated admin Playwright still depends on a rebuilt static export with `NEXT_PUBLIC_BUZZARD_API_URL` plus runtime override. A Next server would be the honest Control Center proof.

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

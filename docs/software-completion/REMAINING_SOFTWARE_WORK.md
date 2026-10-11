# Remaining Software Work

Independent of BLOCKED externals. Do not treat this as a feature backlog of new products.

## CRITICAL

None that currently stop isolated software tests. Sales lock, ACTIVE reject, and Guardian deny remain in place. CI on code HEAD `a26b51d` run 38153709074 is quality + e2e-storefront + e2e-admin SUCCESS. CI for the subsequent gap-close/docs commit is pending until observed.

## HIGH

1. Live external credentials and a separately approved probe. See `EXTERNAL_CONFIGURATION_CHECKLIST.md`.
2. Frontend dependency CVEs (Next/sharp/vitest) — needs a planned upgrade, not `audit fix --force`.
3. Local SQLite can contain leftover public PIM rows and draft hashes. Catalog-mode is on and sales are off; operators must not read that as “0 public products in every environment”.

## MEDIUM

1. Full `customer-journey` checkout form is not executable while sales are locked. Catalog/blocked path is the truthful path.
2. WMS `reserveInventory` and `software.inventory.reserve` remain two tables. They now share an audit event; they do not share reservation authority.
3. Supplier feed validation is fixture/dry-run only. Live fetch stays BLOCKED.
4. Arabic homepage does not show the German photo band (expected locale-specific).
5. Authenticated admin Playwright still uses static export + runtime API override, not a Next server.
6. Marketplace channels without an existing module (OTTO, eMAG, Skroutz, bol.com, Cdiscount) are classification-only. Do not treat them as live adapters.

## LOW

1. Contact form time-trap (pre-existing security warning).
2. Reduce duplicate marketplace list sources (`marketplaceHub` vs software classification).
3. Voice Python leftovers: keep or quarantine so operators do not assume live telephony.

## Explicitly out of scope here

- €0.10 undercut rule.
- Opening sales.
- Activating Product SoT.
- Inventing catalog images or live prices.
- Production deploy or production DB changes.
- Auto-merging PR #425 or #426.

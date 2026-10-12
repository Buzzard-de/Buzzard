# Remaining Software Work

Independent of BLOCKED externals. Do not treat this as a feature backlog of new products.

## CRITICAL

None that currently stop isolated software tests. Sales lock, ACTIVE reject, and Guardian deny remain in place. Product SoT is still inactive. Remaining master writer: `productStore.upsertProduct`. Search index, seed(), and catalogProductSync are not master-authoring paths. Local suites after phase 3: software 64/64, AI 58/58, unit 775/775. Push/CI were not authorized.

## HIGH

1. Live external credentials and a separately approved probe. See `EXTERNAL_CONFIGURATION_CHECKLIST.md`.
2. Remaining frontend audit: eslint-config-next → braces/micromatch (dev-only). Vitest 5, postcss, and sharp remediations are in. Do not `audit fix --force`.
3. Local SQLite can contain leftover public PIM rows and draft hashes. Catalog-mode is on and sales are off; operators must not read that as “0 public products in every environment”.

## MEDIUM

1. Full `customer-journey` checkout form is not executable while sales are locked. Catalog/blocked path is the truthful path.
2. WMS `reserveInventory` and `software.inventory.reserve` remain two tables. They now share an audit event; they do not share reservation authority.
3. Supplier feed validation is fixture/dry-run only. Live fetch stays BLOCKED.
4. Arabic homepage does not show the German photo band (expected locale-specific).
5. Authenticated admin Playwright still uses static export + runtime API override, not a Next server.
6. Marketplace channels without an existing module (OTTO, eMAG, Skroutz, bol.com, Cdiscount) are classification-only. Do not treat them as live adapters.

## LOW

1. Reduce duplicate marketplace list sources (`marketplaceHub` vs software classification).
2. Voice Python leftovers: keep or quarantine so operators do not assume live telephony.

## Explicitly out of scope here

- €0.10 undercut rule.
- Opening sales.
- Activating Product SoT.
- Inventing catalog images or live prices.
- Production deploy or production DB changes.
- Auto-merging PR #425 or #426.

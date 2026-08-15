# BUZZARD Master Taxonomy Unification MAXIMAL

Unifies Shop (41-root `cat-*`) and Intelligence (43-root `01`/`intelligence.*`) taxonomies under a single canonical `bz.*` system.

## Rules

- **43 canonical roots** (`bz.01` … `bz.43`)
- Legacy IDs are **not deleted** — alias mapping links them to canonical IDs
- Shop `cat-05-03` resolves via root `cat-05` → `shop-05` → `bz.05`
- Intelligence `01` / `01.01.01` resolves via `intelligence.01` → `bz.01`

## CLI

```bash
cd intelligence
python3 main.py complete-taxonomy-unify-status
python3 main.py complete-taxonomy-unify-resolve --legacy-id cat-01 --system shop
python3 main.py complete-taxonomy-unify-docs
```

## API

- `GET /taxonomy/status` — unification status
- `GET /taxonomy/canonical/roots` — 43 canonical roots
- `GET /taxonomy/canonical/{id}` — node + children + path
- `GET /taxonomy/resolve?legacy_id=cat-01&system=shop` — alias resolution
- `GET /taxonomy/aliases?system=shop` — full alias table

Node API mirrors the same paths under `/api/taxonomy/*`.

## Database migration

See `master_taxonomy/docs/MIGRATION.sql` — import `category_id_mapping.csv` into `buzzard_category_alias` before remapping products.

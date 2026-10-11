# Database and Migrations

Production database was **not** migrated. Tests use the process SQLite (`BUZZARD_DB_PATH` isolated for restart proofs). Live local API this session used `/workspace/server/data/buzzard.db` in development_default mode (`persistent: false` on `/api/health`). That is not Render disk.

## Additive migration

`migrateSoftwareCompletion()` in `server/lib/db.js` calls `server/lib/software/schema.js`.

Tables (all `CREATE TABLE IF NOT EXISTS`):

| Table | Purpose | Integrity |
| --- | --- | --- |
| `software_inventory_sources` | Source + freshness metadata | sku index |
| `software_reservations` | Isolated reservations | unique idempotency key (partial) |
| `software_reservation_events` | History | FK to reservations |
| `software_shipments` | Tracking | unique tracking number; customer + order indexes |
| `software_shipment_events` | Carrier-normalized events | FK to shipments |
| `software_audit` | Software-layer audit | kind index; safe customer workflow writes `safe_customer_workflow` |
| `software_return_ledger` | Customer refund vs supplier credit | executed flags default 0; `assumed_supplier_will_reimburse` default 0 |
| `software_message_drafts` | Customer communication drafts | unique `input_hash`; `sent` default 0 |

Foreign keys: `PRAGMA foreign_keys = ON` already set in `db.js`.

## Existing Pusat / commerce schema

Unchanged except that software migration runs after `migrateCoreFoundationPusat()`. Pusat tables (`core_ai_memory`, `core_ai_exceptions`, `core_ai_task_meta`, approval columns) remain the AI persistence path. Memory is **not** moved to `/tmp`.

Local catalog note: this development SQLite has public PIM rows. Demo SKU `BZ-CORE-DEMO-001` is not storefront-visible. CI runners do **not** have those leftover public rows. Cart/checkout unit tests now seed an isolated READY/PUBLIC `UNIT-CART-*` fixture instead of assuming catalog contents. The fixture is never ACTIVE.

## Rollback strategy (not executed)

Software tables are additive. Rollback is `DROP TABLE` of the eight names above. No existing column was removed. No production apply.

## Tests

- Schema is created by `software.initialize(db)` in `test:software`.
- Transaction rollback: reserve inside `db.transaction` then throw → zero leftover rows (scenario 24).
- Cross-process: child process with `BUZZARD_DB_PATH` reads shipment written by another PID (scenarios 8–9).
- Idempotent reserve: same `idempotency_key` returns the same row (scenario 25).
- Returns ledger: supplier credit REJECTED does not imply customer refund executed (scenario 26).

## Production

`PRODUCTION_VERIFIED` is false. Render disk / live `buzzard.db` was not opened. `BUZZARD_DB_PATH` production path was not changed.

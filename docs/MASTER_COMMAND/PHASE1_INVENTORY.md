# Phase 1 — Inventory (Europe/Berlin)

**Git at start of this work**

- Working branch created: `cursor/master-ecosystem-c293`
- Branched from: `origin/cursor/pusat-idempotency-c293` @ `67d82d41` (Pusat read-only dispatch + durable idempotency)
- Prior session branch (not used as base): `cursor/api-speed-max-c293` @ `ee2ee8fc` (search cache/WAL; PR #491 unmerged)
- Sales / payments env flags: unset (catalog mode)
- Production restore guard: `scripts/restore-db.mjs` refuses `/var/data` and `NODE_ENV=production` without `BUZZARD_ALLOW_PRODUCTION_RESTORE=1`

## Existing architecture (do not rewrite)

| Area | What already exists | Gap vs master command |
| --- | --- | --- |
| API / SQLite | `server/` + Render disk `/var/data` | Single instance, no proven offsite |
| Backup | `backupAutomation.js`, `db-backup.mjs`, `restore-db.mjs`, `restoreSafety.js` | One disk family, no 3-2-1-1-0 prove |
| Pusat | `server/lib/pusat/runtime.js` read-only, flag `PUSAT_RUNTIME_ENABLED` | No council / meetings / memories |
| AI employees | `DEFAULT_AI_EMPLOYEES` in `server/core/constants.js` | Generic roles, no Doğu/Esat/category experts on Node path |
| Intelligence Python | `intelligence/buzzard_ai_complete` (Doğu, Esat, council zips) | Parallel stack, not wired as production runtime |
| Tax | `taxProvider.js` 8 countries, dry-run | Not AB27, no Tax Connect |
| Locales on this base | `de en tr ar` + RTL for `ar` | 30-locale work lives on other branches, not this base |
| Master categories | 48 nodes in `data/taxonomy/buzzard_master_48_main_categories_de.json` | Command asked for 50; **48 tree is preserved** |
| Voice | `package.json` `buzzard:voice` / `Buzzard/voice.py` | No SIP account in this environment |
| Providers | Stub default; OpenAI/Anthropic/Google listed but unwired | Must stay disconnected from production AI |

## Safety rules applied

- No production DB restore
- No secrets committed
- No customer/order/payment deletes
- No paid purchases
- Push/merge/deploy/sales left `NEEDS_APPROVAL` (feature branch PR is review-only)

## Rollback

- Feature branch only. Revert = delete branch or revert commit. Live Render/Pages unchanged until merge.

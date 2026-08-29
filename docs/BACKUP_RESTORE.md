# Backup & Restore

## Strategy

| Component | Method | Script |
|-----------|--------|--------|
| SQLite (Buzzard API) | File copy | `npm run db:backup` |
| KI snapshots | Python backup | `npm run backup:ki` |
| Taxonomy artifacts | Git + publish | `npm run publish:taxonomy` |

## Restore (safe test environment)

1. Stop API server
2. Copy backup over `server/data/buzzard.db` (or configured DB path)
3. Restart API and run `npm run test:smoke`

## Integrity check

After restore:

```bash
npm run test:unit
npm run test:part8
npm run test:part10
npm run test:production-safety
```

## RPO / RTO

**TBD** — production targets not yet defined. Document actual Render disk persistence requirements before go-live.

## Render persistence

SQLite on Render requires a **persistent disk** attached to `buzzard-api`. Ephemeral filesystem loses data on redeploy. Verify disk mount in Render dashboard before commercial activation.

## Do not

- Run destructive restore against production without approval
- Enable sales during restore testing

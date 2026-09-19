# BUZZARD Human External Actions

1. **Render** — Create/mount Persistent Disk on buzzard-api — path /var/data, size ≥ 1 GB
   - Why: Production SQLite requires Render persistent volume
   - Verify: Deploy, then GET /api/health/db → persistent=true, path /var/data/buzzard.db

2. **Render** — Deploy buzzard-api after disk mount and env BUZZARD_DB_PATH / BUZZARD_BACKUP_DIR
   - Why: Blueprint env vars must apply to running service
   - Verify: GET /api/health/db on production URL

2. **Inter Cars** — Configure SUPPLIER_LIVE_CREDENTIALS_SECRET_REF and complete B2B/OAuth2 production access
   - Why: Supplier production network blocked without credentials
   - Verify: Stage A read-only validation + #342 human approval

3. **Render** — Verify /api/health/db (persistent=true, /var/data/buzzard.db) and register RENDER_LIVE evidence
   - Why: Control center only accepts explicit external evidence
   - Verify: Operator-run curl + evidence registration (no auto-fetch in CI)

4. **Render** — Run npm run backup:db on production instance; store backup artifact reference
   - Why: Backup path /var/data/backups must be proven with RENDER_BACKUP evidence
   - Verify: Artifact reference + metadata hash (no DB file in git)

5. **Render** — Manual production restart; re-check /api/health/db; register RENDER_RESTART_PERSISTENCE evidence
   - Why: Cursor cannot trigger production restart — operator must verify same DB path after restart
   - Verify: before/after health + integrity ok + samePersistentPath

16. **Platform** — Configure SUPPLIER_LIVE_CREDENTIALS_SECRET_REF for Inter Cars
   - Why: From external access preflight SSOT
   - Verify: Operator confirmation

17. **Platform** — Configure Render persistent disk mount at /var/data
   - Why: From external access preflight SSOT
   - Verify: Operator confirmation

18. **Platform** — Complete blocked step: EXTERNAL CREDENTIALS
   - Why: From external access preflight SSOT
   - Verify: Operator confirmation

19. **Platform** — Run Stage A read-only Inter Cars validation after credentials
   - Why: From external access preflight SSOT
   - Verify: Operator confirmation

20. **Platform** — Obtain four-eyes human approval for #342–#346 chain
   - Why: From external access preflight SSOT
   - Verify: Operator confirmation

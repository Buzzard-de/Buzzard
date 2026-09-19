# BUZZARD Human External Actions

1. **Render** — Create/mount Persistent Disk at /var/data (1 GB) and sync Blueprint
   - Why: Required for production SQLite persistence
   - Verify: GET /api/health/db → persistent=true, path /var/data/buzzard.db

2. **Inter Cars** — Configure SUPPLIER_LIVE_CREDENTIALS_SECRET_REF and complete B2B/OAuth2 production access
   - Why: Supplier production network blocked without credentials
   - Verify: Stage A read-only validation + #342 human approval

12. **Platform** — Configure SUPPLIER_LIVE_CREDENTIALS_SECRET_REF for Inter Cars
   - Why: From external access preflight SSOT
   - Verify: Operator confirmation

13. **Platform** — Configure Render persistent disk mount at /var/data
   - Why: From external access preflight SSOT
   - Verify: Operator confirmation

14. **Platform** — Complete blocked step: EXTERNAL CREDENTIALS
   - Why: From external access preflight SSOT
   - Verify: Operator confirmation

15. **Platform** — Run Stage A read-only Inter Cars validation after credentials
   - Why: From external access preflight SSOT
   - Verify: Operator confirmation

16. **Platform** — Obtain four-eyes human approval for #342–#346 chain
   - Why: From external access preflight SSOT
   - Verify: Operator confirmation

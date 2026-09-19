# BUZZARD Human External Actions

1. **Render** — Create/mount Persistent Disk on buzzard-api — path /var/data, size ≥ 1 GB
   - Why: Production SQLite requires Render persistent volume
   - Verify: Deploy, then GET /api/health/db → persistent=true, path /var/data/buzzard.db

1. **Inter Cars** — Configure Inter Cars Production SecretRef (SUPPLIER_LIVE_CREDENTIALS_SECRET_REF)
   - Why: Production API access requires operator-provided credentials
   - Verify: Secret ref present without exposing values in repo

2. **Render** — Deploy buzzard-api after disk mount and env BUZZARD_DB_PATH / BUZZARD_BACKUP_DIR
   - Why: Blueprint env vars must apply to running service
   - Verify: GET /api/health/db on production URL

3. **Render** — Verify /api/health/db (persistent=true, /var/data/buzzard.db) and register RENDER_LIVE evidence
   - Why: Control center only accepts explicit external evidence
   - Verify: Operator-run curl + evidence registration (no auto-fetch in CI)

4. **Render** — Run npm run backup:db on production instance; store backup artifact reference
   - Why: Backup path /var/data/backups must be proven with RENDER_BACKUP evidence
   - Verify: Artifact reference + metadata hash (no DB file in git)

4. **Inter Cars** — Keep SUPPLIER_ORDER_NETWORK_ENABLED=0 until #342–#346 gates complete
   - Why: Order network must remain off during preparation
   - Verify: Environment flags

5. **Render** — Manual production restart; re-check /api/health/db; register RENDER_RESTART_PERSISTENCE evidence
   - Why: Cursor cannot trigger production restart — operator must verify same DB path after restart
   - Verify: before/after health + integrity ok + samePersistentPath

20. **RENDER** — Create/mount Persistent Disk on buzzard-api — path /var/data, size ≥ 1 GB
   - Why: RENDER: CONFIGURED / live=UNVERIFIED_EXTERNAL
   - Verify: Operator-run provider validation + evidence registration

21. **INTER_CARS** — Configure Inter Cars Production SecretRef (SUPPLIER_LIVE_CREDENTIALS_SECRET_REF)
   - Why: SUPPLIER: NOT_CONFIGURED / live=BLOCKED_EXTERNAL_ACCESS
   - Verify: Operator-run provider validation + evidence registration

22. **PAYMENT** — Configure payment provider SecretRef + KYC/webhooks
   - Why: PAYMENT: NOT_CONFIGURED / live=UNVERIFIED_EXTERNAL
   - Verify: Operator-run provider validation + evidence registration

23. **CARRIER** — Configure carrier account SecretRef; validate API read-only — no labels
   - Why: CARRIER: NOT_CONFIGURED / live=UNVERIFIED_EXTERNAL
   - Verify: Operator-run provider validation + evidence registration

24. **DHL** — Carrier DHL: credentials + live validation before labels
   - Why: CARRIER: NOT_CONFIGURED / live=UNVERIFIED_EXTERNAL
   - Verify: Operator-run provider validation + evidence registration

25. **DPD** — Carrier DPD: credentials + live validation before labels
   - Why: CARRIER: NOT_CONFIGURED / live=UNVERIFIED_EXTERNAL
   - Verify: Operator-run provider validation + evidence registration

26. **GLS** — Carrier GLS: credentials + live validation before labels
   - Why: CARRIER: NOT_CONFIGURED / live=UNVERIFIED_EXTERNAL
   - Verify: Operator-run provider validation + evidence registration

27. **UPS** — Carrier UPS: credentials + live validation before labels
   - Why: CARRIER: NOT_CONFIGURED / live=UNVERIFIED_EXTERNAL
   - Verify: Operator-run provider validation + evidence registration

28. **DHL_EXPRESS** — Carrier DHL_EXPRESS: credentials + live validation before labels
   - Why: CARRIER: NOT_CONFIGURED / live=UNVERIFIED_EXTERNAL
   - Verify: Operator-run provider validation + evidence registration

29. **RETURNS** — Configure returns/refunds SecretRef; customer refund vs supplier credit remain separate
   - Why: RETURNS: NOT_CONFIGURED / live=UNVERIFIED_EXTERNAL
   - Verify: Operator-run provider validation + evidence registration

30. **REFUNDS** — No automatic refunds — production evidence required per provider
   - Why: RETURNS: NOT_CONFIGURED / live=UNVERIFIED_EXTERNAL
   - Verify: Operator-run provider validation + evidence registration

31. **AMAZON** — Marketplace credentials + dry-run only until explicit live evidence
   - Why: MARKETPLACE: NOT_CONFIGURED / live=UNVERIFIED_EXTERNAL
   - Verify: Operator-run provider validation + evidence registration

32. **EBAY** — Marketplace credentials + dry-run only until explicit live evidence
   - Why: MARKETPLACE: NOT_CONFIGURED / live=UNVERIFIED_EXTERNAL
   - Verify: Operator-run provider validation + evidence registration

33. **KAUFLAND** — Marketplace credentials + dry-run only until explicit live evidence
   - Why: MARKETPLACE: CONFIGURED / live=UNVERIFIED_EXTERNAL
   - Verify: Operator-run provider validation + evidence registration

34. **ALLEGRO** — Marketplace credentials + dry-run only until explicit live evidence
   - Why: MARKETPLACE: NOT_CONFIGURED / live=UNVERIFIED_EXTERNAL
   - Verify: Operator-run provider validation + evidence registration

35. **BOL.COM** — Marketplace credentials + dry-run only until explicit live evidence
   - Why: MARKETPLACE: NOT_CONFIGURED / live=UNVERIFIED_EXTERNAL
   - Verify: Operator-run provider validation + evidence registration

36. **CDISCOUNT** — Marketplace credentials + dry-run only until explicit live evidence
   - Why: MARKETPLACE: NOT_CONFIGURED / live=UNVERIFIED_EXTERNAL
   - Verify: Operator-run provider validation + evidence registration

37. **OTTO** — Marketplace credentials + dry-run only until explicit live evidence
   - Why: MARKETPLACE: NOT_CONFIGURED / live=UNVERIFIED_EXTERNAL
   - Verify: Operator-run provider validation + evidence registration

38. **TEST AMAZON** — Marketplace credentials + dry-run only until explicit live evidence
   - Why: MARKETPLACE: CONFIGURED / live=UNVERIFIED_EXTERNAL
   - Verify: Operator-run provider validation + evidence registration

39. **TEST EBAY** — Marketplace credentials + dry-run only until explicit live evidence
   - Why: MARKETPLACE: CONFIGURED / live=UNVERIFIED_EXTERNAL
   - Verify: Operator-run provider validation + evidence registration

40. **TEST KAUFLAND** — Marketplace credentials + dry-run only until explicit live evidence
   - Why: MARKETPLACE: CONFIGURED / live=UNVERIFIED_EXTERNAL
   - Verify: Operator-run provider validation + evidence registration

41. **AI** — AI provider SecretRef — no secrets in AI context; production network off
   - Why: AI: NOT_CONFIGURED / live=UNVERIFIED_EXTERNAL
   - Verify: Operator-run provider validation + evidence registration

42. **GOOGLE_ADS** — Marketing spend OFF — configure account only, no campaign activation
   - Why: MARKETING: NOT_CONFIGURED / live=UNVERIFIED_EXTERNAL
   - Verify: Operator-run provider validation + evidence registration

# Disaster Recovery runbook (targets only)

**Status:** CODE = this runbook. TEST = isolated SQLite drill **already exists** (`ISOLATED_RESTORE_TESTED`). INTEGRATION = not production. LIVE = **no**. SECURITY = no production restore executed.  
**Date:** 8 November 2026, Europe/Berlin  
**Budget:** 0 EUR. **No backup service was purchased. No production backup was taken. No backup was deleted. No production restore.**

3-2-1-1-0 is a **target**, not a measured property of Buzzard today.

## 1. What must be recoverable

| Set | Examples | Current evidence | Target copies |
| --- | --- | --- | --- |
| Source code | git remotes | GitHub; this workspace | 2 remotes + offline clone |
| App DB | `buzzard.db` / Render disk | `backupAutomation.js` local dir default `/var/data/backups` | 3-2-1-1-0 **unmet** |
| Catalog / PIM | product tables, taxonomy JSON | in repo + DB | same as DB + git for JSON |
| Orders / payments / returns | commerce tables | fail-closed live | restore **then** reconcile; do not auto-capture |
| Customers / suppliers | CRM / supplier tables | PII | encrypted, access-logged |
| Tax / finance | taxPools (in-memory today), journals | **pools are not durable** | durable ledger required before LIVE |
| Config | env, egress JSON | git + secrets store | secrets **not** in git |
| Secrets / certs | Stripe (disabled), TLS | unknown operator vault | separate keys from backup ciphertext |
| AI memory | Native namespaces | local process/sqlite patterns | per-agent, not mixed |
| Audit / evidence | CEARS + locker (design) | not built | append-only + offline |
| Guardian sqlite | `buzzard_guardian.sqlite3` | **local untracked; do not delete** | operator-owned; not this runbook’s toy drill |

## 2. 3-2-1-1-0 target (not implemented)

| Digit | Meaning | Buzzard today |
| --- | --- | --- |
| 3 | three copies | unproven |
| 2 | two media | unproven |
| 1 | one offsite | unproven |
| 1 | one offline / air-gapped | unproven |
| 0 | zero errors after restore test | **only isolated toy DB** |

Immutable: object-lock / WORM hardware **absent**. Do not call HMAC or git “immutable backup”.

## 3. Proposed RPO / RTO (**targets**, not SLO)

| Class | RPO target | RTO target | Notes |
| --- | --- | --- | --- |
| P0 payments/orders | ≤ 15 min | ≤ 4 h to **read-only** catalog | money movement stays off until recon |
| P1 catalog/PIM | ≤ 1 h | ≤ 8 h | — |
| P2 CMS/docs | ≤ 24 h | ≤ 24 h | — |
| AI memory | ≤ 24 h | best effort | not LIVE agents |

These numbers are **planning values**. They have not been measured on production.

## 4. Recovery sequence (when a human authorizes production restore)

1. Declare incident (CEARS P0/P1). Human ACK.  
2. Freeze writes / keep sales **off**.  
3. Preserve evidence (locker design) — **copy**, do not “fix in place”.  
4. Malware scan **clean-room** host (not the possibly infected disk).  
5. Restore **offline** copy first; verify SHA-256.  
6. Restore order: empty schema → catalog → customers/suppliers → orders → payments ledger → returns → tax journal → AI memory → audit.  
7. Integrity: row counts, FK checks, payment vs order vs return **tie-out**. Mismatch → stay read-only.  
8. Staged re-entry: health → catalog read → checkout **dry-run** → human enable flags.  
9. Never auto-enable Stripe/PayPal/sales.

**This sequence was not executed.**

## 5. Isolated test that already exists

`server/lib/survival/isolatedDisasterDrill.js` — synthetic SQLite, never `/var/data` or live `buzzard.db`. Result must stay `ISOLATED_RESTORE_TESTED`, never `PRODUCTION_DR_VERIFIED`.

## 6. Acceptance tests (runbook — for a future approved drill)

1. Isolated drill still passes without touching guardian sqlite.  
2. Production restore blocked without `HUMAN_RESTORE_APPROVED`.  
3. Checksums documented.  
4. Order/payment/return recon report produced.  
5. Sales flags remain off.  
6. Egress DENY unchanged after restore.  
7. Secrets restored from a **separate** key, not from the DB file.

## 7. Encryption keys

Backup ciphertext and decryption keys must not share the same disk. **Not configured here.**

## 8. Honest status

Finding `backupAutomation.js` or a `.db` file does **not** mean disaster recovery works.

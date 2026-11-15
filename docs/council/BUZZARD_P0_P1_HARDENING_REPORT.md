# Buzzard P0/P1 Hardening Report

**Date:** 8 November 2026, 21:20 Europe/Berlin  
**SoT audit:** `docs/council/BUZZARD_MASTER_FULL_SYSTEM_AUDIT_REPORT.md` @ `97240313`  
**Branch:** `cursor/buzzard-p0-p1-hardening-c293` (isolated; **not pushed**)  
**Parent:** `97240313` on `cursor/buzzard-master-audit-report-c293` (itself from 17-agent `674d9152`)  
**Budget:** 0 EUR. No merge of PR #492. No rebase onto `origin/main`. No deploy. No production restore. Egress DENY unchanged.

This work is a **safe base**, not a live system.

---

## A. Değiştirilen dosyalar

| File | Change |
| --- | --- |
| `server/lib/buzzardNative/core/councilAliasMap.js` | **new** alias map + `resolveIdentity` |
| `server/lib/buzzardNative/core/identityRegistry.js` | official display names; re-export resolve; **SEED_IDS unchanged** |
| `server/lib/buzzardNative/core/permissionEngine.js` | alias → permission profile; unknown / members-only reject |
| `server/lib/buzzardNative/core/taskRouter.js` | alias assign to native id without merging records |
| `server/lib/pusat/council.js` | MEMBERS **ids kept**; display names; `aliasOfNative` on dual ids |
| `server/__tests__/buzzardNativeCouncilAlias.test.mjs` | **new** acceptance tests (5) |
| `server/__tests__/buzzardNative17AgentCouncil.test.mjs` | expected UI names → Çakır/Pelin/Akın/Yılmaz/Sencer |
| `docs/council/CEARS_ARCHITECTURE.md` | **new** design |
| `docs/council/DIGITAL_EVIDENCE_LOCKER_DESIGN.md` | **new** design |
| `docs/MASTER_COMMAND/SPECIAL_16_EGRESS_NON_NODE_PYTHON_INVENTORY.md` | **new** inventory |
| `docs/MASTER_COMMAND/DISASTER_RECOVERY_RUNBOOK.md` | **new** targets-only runbook |
| `docs/council/BUZZARD_P0_P1_HARDENING_REPORT.md` | this file |

---

## B. Korunan dosyalar

- `buzzard_guardian.sqlite3` (+ shm/wal) — untracked, **not** opened, moved, or deleted (90112 bytes, mtime 5 Nov 2026)  
- `data/security/egress_policy.v1.json` — still `"default": "DENY"`  
- Native `SEED_IDS` / `ORIGINAL_10_IDS`  
- Official Sinan m4a (not copied)  
- PR #492, `origin/main`, 17-agent branch pointer  
- Commerce engines **not** rewritten  

---

## C. Yeni branch ve commit

- Branch: `cursor/buzzard-p0-p1-hardening-c293`  
- Rollback: `git checkout cursor/buzzard-master-audit-report-c293` (or 17-agent `674d9152`)  
- Push: **not performed** (human rule)

---

## D. Alias uyumluluk sonuçları

| Alias | Native | Memory merged? | Task assign | Permissions |
| --- | --- | --- | --- | --- |
| `customs_ai` | `tuncay_bey` | **no** (`memoryOwnerId` stays alias) | → `tuncay_bey` | CUSTOMS_READ allow; FILE_DECLARATION gated |
| `phone_ai` | `zeynep_hanim` | no | → `zeynep_hanim` | PHONE_LIVE_CALL gated |
| `price_ai` | `pricing_ai` | no | → `pricing_ai` | PRICE_PUBLISH_LIVE gated |
| `customer_ai` | `banu_hanim` | no | → `banu_hanim` | CUSTOMER_REFUND gated |
| `stock_ai` / `category_ai` / `pricing_ai` / `seo_ai` / `sales_analysis_ai` | same native string | n/a | native | STOCK_BUY etc. gated |
| `finance_ai`, `nesrin_hanim`, category experts | **not** folded into 17 | — | `NOT_NATIVE_SEED` | same |
| unknown | reject | — | `UNKNOWN_AGENT` | `UNKNOWN_IDENTITY` |

`getAgent("customs_ai")` remains **null**. Dual MEMBERS row kept. **identitiesMerged: false**.

---

## E. 17 AI isim doğrulaması

| Native id | Official display |
| --- | --- |
| pusat | Pusat |
| sinan_bey | Sinan Bey |
| esat_bey | Esat Bey |
| dogu_bey | Doğu Bey |
| nedim_bey | Nedim Bey |
| tuncay_bey | Tuncay Bey |
| stock_ai | Çakır Bey |
| category_ai | Pelin Hanım |
| pricing_ai | Akın Bey |
| seo_ai | Yılmaz Bey |
| banu_hanim | Banu Hanım |
| sales_analysis_ai | Sencer Bey |
| zeynep_hanim | Zeynep Hanım |
| amelia, adrian, mira, leon | Amelia, Adrian, Mira, Leon |

Generic “Stok AI / Kategori AI / …” **removed** from Native `display_name` and overlapping MEMBERS `name`.

---

## F. CEARS tasarım durumu

| CODE | TEST | INTEGRATION | LIVE | SECURITY |
| --- | --- | --- | --- | --- |
| document `docs/council/CEARS_ARCHITECTURE.md` | no pager test | not wired | **no** | no auto-notify |

---

## G. Digital Evidence Locker tasarım durumu

| CODE | TEST | INTEGRATION | LIVE | SECURITY |
| --- | --- | --- | --- | --- |
| document only | no ingest | none | **no** | no export; HMAC ≠ signature ≠ WORM |

---

## H. Egress eksik erişim yolları

See `docs/MASTER_COMMAND/SPECIAL_16_EGRESS_NON_NODE_PYTHON_INVENTORY.md`. Highest remaining gaps:

- Python `urllib.request.urlopen` in research/preflight (**no** `guarded_get`)
- Node `scripts/*` raw `fetch`
- `child_process` spawn/exec (git, nvidia-smi, backup, production-guard)
- npm/pip/CI
- Job runners not universally gated
- Host firewall / Render WAF **unverified**

4.4 Node **11/11**, Python **6/6** (not 30/30). Policy DENY not loosened.

---

## I. DR runbook durumu

`docs/MASTER_COMMAND/DISASTER_RECOVERY_RUNBOOK.md` — targets and sequence only. Isolated drill unchanged. **Not** PRODUCTION_DR_VERIFIED.

---

## J. Test sonuçları (8 Nov 2026, ~21:19 Europe/Berlin)

| Suite | Result |
| --- | --- |
| New alias tests | **5/5** |
| 17-agent | **3/3** |
| 10-agent | **7/7** |
| Foundation | **7/7** |
| egress44 + special16 + idempotency + above | **7 files, 45 passed** (40 prior + 5 alias) |
| Phase 5–18 + handoff + runtime | **45/45** |
| Python egress | **6/6** |
| Live HTTP / WAF / phone | **not run** |

---

## K. Güvenlik riskleri (still open)

1. Unguarded Python urllib and Node scripts.  
2. Dual registries still two objects (by design) — callers that ignore `resolveIdentity` can still show stale logic.  
3. CEARS/locker are paper.  
4. DR 3-2-1-1-0 unmet.  
5. `origin/main` 183-commit divergence untouched.  
6. PR #492 Taxonomy Sync FAILURE untouched.

---

## L. İnsan onayı gereken işlemler

Push of this branch; merge; PR #492; deploy; production backup/restore; egress allowlist; live notify; evidence export; sales/payments; voice clone; any EUR spend.

---

*Sinan Bey: alias layer is CODE+TEST locally. CEARS, locker, DR, and host egress remain not LIVE.*

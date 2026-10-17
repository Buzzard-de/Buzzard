# Buzzard — Phase 1 Execution Checklist

Date: 2026-10-16  
SHA to use: `b9d3ae835fdf0e31b1815dc577d6b98b07a1ce54`  
Branch: `cursor/software-completion-local-c293`  
This agent: **inspection/planning only**. No PR, retarget, merge, push, deploy, production access, paid APIs, sales/payments/SoT.

Items remain **not TAMAMLANDI**. No new completion percentages.

Source plan: `docs/software-completion/BUZZARD_PHASE1_NEXT_ACTION_PLAN.md`.

---

## 1. Item 205 — CI (GitHub Actions `CI` on this SHA)

### Barrier
`.github/workflows/ci.yml` runs only on `push`/`pull_request` to **`main`**. PR #430 base is **not** `main`, so this SHA has **no** `CI` run. Local tests do not count.

### Confirm: new `main`-based PR of the **same SHA**
Yes. Lowest-cost unblock **without editing #430**: a **second** pull request whose:

- **head** = `cursor/software-completion-local-c293` (OID `b9d3ae8…`)
- **base** = `main`

This agent **must not** open that PR.

### Human GitHub steps (205 only)

1. Confirm SHA: `git rev-parse origin/cursor/software-completion-local-c293` equals `b9d3ae835fdf0e31b1815dc577d6b98b07a1ce54`. If the branch moved, use the new OID and record it — do not mix SHAs.
2. Optional pre-PR local check (already run 16.10 on this SHA; **not** GitHub evidence): lint, typecheck, test:ai (62), test:software (143), test:unit (1084), build, security:check (1 warn), e2e-storefront 18. `render:preflight` and `e2e-admin` were **not** run locally (prod probe / SQLite write).
3. GitHub: **New pull request** → base **`main`**, compare **`cursor/software-completion-local-c293`**. Do **not** change #430.
4. Title/body: draft OK; state that sales/SoT/live payments stay off; **do not merge**.
5. Wait for workflow **`CI`**.
6. Record run URL + `headSha`.

### Jobs that must succeed
All three jobs in `ci.yml`:

| Job | Must |
| --- | --- |
| `quality` | success (lint, typecheck, build, test:ai, test:software, test:unit, render:preflight, security:check) |
| `e2e-storefront` | success |
| `e2e-admin` | success (`BUZZARD_SALES_ENABLED=0` in workflow) |

`security:check` may log the known braces/eslint **WARN** and still exit 0 (as locally). Job **failure** is not acceptance.

### Human approvals
Repo write + PR create. No merge. No `ci.yml` edit in this phase. No production deploy.

### How to verify SHA and local results **before** opening the PR
```
git fetch origin cursor/software-completion-local-c293
git rev-parse origin/cursor/software-completion-local-c293
# expect b9d3ae835fdf0e31b1815dc577d6b98b07a1ce54
```
Local log dir used this session: `/tmp/buzzard-phase1-ci/` (agent VM; not GitHub). If SHA differs, re-run local suite on **that** SHA before asking Actions to judge it.

---

## 2. Item 212 — PR #430 checks

### Read-only state (this session)

| Field | Value |
| --- | --- |
| URL | https://github.com/Buzzard-de/Buzzard/pull/430 |
| State | OPEN, **draft** |
| Base | `cursor/security-session-closeout-c293` |
| Head | `cursor/software-completion-local-c293` |
| `headRefOid` | `b9d3ae835fdf0e31b1815dc577d6b98b07a1ce54` |
| Checks | **0** (`statusCheckRollup` empty) |

### Why 212 cannot be met **without changing #430**
`CI` never starts when the PR base is not `main`. Empty checks are the expected GitHub result. Filling 205 via a **different** PR leaves #430’s rollup empty. Item 212’s established criterion is **#430’s** checks, not “any PR”.

This phase **forbids** retarget/edit of #430. Therefore **212 stays blocked** until a later human explicitly changes #430’s **base to `main`** (HEAD may stay). That later act is **out of scope here**.

### Acceptance (212) — not this task
`gh pr view 430 --json statusCheckRollup,headRefOid`: non-empty checks, jobs named `CI` / quality / e2e-*, `headRefOid` still the intended SHA. **Do not merge.**

A `main` PR opened for 205 **does not** satisfy 212.

---

## 3. Item 220 — Persistent disk

### Barrier
Blueprint (`render.yaml`: disk `buzzard-data`, `/var/data`, 1GB, `BUZZARD_DB_PATH=/var/data/buzzard.db`) is **code**. `RENDER_STORAGE_OPERATOR.md` live rows are **NOT_VERIFIED**. This agent has no `/var/data` and **must not** open Render.

### Operator read-only steps (human, Render dashboard / shell — **no writes**)

Copy of operator intent; step 7 in the old doc cites `/api/health` for persistence — **that path does not include persistence**. Use `/api/health/db`.

1. Service name is **`buzzard-api`** (not preview).
2. Disk **`buzzard-data`** attached.
3. Mount **`/var/data`**.
4. Env **string** `BUZZARD_DB_PATH` = `/var/data/buzzard.db` (do not paste other secrets; do not change values).
5. `BUZZARD_BACKUP_DIR` = `/var/data/backups` if backups expected.
6. `NODE_ENV=production`, `BUZZARD_SALES_ENABLED=0`. Do **not** set live payments or `BUZZARD_PRODUCT_SOT_ACTIVE`.
7. Public **`GET /api/health/db`**: see expected JSON below. (`GET /api/health` is liveness only.)
8. Optional authorized restart **only if already approved separately**; file at `/var/data/buzzard.db` still present and non-empty. Empty new file ≠ success.
9. Do not migrate, restore, resize, or create a disk in this phase.

### Expected `/api/health/db` evidence (public; no path leak)

```json
{
  "success": true,
  "database": {
    "ok": true,
    "persistent": true,
    "ephemeralRisk": false,
    "persistence": {
      "mode": "render_persistent_disk",
      "persistent": true,
      "ephemeralRisk": false
    }
  }
}
```

Must **not** contain filesystem paths or table counts. Record timestamp + HTTP 200. Do not store secrets.

If `mode` is `custom_path` / `development_default` / `production_ephemeral` or `persistent` is false → 220 **not** met.

### Cost
0 € if disk already on starter. Invoice unread. Do not buy in this phase.

---

## 4. Item 217 — Monitoring

### Barrier
No authorized **production** persistence snapshot. Uptime on **`main`** ≠ this HEAD.

### Separate evidence classes

| Class | What it is | What it is not |
| --- | --- | --- |
| **Local** | Handler code; fortress authz tests; 16.10 unit/software green | Live Render |
| **`main` uptime** | `uptime-monitor.yml` schedule; last success e.g. run `38848577315` 16.10 ~04:02 UTC on **`main`** | SHA `b9d3ae8`; disk mode |
| **This HEAD** | Git commit only until a `main` PR runs `CI` | Production monitor |

`GET /api/health` → `{ ok: true }` only.  
`GET /api/health/db` → persistence flags.  
Uptime script hits `/api/health` + `/api/health/version` + site URLs — **not** `/api/health/db`.

### Live verification steps (human; this agent does not curl prod)

1. After 220 dashboard check (preferred order: disk then monitor).
2. `GET /api/health` → 200, `{ ok: true }`.
3. `GET /api/health/db` → `persistent: true`, `mode: render_persistent_disk`.
4. Keep sales 0. Do not call mutating APIs.
5. Save redacted JSON + time. Existing 6-hour uptime job stays; **do not buy** Datadog/PagerDuty.
6. Optional: GitHub **Uptime Monitor** `workflow_dispatch` (already in yaml) — still not 217 alone.

---

## 5. One-page outcome (no TAMAMLANDI)

| | **205 CI** | **212 #430** | **220 Disk** | **217 Monitor** |
| --- | --- | --- | --- | --- |
| **Barrier** | `CI` only on `main`; #430 not `main` | Empty checks on #430 | Live attach unknown | No prod `/api/health/db` record |
| **Action that unblocks** | New PR head=`software-completion-local-c293` base=`main` | Later: #430 **base → main** (forbidden **this** task) | Operator read-only Render + `/api/health/db` | Same health/db capture |
| **Who** | Human with GitHub write | Human, **after** this freeze | Render operator | Same operator |
| **Evidence** | Actions run, `headSha` = intended OID, 3 jobs green | `statusCheckRollup` on **#430 only** | Operator md rows + JSON above | Timestamped health + db JSON |
| **Accept** | Those 3 jobs success; **no merge** | Checks on #430; **no merge** | `mode=render_persistent_disk` + restart survival if authorized | Liveness **and** persistence flags |
| **Cost** | 0 € product (Actions minutes) | 0 € | 0 € if disk exists | 0 €; no new SaaS |
| **Next step** | Human opens **main** PR | Do **not** retarget now; 205 PR ≠ 212 | Operator checklist; no disk create | Capture `/api/health/db` after 220 |

**Order:** 205 (human PR) → 212 deferred until #430 may be retargeted → 220 operator → 217 operator (db JSON).

This checklist is not completion. Sales, payments, Product SoT stay off.

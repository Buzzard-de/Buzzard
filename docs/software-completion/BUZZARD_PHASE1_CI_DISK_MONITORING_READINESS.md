# Buzzard — Phase 1 Execution Readiness (205 → 212 → 220 → 217)

Date: 2026-10-16  
Mode: **read-only inspection + safe local tests**. No code/config/git/PR/deploy/production change.  
Sales, live payments, Product SoT remain **off**. No paid purchase. No secrets.

HEAD: `b9d3ae835fdf0e31b1815dc577d6b98b07a1ce54`  
Branch: `cursor/software-completion-local-c293`  
PR #430: https://github.com/Buzzard-de/Buzzard/pull/430 (OPEN, **draft**)

This document does **not** mark items TAMAMLANDI.

---

## Shared facts (ci.yml)

File: `.github/workflows/ci.yml`  
Name: `CI`

```
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
```

Jobs: `quality` (lint, typecheck, build, test:ai, test:software, test:unit, render:preflight, security:check), `e2e-storefront`, `e2e-admin` (sales env `0`).

**Not present:** `workflow_dispatch`, `pull_request` to non-`main` bases, `push` to this feature branch.

Other workflows (`uptime-monitor.yml` schedule, `deploy-api.yml` push `main`, `verify-go-live.yml` after Pages on `main`) are **not** the Item 205/212 `CI` workflow.

---

## 1. Item 205 — GitHub CI (register 20%, BLOCKED_EXTERNAL)

### Current status
GitHub Actions **CI** has **no run** for this branch or this SHA. Latest `ci.yml` successes on GitHub are **other** branches targeting `main` (e.g. `cursor/desktop-bridge-shortcut-c293`, 2026-10-12).

### Verified evidence
- Trigger is **only** `push`/`pull_request` with **base or destination `main`**.
- `gh run list --branch cursor/software-completion-local-c293` → **empty**.
- `gh run list --workflow=ci.yml` → no SHA `b9d3ae8`.
- Cause of missing evidence is **workflow `on:` + PR base ≠ main**, not a missing `ci.yml` file.

### Missing evidence
Actions job logs for **this HEAD**: quality + both e2e jobs green (or a recorded failure).

### Safe local actions (done / available)
Local substitutes **do not replace** GitHub CI:

| Command | This session | Maps to CI job |
| --- | --- | --- |
| `npx vitest run server/__tests__/softwareCompletion.test.mjs -t "43 /tmp database paths"` | **1 passed** (71 skipped) | subset of `test:software` |
| `npx vitest run server/__tests__/fortressAuthz.test.mjs -t "health"` | **1 passed** (10 skipped) | subset of unit |
| Full `npm run lint|typecheck|build|test:ai|test:software|test:unit|render:preflight|security:check` | **not re-run here** | `quality` |
| Playwright e2e | **not run here** | `e2e-*` |

Do **not** push to trigger CI.

### Human-required (GitHub)
Without editing `ci.yml`:

1. Retarget PR **#430** base from `cursor/security-session-closeout-c293` to **`main`** (UI), **or**
2. Open a **new** PR of this head **into `main`** (then 205 can pass while 212 may still fail — see §2), **or**
3. Merge/push this SHA onto `main` (out of Phase 1; deploy risk).

`workflow_dispatch` **cannot** start `CI` today — it is not in `ci.yml`. Adding it would be a **code change** (forbidden in this pass).

### Free solution
GitHub Actions minutes already used by the repo. **0 € new product.**

### Risks
- Retargeting #430 to `main` produces a **large** diff vs `main`; CI may fail for merge-base reasons unrelated to this SHA’s local tests.
- A new PR to `main` satisfies **205** only if checks run on **this OID**.
- Local green ≠ Actions green (Node image, Playwright deps).

### Acceptance (205)
`CI` workflow run whose `headSha` = intended SHA, jobs `quality`, `e2e-storefront`, `e2e-admin` completed (success recorded). This report is **not** that evidence.

---

## 2. Item 212 — PR #430 CI evidence (register 0%, BLOCKED_EXTERNAL)

### Current status
PR **OPEN draft**. Checks empty.

### Verified evidence (`gh pr view 430`)

| Field | Value |
| --- | --- |
| url | https://github.com/Buzzard-de/Buzzard/pull/430 |
| state / draft | OPEN / true |
| base | **`cursor/security-session-closeout-c293`** (not `main`) |
| head | `cursor/software-completion-local-c293` |
| `headRefOid` | **`b9d3ae835fdf0e31b1815dc577d6b98b07a1ce54`** |
| local HEAD | **same OID** |
| `statusCheckRollup` | **`[]`** |
| commits on PR | 67 |

**Stale register note (14.10):** “local HEAD ahead of PR” is **false on 16.10**. HEAD and PR tip **match**. Empty rollup remains.

**Why checks are empty (proven, not guessed):** GitHub only starts `CI` when the PR’s **base** is `main`. Base is `cursor/security-session-closeout-c293`. Therefore **no `CI` event**. Empty rollup is the expected GitHub result, not a missing permissions mystery.

### 205 vs 212

| | 205 | 212 |
| --- | --- | --- |
| Shared | Same `ci.yml`, same jobs | same |
| Distinct | SHA has a `CI` run | **This PR (#430)** has non-empty check rollup for that SHA |
| If new PR to `main` | 205 can complete | 212 **still 0%** until #430 itself has checks |
| If #430 retargeted to `main` | both can complete together | |

### Missing evidence
PR page: `CI / quality`, `CI / e2e-storefront`, `CI / e2e-admin` attached to `headRefOid` `b9d3ae8…`.

### Safe local
Same as 205. Does not fill rollup.

### Human-required
- Do **not** merge.  
- To satisfy **212 specifically**: change **#430** base to `main` (or add a workflow that runs on this base — **code change, not this pass**).  
- No comment/check/merge from this agent.

### Free solution
Same Actions, 0 €.

### Risks
Retarget conflict; draft PR still not mergeable until human; CI failure on huge `main` delta.

### Acceptance (212)
`gh pr view 430 --json statusCheckRollup` non-empty; `headRefOid` still the intended SHA; jobs named `CI`.

---

## 3. Item 220 — Production disk (register 0%, BLOCKED_EXTERNAL)

### Current status
Blueprint **declares** a disk. Live attach **NOT_VERIFIED**. This VM has **no** `/var/data`.

### Verified evidence (repository / local)

`render.yaml` (`buzzard-api`, `plan: starter`, `branch: main`):

```
disk:
  name: buzzard-data
  mountPath: /var/data
  sizeGB: 1
BUZZARD_DB_PATH=/var/data/buzzard.db
BUZZARD_BACKUP_DIR=/var/data/backups
healthCheckPath: /api/health
BUZZARD_SALES_ENABLED=0
```

`server/lib/dbPaths.js`:

- Production without `BUZZARD_DB_PATH` → **fail-closed** `PRODUCTION_DB_PATH_UNCONFIGURED`.
- Production path under `/tmp` → `PRODUCTION_EPHEMERAL_PATH`.
- Path prefix `/var/data` → `mode=render_persistent_disk`, `persistent=true`.

This session, `node` on the agent:

- `getRenderDiskDiagnostics()`: `exists: false`, `writable: false` (`/var/data` **absent**).
- Simulated `{ NODE_ENV: production, BUZZARD_DB_PATH: /var/data/buzzard.db }` → `ok: true`, `mode: render_persistent_disk`.
- Simulated production `/tmp` → `ok: false`.
- Vitest **43** `/tmp` not persistent: **PASS**.

`docs/software-completion/RENDER_STORAGE_OPERATOR.md`: all live rows **NOT_VERIFIED** (service identity, attach, mount, env path string, restart survival, backup).

SQLite need: durable file **not** on Render ephemeral FS; default `server/data/buzzard.db` is **dev only**.

### Local vs production (must stay separate)

| | Local (this agent) | Production |
| --- | --- | --- |
| `/var/data` | missing | unknown |
| `BUZZARD_DB_PATH` in this shell | `/workspace/server/data/test-scratch/phase11-unit.db` (dev scratch — **not** prod) | must be `/var/data/buzzard.db` if blueprint applied |
| `getPersistenceInfo().mode` here | `custom_path` | must be `render_persistent_disk` to claim 220 |
| Public `/api/health` | liveness `{ok:true}` only — **no disk field** | same contract |

Blueprint in git ≠ Render dashboard applied.

### Missing evidence
Operator checklist 1–10 in `RENDER_STORAGE_OPERATOR.md`. File exists after authorized restart. No secret values.

### Safe local
dbPaths tests (done). `npm run test:backup-restore` is **dry-run local** — optional; **not** run this pass (touches backup script; not required for readiness listing). Do **not** create `/var/data` or Render disks.

### Human-required (Render)
1. Service is `buzzard-api`.  
2. Disk `buzzard-data` attached, mount `/var/data`, 1GB.  
3. Env path **strings** `/var/data/buzzard.db` and backups dir — do not paste other secrets.  
4. `NODE_ENV=production`, `BUZZARD_SALES_ENABLED=0`.  
5. After restart: file still present; health persistence (below).  
6. Do not enable SoT/payments/sales.

### Free solution
**If** starter+1GB is already on the live service: verification **0 €**.  
**If not attached:** ephemeral instance **fails 220**; paid disk may already be implied by `plan: starter` in yaml — **invoice not read**. Do not buy from this task.

### Risks
Redeploy wipes SQLite without disk. Claiming local `buzzard.db` as prod is **false**. Public `/api/health` **200 does not prove disk**.

### Acceptance (220)
Operator record: disk attached + `persistence.mode=render_persistent_disk` and `persistent=true` from **production** `/api/health/db` or authorized `/api/health/production` (path fields stripped per plugin) + restart survival. `RENDER_STORAGE_OPERATOR.md` rows leave NOT_VERIFIED.

---

## 4. Item 217 — Production monitoring (register 20%, BLOCKED_EXTERNAL)

### Current status
Code health routes exist. **Authorized production persistence/ops probe by this agent: none.** Uptime workflow is **liveness of URLs on `main` schedule**, not this HEAD and not disk proof.

### Verified evidence

Public (no auth) — `server/lib/routePermissions.js` + plugins:

| Path | Handler | Body |
| --- | --- | --- |
| `GET /api/health` | `aiAutomationPlugin.js` | `{ success, ok, status: "ok" }` **only** |
| `GET /api/health/db` | `controlCenterPlugin.js` | `toPublicDatabaseHealth()` → `persistent`, `persistence.mode`, **no path** |
| `GET /api/health/version` | `productionHealthPlugin.js` | service + commit |

Auth `system.read`: `/api/health/pusat`, `/software`, `/production`, go-live, operations, etc. Unauthenticated → 401 (vitest health pattern **PASS** this session).

`server/lib/software/monitoringReady.js`: `productionWired: false`, `productionDb: "UNKNOWN"`, `liveVerified: false`. Local `renderMountExists` is false here.

`.github/workflows/uptime-monitor.yml`: `schedule` `0 */6 * * *` + `workflow_dispatch`; runs `scripts/verify-go-live.mjs` against `https://buzzard24.de` and `https://buzzard-api.onrender.com`. **Latest:** `38848577315` **success** 2026-10-16 04:02 UTC, branch **`main`**. That script checks HTTP of site/API routes; it is **not** a persistence audit and **not** CI for `b9d3ae8`.

This agent **did not** curl production.

### Local vs live

| Local | Production |
| --- | --- |
| Route tests 401/public | Live 200/401 unknown to this session |
| Uptime job success on `main` | Proves **those URLs answered** for verify-go-live, **not** `persistent=true` |
| Isolated API `:3001` historically | Not this pass |

### Missing evidence
Dated operator note: prod `GET /api/health` 200 **and** `GET /api/health/db` `persistent=true` `mode=render_persistent_disk`, sales still 0. Auth snapshots without secrets. 217 is **blocked** until that — uptime green is **insufficient** for disk-aware monitoring.

### Safe local
Fortress health tests (done). Optional: local `node server/server.js` + `curl /api/health` with sales `0` — **not started** this pass (avoid extra long-lived process). Do **not** call Render.

### Human-required
Dashboard or authorized curl of public health + `/api/health/db`. Optional: `workflow_dispatch` on **Uptime Monitor** (already exists) — still not persistence. Do not enable paid APM.

### Free solution
Existing `/api/health*` + existing 6-hour uptime job. Datadog **not required**.

### Risks
Treating uptime **success** as 217 complete. Treating public liveness as disk health. Hitting `/api/health/production` without auth leaks were already locked; do not reopen.

### Acceptance (217)
Operator-captured production JSON for public liveness **plus** public DB persistence flags (or auth production summary with paths stripped) with timestamp. `monitoringReady.liveVerified` remains false until that capture. This markdown is **not** liveVerified.

---

## Order (still valid)

1. **205** — GitHub `CI` on this SHA (human PR-to-`main` event).  
2. **212** — same jobs visible **on #430** (retarget #430; a different PR does not close 212).  
3. **220** — Render disk operator checklist (after or parallel in calendar, but **before** trusting prod data).  
4. **217** — production health **including persistence**; uptime-only is a lower bar.

220 before 217: `/api/health` can be 200 on ephemeral SQLite.

---

## Not done / not claimed

- No commit, push, PR edit, merge, deploy.  
- No Render disk create/resize.  
- No production env write.  
- No sales / payments / `BUZZARD_PRODUCT_SOT_ACTIVE`.  
- No 205/212/217/220 TAMAMLANDI.

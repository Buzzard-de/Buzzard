# BUZZARD — Complete AI Agent History & Contribution Investigation

**Report date:** 2026-11-19, ~17:25 Europe/Berlin  
**Mode:** Read-only research (no source code, DB, PR, or port changes)  
**Investigator context:** Single Cloud Agent run `bc-a02d07fa-e72e-400c-892f-ce9921a3c293` (`composer-2.5-fast`)

---

## 1. Executive summary

| Metric | Value | Evidence quality |
|--------|------:|------------------|
| **Accessible Buzzard agent runs (Cursor API)** | **116** | VERIFIED (`cursor-cloud-list-cloud-agents`, `totalMatched: 116`) |
| Runs with **known model name** in API | **2** | VERIFIED |
| Runs with **model UNKNOWN/null** | **114** | VERIFIED (field `originalModelName: null`) |
| **Composer** (API-attributed) | **1** | VERIFIED |
| **Grok** (API-attributed) | **1** (`grok-4.7`) | VERIFIED |
| **Claude** (API-attributed) | **0** | NOT FOUND in accessible API |
| **Grok 4.6** (API-attributed) | **0** | NOT FOUND in accessible API |
| Remote `cursor/*` branches (git) | **394** | VERIFIED (`git branch -r`) |
| Local uncommitted diff vs HEAD | **90 files**, +3376/−774 lines | VERIFIED (not committed) |
| Open PRs #507 / #508 | Both **open**, **dirty**, **not merged** | VERIFIED (GitHub API) |

**Critical limitation:** Cursor’s API for this principal returns **`originalModelName` for only 2 of 116 Buzzard runs**. Therefore **Claude, Grok 4.6, and most Composer/Grok desktop sessions cannot be assigned per run from this investigation alone.** Those runs are listed as **UNKNOWN (model)** with task title and timestamp only.

---

## 2. Access limits and what you can export

### What this investigation could access

- `cursor-cloud-list-cloud-agents` — 116 Buzzard runs (full page, `hasMore: false`)
- `cursor-cloud-run-info` / `batch-fetch-details` for sample runs (diff metadata, events)
- GitHub: PR metadata, compare API, first page of PR file lists
- Local git: branches, HEAD, worktree diff (no commit)

### What was NOT accessible

- Per-run **model** for 114 agents (`originalModelName: null`)
- Full **transcripts** for all 116 runs (only 2 batch-fetched)
- Per-agent **file lists** for most runs (API flags `didMakeCodeChanges` not present on listed agents; diff metadata only sampled)
- **Team-wide** or **other users’** agent history
- **Desktop Composer** model picker history (not in git)

### Requested from Süleyman Bey (for ChatGPT follow-up)

1. **Cursor → Agents** export or screenshots: columns **Model**, **Created**, **Branch**, **bcId** — filter Buzzard repo, date range Aug–Nov 2026.  
2. CSV/screenshot of runs explicitly started as **Claude 4.x**, **Grok 4.6**, **Grok 4.7**, **Composer 2.5**.  
3. For any run: open `https://cursor.com/agents/bc-<id>` and copy **model** shown in UI (authoritative when API is null).  
4. Optional: GitHub PR list export linking **PR number → head branch → merge status**.

---

## 3. Agent register (API-accessible, all 116 Buzzard runs)

**Source file (machine-readable, not committed):** `/tmp/buzzard-agents-summary.json`  
**Derived:** 2026-11-19 from list API response (~2563 lines).

### 3.1 Aggregate

| Field | Count |
|-------|------:|
| Total accessible runs | 116 |
| Status IDLE | 113 |
| Status RUNNING | 1 (`bc-a02d07fa…`) |
| Status ERROR | 2 |
| `branchName` recorded | **3** only |
| Explicit model recorded | **2** |

### 3.2 Runs with VERIFIED model

| Agent ID | Model | Created (UTC) | Name / task | Branch | PR link | Tests / diff |
|----------|-------|---------------|-------------|--------|---------|--------------|
| `bc-a02d07fa-e72e-400c-892f-ce9921a3c293` | **composer-2.5-fast** | 2026-08-08 18:44:39 | German language request | `cursor/pim-catalog-foundation-c293` | **#507, #508** footers cite this bcId | Long-lived session: inventory, phases 6–21, security sprint docs, 8 reports, handover; **batch diff-metadata** (stale sample): 17 files, +1483/−47, PR ref #297 OPEN/merged flag inconsistent — **treat as NOT_VERIFIED for current PRs** |
| `bc-5a736bb9-872f-4c79-8e70-884740494be7` | **grok-4.7** | 2026-10-10 10:16:32 | Devam eden iş | `cursor/buzzard-eu27-fiat-engine-4be7` | **#501** branch match (EU27 fiat) — model ↔ PR link **PARTIALLY_VERIFIED** | API: no PR flag; branch aligns with open PR #501 |

### 3.3 Sample UNKNOWN-model runs (114 total — model not in API)

| Created (UTC) | Task title | Status | Model |
|---------------|------------|--------|-------|
| 2026-11-19 13:20 | Architecture engines audit | IDLE | UNKNOWN |
| 2026-11-18 18:34 | Scan module completion state | IDLE | UNKNOWN |
| 2026-11-13 19:48 | Audit commerce and markets | IDLE | UNKNOWN |
| 2026-11-13 19:48 | Audit 17 AI council | IDLE | UNKNOWN |
| 2026-11-10 20:12 | Browse storefront prototype | IDLE | UNKNOWN |
| 2026-11-05 05:41 | Audit 16 items and AI | IDLE | UNKNOWN |
| 2026-10-12 22:29 | Audit Pusat PIM supplier | IDLE | UNKNOWN |
| 2026-10-11 09:37 | Audit orders payments marketplaces | IDLE | UNKNOWN |
| … | *(106 additional rows in `/tmp/buzzard-agents-summary.json`)* | … | UNKNOWN |

**Interpretation:** Titles skew toward **audit/inventory** (read-only). **Cannot** attribute these to Claude vs Grok vs Composer without UI export.

### 3.4 Distribution by month (createdAt)

| Month (UTC) | Runs |
|-------------|-----:|
| 2026-08 | 38 |
| 2026-09 | 56 |
| 2026-10 | 12 |
| 2026-11 | 10 |

---

## 4. Model-based contribution analysis

### 4.1 Composer (`composer-2.5-fast`) — VERIFIED (one run, many outcomes)

**Attributed bcId:** `bc-a02d07fa-e72e-400c-892f-ce9921a3c293`

| Category | Evidence | Verification |
|----------|----------|--------------|
| **Modules / areas** | Master phases 6–21 gates, order orchestrator, ecosystem health, security sprint artifacts, 8 inventory reports, handover docs | PARTIALLY_VERIFIED (git worktree + PR bodies; not all merged) |
| **PRs** | GitHub PR **#507**, **#508** embed this agent URL in footer | VERIFIED |
| **Committed on `master-phases-6-21`** | HEAD `3df03351` — phase gates 6–21, vitest | VERIFIED |
| **Security branch** | `cursor/security-admin-final-checkpoint-c293` @ `b2479b6b` — admin UI landings per `git log` | VERIFIED |
| **Uncommitted worktree** | 90 files vs HEAD (orchestrator HTTP, tests, reports, jwt/session patches, etc.) | VERIFIED |
| **Merged to `main`** | **No** for #507/#508 | VERIFIED |
| **Tests** | Inventory doc: 1949 pass (tmp DB copy) — run by same session | PARTIALLY_VERIFIED (documented, not re-run in this task) |

### 4.2 Grok (`grok-4.7`) — VERIFIED (one API run only)

| Category | Evidence | Verification |
|----------|----------|--------------|
| **Branch** | `cursor/buzzard-eu27-fiat-engine-4be7` | VERIFIED |
| **Likely PR** | #501 (same branch name) | PARTIALLY_VERIFIED |
| **Grok 4.6** | **No API record** | NOT FOUND |
| **Files / tests** | Not available via API for this run | UNKNOWN |

### 4.3 Claude — NOT FOUND in accessible agent API

No run in the **116** list has `originalModelName` containing `claude`.  
**Any Claude contribution** must be assumed inside the **114 UNKNOWN** runs or **desktop sessions not labeled in API** → classification **UNKNOWN** until UI export.

### 4.4 UNKNOWN model (114 runs)

| Likely activity (from titles only) | Verification |
|-----------------------------------|--------------|
| Audits (commerce, AI council, security, PIM, i18n) | NOT_VERIFIED (no diff/transcript pulled) |
| Storefront browse prototype | NOT_VERIFIED |
| Architecture / module completion scans | NOT_VERIFIED |

**Do not** infer model family from task title alone.

---

## 5. Model conflicts and overlapping work

| Conflict type | Example | Evidence | Assessment |
|---------------|---------|----------|------------|
| Same long-lived agent, multiple PRs | #507 security + #508 phases both link `bc-a02d07fa…` | PR HTML bodies | VERIFIED — **not** multi-model conflict; **same Composer session** |
| Same base, parallel mega-PRs | #507 vs #508 both base `cursor/pim-catalog-foundation-c293`, mergeable **dirty** | GitHub | VERIFIED |
| Overlapping changed paths (sample) | **99** shared paths in first API page of files (e.g. `app/layout.tsx`, admin pages, artifacts) | `gh api` file lists | PARTIALLY_VERIFIED (pagination cap 100) |
| Order stack duplication | `ordersPlugin` + `orderService` + orchestrator | Code inventory / debt P0-1 | VERIFIED |
| Product SoT duplication | `productStore` vs PIM plugins | Debt P0-2 | VERIFIED |
| Worktree vs HEAD order HTTP | `dry-rehearsal` in worktree; **absent on HEAD** (`git show HEAD:ordersPlugin.js`) | Shell | VERIFIED |
| Security vs phase gates | #507 server patch vs #508 phase modules — **not integrated** | PR state + worktree | VERIFIED |
| JWT narrative drift | Older scorecard “weak JWT on HEAD” vs current `jwtSecret.js` file | Multiple md reports | CONTRADICTORY across **documents**; file read favors **no static fallback** — **live API NOT_VERIFIED** |
| Repeated plugin families | 92 plugins; part28–35 health plugins | Debt P1-1 | VERIFIED |
| One model completes another’s gap | Composer worktree wires order dry-rehearsal after phase-6 gate-only work | Conversation + git diff | PARTIALLY_VERIFIED |

**“Model A breaks model B”:** No **proven** instance keyed by model ID. **Proven** instance: **later worktree edits** supersede **committed HEAD** without merge.

---

## 6. PR #507 vs #508 (Git / GitHub evidence)

| Field | PR #507 | PR #508 |
|-------|---------|---------|
| Title | Security admin final sprint Phases 0–11 | Master plan phases 6–21 gates + vitest |
| Head branch | `cursor/security-admin-final-checkpoint-c293` | `cursor/master-phases-6-21-c293` |
| Head SHA | `b2479b6b` | `3df03351` |
| Base | `cursor/pim-catalog-foundation-c293` | same |
| State | open | open |
| mergeable_state | dirty | dirty |
| Commits on PR | 120 | 121 |
| GitHub additions stat | 967,378 | 968,627 |
| Agent footer bcId | `bc-a02d07fa…` | `bc-a02d07fa…` |
| Merged | **No** | **No** |

**Compare to base (GitHub):** each PR ~**300 files** vs `pim-catalog-foundation-c293`; **ahead_by** 120/121 commits.

**Lifecycle:**

| Change type | #507 | #508 |
|-------------|------|------|
| On branch only | Security + admin sprint payload | Phase 6–21 modules + ledger |
| In open PR | Yes | Yes |
| Merged to main | No | No |
| Local-only (worktree) beyond HEAD | Overlaps security uncommitted files | Overlaps phase fixes + reports (**196** modified paths reported earlier; **90** in current `git diff --stat HEAD`) |
| Superseded / invalid | Live server graph **unapplied** (per PR #507 body) | Phase “100%” claims **disputed** in independent audits |

---

## 7. Contribution verification categories (summary)

| Work product | Category | Note |
|--------------|----------|------|
| Phase 6–21 gate tests pass on branch | PARTIALLY_VERIFIED | Gate ≠ full software complete |
| Security matrix vitest (worktree) | VERIFIED | Documented 1949-pass run |
| 8 inventory reports | VERIFIED | Exist untracked on disk |
| PR #507 live patch on :3001 | FAILED / BLOCKED | Explicitly not applied |
| Grok EU27 PR #501 content | NOT_VERIFIED | Not diffed in this task |
| 114 UNKNOWN agent runs | UNKNOWN | No model, no diff |

---

## 8. Git facts (no model in commit metadata)

| Item | Value |
|------|-------|
| Earliest commit in clone | `d4f8ddc2` (2026-07-25) |
| HEAD (current branch) | `3df03351` on `cursor/master-phases-6-21-c293` |
| Commits reachable | 745 |
| Git does **not** record LLM model on commits | VERIFIED |

---

## 9. Counts requested in directive

| Item | Count |
|------|------:|
| Accessible agents | 116 |
| By model (API) | Composer 1, Grok 4.7: 1, Claude 0, UNKNOWN 114 |
| Contradictions (model-attributed) | **0** (insufficient model data) |
| Architectural / doc contradictions | **≥3** (JWT narrative, phase %, HEAD vs worktree order route) |
| Unresolved security (from inventory) | 4 (SEC-01–04) |
| Incomplete debt items (enumerated P0–P3 + gaps) | **26** (+ 21 partial phases) |
| Missing evidence references (model ↔ run) | **114** runs |
| Merged agent PRs in sample (#507/#508) | **0** |

---

## 10. Five priority human decisions

1. Export Cursor UI **model column** for 114 UNKNOWN runs.  
2. Decide merge order: **#507** vs **#508** vs integration branch.  
3. Bless or restore **`buzzard.db`** baseline.  
4. Confirm whether **Grok 4.6** ran only on desktop (never stored in cloud API).  
5. Freeze **one** long-lived agent (`bc-a02d07fa…`) vs start fresh per task to reduce worktree/PR overlap.

---

## 11. Safety confirmations (this investigation)

| Rule | Status |
|------|--------|
| Source code unchanged | **Yes** (only this `.md` created) |
| No commit / push / merge / deploy | **Yes** |
| PR #507 / #508 unchanged | **Yes** |
| Ports 3000 / 3001 | **Not touched** |
| Protected DB hash | `f5617f67…` (unchanged this session) |
| SALES / EGRESS / live flags | Unchanged |

---

## Appendix A — How to map UNKNOWN runs to Claude / Grok / Composer

For each row in `/tmp/buzzard-agents-summary.json`:

1. Open `url` in Cursor.  
2. Record **model** from UI → update spreadsheet.  
3. If PR created, note `headRefName` from GitHub.  
4. Classify contribution using `git log` / `gh pr diff` on that branch only.

**Do not** use phase gate percentages as proof of agent success.

---

*End of report. No implementation authorized.*
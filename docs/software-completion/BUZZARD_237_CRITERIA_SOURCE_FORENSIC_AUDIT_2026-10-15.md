# Buzzard 237 Criteria Source — Forensic Audit

Date: 2026-10-15  
Mode: **LOCAL READ-ONLY INVESTIGATION**  
Command: COMMAND 1 — original 237-criteria source investigation  
This file did not exist before this investigation (`ABSENT` at inspect). Existing registers and reports were **not** overwritten.

**This was a local read-only investigation.** No production systems were touched. No scoring formulas, criterion IDs, or register values were changed. No replacement checklist was invented.

---

## 1. Repository identity

| Field | Value |
| --- | --- |
| Working directory | `/workspace` |
| Branch | `cursor/software-completion-local-c293` |
| HEAD (full) | `8613c3b8ea1c3f4d412a8b1d54a9da3c0987388a` |
| HEAD (short) | `8613c3b` |
| Matches previously reported HEAD `8613c3b` | **YES** |
| Upstream | `origin/cursor/software-completion-local-c293` **ahead 36** |
| `git reset --hard` / `git clean -fd` | **not used** |
| Branch switch | **not performed** |
| Fetch / remote access | **not performed** |
| Push / PR / deploy | **not performed** |

### Recent commits (HEAD first)

```
8613c3b Record this pass test evidence without changing the 237-item mean.
bb5a70c Require stored HAC action on consume and record the local audit.
bfc4265 Fix public login entrypoints and bind Human Approval actions.
87a5e30 Harden Esat Bey gates and complete identity 2FA confirm-enable.
b2bdf57 Record Komut 7–10 Turkish final security report.
bba4df1 Record Komut 7–10 Esat Bey and hashed-reset evidence.
adc36a7 Harden reset tokens, 2FA responses, and Esat Bey gates.
1096f29 Record KOMUT 6 password-reset and submissions evidence.
```

### Initial working-tree state (before this report file)

- `git status`: clean (`## ... [ahead 36]`)
- Untracked files: **none**
- User-created uncommitted files: **none observed**
- Working tree did **not** contain uncommitted user changes at inspection

Reported baseline (historical report, now verified against this workspace):

| Claim | Verified |
| --- | --- |
| Branch `cursor/software-completion-local-c293` | Yes |
| HEAD `8613c3b` | Yes (full SHA above) |
| Esat Bey 83.73% | Reproducible from current register (see §5) |
| Overall Buzzard 73.90% | Reproducible from current register (see §5) |
| Original 237-item checklist not found | Confirmed for locally accessible history (see §3) |
| Register first seen around `4b0ce17` | Confirmed (first add of the numbered register) |

---

## 2. Search scope

Non-destructive inspection only. Categories:

| Category | What was inspected |
| --- | --- |
| Working tree | `docs/software-completion/`, `docs/`, scripts, intelligence production checklists |
| Git history (local) | `git log --all --grep=237`; first-add of the register; parent of `4b0ce17` |
| Commit `4b0ce17` | Full SHA `4b0ce17148d4221f8986f5c04ca758eb69dc37fc`; parent `5ba16b2`; file list |
| Generators | `scripts/generate-237-register.mjs`, `scripts/emit-237-register.py` |
| Canonical register | `docs/software-completion/BUZZARD_237_MASTER_EXECUTION_REGISTER.md` |
| Derived 237 docs | handover, test evidence, human-approval blockers, 2026-10-14 master completion report |
| Alternate scoring | `docs/software-completion/COMPLETION_PERCENTAGES.md` (`whole-software-weighted-v1`, 148 weights) |
| Architecture list | `intelligence/production/FINAL_MASTER_CHECKLIST.md` (89 lines) |
| Esat reports | three dated 2026-10-15 reports listed in §6 |
| String search | `237`, `237-item`, `237 criteria`, `Completion percentage`, `VERIFIED_100`, `HUMAN`, `BLOCKED_EXTERNAL` in local markdown/scripts |

Commands / methods used (non-destructive): `pwd`, `git rev-parse`, `git status`, `git log`, `git show --name-only`, `git log --diff-filter=A --follow`, `git grep` on ancestor `5ba16b2`, Python parse of the current register (read-only), ripgrep of workspace text. **No `git fetch`. No network services. No production probes.**

Limitation: absence in **locally accessible** history does not prove the checklist never existed outside this clone, on an unfetched remote, in chat/ticket systems, or in destroyed working trees.

---

## 3. Original 237-item checklist — search outcome

**Outcome: C + D**

- **C.** Only derived registers and later evidence reports were found.
- **D.** No authentic original 237-item source (original titles + original acceptance criteria, numbered 1–237 as authored) exists in the locally accessible repository or Git history.

**Outcome A (found and complete) does not apply.**  
**Outcome B (uncertain candidate of original wording) does not apply.** No file was found whose content could be treated as the original authored checklist.

### Why this is not A or B

1. The numbered register **first appears** in commit `4b0ce17` (`2026-10-14`), message: *Record the 237-item execution register and fail-closed flag/approval gaps.*
2. That commit **adds** (does not copy from an earlier path):
   - `docs/software-completion/BUZZARD_237_MASTER_EXECUTION_REGISTER.md`
   - `docs/software-completion/BUZZARD_237_TEST_EVIDENCE.md`
   - `docs/software-completion/BUZZARD_237_HUMAN_APPROVAL_BLOCKERS.md`
   - `docs/software-completion/BUZZARD_237_FINAL_HANDOVER.md`
   - `scripts/generate-237-register.mjs`
   - `scripts/emit-237-register.py`
3. Parent `5ba16b2` (*Note isolated Playwright cookie…*) contains **no** `BUZZARD_237_MASTER_EXECUTION_REGISTER.md`. Hits for “237” on that commit are unrelated (PR numbers, EANs, other reports).
4. `git log --diff-filter=A --follow -- docs/software-completion/BUZZARD_237_MASTER_EXECUTION_REGISTER.md` returns **only** `4b0ce17`.
5. Generator header states it **does not invent a canonical original checklist** and that original titles remain UNKNOWN because no numbered 1–237 source file exists in this repository. Scope is taken from **directive category bands** plus inspectable code (`BANDS` / `SCOPES` in `scripts/generate-237-register.mjs`).
6. Every register item field `Original title` is **UNKNOWN**. `Title source` is `SCOPE_ESTABLISHED_FROM_DIRECTIVE_CATEGORY_BAND`.
7. `intelligence/production/FINAL_MASTER_CHECKLIST.md` is an **89-line** architecture list (sections A. Architecture, unchecked items). It is **not** 237 numbered criteria.
8. `docs/software-completion/COMPLETION_PERCENTAGES.md` is a **different** method (`whole-software-weighted-v1`, denominator **148**). It is not the 237-item register.
9. Later `git log --all --grep=237` commits are evidence/register **updates after** `4b0ce17`, not discovery of an earlier original.

### Candidate files (derived, not original)

| Path | Provenance | Role |
| --- | --- | --- |
| `docs/software-completion/BUZZARD_237_MASTER_EXECUTION_REGISTER.md` | Added `4b0ce17`; current HEAD `8613c3b` | Canonical **derived** register |
| `scripts/generate-237-register.mjs` | Added `4b0ce17` | Band/scope generator; admits UNKNOWN originals |
| `scripts/emit-237-register.py` | Added `4b0ce17` | Parallel emitter |
| `BUZZARD_237_TEST_EVIDENCE.md` | Added `4b0ce17`; updated later | Test evidence log |
| `BUZZARD_237_HUMAN_APPROVAL_BLOCKERS.md` | Added `4b0ce17` | HUMAN / BLOCKED lists |
| `BUZZARD_237_FINAL_HANDOVER.md` | Added `4b0ce17` | Handover |
| `intelligence/production/FINAL_MASTER_CHECKLIST.md` | Pre-existing; 89 lines | **Not** 237 criteria |
| `docs/software-completion/COMPLETION_PERCENTAGES.md` | Separate 148-weight system | **Not** 237 mean |

No original wording was reconstructed. Band labels in the generator are **established-scope substitutes**, not recovered originals.

---

## 4. Completion register and scoring implementation

**Canonical register:** `docs/software-completion/BUZZARD_237_MASTER_EXECUTION_REGISTER.md` at HEAD `8613c3b`.

**Calculation (as used by this register, not a new formula):**

- Denominator for overall Buzzard: **237** (one integer `Completion percentage` per item 1–237).
- Representation: each item has `Current implementation status` and `Completion percentage | N%`.
- Overall mean: arithmetic mean of the 237 integers: \(\frac{1}{237}\sum p_i\).
- Esat Bey: **separate population** — items **227–237 only** (11 items), same arithmetic mean of those 11 integers.
- VERIFIED_100 is a **status**, not implied by a high percentage. Original titles UNKNOWN ⇒ official VERIFIED_100 cannot be honest against original acceptance criteria.
- Missing/duplicate items: current file has headings `### Item 1` … `### Item 237`, **no missing numbers, no duplicates**. Every item has a `Completion percentage` integer.
- Malformed criteria: this investigation did not rewrite data. Parser required `Completion percentage | <int>%` and a status cell. All 237 parsed.
- Generator `avg = (pctSum / 237).toFixed(1)` is the **same** 1-decimal presentation used in the register summary. This investigation **did not run** the generator to overwrite the register.

Scoring formula, weights, IDs, and percentages were **not modified**.

---

## 5. Reproducibility of reported percentages

Read-only parse of the current register (HEAD `8613c3b`):

| Metric | Value |
| --- | --- |
| Item headings | 237 (1–237, unique) |
| Sum of Completion percentage | **17515** |
| Mean | 17515 / 237 = **73.9029535865…** |
| Reported overall | **73.90%** |
| Reproducible? | **YES** (standard 2-decimal rounding of the mean) |

Esat Bey items 227–237 Completion percentage:

`[86, 88, 74, 82, 80, 84, 88, 72, 90, 84, 93]`

| Metric | Value |
| --- | --- |
| Sum | **921** |
| Mean | 921 / 11 = **83.727272…** |
| Reported Esat | **83.73%** |
| Reproducible? | **YES** |

Status counts from `Current implementation status` (same file):

| Status | Count | Register summary | Match |
| --- | --- | --- | --- |
| VERIFIED_100 | **0** | 0 | Yes |
| PARTIAL | **216** | 216 | Yes |
| HUMAN_APPROVAL_REQUIRED | **13** | 13 | Yes |
| BLOCKED_EXTERNAL_DEPENDENCY | **7** | 7 | Yes |
| NOT_APPLICABLE_WITH_EVIDENCE | **1** | 1 | Yes |
| Total | 237 | 216+13+7+1=237 | Yes |

`BUZZARD_237_HUMAN_APPROVAL_BLOCKERS.md` HUMAN items: 67, 73, 115/129, 155/165, 182, 213, 214, 219, 221, 225, 226 → **13** distinct numbers (115 and 129 counted separately; 155 and 165 counted separately). BLOCKED: 87, 88, 185, 205/212, 217, 220 → **7** distinct numbers. **Agrees** with register status counts.

**Auditability vs original source:** percentages are **reproducible from the derived register**. They are **NOT FULLY AUDITABLE** against original 237 wording, because that wording is not in this repository. Established-scope scores must not be treated as original-criteria 100%.

**Older scoring system:** `COMPLETION_PERCENTAGES.md` reports ~82.0% code implementation under `whole-software-weighted-v1` / 148. That number is **not** the 237 mean and was **not** used to verify 73.90% / 83.73%.

---

## 6. Esat Bey reports — existence and cross-check

All three requested reports **exist** under `docs/software-completion/`:

| File | Exists | Written against HEAD (self-reported) |
| --- | --- | --- |
| `BUZZARD_ESAT_BEY_FINAL_HARDENING_REPORT_2026-10-15.md` | Yes | start `87a5e30` |
| `BUZZARD_ESAT_BEY_MASTER_SECURITY_REPORT_2026-10-15.md` | Yes | start `b2bdf57` |
| `BUZZARD_ESAT_BEY_FINAL_COMPLETION_AUDIT_2026-10-15.md` | Yes | start `bfc4265` |

Current HEAD `8613c3b` is **later** than those start HEADs (evidence-only commit after HAC consume bind).

### Claims vs repository evidence (inspection, not production)

| Topic | What reports claim | Local evidence class | Finding |
| --- | --- | --- | --- |
| Original 237 source | Not found | Docs + git history | **Agrees** with this investigation |
| Esat / Buzzard % at current register | 83.73 / 73.90; VERIFIED_100=0 | Register parse | **Agrees** at HEAD `8613c3b` |
| Tests | Vitest 113 files / 1084 passed; tsc 0; next build 0; Playwright subsets | **Test evidence in reports / TEST_EVIDENCE** | This COMMAND **did not re-run** tests. Pass counts are **cited evidence**, not re-verified here |
| HAC action binding | consume requires stored action | Code at `server/lib/pusat/approval.js` (prior commit `bb5a70c` / `bfc4265`) | **Code inspection:** action required when stored; `executeTask` passes action. **Not** a live human approval |
| Guardian / Esat paths | `server/lib/pusat/{esatSecurity,guardian,lifecycle}.js` | Code paths exist | Komut 7–10 path `server/lib/software/esatSecurity.js` **does not exist**. Real paths are Pusat. `server/lib/software/lifecycle.js` exists and calls Guardian for marketplace publish |
| Fail-closed | FINANCIAL_BLOCKED, circuit, HAC down deny | Code + unit tests cited | **Local software** claim. **Not** production observation |
| Auth / 2FA | confirm-enable; hashed recovery; login/register public | Code + tests cited | **Local**. Live IdP / email **not** claimed |
| Audit / security events | local incidents; `liveSoc: false` | Reports + code | SIEM/SOC **not connected** |
| Commerce locks | sales / SoT / live payments off | Register + workspace policy | **Standing local locks**; production env **not probed** |
| Backup/restore | isolated scratch restore; not production RESTORE_TESTED | `backupRestoreIntegrity.test.mjs` cited | **Test evidence only**. Production restore **not** performed |
| SOC/SIEM | not connected | Reports | **BLOCKED_EXTERNAL / HUMAN**; this command did not access SOC |

Evidence classes used in this section:

- **Code inspection:** files present at HEAD.
- **Test evidence:** recorded in Esat reports / TEST_EVIDENCE; **not re-executed** in COMMAND 1.
- **Production evidence:** **none**. No production DB, env, restore, or SOC access.

### Report vs register discrepancy (historical, not silently “fixed”)

- Master security report (start HEAD `b2bdf57`) lists Esat domain 8 / item 234 as **66%** (previous 48% “register-verified”).
- Current register item 234 `Completion percentage` is **72%** (`PARTIAL`).
- Hardening report records Esat **83.00% → 83.73%** and Buzzard **73.77% → 73.90%** after that pass.
- Final completion audit (start `bfc4265`) already shows **83.73 / 73.90**, matching current HEAD arithmetic.

This investigation **did not change** item 234. The 66% vs 72% gap is a **document-time vs current-register** mismatch, not a new score.

---

## 7. Evidence discrepancies and limitations

1. **Original 237 wording is missing.** Score is established-scope only. VERIFIED_100 remains 0 for that reason as well as incomplete live verification.
2. **Two scoring systems coexist.** 237 arithmetic mean vs 148-weight `whole-software-weighted-v1`. Mixing them would inflate or confuse percentages; they were kept separate.
3. **Generator is not a historical source.** `SCOPES` in `generate-237-register.mjs` is a later reconstruction of bands, not recovered original titles.
4. **Esat reports predate current HEAD** by one or more commits; percentages at `8613c3b` still match the last audit’s 73.90 / 83.73.
5. **Item 234 percentage** in the master security report (66%) ≠ current register (72%).
6. **Wrong historical Esat file paths** in older Komut text (`server/lib/software/esatSecurity.js`) vs actual `server/lib/pusat/…`.
7. **Test pass counts were not re-run** in this command. Citing 1084 passed is report-level evidence only.
8. **Remote history not fetched.** Unfetched remotes, issues, or attachments are out of scope.
9. **No LIVE_VERIFIED.** Local Guardian on `executeTask` is not SOC/SIEM.
10. **Ahead 36** vs origin: this clone has local commits not necessarily on the remote; this audit still did not fetch or push.

---

## 8. Prioritized next work (not implemented)

COMMAND 1 stops here. The following is a list only.

### 1. Missing evidence to validate the 237-item checklist

**Highest priority:** obtain the **original** 237-item document (titles + acceptance criteria + original order) from outside this clone (author archive, ticket, attachment, or another repository the owner already holds). Until then, do **not** mark VERIFIED_100 and do **not** fabricate titles.

Secondary: if the original lives only on a remote not present locally, an **authorized human** may fetch later; this agent did not fetch.

### 2. Discrepancies in the completion register or score calculation

- Arithmetic of the **current** register is internally consistent (73.90 / 83.73 / 0 / 13 / 7).
- Do **not** “repair” scores to match original criteria that are unknown.
- Optionally, a later **documentation** pass (not a score change) could footnote item 234’s 66% vs 72% report mismatch.
- Do not merge 148-weight scores into the 237 mean.

### 3. Confirmed local security gaps suitable for a separate implementation task

Inspection-only (not started here):

- Production persistence / restore remain unproven (local scratch ≠ production disk).
- Alerting `liveDispatch: false`; no live SOC.
- 2FA/email/IdP live paths not claimed.
- Marketplace live adapters still classification / 409 while sales off (by design).
- HAC still has **no real independent human approval** in this workspace.

Any implementation must remain fail-closed and must not enable `BUZZARD_SALES_ENABLED`, `BUZZARD_PRODUCT_SOT_ACTIVE`, or `BUZZARD_LIVE_PAYMENTS`.

### 4. Blocked by external infrastructure or authorized human action

From `BUZZARD_237_HUMAN_APPROVAL_BLOCKERS.md` (unchanged by this command):

- HUMAN: 67, 73, 115, 129, 155, 165, 182, 213, 214, 219, 221, 225, 226.
- BLOCKED_EXTERNAL: 87, 88, 185, 205, 212, 217, 220 (Inter-Cars/TecDoc live, alerting backend, GitHub CI vs PR, production monitor, production disk).

Production restore and SOC/SIEM access are **not** permission to perform those operations in a follow-up unless independently authorized.

---

## 9. Explicit statement

This document is the product of a **local, read-only forensic investigation**.  
No production operation, deploy, push, PR, merge, live payment, supplier action, customer communication, or scoring change was performed.  
The original completion register and existing reports were not overwritten.  
The original 237-item checklist was **not found** in the currently accessible repository history.

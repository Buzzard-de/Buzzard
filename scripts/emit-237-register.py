#!/usr/bin/env python3
"""Emit the 237-item register from SCOPES in generate-237-register.mjs."""
import pathlib
import re
import json

root = pathlib.Path("/workspace")
src = (root / "scripts/generate-237-register.mjs").read_text()
out_dir = root / "docs/software-completion"

bands = [
    (1, 19, "Baseline, architecture, access control, security foundations, configuration, feature flags, data protection, project integrity"),
    (20, 34, "Buzzard Core, shared business services, common interfaces, data contracts, core infrastructure"),
    (35, 55, "Pusat Orchestrator, agent coordination, central AI memory, specialist agents, task orchestration, error handling, AI governance"),
    (56, 74, "Product catalog, canonical product model, PIM, taxonomy, category localization, product validation, Product SoT readiness (inactive)"),
    (75, 94, "Pricing, profit, supplier integrations, normalization, inventory sync, availability, shipping costs, pricing safeguards"),
    (95, 113, "Orders, checkout, payment adapters, finance, refunds, returns, reconciliation, idempotency, fraud, financial authorization"),
    (114, 136, "Marketplace connectors, listings, market configuration, VAT, localization, multilingual, international expansion"),
    (137, 151, "Homepage, navigation, product pages, search, responsive layouts, CX, accessibility, language/country, RTL, UI regression"),
    (152, 167, "Shipping, customer operations, tracking, notifications, accounts, returns, carriers, operational visibility"),
    (168, 182, "Human Approval Center, exception handling, approval policies, identity, financial limits, hashes, expiry, replay, audit"),
    (183, 195, "Observability, structured logs, metrics, alerting, backup, restore, persistence, recovery, incident evidence"),
    (196, 212, "Unit, integration, API security, E2E, regression, load-safe checks, build, lint, typecheck, release quality"),
    (213, 226, "Production readiness, env config, deployment preparation, integrations, secrets, monitoring, launch controls"),
    (227, 237, "Esat Bey / Guardian maximum-security: threat detection, authz, anomaly, telemetry, containment (no autonomous destructive), audit, isolation, IR"),
]

pat = re.compile(
    r'^\s+(\d+):\s+\[("(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'),\s*("(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'),\s*("(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'),\s*("(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'),\s*(\d+),\s*("(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\')\],',
    re.M,
)

def unq(s):
    return json.loads(s) if s.startswith('"') else s[1:-1]

scopes = {}
for m in pat.finditer(src):
    n = int(m.group(1))
    scopes[n] = [unq(m.group(2)), unq(m.group(3)), unq(m.group(4)), unq(m.group(5)), int(m.group(6)), unq(m.group(7))]

missing = [i for i in range(1, 238) if i not in scopes]
if missing:
    raise SystemExit(f"missing items {missing[:20]} count={len(missing)}")

from collections import Counter
states = Counter(v[3] for v in scopes.values())
avg = sum(v[4] for v in scopes.values()) / 237.0


def pct(n):
    return f"{(n / 237) * 100:.1f}%"


def band_of(n):
    for a, b, t in bands:
        if a <= n <= b:
            return a, b, t
    raise KeyError(n)


DATE = "2026-10-14"

parts = []
parts.append(f"""# Buzzard 237 Master Execution Register

Date: {DATE}  
Branch: `cursor/software-completion-local-c293`  
Inspected ancestor HEAD: `5ba16b2` plus working-tree changes in this pass  
Mode: LOCAL SOFTWARE IMPLEMENTATION + EVIDENCE  
Sales / Product SoT / live payments: **remain OFF**

## Canonical source status

The directive requires preserving the original 237-item numbering, wording, order, and acceptance criteria.

**Search result:** no file in this repository contains a numbered Buzzard software checklist with items 1 through 237. Matches for "237" are GitHub PR #237, EAN `4006633001237`, and unrelated commit SHAs. `FINAL_MASTER_CHECKLIST.md` is a short unchecked architecture list. Historical phase reports are not a 237-item source.

Therefore:

- Original titles: **UNKNOWN**
- Original acceptance criteria: **UNKNOWN**
- Item numbers 1–237 are retained in order
- Established scope is taken only from directive section C category bands plus inspectable code
- No item is labeled VERIFIED_100 solely because code exists
- Nothing is LIVE_VERIFIED

## Summary (established-scope scoring, not original-criteria 100%)

| State | Count | % of 237 |
| --- | --- | --- |
| VERIFIED_100 | {states.get('VERIFIED_100', 0)} | {pct(states.get('VERIFIED_100', 0))} |
| PARTIAL | {states.get('PARTIAL', 0)} | {pct(states.get('PARTIAL', 0))} |
| HUMAN_APPROVAL_REQUIRED | {states.get('HUMAN_APPROVAL_REQUIRED', 0)} | {pct(states.get('HUMAN_APPROVAL_REQUIRED', 0))} |
| BLOCKED_EXTERNAL_DEPENDENCY | {states.get('BLOCKED_EXTERNAL_DEPENDENCY', 0)} | {pct(states.get('BLOCKED_EXTERNAL_DEPENDENCY', 0))} |
| BLOCKED_AUTHORIZATION | {states.get('BLOCKED_AUTHORIZATION', 0)} | {pct(states.get('BLOCKED_AUTHORIZATION', 0))} |
| BLOCKED_SECURITY | {states.get('BLOCKED_SECURITY', 0)} | {pct(states.get('BLOCKED_SECURITY', 0))} |
| NOT_IMPLEMENTED | {states.get('NOT_IMPLEMENTED', 0)} | {pct(states.get('NOT_IMPLEMENTED', 0))} |
| NOT_APPLICABLE_WITH_EVIDENCE | {states.get('NOT_APPLICABLE_WITH_EVIDENCE', 0)} | {pct(states.get('NOT_APPLICABLE_WITH_EVIDENCE', 0))} |
| FAILED_VERIFICATION | {states.get('FAILED_VERIFICATION', 0)} | {pct(states.get('FAILED_VERIFICATION', 0))} |
| NOT_STARTED | 0 | 0.0% |

Mean established-scope completion: **{avg:.1f}%**. This is not 237/237 done.

## Safety locks this workspace

- `BUZZARD_SALES_ENABLED` is not `1`
- `BUZZARD_PRODUCT_SOT_ACTIVE` is not treated as active in software (`productSourceOfTruthActive: false`)
- `BUZZARD_LIVE_PAYMENTS` effective flag is false without sales
- No production probe, deploy, merge, live payment, PO, listing, or carrier purchase

## Software implemented this pass (in-order gaps)

1. Feature-flag parent/child now includes `BUZZARD_LIVE_PAYMENTS` and `BUZZARD_PRODUCT_SOT_ACTIVE` (SoT stays software-inactive).
2. Production environment validation errors when live payments are armed without sales.
3. Payment diagnostics and secureCommerce flags report **effective** flags, not raw env for SoT/live payments.
4. Human Approval Center rejects AI self-approval and missing approver identity.
5. `/api/health*` uses a separate still-enabled rate-limit bucket so probes do not share the global `api:` 180/min bucket. Rate limiting is **not** disabled.
6. Product architecture tests resolve files from the repository root, not `process.cwd()`.

---
""")

for a, b, title in bands:
    parts.append(f"## Items {a}–{b}: {title}\n")
    for n in range(a, b + 1):
        scope, criteria, files, state, ipct, remaining = scopes[n]
        ba, bb, _ = band_of(n)
        tests = (
            "Focused vitest this session (see BUZZARD_237_TEST_EVIDENCE.md)"
            if n <= 19 or n in (12, 41, 61, 62, 171, 178, 208, 11)
            else "See TEST_EVIDENCE; not every item re-executed this session"
        )
        blob = scope + remaining + state
        human = (
            "See HUMAN_APPROVAL_BLOCKERS.md if state is HUMAN or BLOCKED"
            if re.search(r"HUMAN|BLOCKED_EXTERNAL|deploy|live|SoT|listing|order|pay", blob, re.I)
            else "None beyond standing safety locks"
        )
        parts.append(f"""### Item {n}

| Field | Value |
| --- | --- |
| Original title | **UNKNOWN** — canonical numbered 237-item checklist file was not found in this repository or `docs/software-completion` |
| Title source | SCOPE_ESTABLISHED_FROM_DIRECTIVE_CATEGORY_BAND ({ba}–{bb}) |
| Established scope | {scope} |
| Original acceptance criteria | **UNKNOWN as authored.** Established criteria: {criteria} |
| Current implementation status | {state} |
| Existing implementation evidence | {files} |
| Identified gaps | {remaining} |
| Required changes | Complete remaining local software without enabling sales/SoT/live payments; record human/external blockers |
| Files and modules involved | {files} |
| Security and data-integrity implications | Must not weaken auth, CSRF, CORS, rate limits, finance locks, or approval gates |
| Dependencies | Previous items in band {ba}–{bb}; commercial children depend on item 12 flags remaining off |
| Human approval requirements | {human} |
| Tests required | Meaningful unit/integration covering the established criteria |
| Exact tests executed and results | {tests} |
| Integration status | ADAPTER_IMPLEMENTED or MOCK_OR_SIMULATED unless noted; **LIVE_VERIFIED never claimed** |
| Sandbox verification status | UNKNOWN unless a named sandbox test is in TEST_EVIDENCE |
| Production verification status | UNKNOWN |
| Completion percentage | {ipct}% (established-criteria weighting; original unknown criteria cannot be 100%) |
| Remaining work | {remaining} |
| Final evidence references | `docs/software-completion/BUZZARD_237_TEST_EVIDENCE.md`; HEAD working tree after this pass |
| Final state and date | {state} / {DATE} |
""")

text = "\n".join(parts)
path = out_dir / "BUZZARD_237_MASTER_EXECUTION_REGISTER.md"
path.write_text(text)
print("wrote", path, "items", 237, "bytes", len(text), "avg", round(avg, 1), dict(states))
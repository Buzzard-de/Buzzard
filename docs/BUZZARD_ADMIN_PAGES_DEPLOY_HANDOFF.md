# Buzzard Admin Pages — GitHub Pages Deploy Handoff

Behebt die **Live-Deploy-Lücke** für:

- `https://buzzard24.de/admin/returns/`
- `https://buzzard24.de/admin/analytics-foundation/`

**Kein Redirect.** Seiten existieren im Repo (`app/admin/returns/page.tsx`, `app/admin/analytics-foundation/page.tsx`); GitHub Pages baut nur von **`main`**.

## Git snapshot (at handoff authoring)

| Field | Value |
|--------|--------|
| **CURRENT_BRANCH** | `cursor/admin-pages-deploy-gap-c293` |
| **CURRENT_COMMIT** | `19c3d3d` — `fix(pages): port admin returns and analytics-foundation for GitHub Pages` |
| **MAIN_COMMIT** | `38384532b5cc380b0607dcc13e17c80161bacd7b` — `fix: sync UI language when country is selected in header` |
| **MISSING_COMMIT** | `app/admin/returns/`, `app/admin/analytics-foundation/`, nav slugs, and client libs were **absent on `main`** (originally on feature line `49cb3b8`, `c6d5e89`) |
| **REQUIRED_MERGE** | Merge PR from `cursor/admin-pages-deploy-gap-c293` → **`main`** (minimal port of existing pages + deps + nav) |
| **REQUIRED_DEPLOY** | GitHub Actions workflow **Deploy to GitHub Pages** (`.github/workflows/deploy-pages.yml`) on push to `main`, or **workflow_dispatch** |

## GitHub Pages workflow (unchanged — verified)

| Check | Status |
|--------|--------|
| Branch trigger | `push` → `main`, `workflow_dispatch` |
| Build | `npm ci && npm run build` |
| Output | Next `output: "export"` → `./out` |
| Artifact | `upload-pages-artifact` path `./out` |
| Deploy | `deploy-pages@v4` |
| Base path | Default (site root `https://buzzard24.de`) |
| `NEXT_PUBLIC_SALES_ENABLED` | `"0"` (must stay) |

No workflow change required unless CI fails on `main` after merge.

## Live URLs & expectation

| URL | Expected after deploy |
|-----|------------------------|
| `/admin/returns/` | HTTP **200** |
| `/admin/analytics-foundation/` | HTTP **200** |

Regression: existing admin routes (e.g. `/admin/returns-rma/`) must remain **200**.

## Verification (operator)

```bash
npm run typecheck
npm run lint
npm run build
test -f out/admin/returns/index.html
test -f out/admin/analytics-foundation/index.html
npm run verify:admin-pages-deploy
BUZZARD_SITE_URL=https://buzzard24.de node scripts/verify-go-live.mjs
```

**Live PASS rule:** `LIVE_ADMIN_*` may only be **PASS** when real HTTP returns **200**. Local `out/` alone is **not** live evidence.

## Status semantics

- `LOCAL_BUILD` / `ADMIN_*_LOCAL` → after `npm run build` on merged code
- `LIVE_ADMIN_*` → **UNVERIFIED_EXTERNAL** until Pages deploy completes and URLs return 200
- `PAGES_DEPLOY` → **HUMAN_REQUIRED** until live verify passes → **VERIFIED**

## Deployment completion (live evidence)

| Field | Value |
|--------|--------|
| **PR** | [#366](https://github.com/Buzzard-de/Buzzard/pull/366) — **MERGED** |
| **MAIN_AFTER_MERGE** | `ca1fe31af7b20564b37ccae50e6c6611b12793d0` |
| **PAGES_WORKFLOW** | [Run 35532890070](https://github.com/Buzzard-de/Buzzard/actions/runs/35532890070) — **success** |
| **PAGES_DEPLOY** | **VERIFIED** |
| **LIVE_ADMIN_RETURNS** | **PASS** (HTTP 200) |
| **LIVE_ADMIN_ANALYTICS_FOUNDATION** | **PASS** (HTTP 200) |
| **SALES_ENABLED** | **0** |
| **Verified at** | 2026-09-20 (UTC) via `npm run verify:admin-pages-deploy` |

No further operator action required for this deploy gap.

**Do not** set `SALES_ENABLED=1`. **Do not** claim live fix without HTTP evidence.

# BUZZARD — Source Code Statistics

**Inventory version:** 1.0  
**Measured:** 2026-11-19, 15:52 Europe/Berlin  
**Branch:** `cursor/master-phases-6-21-c293` (worktree)  
**HEAD:** `3df03351626a9147374b0dd3b1fe622d875a1094`

## Counting method

- **Tool:** Custom Node.js walker (`fs.readdirSync` + line scan). No estimates.
- **Excluded directories (not walked):** `node_modules`, `.git`, `.next`, `dist`, `build`, `out`, `.turbo`, `coverage`, `.cache`, `artifacts`, `playwright-report`, `test-results`, `.vercel`
- **Line classification:** Blank = empty/whitespace; comment = `//`, `#`, `/* */` prefix heuristics; **code** = all other lines.
- **Primary application source:** Extensions `.js`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.jsx`, `.py` under `server/`, `app/`, `components/`, `lib/`, `e2e/`, `scripts/` (tests counted separately).
- **Not in primary total:** Bulk `data/` JSON (~932k code lines), `intelligence/` Python archive, `public/` static dumps, `package-lock.json`, markdown, patches.

## Repository file counts (excluded caches)

| Category | Files |
|----------|------:|
| **Total files walked** | **4,480** |
| Backend (`server/`) | 779 |
| Frontend (`app/`, `components/`, `lib/`) | 499 |
| Tests (`server/__tests__`, `e2e`, `*.test.*`) | 201 |
| Data (`data/`, `server/data/`) | 140 |
| Documentation (`*.md`, `docs/`) | 846 |
| Configuration | 186 |
| Scripts | 83 |
| AI/automation (path heuristic) | 16 |
| Other | 1,726 |
| Assets (binary/svg) | 4 |

**Empty / near-empty files:** 390 (many `intelligence/**/.gitkeep`, `__init__.py` stubs).

## Line totals (full repo walk, all extensions)

| Metric | Lines |
|--------|------:|
| Total lines | 1,707,424 |
| Blank | 41,276 |
| Comment | 3,696 |
| **Code (all extensions)** | **1,662,452** |

### Dominance of non-source artifacts

| Top contributor | Code lines | Note |
|-----------------|-----------:|------|
| `data/` directory | 932,584 | Taxonomy / catalog JSON — not application source |
| `intelligence/` | 400,967 | Parallel Python AI tree — mostly not wired to Node API |
| `server/` | 123,188 | Primary backend + tests |
| `public/` | 43,725 | Static / taxonomy mirrors |
| `Markdown` | 46,178 | Docs and reports |

## Primary application source (excluded bulk data/intelligence)

| Metric | Value |
|--------|------:|
| Application source **files** | 1,550 |
| **Effective code lines** | **169,831** |
| Blank | 16,127 |
| Comment | 3,160 |
| **Backend effective lines** (`server/`, excl. tests) | **80,912** |
| **Frontend effective lines** (`app/`, `components/`, `lib/`, `e2e/`, excl. tests) | **67,083** |
| Test source files (in scope roots) | 200 |

### By language (application roots only)

| Language | Effective code lines (approx., from full-repo lang bucket) |
|----------|---------------------------------------------:|
| JavaScript | 116,153 (repo-wide; server is majority) |
| TypeScript | 61,332 |
| Python | 47,936 (mostly `intelligence/`, outside primary roots) |

### Legacy / parallel trees (reported separately)

| Tree | Effective code lines (repo-wide) |
|------|---------------------------------:|
| `intelligence/` (Python + manifests) | ~400,967 |
| `data/` JSON | ~932,584 |

## Backend vs frontend file counts (application roots)

| Area | Source files (incl. tests in server) |
|------|-------------------------------------:|
| Backend | 768 |
| Frontend | 582 |

## API surface (static count)

| Metric | Count | Method |
|--------|------:|--------|
| Express `app.(get\|post\|put\|patch\|delete)` in `server/plugins` + `server/server.js` | **772** | `rg` occurrence sum |
| Plugins exporting `register(app)` | **92** | `server/plugins/*.js` |
| `routePermissions.js` EXACT route keys | **188** | parse source |
| `adminRouteMatrix.test.mjs` enumerated routes | **122** | parse test file |

## Test infrastructure (files only)

| Location | `.mjs` test files |
|----------|------------------:|
| `server/__tests__/` | 173 |
| Total vitest cases (current run) | 1,950 |

## Historical limitation

Earliest git commit in this clone: **2026-07-25** (`d4f8ddc2`). Earlier offline or squashed history is **not available** in the remote graph; first-day development cannot be reconstructed beyond this root.
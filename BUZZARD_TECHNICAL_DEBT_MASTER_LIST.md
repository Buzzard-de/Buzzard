# BUZZARD — Technical Debt Master List

**Ranked P0–P3** · Evidence from inventory walk + audits · 2026-11-19

## P0 — Critical

| ID | Debt | Evidence |
|----|------|----------|
| P0-1 | No single **order** source of truth | `ordersPlugin.js`, `orderService.js`, `orderManagementOrchestrator.js`, multiple plugins |
| P0-2 | No single **product/catalog** source of truth | `productStore.js`, PIM plugins, SQLite vs JSON |
| P0-3 | Live API security / graph **not proven** equal to vitest worktree | PR #507 unapplied on :3001; operator blocked restart |
| P0-4 | Protected `buzzard.db` hash **drifted** from earlier baseline | See `BUZZARD_COMPLETE_TECHNICAL_INVENTORY.md` §5 |
| P0-5 | Open PRs #507/#508 **mergeable_state: dirty** | GitHub API 2026-11-19 |

## P1 — High

| ID | Debt | Evidence |
|----|------|----------|
| P1-1 | **92 plugins** — overlapping “partNN/finalNN” health plugins | `server/plugins/part*`, `final*` |
| P1-2 | Carrier seed **V2–V11** duplication | `carrierMasterV*.js`, `eu27SeedV*.js` |
| P1-3 | Phase gate **100%** misleading vs verified **~60%** | `buzzard_ordered_phases.v1.json` dual ledger |
| P1-4 | Textile AI **skeleton** vs roadmap claims | `textileSandbox.js` only |
| P1-5 | Marketplace **dry-only** depth (no order ingest E2E) | connector registry |
| P1-6 | `intelligence/` **400k LOC** unwired parallel stack | not in `server.js` |
| P1-7 | Full vitest with `BUZZARD_DB_ENABLED=0` **breaks 347 tests** | misconfiguration hazard |

## P2 — Medium

| ID | Debt | Evidence |
|----|------|----------|
| P2-1 | Multiple auth stacks | `auth.js`, `dbAuth.js`, `customerAuth.js`, `identitySecurity.js` |
| P2-2 | TODO/FIXME sparse in app code (low count in grep) — debt more architectural than comment-based | |
| P2-3 | Taxonomy JSON **duplicated** `data/` vs `public/` | file inventory |
| P2-4 | Marketing phase **synthetic only** | phase18 |
| P2-5 | Performance phase **trivial probe** | phase20 |
| P2-6 | Missing browser E2E proof for full customer journey on :3000 | NOT_VERIFIED |
| P2-7 | 390 empty/gitkeep files in intelligence trees | inventory |

## P3 — Low

| ID | Debt | Evidence |
|----|------|----------|
| P3-1 | Documentation volume (840+ MD files) vs code drift risk | |
| P3-2 | Historical reports/patches in repo root | `*.patch` |
| P3-3 | `helloPlugin.js` — sample plugin still present | |
| P3-4 | Multiple analytics plugin versions (v39, dashboard, analytics) | |

## Circular / dead code signals

- `coreEngineChain.js` — primarily test-invoked chain.
- Many `*ReadinessPlugin.js` — status JSON only, no business mutation.
- Python packages with only `__init__.py` — **dead scaffolding**.

## Test gaps

- Live webhook with real provider secret.
- Storefront Playwright at scale against :3000 (blocked this audit).
- Cross-plugin contract tests for unified SoT.
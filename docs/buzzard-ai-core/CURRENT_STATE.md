# BUZZARD AI CORE — CURRENT STATE

**Date:** 2026-08-21  
**Scope:** Full repository analysis before production-grade AI Core consolidation  
**Directive:** Master Development Directive v1 — analysis phase only (no implementation yet)

---

## 1. Executive Summary

Buzzard is a **multi-tier monorepo** with real commerce capabilities, a large Python intelligence stack, and many **static HTML “OS console” demos** that visually represent the target AI Core but are **not** production backends.

| Layer | Technology | Deployed? | Maturity |
|-------|------------|-----------|----------|
| Storefront | Next.js 15 static export | ✅ GitHub Pages (`buzzard24.de`) | Production (catalog mode) |
| Commerce API | Node.js + SQLite | ✅ Render (`buzzard-api`) | Production-capable, sales gated |
| Intelligence API | Python FastAPI + SQLite | ⚙️ Render blueprint (`buzzard-intelligence`) | Partial — many modules, fragmented |
| AI Core (target) | Not unified | ❌ | Concept exists across 6+ orchestrators, 10+ memory stores |

**Current mode:** Catalog / intelligence-first. `BUZZARD_SALES_ENABLED=0`, `NEXT_PUBLIC_SALES_ENABLED=0`.

**Key finding:** The repository already contains ~70% of the *building blocks* for BUZZARD AI CORE, but they are **not wired into one platform** with one database, one orchestrator, one memory, and one security layer.

---

## 2. Repository Structure

```
/workspace/
├── app/                    # Next.js App Router — shop, admin (~47 pages), i18n (de/en/tr/ar)
├── components/             # React UI (shop, admin, AI widget, SEO)
├── lib/                    # Frontend clients, commerce, i18n, API config
├── server/                 # Node commerce API — 51 plugins, SQLite (~174 tables)
├── intelligence/           # Python AI stack — primary: buzzard_ai_complete/
│   ├── buzzard_ai_complete/   # Canonical FastAPI AI Core (72 top-level modules)
│   ├── buzzard_intelligence/  # Legacy v1–v200 modules (203 .py files)
│   ├── buzzard_ai_gesamt/     # Bey agents (dogu/aslan/esat) — overlaps complete/
│   ├── buzzard_ki_gesamt/     # Backup/symlink tree — drift risk
│   ├── live_connectors/       # eBay, Amazon parsers
│   ├── main.py                # 6,293-line CLI (200+ subcommands)
│   └── archive/               # ZIP snapshots
├── data/                   # Seeds, taxonomy source JSON, specs
├── public/taxonomy/        # Published HTML/JSON consoles (static demos)
├── scripts/                # Build, verify, deploy, taxonomy sync
├── docs/                   # Go-live, security, session checkpoints
├── Buzzard/                # Python launcher (api + voice)
├── gizli/                  # Duplicate voice/API entrypoints
└── render.yaml             # Node API + Python intelligence services
```

---

## 3. Technology Stack

### Frontend
- **Next.js 15** App Router, **React 19**, TypeScript 5.7
- `output: "export"` — static site only (no SSR API in production)
- Multilingual: `de` (default), `en`, `tr`, `ar` (RTL) — `lib/i18n/`
- Brand: black/gold custom CSS (no Tailwind)

### Commerce API (`server/`)
- Custom HTTP router (`server/server.js`) — not Express/Fastify
- **SQLite** via `better-sqlite3` — schema inline in `server/lib/db.js` (~3,320 lines)
- **51 plugins** — orders, suppliers, CRM, analytics, AI center, taxonomy, etc.
- JWT auth, rate limiting (180 req/min), CORS allowlist

### Intelligence API (`intelligence/buzzard_ai_complete/`)
- **FastAPI** + Uvicorn on port 8000
- **SQLite** — `database/db.py` (claims, memory, tasks, agents, commerce tables)
- **58+ pytest files** — not run in root CI
- Docker deploy: `buzzard_ai_complete/deploy/docker/Dockerfile`

### Deployment (`render.yaml`)
| Service | Runtime | Health |
|---------|---------|--------|
| `buzzard-api` | Node | `/api/health` |
| `buzzard-intelligence` | Docker (Python) | `/health` |

Node API bridges to Python via `BUZZARD_INTELLIGENCE_API_URL` or falls back to **embedded mode** (`server/lib/embeddedIntelligence.js`).

---

## 4. What Works Today (Real Backends)

### 4.1 Commerce Platform (Node)
| Capability | Evidence | Status |
|------------|----------|--------|
| Product catalog | `server/plugins/databasePlugin.js`, `products` table | ✅ Working |
| Cart / checkout scaffold | `cartCheckoutPlugin.js` | ⚙️ Gated (`SALES_ENABLED=0`) |
| Orders | `ordersPlugin.js` | ✅ Schema + API |
| Suppliers v1.6 | `supplierHubPlugin.js`, `server/lib/supplierHub.js` | ✅ Registry, feed sync jobs |
| Suppliers v3.1 | `supplierIntegrationHubPlugin.js` | ✅ Separate schema (`supih_*`) |
| CRM / loyalty / marketing | Multiple v0.3–v4.0 plugins | ⚙️ Scaffold tables |
| Admin UI | `app/admin/*` (47 pages) | ✅ Mirrors API plugins |
| Search index | `scripts/sync-search-index.mjs` | ✅ Working |
| Taxonomy sync | `scripts/run_taxonomy_auto_sync.py`, CI workflow | ✅ 53 L1 → 48 master mapped |

### 4.2 Intelligence Platform (Python)
| Capability | Path | Status |
|------------|------|--------|
| FastAPI app (30+ routers) | `buzzard_ai_complete/api/app.py` | ✅ Runnable |
| Core orchestrator (Bey) | `core/orchestrator.py` — AslanBey + EsatBey gate | ⚙️ Minimal (13 lines) |
| Memory store | `memory/store.py` — versioned SQLite KV | ✅ Working |
| Category Intelligence 43 | `category_intelligence_43_maximal/` | ⚙️ `live_activation: false` |
| Category Intelligence 47 | `category_intelligence_47_maximal/` | ⚙️ Evidence/research layer |
| Master Taxonomy 48 | `master_taxonomy_48_maximal/` | ✅ 48 L1 DE taxonomy |
| AI Council 18 | `ai_council_18_unified/` | ✅ 18 agents + shared memory |
| AI Council 19 (Customs) | `ai_council_19_customs_bureaucracy/` | ✅ Customs specialist |
| Supplier Intelligence | `supplier_intelligence_ai_maximal/` | ✅ Scoring + FastAPI |
| Production Bridge | `production/bridge.py` — 14 go-live gates | ✅ Env-based checks |
| Phone Assistant | `ai_phone_assistant/` | ⚙️ Module exists |
| PIM / multilingual | `pim_product_master/`, `multilingual_product_intelligence/` | ⚙️ Partial |
| Order engine routes | `order_engine/api/routes.py` | ⚙️ Python-side scaffold |
| Commerce routes | `commerce/api/routes.py` | ⚙️ Python-side scaffold |

### 4.3 Integration Bridge
| Mode | Trigger | Behavior |
|------|---------|----------|
| Embedded | `BUZZARD_EMBEDDED_INTELLIGENCE=1` or no API URL | Node reads local taxonomy JSON |
| Bridge | `BUZZARD_INTELLIGENCE_API_URL` set | Node proxies to Python FastAPI |
| Direct | `python Buzzard/app.py api` | Standalone Python API |

### 4.4 CI/CD
| Workflow | Runs |
|----------|------|
| `ci.yml` | lint, typecheck, build, security-check, render-preflight |
| `deploy-pages.yml` | Static site → GitHub Pages |
| `deploy-api.yml` | Render API deploy + health wait |
| `verify-go-live.yml` | Production URL checks |
| `taxonomy-auto-sync.yml` | Taxonomy pipeline on `main` |

**Gap:** Python `pytest` not in root CI. No E2E browser tests.

---

## 5. What Is Demo / Static Only

| Artifact | Location | Reality |
|----------|----------|---------|
| AI Core HTML console | `public/taxonomy/buzzard_ai_core_maximum_single_file.html` | In-browser JS, `localStorage` — **no backend** |
| Kurmay AI | Inside HTML consoles only | **No Python/Node module** |
| Exception Center UI | Inside HTML consoles | **No dedicated exception service** |
| Intelligence OS consoles | 14 HTML files in `public/taxonomy/` | Generated artifacts, client-side state |
| Category worker schedulers | `*/scheduler.py` in complete | Stubs — comments say "use Celery/K8s" |
| v3.2–v4.0 Node plugins | `orderManagementV32Plugin.js` etc. | Generic `records`/`jobs` scaffold |
| v34–v200 JSON modules | `buzzard_v34.json` … `buzzard_v200.json` | File-based, no runtime |

---

## 6. The 11 Systems — Directive Mapping vs Current State

| # | Directive System | Current State | Gap |
|---|------------------|---------------|-----|
| 1 | Central AI worker structure | 6+ orchestrators, no unified worker registry | **Major** — needs consolidation |
| 2 | Category AI connections | 43/47/48 modules, 55 config entries, `live_activation: false` | **Major** — unify numbering, enable |
| 3 | Customs AI | Council 19 + HTML UI | **Medium** — no full pipeline to exception |
| 4 | Supplier / API / XML hub | Node v1.6 + v3.1 + Python supplier intelligence | **Medium** — duplicate hubs, no canonical adapter |
| 5 | Price + stock automation | Python commerce schema + Node WMS plugin | **Medium** — no unified price engine with policy gate |
| 6 | Order automation | Node `ordersPlugin` + Python `order_engine` | **Medium** — two implementations, sales gated |
| 7 | Product creation / categorization AI | PIM plugins + `product_enrich` task type in HTML | **Medium** — no canonical product pipeline |
| 8 | Customer service AI | `aiAutomationPlugin`, phone assistant | **Medium** — intent pipeline partial |
| 9 | Central memory + reporting | 10+ memory stores (see §7) | **Major** — no single memory |
| 10 | Esat Bey security layer | `agents/esat_bey/`, Node security plugins | **Medium** — not enforced platform-wide |
| 11 | Exception engine | HTML UI only | **Major** — no backend lifecycle |

---

## 7. Duplicate & Overlapping Systems

### 7.1 Orchestrators (6+)
1. `buzzard_intelligence/orchestrator.py` — Council v20, SQLite
2. `buzzard_ai_complete/core/orchestrator.py` — AslanBey/EsatBey (minimal)
3. `intelligence_pipeline/orchestrator.py` — 7-stage pipeline
4. `ai_council_18_unified/council/orchestration/orchestrator.py` — 18 agents
5. `control_center/orchestrator.py` — Platform control
6. `launch_sequence_maximal/launch/orchestrator.py` — Go-live stages
7. `server/plugins/orderAutomationPlugin.js` — Node job queue

### 7.2 Memory Stores (10+)
1. `buzzard_intelligence/memory.py` — v2
2. `buzzard_intelligence/shared_memory.py` — v12
3. `buzzard_intelligence/learning_memory.py` — v31
4. `buzzard_intelligence/enterprise_memory.py`
5. `buzzard_intelligence/agent_memory.py`
6. `buzzard_ai_complete/memory/store.py` — **best candidate for canonical**
7. `ai_council_18_unified/council/memory/shared_memory.py` — in-memory
8. `buzzard_ai_gesamt/memory/store.py` — Bey agents
9. `ai_phone_assistant/memory_facade.py` — phone context
10. HTML `state.memory[]` — demo only

### 7.3 Category Intelligence Numbering
| Number | Meaning | Source |
|--------|---------|--------|
| 43 | KFZ main categories | `kfz_shop_bridge.json` |
| 47 | Non-KFZ research categories | `category_intelligence_47_maximal/` |
| 48 | Master L1 DE taxonomy | `buzzard_master_48_main_categories_de.json` |
| 53 | Shop L1 categories (live) | Taxonomy auto-sync |
| 55 | UI marketing (48 + 7 meta) | AI Core HTML console |

**Inconsistency:** `category_intelligence_43_maximal` config has 55 entries with duplicate IDs.

### 7.4 Supplier Hubs
- Node `supplierHubPlugin.js` (v1.6) — primary, TecDoc, dropship
- Node `supplierIntegrationHubPlugin.js` (v3.1) — separate `supih_*` schema
- Python `supplier_intelligence_ai_maximal/` — evidence scoring
- Legacy `buzzard_intelligence/supplier.py` (v18)

### 7.5 Structural Mirrors (drift risk)
- `buzzard_ki_gesamt/aktiv/` — symlinks + partial copies of canonical paths
- `public/taxonomy/` ↔ `data/taxonomy/` ↔ `buzzard_ki_gesamt/aktiv/*`
- `Buzzard/` ↔ `gizli/` ↔ `intelligence/` entrypoints

---

## 8. Database State

### Commerce DB (Node — production path)
- **Engine:** SQLite (`better-sqlite3`)
- **Path:** `server/data/buzzard.db` (override: `BUZZARD_DB_PATH`)
- **Schema:** Inline in `server/lib/db.js` — ~174 `CREATE TABLE` statements
- **Migrations:** Conditional `ALTER TABLE` blocks — **no versioned migration runner**
- **Risk:** Render free tier = ephemeral disk; data lost on redeploy

### Intelligence DB (Python)
- **Engine:** SQLite
- **Schema:** `intelligence/buzzard_ai_complete/database/db.py`
- **Tables:** claims, memory, memory_history, tasks, agents, products, orders, suppliers, competitor_prices, etc.
- **PostgreSQL:** Documented in `production_integration_maximal/deployment/docker/compose.production.yml` — **not used in production deploy**

### Gap vs Directive
Directive requires **PostgreSQL**, versioned migrations, seeds, indexes, foreign keys, transactions. Current state uses **two separate SQLite databases** with inline schemas.

---

## 9. API Surface

### Node API (`/api/*`)
- 51 plugins — health, orders, suppliers, CRM, AI center, taxonomy, intelligence bridge, etc.
- Auth: JWT (`JWT_SECRET`), admin credentials
- No unified `/api/v1/*` versioning

### Python FastAPI
- 30+ routers mounted in `api/app.py`
- Auto OpenAPI docs when running
- Token auth via `API_TOKEN` header
- Routes include: commerce, CRM, marketing, production bridge, taxonomy (43/47/48), phone, council, category intelligence, supplier intelligence, etc.

### Gap vs Directive
Directive requires versioned `/api/v1/agents`, `/api/v1/tasks`, `/api/v1/memory`, etc. with unified auth. Current APIs are **module-scoped** with inconsistent paths.

---

## 10. Security Posture

### Exists
- JWT auth (Node), API token (Python)
- Rate limiting (Node: 180/min)
- CORS allowlist
- `agents/esat_bey/` — security gate in core orchestrator
- Account lockout, 2FA lib (Node)
- `scripts/security-check.mjs` in CI
- RBAC tables in Node DB
- `api_keys` table in Python DB
- Secrets via env vars (`.env.example`, `.env.render.example`)

### Gaps / Risks
- No platform-wide RBAC enforcement across Node + Python
- AI workers can theoretically call APIs without unified permission model
- No MFA enforcement (MFA-ready only)
- Audit logs not immutable across both databases
- `ADMIN_PASSWORD` / `JWT_SECRET` must be set manually for production
- Stripe/PayPal keys empty — payments not live
- No wired APM/error tracking (`ERROR_TRACKING_DSN` placeholder)
- Duplicate entrypoints (`gizli/`, `Buzzard/`) increase attack surface

---

## 11. Observability

| Capability | Status |
|------------|--------|
| Health endpoints | ✅ Node `/api/health`, Python `/health` |
| Structured logs | ⚙️ Partial — no unified format |
| Metrics | ❌ Not wired |
| Request IDs | ⚙️ Partial in some plugins |
| Worker execution metrics | ❌ |
| Supplier sync status | ⚙️ Job tables exist, no dashboard metrics |
| Error tracking | ❌ DSN placeholder only |

---

## 12. Testing

| Type | Location | In CI? |
|------|----------|--------|
| Python unit/integration | `intelligence/buzzard_ai_complete/tests/` (58 files) | ❌ |
| Live connector tests | `intelligence/live_connectors/tests/` | ❌ |
| Node smoke test | `scripts/smoke-core.mjs` | ❌ |
| Frontend lint/typecheck | `npm run lint`, `npm run typecheck` | ✅ |
| Build | `npm run build` | ✅ |
| Go-live verify | `scripts/verify-go-live.mjs` | ✅ (separate workflow) |
| E2E / browser | None | ❌ |
| Server unit tests | None | ❌ |

---

## 13. Production Blockers

| # | Blocker | Impact |
|---|---------|--------|
| 1 | No unified AI Core platform (6 orchestrators, 10 memories) | Cannot operate as single system |
| 2 | Two SQLite DBs, no PostgreSQL in prod path | Data fragmentation, no scale |
| 3 | Ephemeral disk on Render free tier | Data loss on redeploy |
| 4 | Sales disabled, no payment credentials | Commerce not live |
| 5 | Category AI `live_activation: false` | Agents not running |
| 6 | No worker daemon / job runner | Schedulers are stubs |
| 7 | Kurmay + Exception = UI only | No backend lifecycle |
| 8 | Python tests not in CI | Regression risk |
| 9 | HTML demos mistaken for production | Architectural confusion |
| 10 | Duplicate supplier hubs, category numbering | Integration complexity |
| 11 | No versioned DB migrations | Schema drift risk |
| 12 | LLM default `AI_PROVIDER=rules` | No real AI without API keys |

---

## 14. Technical Debt Summary

1. **Fragmentation** — 72 Python modules, 51 Node plugins, 14 HTML consoles, legacy v1–v200
2. **Naming drift** — 43/47/48/53/55 category counts used interchangeably
3. **Mirror trees** — `buzzard_ki_gesamt/`, `buzzard_ai_gesamt/`, `archive/` duplicate canonical code
4. **Inline schemas** — no migration framework in Node or Python
5. **Scaffold plugins** — v3.2–v4.0 use generic tables without business logic
6. **Static export constraint** — Next.js cannot run server API routes in production
7. **Embedded intelligence fallback** — masks missing Python service in production

---

## 15. Assets to Preserve (Do Not Delete)

| Asset | Path | Reason |
|-------|------|--------|
| Shop storefront + i18n | `app/`, `lib/i18n/`, `components/` | Live production site |
| Node commerce API | `server/` | Orders, suppliers, CRM, admin |
| Python AI complete | `intelligence/buzzard_ai_complete/` | Canonical intelligence stack |
| 48-category DE taxonomy | `data/taxonomy/buzzard_master_48_main_categories_de.json` | Master taxonomy |
| Taxonomy auto-sync | `intelligence/scripts/run_taxonomy_auto_sync.py` | CI pipeline |
| Category intelligence agents | `category_intelligence_43_maximal/`, `_47_maximal/` | Expert worker foundation |
| Bey agents | `agents/aslan_bey`, `esat_bey`, `dogu_bey` | Orchestrator + security |
| Production bridge gates | `production/bridge.py` | Go-live checks |
| Supplier intelligence | `supplier_intelligence_ai_maximal/` | Evidence-based scoring |
| Live connectors | `live_connectors/` | Real marketplace parsers |
| Admin dashboard | `app/admin/*` | Operations UI foundation |
| CI/CD workflows | `.github/workflows/` | Deploy pipeline |
| Render blueprint | `render.yaml` | Production deploy config |

---

## 16. Canonical Paths (Recommended)

| Concern | Canonical Path |
|---------|----------------|
| Python AI Core | `intelligence/buzzard_ai_complete/` |
| Commerce API | `server/` |
| Storefront | `app/` + `components/` |
| Taxonomy source | `data/taxonomy/` |
| Taxonomy publish | `public/taxonomy/` (build artifact) |
| Intelligence launcher | `Buzzard/app.py` |
| Legacy modules (read-only) | `intelligence/buzzard_intelligence/` |
| Backup (archive only) | `intelligence/buzzard_ki_gesamt/` |

---

## 17. External Integrations — Status

| Integration | Status | Notes |
|-------------|--------|-------|
| Stripe / PayPal | `EXTERNAL INTEGRATION PENDING` | Keys empty, sales gated |
| TecDoc | `EXTERNAL INTEGRATION PENDING` | Adapter interface needed, no mock |
| DHL / carriers | `EXTERNAL INTEGRATION PENDING` | Config placeholders |
| OpenAI / LLM | `EXTERNAL INTEGRATION PENDING` | `AI_PROVIDER=rules` default |
| eBay / Amazon | `EXTERNAL INTEGRATION PENDING` | Parsers exist, credentials needed |
| PostgreSQL | `EXTERNAL INTEGRATION PENDING` | Compose file exists, not deployed |
| Render persistent disk | `EXTERNAL INTEGRATION PENDING` | Paid plan required |

---

*Next document: [ARCHITECTURE_PLAN.md](./ARCHITECTURE_PLAN.md)*

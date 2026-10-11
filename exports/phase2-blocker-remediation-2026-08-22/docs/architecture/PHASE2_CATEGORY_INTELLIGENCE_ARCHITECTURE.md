# BUZZARD AI CORE — CATEGORY INTELLIGENCE AI ARCHITECTURE

**Version:** 2.1 (Design)  
**Date:** 2026-08-22  
**Status:** Architecture only — **implementation not started**  
**Principle:** Dynamic, scalable, taxonomy-driven — **never hard-code category counts**

---

## 1. Purpose

Category Intelligence AI provides one dedicated worker per **main category node** in the authoritative Buzzard Master Category Tree. Workers are created at runtime from the taxonomy — not from a fixed list baked into code or architecture documents.

This document supersedes any Phase 2 reference that hard-codes `43`, `48`, `49`, or `55` category workers.

---

## 2. Authoritative Taxonomy Source

### 2.1 Determination Method

The number of Category Intelligence AI workers is **never assumed**. It is computed at runtime:

```
worker_count = TaxonomyRegistry.list_main_categories().length
```

### 2.2 Repository Sources Audited (2026-08-22)

| Source | Path | Declared L1 | Actual L1 (counted) | ID Scheme | Status |
|--------|------|-------------|---------------------|-----------|--------|
| **Master Taxonomy v2** | `intelligence/buzzard_ai_complete/master_taxonomy_48_maximal/data/taxonomy.json` | 48 | **48** | `bz.{nn}` | **AUTHORITATIVE** |
| Master Taxonomy production config | `.../master_taxonomy_48_maximal/config/master_taxonomy_48.production.json` | 48 | — | `buzzard.master-taxonomy.v2` | Confirms authoritative |
| Public DE main categories | `public/taxonomy/buzzard_master_48_main_categories_de.json` | 48 | **48** | `bz.{nn}` | Published mirror of master v2 |
| COUNTS metadata | `.../master_taxonomy_48_maximal/data/COUNTS.json` | 48 | — | documents `legacy_43` + `new_5` | Evolution audit trail |
| Legacy canonical taxonomy | `intelligence/buzzard_ai_complete/master_taxonomy/data/canonical_taxonomy.json` | 43 | **43** | `bz.{nn}` | **SUPERSEDED** (older v2.0.0) |
| Legacy taxonomy.json | `.../master_taxonomy/data/taxonomy.json` | — | **43** | `bz.{nn}` | **SUPERSEDED** |
| Shop category catalog | `data/buzzard_categories.json` | 53 (shop menu) | **53** | `cat-{nn}` | **Storefront layer** — not master tree |
| Shop catalog rules | same file `rules.master_taxonomy_l1` | 48 | — | — | Explicitly references master = 48 |
| Category Intelligence 43 config | `category_intelligence_43_maximal/config/category_intelligence.production.json` | — | **55 agents** | `CATEGORY_{nn}`, `cat-{nn}` | **Legacy agent config** — different ID scheme |
| Taxonomy auto-sync report | `data/taxonomy/taxonomy_auto_sync_report.json` | — | maps 48 master → 53 shop | `cat-XX` ↔ `bz.XX` | Sync tooling, not taxonomy authority |
| 47-category OS manifests | `public/taxonomy/buzzard_47_category_intelligence_os*.json` | 47 | — | varies | **Research artifact** — not master tree |

### 2.3 Authoritative Document

**`intelligence/buzzard_ai_complete/master_taxonomy_48_maximal/data/taxonomy.json`**

Reasons:
1. Schema `buzzard.master-taxonomy.v2` — latest version in repository
2. Production config `master_taxonomy_48.production.json` points to this module
3. Largest complete tree (7,255 nodes, L1–L4) with explicit `COUNTS.json` audit trail
4. Published to `public/taxonomy/buzzard_master_48_main_categories_de.json`
5. `data/buzzard_categories.json` rules explicitly set `master_taxonomy_l1: 48`

### 2.4 Reported Discrepancies (Do Not Guess)

| Discrepancy | Documents Involved | Impact | Resolution |
|-------------|-------------------|--------|------------|
| **43 vs 48 L1** | `canonical_taxonomy.json` (43) vs `master_taxonomy_48_maximal` (48) | Legacy code/docs reference 43 | Use v2 tree; `COUNTS.json` documents 5 new L1 categories added to legacy 43 |
| **48 master vs 53 shop** | `taxonomy.json` (48) vs `buzzard_categories.json` (53 menu) | Shop menu has presentation slots beyond strict master L1 | Category Intelligence workers use **master** L1 (`bz.{nn}`), not shop `cat-{nn}` |
| **55 agents vs 48 L1** | `category_intelligence.production.json` (55) vs master tree (48) | Legacy agent config has extra/split agents | Bridge maps agents to master L1 at runtime; do not use agent_count as worker count |
| **47 vs 48** | 47-category OS manifests vs master v2 (48) | Research artifacts from intermediate state | Ignore for worker count; use master v2 |
| **KFZ as separate worker** | Prior Phase 2 docs (`category-kfz` as +1) | `bz.01` already IS "Automotive & Kfz" | KFZ/TecDoc is a **capability extension** on `bz.01`, not a separate main-category worker |

**Current runtime worker count (from authoritative tree at review time): 48**  
This number is informational only. Implementation must never embed it in code.

---

## 3. Dynamic Architecture

### 3.1 Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    TaxonomyRegistry (NEW)                        │
│  Loads authoritative tree at startup                            │
│  BUZZARD_MASTER_TAXONOMY_PATH (configurable)                    │
│  list_main_categories() → [TaxonomyNode, ...]                   │
│  watch_for_changes() → re-register workers (future)             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              CategoryWorkerFactory (NEW)                         │
│  For each TaxonomyNode where level == 1:                        │
│    create CategoryExpertWorker(node)                            │
│    register in WorkerRegistry                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│           UnifiedOrchestrator (EXTEND)                           │
│  WORKER_ROUTING: category_* → resolve by payload.category_id    │
│  POST /api/v1/categories/{taxonomy_id}/scan                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   Central Memory    Kurmay AI         Audit System
 categories/{id}   (synthesis)      (per-category)
```

### 3.2 Worker Identity (Derived, Not Hard-Coded)

```python
def worker_id_for_category(taxonomy_node_id: str) -> str:
    """taxonomy_node_id = authoritative node id, e.g. 'bz.01'"""
    return f"category-{taxonomy_node_id}"   # → 'category-bz.01'
```

- **Never** use `category-worker` (Phase 1 stub) in production routing
- **Never** use `category-01` without `bz.` prefix
- Phase 1 stub `category-worker` remains as fallback alias during migration (feature flag)

### 3.3 TaxonomyNode Model

```python
class TaxonomyNode(BaseModel):
    id: str                    # e.g. "bz.01" — authoritative
    parent_id: str | None
    level: int                 # 1 = main category
    name: str
    slug: str
    schema_version: str        # from source file
    capabilities: list[str]    # derived from node metadata + extensions
```

### 3.4 TaxonomyRegistry

```python
class TaxonomyRegistry:
    """Single source for Category Intelligence worker provisioning."""

    def __init__(self, taxonomy_path: str | None = None):
        self.path = taxonomy_path or settings.BUZZARD_MASTER_TAXONOMY_PATH

    def load(self) -> TaxonomyDocument: ...

    def list_main_categories(self) -> list[TaxonomyNode]:
        """Returns all level==1 nodes. Count is always derived."""
        ...

    def get_node(self, node_id: str) -> TaxonomyNode | None: ...

    def schema_version(self) -> str: ...

    def checksum(self) -> str:
        """SHA-256 of taxonomy file — for audit and Kurmay context."""
        ...
```

**Default path:** `intelligence/buzzard_ai_complete/master_taxonomy_48_maximal/data/taxonomy.json`  
**Override:** `BUZZARD_MASTER_TAXONOMY_PATH` environment variable

### 3.5 Future Category Support (No Architectural Change)

When a new L1 category is added to the master taxonomy file:

1. `TaxonomyRegistry.list_main_categories()` returns the new node
2. `CategoryWorkerFactory` creates and registers a new worker at next startup (or hot-reload in Phase 2b)
3. Memory namespace `categories/{new_id}` is automatically valid
4. Kurmay receives new category signals via existing memory trigger rules
5. **No code changes** to worker classes, routing tables, or permission templates

Optional Phase 2b: taxonomy file watcher → `WorkerRegistry.reregister()` + audit event `category.worker.provisioned`.

---

## 4. Per-Category Worker Definition

For **every** main category node returned by `TaxonomyRegistry.list_main_categories()`, the system provisions:

### 4.1 Dedicated Category Intelligence AI Worker

| Property | Source |
|----------|--------|
| `worker_id` | `category-{node.id}` |
| `name` | `{node.name} Intelligence` |
| `category` | `category_intelligence` |
| `taxonomy_node_id` | `node.id` |
| `supported_task_types` | `category_scan`, `category_analyze`, `taxonomy_gap_report` |

### 4.2 Central AI Orchestrator Connection

```python
# Orchestrator routing — dynamic, not a static dict entry per category
def resolve_category_worker(task: Task, registry: WorkerRegistry) -> Worker:
    category_id = task.payload["category_id"]   # must be taxonomy node id, e.g. "bz.01"
    worker_id = f"category-{category_id}"
    return registry.get(worker_id)
```

Task creation:

```
POST /api/v1/categories/{taxonomy_id}/scan
  → orchestrator.create_task(
       type="category_scan",
       payload={"category_id": taxonomy_id, ...},
       worker_id=f"category-{taxonomy_id}",
     )
```

Validation: `taxonomy_id` must exist in `TaxonomyRegistry` — reject unknown IDs.

### 4.3 Category-Specific Memory

| Field | Value |
|-------|-------|
| Namespace | `categories/{taxonomy_node_id}` |
| Types written | `SIGNAL`, `INSIGHT`, `FACT`, `EVENT` |
| Key pattern | `{finding_type}/{date}/{hash}` |
| Versioning | Central Memory history (Phase 1) |
| Impact tagging | Per-finding severity → Kurmay trigger evaluation |

Each category worker writes **only** to its own namespace. Cross-category reads require `memory:read` + orchestrator authorization.

### 4.4 Category-Specific Tools / Capabilities

Base capabilities (all main-category workers):

| Capability | Description |
|------------|-------------|
| `assortment_scan` | Analyze product assortment breadth |
| `competitor_price` | Competitor price signal extraction |
| `competitor_product` | Competitor product presence |
| `trend_analysis` | Demand/trend signals |
| `supplier_opportunity` | Supplier gap detection |
| `stock_price_signal` | Stock-price correlation |
| `subcategory_gap` | Taxonomy gap vs observed trees |
| `quality_issue_detection` | Quality/compliance signals |
| `taxonomy_map` | Map offers to taxonomy nodes |

**Capability extensions** (derived from taxonomy metadata, not hard-coded):

```python
CAPABILITY_EXTENSIONS: dict[str, list[str]] = {
    # Applied when node.id matches — loaded from config, not code constants
    "bz.01": ["vehicle_compatibility_check", "tecdoc_lookup"],  # Automotive & Kfz
}
```

Extensions are defined in `ai_core/workers/category/capability_extensions.json` keyed by `taxonomy_node_id`. Adding a new extension for a category does not require new worker classes.

External tools:
- `CategoryIntelligenceBridge` → legacy `CategoryIntelligenceAgent.analyze()`
- `TaxonomyIntelligence` → gap detection within node's subtree
- `PriceIntelligenceEngine`, `OpportunityScorer`, `EvidenceStore`
- `TecDocAdapter` → only when `tecdoc_lookup` capability present and `TECDOC_API_KEY` configured

### 4.5 Category-Specific Permissions

Base permission set (all category workers):

```
memory:read
memory:write          # scoped to own namespace only
tasks:read
categories:analyze
taxonomy:read
```

**Denied for all category workers:**
```
prices:publish
orders:transition
products:publish
suppliers:sync
customs:approve
```

Namespace write enforcement via EsatBey policy (Phase 2 Step 1): worker may only write to `categories/{own_taxonomy_node_id}`.

### 4.6 Category-Specific Reporting

Each worker produces a `CategoryScanOutput` (schema in `PHASE2_WORKER_SPEC.md`) containing:

- `category_id` — authoritative taxonomy node id
- `category_name` — from TaxonomyNode
- `findings[]`, `opportunities[]`, `taxonomy_gaps[]`
- `integration_status` — per-connector honest status
- `taxonomy_checksum` — for Kurmay cross-category correlation

Reports are written to:
1. Central Memory (`categories/{id}`, type `INSIGHT`)
2. Audit log (`category.scan.complete`, entity_id = category_id)
3. Kurmay trigger evaluation (if `impact >= MEDIUM`)

### 4.7 Kurmay AI Connection

```
CategoryExpertWorker.execute()
    → CategoryScanOutput
    → CentralMemory.write(namespace=categories/{id}, impact=computed)
    → [if impact >= MEDIUM]
        orchestrator.create_task(
            type="kurmay_synthesis",
            payload={
                "trigger": "memory_event",
                "scope": "category",
                "namespace_filter": [f"categories/{id}"],
            },
            parent_id=source_task.id,
        )
```

Kurmay aggregates across **all** `categories/*` namespaces when scope is `global` or `category` (multi-category parent task).

**Anti-loop guard (required before implementation):**
- Kurmay writes to `kurmay/reports/*` — excluded from Kurmay auto-trigger
- Debounce: max 1 `kurmay_synthesis` per `category_id` per 15-minute window
- Idempotency key: `kurmay:{scope}:{namespace_filter_hash}:{window}`

---

## 5. Legacy Bridge Strategy

Phase 2 does **not** rewrite `category_intelligence_43_maximal/`. It bridges:

```python
class CategoryIntelligenceBridge:
    """Maps taxonomy node → legacy agent config entry."""

    def resolve_agent(self, taxonomy_node: TaxonomyNode) -> CategoryIntelligenceAgent:
        # Lookup via master_shop_l1_mapping or category_id_mapping.csv
        # Falls back to generic agent with node metadata if no legacy agent
        ...
```

Mapping files (existing):
- `intelligence/buzzard_ai_complete/master_taxonomy/data/category_id_mapping.csv`
- `public/taxonomy/master_shop_l1_mapping.json` (shop `cat-XX` ↔ `bz.XX`)

The bridge resolves **taxonomy node id → legacy agent**. Unmapped nodes get a generic `CategoryIntelligenceAgent` instance — no fake data.

---

## 6. Input / Output Schemas (Dynamic)

### 6.1 Input

```python
class CategoryScanInput(BaseModel):
    category_id: str          # MUST be valid TaxonomyRegistry node id
    analysis_types: list[str] # from capability list
    period: str = "current"
    depth: Literal["L1", "L2", "L3"] = "L2"
    include_children: bool = True
    offer_sample: list[dict] | None = None   # real data only
```

Validation at task creation:

```python
def validate_category_id(category_id: str, registry: TaxonomyRegistry) -> TaxonomyNode:
    node = registry.get_node(category_id)
    if not node or node.level != 1:
        raise ValueError(f"unknown or non-main category: {category_id}")
    return node
```

### 6.2 Output

```python
class CategoryScanOutput(BaseModel):
    category_id: str
    category_name: str
    taxonomy_schema: str       # e.g. "buzzard.master-taxonomy.v2"
    taxonomy_checksum: str
    period: str
    offers_seen: int
    findings: list[CategoryFinding]
    opportunities: list[dict]
    taxonomy_gaps: list[dict]
    integration_status: dict[str, str]
```

---

## 7. API Surface

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/categories` | List main categories from TaxonomyRegistry (dynamic count) |
| `GET` | `/api/v1/categories/{taxonomy_id}` | Single category node metadata |
| `POST` | `/api/v1/categories/{taxonomy_id}/scan` | Create `category_scan` task |
| `GET` | `/api/v1/agents?category=category_intelligence` | List all category workers (dynamic) |
| `GET` | `/api/v1/taxonomy/status` | Schema version, checksum, main_category_count (computed) |

**`main_category_count` in API responses is always computed at request time — never a constant.**

---

## 8. Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `BUZZARD_MASTER_TAXONOMY_PATH` | `master_taxonomy_48_maximal/data/taxonomy.json` | Authoritative tree file |
| `BUZZARD_AI_CORE_V2` | `0` | Feature flag for dynamic category workers |
| `TECDOC_API_KEY` | unset | Enables `tecdoc_lookup` on capable nodes only |

---

## 9. Implementation Modules

| Module | Path | Type |
|--------|------|------|
| TaxonomyRegistry | `ai_core/taxonomy/registry.py` | NEW |
| TaxonomyLoader | `ai_core/taxonomy/loader.py` | NEW |
| CategoryWorkerFactory | `ai_core/workers/category/factory.py` | NEW |
| CategoryExpertWorker | `ai_core/workers/category/expert_worker.py` | NEW |
| CategoryIntelligenceBridge | `ai_core/workers/category/bridge.py` | NEW |
| Capability extensions config | `ai_core/workers/category/capability_extensions.json` | NEW |
| Category schemas | `ai_core/schemas/workers/category.py` | NEW |
| Categories API | `ai_core/api/v1/categories.py` | NEW |

See `PHASE2_IMPLEMENTATION_PLAN.md` Step 4 — updated to reference TaxonomyRegistry.

---

## 10. Testing Requirements

```python
def test_worker_count_matches_taxonomy():
    registry = TaxonomyRegistry()
    main = registry.list_main_categories()
    workers = worker_registry.list_by_category("category_intelligence")
    assert len(workers) == len(main)

def test_unknown_category_id_rejected():
    # category_id not in taxonomy → 400

def test_new_category_in_taxonomy_file():
    # Add node to test fixture taxonomy → new worker registered on reload

def test_namespace_isolation():
    # category-bz.01 cannot write to categories/bz.02

def test_no_hardcoded_count_in_source():
    # grep CI check: no literal 43/48/49/55 in ai_core/workers/category/
```

---

## 11. Relationship to Other Documents

| Document | Change Required |
|----------|-----------------|
| `PHASE2_ARCHITECTURE.md` | Remove hard-coded counts; reference this document |
| `PHASE2_WORKER_SPEC.md` | §3 Category — dynamic worker_id, remove KFZ as separate worker |
| `PHASE2_DATA_FLOW.md` | §3.1 — reference TaxonomyRegistry |
| `PHASE2_IMPLEMENTATION_PLAN.md` | Step 4 — add TaxonomyRegistry as prerequisite |
| `PHASE2_ARCHITECTURE_REVIEW.md` | G-03 resolved by this document |
| `AI_WORKER_SPEC.md` v1 | Superseded for category count/ID scheme |

---

**Category Intelligence architecture is dynamic and taxonomy-driven. Worker count is determined at runtime from the authoritative master tree — never hard-coded.**

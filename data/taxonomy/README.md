# Buzzard Master Kfz Taxonomy & Intelligence OS

Canonical automotive parts taxonomy for Buzzard.

## Files

| File | Description |
|------|-------------|
| `buzzard_master_kfz_category_tree_v1.html` | Interactive browser UI (2 levels) |
| `buzzard_master_kfz_category_tree_v1.json` | Machine-readable taxonomy V1 |
| `buzzard_master_kfz_intelligence_os.json` | **Intelligence OS** — 43 mains, 454 subs, 412 L3, 8 competitors, coverage matrix |
| `buzzard_intelligence_os_maximum_manifest.json` | **Maximum Manifest** — All-in-One + 43 Category Agents, 24 Services, Schemas, Runtime |
| `buzzard_master_business_os_maximum_manifest.json` | **Master Business OS Manifest** — Intelligence OS + 18 Enterprise Modules, 20 Business Categories, 12 Company Layers, 18 Integrations |
| `buzzard_master_business_os_maximum_single_file.html` | **Master Business OS Maximum Single-File Console** — Intelligence + Business OS + PIM + Commerce + Logistics + Growth + Finance + Security |
| `buzzard_master_business_os_final_100_single_file.html` | **Master Business OS Final 100% Single-File Console** — Maximum console + Final 100% scope lock + go-live boundary |
| `buzzard_intelligence_os_all_in_one.json` | **Intelligence OS All-in-One (JSON)** — Taxonomie, Module, Demo-Findings, Governance |
| `buzzard_intelligence_os_all_in_one.html` | **Intelligence OS All-in-One** — 12 Module, Kurmay, Memory, Alerts, Pipeline-Architektur |
| `buzzard_intelligence_os_maximum_single_file.html` | **Maximum Single-File Console** — All-in-One + 43 Agents + Operations Center (embedded manifest) |
| `buzzard_master_kfz_intelligence_os.html` | **KFZ Intelligence OS Console** — Dashboard, Taxonomie, Wettbewerber-Matrix, Gap-Analyse |
| `kfz_shop_bridge.json` | KFZ id → `cat-05` L2 mapping + L3 + competitor coverage |
| `buzzard_47_category_intelligence_os.json` | **47 Category Intelligence OS** — 47 non-Kfz mains, 940 competitor target, evidence model |
| `buzzard_47_category_intelligence_os.html` | **47 Category Intelligence OS Console** — Kurmay dashboard, taxonomy gap analysis |
| `buzzard_47_category_intelligence_os_final_100_single_file.html` | **47 Category Intelligence OS Final 100% Console** — scope lock + 12-layer completion |
| `buzzard_47_category_intelligence_os_max_final_single_file.html` | **47 Category Intelligence OS MAX FINAL Console** — maximum core engine + evidence model |
| `buzzard_production_bridge_max_single_file.html` | **Production Bridge MAX SINGLE Console** — Preflight-Dashboard (DE) |
| `buzzard_production_preflight.json` | **Production Preflight Report** — Gate-Status-Snapshot |
| `buzzard_production_bridge_manifest.json` | **Production Bridge Manifest** — 14 Go-Live-Gates, DSGVO, Zahlung, Versand |
| `buzzard_master_48_main_categories_de.json` | **48 Hauptkategorien (DE)** — kanonische deutsche L1-Taxonomie (48 Master, 47 Recherche) |
| `buzzard_master_48_main_categories_tr.json` | *(Archiv)* Türkische Variante — nicht mehr produktiv |
| `buzzard_final_47_category_intelligence_manifest.json` | **47 Category Intelligence FINAL Manifest** — pipeline, evidence policy, outputs, research basis |
| `buzzard_final_47_category_intelligence_os_max_single_file.html` | **47 Category Intelligence OS FINAL MAX Console (primary)** — evidence orchestration + verification |
| `buzzard_category_intelligence_maximum_single_file.html` | **Category Intelligence MAXIMUM Command Center** — Master Tree, Registry, Research, Governance (DE, 48 L1) |
| `buzzard_ai_core_maximum_single_file.html` | **AI CORE Maximum Single File** — Zentrale KI-Orchestrierung, 55 Kategorie-KI, Memory, Security, Exception (DE) |
| `buzzard_47_category_intelligence_os_max_single_final_single_file.html` | **47 Category Intelligence OS MAX SINGLE FINAL Console** — unified primary console (MAX + 100% Final) |

## Intelligence OS

- **Taxonomy:** 3 levels (main → sub → product group)
- **Competitors:** AUTODOC, kfzteile24, ATU, ATP, Bandel, Motointegrator, pkwteile, daparto
- **Coverage:** per main category, which competitors are active (research seed)

## Architecture rule

Vehicle make/model/year, HSN/TSN, OEM numbers, TecDoc ID, manufacturer part numbers, viscosity, dimensions, etc. are **not** categories — they belong in the **Product Attribute / Compatibility** layer (vehicle, OEM, TecDoc).

## Relation to Buzzard catalog

- General shop navigation: `data/buzzard_categories.json` (53 L1 mains on branch, 48 master codes mapped; live `main` still 41 until PR #210 deploy)
- Deep KFZ parts tree: this folder
- Shop bridge: `kfz_shop_bridge.json`

## Sync bridge

```bash
cd intelligence
python3 main.py complete-sync-kfz-category-tree
```

## URLs

- Shop Automotive: `/kategorie/automotive/`
- KFZ tree index: `/kategorie/automotive/kfz/`
- **Intelligence OS All-in-One (HTML):** `/taxonomy/buzzard_intelligence_os_all_in_one.html`
- **Maximum Single-File Console (HTML):** `/taxonomy/buzzard_intelligence_os_maximum_single_file.html`
- **Master Business OS Maximum Single-File Console (HTML):** `/taxonomy/buzzard_master_business_os_maximum_single_file.html`
- **Master Business OS Final 100% Single-File Console (HTML):** `/taxonomy/buzzard_master_business_os_final_100_single_file.html`
- **Maximum Manifest (JSON):** `/taxonomy/buzzard_intelligence_os_maximum_manifest.json`
- **Master Business OS Manifest (JSON):** `/taxonomy/buzzard_master_business_os_maximum_manifest.json`
- **Intelligence OS All-in-One (JSON):** `/taxonomy/buzzard_intelligence_os_all_in_one.json`
- **KFZ Intelligence OS Console (HTML):** `/taxonomy/buzzard_master_kfz_intelligence_os.html`
- **47 Category Intelligence OS Console (HTML):** `/taxonomy/buzzard_47_category_intelligence_os.html`
- **47 Category Intelligence OS Final 100% Console (HTML):** `/taxonomy/buzzard_47_category_intelligence_os_final_100_single_file.html`
- **47 Category Intelligence OS MAX FINAL Console (HTML):** `/taxonomy/buzzard_47_category_intelligence_os_max_final_single_file.html`
- **47 Category Intelligence OS MAX SINGLE FINAL Console (HTML):** `/taxonomy/buzzard_47_category_intelligence_os_max_single_final_single_file.html`
- **47 Category Intelligence OS FINAL MAX Console (HTML, primary):** `/taxonomy/buzzard_final_47_category_intelligence_os_max_single_file.html`
- **47 Category Intelligence FINAL Manifest (JSON):** `/taxonomy/buzzard_final_47_category_intelligence_manifest.json`
- **47 Category Intelligence OS Manifest (JSON):** `/taxonomy/buzzard_47_category_intelligence_os.json`
- API: `/api/kfz-tree`, `/api/kfz-intelligence`
- Intelligence API: `/automotive-taxonomy/kfz-intelligence-os`, `/automotive-taxonomy/intelligence-os-all-in-one`, `/automotive-taxonomy/intelligence-os-maximum-manifest`, `/automotive-taxonomy/intelligence-os-maximum-single-file`, `/automotive-taxonomy/master-business-os-maximum-manifest`, `/automotive-taxonomy/master-business-os-maximum-single-file`, `/automotive-taxonomy/master-business-os-final-100-single-file`, `/category-intelligence-47`

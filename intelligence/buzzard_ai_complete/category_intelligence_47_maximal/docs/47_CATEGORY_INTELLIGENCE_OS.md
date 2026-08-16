# Buzzard 47 Category Intelligence OS

Competitive intelligence for **47 non-Kfz main categories** (Master Taxonomy 48 minus Automotive).

## Scope

- 47 categories × 20 competitors = **940 competitor target**
- Evidence-backed taxonomy nodes, features, and findings
- Gap detection: common, unique, and Buzzard-missing taxonomy paths

## API

Prefix: `/category-intelligence-47`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service readiness |
| `/summary` | GET | DB counters |
| `/categories` | GET | Category registry |
| `/categories/seed` | POST | Seed from production config |
| `/categories/{id}/competitors` | GET | Competitors per category |
| `/analysis/{id}` | GET | Taxonomy comparison |
| `/intelligence-os/full` | GET | Runtime manifest (categories + consoles) |
| `/final-manifest` | GET | FINAL MAX authoritative manifest |
| `/final-manifest/summary` | GET | FINAL manifest + runtime bindings |
| `/demo` | GET | Seed + sample analysis |

## Console

- Primary HTML: `/taxonomy/buzzard_final_47_category_intelligence_os_max_single_file.html`
- **FINAL manifest (JSON):** `/taxonomy/buzzard_final_47_category_intelligence_manifest.json`
- Legacy HTML: `/taxonomy/buzzard_47_category_intelligence_os.html`
- Research matrix: `/taxonomy/buzzard_47_research_matrix_max.json`
- Manifest: `/taxonomy/buzzard_47_category_intelligence_os.json`

## Evidence orchestration (FINAL MAX)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/research-matrix` | GET | Load candidate research matrix JSON |
| `/research-matrix/import` | POST | Bulk-import CANDIDATE competitors |
| `/evidence` | POST | Add evidence packet (PENDING review) |
| `/evidence/review` | POST | Approve or reject evidence |
| `/evidence/{competitor_id}` | GET | List evidence for competitor |
| `/competitor/{id}/verify` | POST | Verify competitor (requires APPROVED evidence) |
| `/verification-dashboard` | GET | Candidate/verified/evidence counts |
| `/score/{category_id}` | POST | Calculate competitor scores |
| `/executive-report` | GET | Category rollup report |
| `/export/competitors` | GET | CSV-ready competitor export |
| `/export/taxonomy` | GET | CSV-ready taxonomy export |

## Sync

```bash
cd intelligence
python3 main.py complete-sync-category-intelligence-47
```

## CLI

```bash
python3 main.py complete-category-intelligence-47-health
python3 main.py complete-category-intelligence-47-summary
python3 main.py complete-category-intelligence-47-demo
python3 main.py complete-category-intelligence-47-docs
```

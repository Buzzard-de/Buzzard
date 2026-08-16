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
| `/intelligence-os` | GET | Console + manifest summary |
| `/demo` | GET | Seed + sample analysis |

## Console

- HTML: `/taxonomy/buzzard_47_category_intelligence_os.html`
- Manifest: `/taxonomy/buzzard_47_category_intelligence_os.json`

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

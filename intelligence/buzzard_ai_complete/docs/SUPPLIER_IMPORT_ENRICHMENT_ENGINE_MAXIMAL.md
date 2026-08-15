# BUZZARD SUPPLIER IMPORT & ENRICHMENT ENGINE MAXIMAL

Supplier data pipeline into PIM with dry-run by default.

## Pipeline

Ingest → Snapshot → Parse → Normalize → Identity Resolution → Duplicate Detection
→ Category Mapping → Attribute Mapping → Multilingual Enrichment
→ Media Normalization → Quality Gate → Compliance Gate → Review Queue → PIM Publish.

## Safety

- Default `dry_run=true`
- Approved products are never blindly overwritten by supplier feeds
- New categories do not go live automatically
- Every mutation is auditable
- Duplicate suspicion routes to review, not live product creation

## CLI

```bash
cd intelligence
python3 main.py complete-import-engine-health
python3 main.py complete-import-engine-demo
python3 main.py complete-import-engine-schema
python3 main.py complete-import-engine-docs
```

## API

- `GET /import-engine/health`
- `GET /import-engine/schema/decision`
- `GET /import-engine/schema/normalized-record`
- `POST /import-engine/preview`
- `GET /import-engine/demo`

## Connectors

CSV/XML/JSON feed adapters live in `connectors/feed_adapters.py`.
Real supplier credentials are never stored in source code.

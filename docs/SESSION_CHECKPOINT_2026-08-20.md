# Buzzard Session Checkpoint — 20. Aug 2026

**Stand:** Alles committed, gepusht und live auf `main` (Merge PR #210).

## Live-Status (buzzard24.de)

| Bereich | Status |
|--------|--------|
| Frontend / GitHub Pages | ✅ HTTP 200, Deploy OK |
| Shop L1-Kategorien | ✅ **53** (48 Master-Codes gemappt) |
| Taxonomy-Konsolen (5 HTML) | ✅ online |
| Taxonomy-JSONs (`/taxonomy/*.json`) | ✅ online (mapping, sync report, KFZ bridge, preflight) |
| `verify:go-live` | ✅ alle Checks grün (API pending OK) |
| Render API | ❌ nicht provisioniert (bewusst offen) |
| Verkauf / Checkout | ❌ `BUZZARD_SALES_ENABLED=0` (bewusst offen) |

## Was heute erledigt wurde

1. **Taxonomy Auto-Sync** — Master → Shop Pipeline, 48/48 Mapping
2. **KI Gesamt-Sicherung** — `intelligence/buzzard_ki_gesamt/`
3. **Shop-Expansion** — 41 → 53 L1 (`cat-42` … `cat-53`)
4. **Deploy-Artefakte** — `scripts/publish-taxonomy-artifacts.mjs` im Build
5. **CI-Fix** — idempotenter Sync, Taxonomy Auto Sync grün
6. **PR #210 gemergt** — Commit `81224d6` auf `main`

## Wichtige Dateien

| Pfad | Zweck |
|------|-------|
| `data/buzzard_categories.json` | Shop-Katalog (53 L1) |
| `data/taxonomy/master_shop_l1_mapping.json` | Master→Shop Mapping |
| `data/taxonomy/buzzard_master_48_main_categories_de.json` | Kanonische 48 DE L1 |
| `intelligence/scripts/run_taxonomy_auto_sync.py` | Sync-Orchestrator |
| `intelligence/buzzard_ki_gesamt/` | KI-Backup-Ordner |
| `scripts/publish-taxonomy-artifacts.mjs` | Public Taxonomy Publish |

## Nützliche Befehle (morgen)

```bash
npm run verify:go-live
npm run sync:taxonomy
npm run sync:taxonomy:dry
npm run backup:ki
npm run build
cd intelligence && python3 -m pytest buzzard_ai_complete/tests/ -q
```

## Morgen offen (Priorität)

1. **Render Blueprint** — API provisionieren (wenn gewünscht)
2. **Verify-Go-Live Workflow** — erst nach Pages-Deploy laufen lassen (Race Condition fix)
3. **Verkauf aktivieren** — nur wenn explizit gewünscht
4. **53 vs 48 L1** — ggf. Duplikat-Kategorien bereinigen (Tierfutter, Verpackung etc.)
5. **LLM / Intelligence Service** — `NOT_CONFIGURED` Credentials in `intelligence/.env`

## Git

- Branch: `main` @ `81224d6`
- PR #210: **MERGED**
- PR #209: superseded durch #210
- Working tree: clean

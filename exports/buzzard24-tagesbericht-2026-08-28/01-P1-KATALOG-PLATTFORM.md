# 01 — P1 Katalog-Plattform

**Aufgaben:** ChatGPT-Paket 05–15  
**Status:** ✅ Code fertig

---

## Neue Module

| Datei | Aufgabe |
|-------|---------|
| `server/lib/productValidator.js` | 05 PIM/Schema + EAN-Validierung |
| `server/lib/adapters/*` | 06 Supplier/XML/TecDoc Mock |
| `server/lib/priceStockQueue.js` | 07 Preis/Stok Queue + Audit |
| `server/lib/productAi.js` | 08 Product AI + Review-Queue |
| `server/lib/categoryIntelligence.js` | 09 Category AI (report-only) |
| `server/lib/customsAi.js` | 10 Customs AI (GTIP/TARIC) |
| `server/lib/p1CatalogPlatform.js` | 11 Mock-Orders |
| `server/lib/seoGooglePrep.js` | 12 SEO Status |
| `server/lib/i18nCatalog.js` | 13 i18n Gap-Report |
| `server/plugins/p1CatalogPlatformPlugin.js` | API-Routen |

## API-Endpunkte (Auswahl)

```
GET  /api/p1/status
GET  /api/p1/health
GET  /api/p1/seo/status
GET  /api/p1/i18n/gaps
GET  /api/admin/p1/adapters
POST /api/admin/p1/adapters/:id/import
POST /api/admin/p1/orders/mock
```

## Tests

```bash
npm run verify:p1
# → 8/8 lokal grün
```

## Doku

`docs/P1_CATALOG_PLATFORM_DE.md`

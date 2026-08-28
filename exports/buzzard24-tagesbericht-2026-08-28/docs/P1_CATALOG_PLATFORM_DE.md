# P1 Katalog-Plattform — Produktionsreife (Aufgaben 05–15)

**Stand:** 27. August 2026  
**Modus:** Katalog (`BUZZARD_SALES_ENABLED=0`) — kein Verkauf, keine echten Lieferantenbestellungen

---

## Module

| Modul | Pfad | Aufgabe |
|-------|------|---------|
| Produkt-Validator | `server/lib/productValidator.js` | PIM-Schema, EAN, i18n, Zollfelder |
| Supplier-Adapter | `server/lib/adapters/*` | Mock/XML/TecDoc (nur Testdaten) |
| Preis/Stok-Queue | `server/lib/priceStockQueue.js` | Margin-Guard, Audit, Alerts |
| Product AI | `server/lib/productAi.js` | Anreicherung + Review-Queue |
| Customs AI | `server/lib/customsAi.js` | GTIP/TARIC-Hinweise (Review Pflicht) |
| Category Intelligence | `server/lib/categoryIntelligence.js` | Report-only, Orchestrator-Tasks |
| P1 API | `server/plugins/p1CatalogPlatformPlugin.js` | Admin-Endpunkte unter `/api/admin/p1/*` |

---

## Umgebungsvariablen

| Variable | Default | Beschreibung |
|----------|---------|--------------|
| `BUZZARD_SALES_ENABLED` | `0` | **Muss 0 bleiben** im Katalogmodus |
| `BUZZARD_P1_CATALOG` | aktiv | P1-Modul ein/aus |
| `BUZZARD_DB_ENABLED` | `1` | SQLite für OMS/AI |
| `BUZZARD_ORDER_MANAGEMENT` | `1` | Mock-Bestellungen (Prep) |
| `BUZZARD_ORCHESTRATOR_URL` | — | Python-Orchestrator (optional) |
| `BUZZARD_PRICE_ALERT_PERCENT` | `25` | Große Preisänderung → Approval |
| `TECDOC_API_KEY` | — | Nur für spätere TecDoc-Integration |

Secrets (Admin, JWT, Supplier-API) gehören **nur** in Render/GitHub Secrets — nie ins Repo.

---

## API-Endpunkte (Auswahl)

```
GET  /api/p1/status
GET  /api/p1/health
GET  /api/admin/p1/adapters
POST /api/admin/p1/adapters/:id/fetch
POST /api/admin/p1/adapters/:id/import
GET  /api/admin/p1/price-stock/queue
POST /api/admin/p1/price-stock/apply
GET  /api/admin/p1/ai/reviews
POST /api/admin/p1/ai/product-enrich
POST /api/admin/p1/ai/customs-assess
GET  /api/admin/p1/category/:id/intelligence
POST /api/admin/p1/orders/mock
```

Alle Admin-Routen erfordern Login (`admin@buzzard24.de`).

---

## QA

```bash
node scripts/p1-smoke.mjs
node scripts/verify-go-live.mjs
```

Kritische Checks:
- `salesEnabled: false` in `/api/health`
- Checkout/Orders ohne Sales → 403
- Keine Stripe/PayPal-Aufrufe
- Mock-Bestellungen nur über `/api/admin/p1/orders/mock`

---

## Backup & Rollback

- **Produktdaten:** `data/buzzard_products.json` (Git-versioniert)
- **Queues/Audit:** `server/data/price-stock-*.json`, `server/data/ai-review-queue.json`
- **SQLite:** `server/data/buzzard.db` (Render Persistent Disk empfohlen)
- **Rollback:** Render Deploy auf vorherige Revision; JSON aus Git restore

---

## GDPR / Datenschutz

- Kontaktformular: FormSubmit → `info@buzzard24.de` (keine DB-Speicherung im Katalogmodus)
- Admin-Audit: `server/data/audit-log.json`
- AI-Review-Queue: Demo-Metadaten, keine Kundendaten
- Mock-Orders: fiktive E-Mail `mock@buzzard24.de`

---

## Bewusst offen (nicht P1)

- Echte Produktbilder
- Stripe/PayPal/Checkout
- Echte Lieferanten-APIs
- TecDoc Live-API
- Google Search Console (manuell)

Siehe auch: `docs/MONITORING.md`, `docs/GO_LIVE_PREP.md`, `docs/ORCHESTRATOR_DE.md`

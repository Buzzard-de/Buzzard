# 04 — Produkt-Übersetzungen (heute abgeschlossen)

**Stand:** 28. August 2026  
**Ergebnis:** 15/15 Produkte · EN/TR/AR · **0 Lücken**

---

## Script

```bash
npm run catalog:i18n-fill
# oder: node scripts/fill-product-i18n-gaps.mjs
```

## Datei

`data/buzzard_product_translations.json` — 40 neue Locale-Einträge ergänzt

## Produkte

| ID | Name (DE) |
|----|-----------|
| prod-000001 | Premium Bremsscheibe Testprodukt |
| bremsscheibe-280 | Bremsscheibe Vorderachse 280mm |
| bremsbelaege-vorder | Bremsbeläge Satz Vorderachse |
| motoroel-5w30 | Motoröl 5W-30 Fullsynthetic 5L |
| oelfilter | Ölfilter Universal OEM-kompatibel |
| innenraumfilter | Innenraumfilter Pollenfilter Premium |
| zuendkerze-ngk | Zündkerze Iridium IX NGK |
| batterie-72ah | Starterbatterie 12V 72Ah 680A |
| stossdaempfer | Stoßdämpfer Vorderachse Gas |
| getriebeoel-75w90 | Getriebeöl 75W-90 Vollsynthetisch 1L |
| bremsfluessigkeit-dot4 | Bremsflüssigkeit DOT 4 500ml |
| keilrippenriemen | Keilrippenriemen 6PK1548 |
| frostschutz-g12 | Kühlerfrostschutzmittel G12+ 5L |
| scheibenwischer-set | Bosch Aerotwin Scheibenwischer Set |
| reifen-pilot-sport | Michelin Pilot Sport 4 Reifen 225/45 R17 |

## API-Check

```bash
curl -s https://buzzard-api.onrender.com/api/p1/i18n/gaps
# Nach Deploy: products_with_gaps: 0
```

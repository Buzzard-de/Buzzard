# Google Search Console — Vorbereitung (P1-12)

**Stand:** 27. August 2026  
**Domain:** https://buzzard24.de  
**Modus:** Katalog — kein Verkauf

---

## Bereits live (nicht neu bauen)

| Feature | URL / Datei |
|---------|-------------|
| Sitemap | https://buzzard24.de/sitemap.xml |
| robots.txt | https://buzzard24.de/robots.txt |
| Meta / Canonical / OG | `lib/seo/metadata.ts` |
| hreflang | `lib/i18n/routing.ts` |
| JSON-LD | `lib/seo/structured-data.ts` |
| Merchant Feed | `https://buzzard-api.onrender.com/api/localization/feed/google.xml` |
| SEO-Status API | `GET /api/p1/seo/status` |

---

## Search Console einrichten (manuell)

> **Bereits deployed:** Verifizierungsdatei liegt live unter  
> https://buzzard24.de/google1206d6d713142108.html  
> (Methode „HTML-Datei“ in Search Console wählen — kein neuer Upload nötig.)

1. https://search.google.com/search-console öffnen
2. Property hinzufügen: **Domain** `buzzard24.de` (empfohlen) oder URL-Präfix `https://buzzard24.de`
3. Verifizierung wählen:
   - **DNS TXT** bei IONOS (empfohlen für Domain-Property)
   - oder **HTML-Datei** unter `public/` (nur wenn nötig)
   - oder **Meta-Tag** → Token als `GOOGLE_SITE_VERIFICATION` in Render/Vercel (nicht ins Repo)
4. Sitemap einreichen: `https://buzzard24.de/sitemap.xml`
5. Optional: hreflang prüfen unter „Internationales Targeting“

---

## Merchant Center (später, ohne Verkauf)

- Feed-URL testen: `/api/localization/feed/google.xml?locale=de-DE&country=DE&currency=EUR`
- Keine echten Produktbilder erzwingen — Platzhalter bleiben
- Verkauf/Checkout erst nach bewusster Aktivierung

---

## API-Check

```bash
curl -s https://buzzard-api.onrender.com/api/p1/seo/status | jq .
```

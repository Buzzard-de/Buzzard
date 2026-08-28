# 02 — Wave 2: SEO, i18n, Security

**Regel:** Bestehende Wave-1-Module nicht neu gebaut — nur Ergänzungen.

---

## SEO (Aufgabe 12)

- `server/lib/seoGooglePrep.js` — Readiness-Report
- `GET /api/p1/seo/status`
- `docs/SEO_SEARCH_CONSOLE_DE.md`
- Sitemap: `/kontakt/` ergänzt
- Merchant Feed bereits live: `/api/localization/feed/google.xml`

## i18n/UX (Aufgabe 13)

- Kontaktformular: `components/ContactForm.tsx` → DE/EN/TR/AR
- Neue Keys: `contactForm.*` in allen Locale-Dateien
- `GET /api/p1/i18n/gaps`
- `docs/I18N_UX_CHECKLIST_DE.md`

## Security (Aufgabe 04/15)

- `docs/SECURITY_BACKUP_DE.md`
- Backup-Konzept, Secrets-Liste, Monitoring-Verweis

## Tests

```bash
npm run verify:p1:seo
# → 8/8 grün
```

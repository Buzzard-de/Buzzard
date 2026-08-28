# Wave 2 — Ergänzungen (ohne Neuaufbau)

**Datum:** 27. August 2026  
**Regel:** Bestehende Module aus Wave 1 **nicht** neu gebaut — nur offene Teile ergänzt.

---

## Neu in Wave 2

| Aufgabe | Was | Datei |
|---------|-----|-------|
| **12 SEO/Google** | Search-Console-Doku + SEO-Status-API | `docs/SEO_SEARCH_CONSOLE_DE.md`, `server/lib/seoGooglePrep.js` |
| **13 i18n/UX** | Kontaktformular 4 Sprachen + Lücken-Report | `ContactForm.tsx`, `lib/i18n/locales/*`, `server/lib/i18nCatalog.js` |
| **04 Security** | Backup/Secrets-Doku | `docs/SECURITY_BACKUP_DE.md` |
| **QA** | SEO/i18n Smoke (getrennt von p1-smoke) | `scripts/p1-seo-i18n-smoke.mjs` |

---

## Neue API-Endpunkte (Ergänzung zu Wave 1)

```
GET /api/p1/seo/status
GET /api/p1/i18n/gaps
GET /api/admin/p1/seo/status
GET /api/admin/p1/i18n/gaps
```

---

## Integration

Wave-2-Dateien liegen unter `wave2/` — in das Repo **mergen**, nicht ersetzen:

```text
wave2/docs/*           → docs/
wave2/server/lib/*     → server/lib/
wave2/server/plugins/p1CatalogPlatformPlugin.js → server/plugins/ (Routes ergänzt)
wave2/scripts/*        → scripts/
wave2/components/*     → components/
wave2/lib/i18n/locales/* → lib/i18n/locales/
```

Wave-1-Module (`productValidator`, Adapter, AI, Queue …) bleiben unverändert.

---

## Test

```bash
node scripts/p1-seo-i18n-smoke.mjs
```

# Session Checkpoint — 23. Aug 2026

## Status: Katalogmodus live

| Komponente | Status |
|------------|--------|
| Website buzzard24.de | ✅ Live |
| E-Mail info@buzzard24.de (IONOS) | ✅ Funktioniert |
| Kontaktformular (FormSubmit) | ✅ Aktiv |
| Render API buzzard-api | ✅ Live, salesEnabled: false |
| Render Blueprint | ✅ Deployt |
| Admin-Login | ⏳ Passwort in Render setzen (ADMIN_PASSWORD) |

## Offene Punkte (User)

Siehe **`docs/WAS_NOCH_ZU_TUN.md`** — priorisierte Checkliste.

Kurz:
1. `ADMIN_PASSWORD` in Render setzen → Admin-Login testen
2. Optional: Google Search Console, Impressum vervollständigen, Cloudflare
3. Commerce/AI-Core-Secrets nur für Phase 3 — nicht für Katalog nötig

## Wichtige Env (Render buzzard-api)

- `BUZZARD_SALES_ENABLED=0` — **nicht ändern**
- `ADMIN_PASSWORD` — vom User gesetzt
- `BUZZARD_EMBEDDED_INTELLIGENCE=1`

## PRs merged (diese Session)

- #232–#236: Kontakt, Formular, Redirects, Render-Docs, Catalog-Polish

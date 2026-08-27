# Go-Live Vorbereitung — Was du noch machen musst

Buzzard24 ist im **Katalogmodus** vorbereitet. Alles unten „Erledigt“ läuft ohne Produkte, Preise oder Zahlung.

## Erledigt (automatisch / ohne dich)

- [x] Frontend live auf [buzzard24.de](https://buzzard24.de)
- [x] Deutsche Kategorien (`/kategorie/…`)
- [x] Katalogmodus-Texte (keine Fake-Bewertungen, kein „1 Mio. Produkte“)
- [x] API blockiert Bestellungen im Katalogmodus (`sales_disabled`)
- [x] Intelligence Production Bridge (`/api/intelligence/*`) — Shop ↔ Python-Stack, Verkauf bleibt aus
- [x] Rechtliche Stub-Seiten: Hilfe, AGB, Versand, Widerruf
- [x] SEO, Sitemap, Redirects
- [x] Security-Checks, CI (Lint, Build, Preflight)
- [x] Kontaktformular, Impressum, Datenschutz
- [x] E-Mail `info@buzzard24.de` bei IONOS (siehe `docs/EMAIL_SETUP_IONOS.md`)
- [x] Render API `buzzard-api` live (`/api/health` → OK, `salesEnabled: false`)
- [x] Render Blueprint deployt
- [x] Rechtliche Seiten für Katalogmodus (AGB, Hilfe, Versand, Widerruf)
- [x] Newsletter an FormSubmit angebunden
- [x] Zentrale Firmendaten (`lib/site/company.ts`)

## Nur du — Phase 1 (nach Deploy)

> **Blueprint ist deployt.** API läuft unter `https://buzzard-api.onrender.com`.
> **Restliste:** `docs/WAS_NOCH_ZU_TUN.md`

1. **Admin-Passwort setzen / zurücksetzen**
   - Render → **buzzard-api** → **Environment** → `ADMIN_PASSWORD` → Save → Restart
   - Login: [buzzard24.de/admin/login/](https://buzzard24.de/admin/login/) (`admin@buzzard24.de`)

2. **Optional: Impressum vervollständigen**
   - GitHub Secrets: `NEXT_PUBLIC_COMPANY_STREET`, `NEXT_PUBLIC_COMPANY_VAT_ID`
   - GitHub Pages neu deployen

3. **Optional: Google Search Console** — `docs/GOOGLE_SEARCH_CONSOLE.md`

4. **Optional: Cloudflare** vor buzzard24.de (siehe `docs/SECURITY.md`)

## Nur du — Phase 2 (Verkauf — später)

- [ ] `NEXT_PUBLIC_COMPANY_STREET` + `NEXT_PUBLIC_COMPANY_VAT_ID` (falls noch nicht gesetzt)
- [ ] AGB / Versand / Widerruf für aktiven Verkauf ergänzen
- [ ] `NEXT_PUBLIC_SALES_ENABLED=1` + `BUZZARD_SALES_ENABLED=1`
- [ ] Stripe/PayPal Keys
- [ ] Produktimport (PIM / TecDoc)
- [ ] SMTP für Bestell-E-Mails

## Nützliche Befehle

```bash
npm run verify:go-live      # Live-Routen prüfen
npm run test:smoke          # API lokal (Port 3001)
npm run render:preflight    # Render-Config prüfen
npm run security:check      # Security-Audit
npm run db:backup           # SQLite-Backup
```

## Support

Fragen? `/hilfe/` auf der Website oder info@buzzard24.de — Einrichtung: `docs/EMAIL_SETUP.md`

# Go-Live Vorbereitung — Was du noch machen musst

Buzzard24 ist im **Katalogmodus** vorbereitet. Alles unten „Erledigt“ läuft ohne Produkte, Preise oder Zahlung.

## Erledigt (automatisch / ohne dich)

- [x] Frontend live auf [buzzard24.de](https://buzzard24.de)
- [x] Deutsche Kategorien (`/kategorie/…`)
- [x] Katalogmodus-Texte (keine Fake-Bewertungen, kein „1 Mio. Produkte“)
- [x] API blockiert Bestellungen im Katalogmodus (`sales_disabled`)
- [x] Rechtliche Stub-Seiten: Hilfe, AGB, Versand, Widerruf
- [x] SEO, Sitemap, Redirects
- [x] Security-Checks, CI (Lint, Build, Preflight)
- [x] Kontaktformular, Impressum, Datenschutz

## Nur du — Phase 1 (Backend live)

1. **Render API verbinden**
   - [Render Blueprint](https://dashboard.render.com/blueprint/new?repo=https://github.com/Buzzard-de/Buzzard)
   - Oder `RENDER_API_KEY` in GitHub Secrets → Workflow „Setup Render API“
   - Docs: `docs/RENDER_API_GO_LIVE.md`

2. **Nach Deploy prüfen**
   ```bash
   curl https://buzzard-api.onrender.com/api/health
   npm run verify:go-live
   ```

3. **Optional: Cloudflare** vor buzzard24.de (siehe `docs/SECURITY.md`)

## Nur du — Phase 2 (Verkauf — später)

- [ ] Echte Firmendaten (Impressum: USt-ID, Adresse)
- [ ] AGB / Versand / Widerruf finalisieren
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

Fragen? `/hilfe/` auf der Website oder info@buzzard.com

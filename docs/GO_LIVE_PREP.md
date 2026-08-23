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

## Nur du — Phase 1 (Backend live)

> **Einmalig:** Render Blueprint verbinden — erstellt `buzzard-api` + `buzzard-intelligence` automatisch.
> Ohne Blueprint bleibt `buzzard-api.onrender.com` auf `no-server` (404).
> **Deutsche Anleitung:** `docs/RENDER_API_SETUP_DE.md`

1. **Render Blueprint verbinden (empfohlen)**
   - [Render Blueprint öffnen](https://dashboard.render.com/blueprint/new?repo=https://github.com/Buzzard-de/Buzzard)
   - Erstellt: `buzzard-api` (Node) + `buzzard-intelligence` (Python/FastAPI)
   - Embedded Intelligence ist standardmäßig aktiv (`BUZZARD_EMBEDDED_INTELLIGENCE=1`)
   - Docs: `docs/RENDER_API_GO_LIVE.md`

2. **Alternativ: GitHub Secret**
   - `RENDER_API_KEY` in GitHub Secrets → Workflow „Setup Render API“

2. **Nach Deploy prüfen**
   ```bash
   curl https://buzzard-api.onrender.com/api/health
   npm run verify:go-live
   ```

3. **Optional: Cloudflare** vor buzzard24.de (siehe `docs/SECURITY.md`)

4. **Optional: Intelligence-Stack anbinden** (Verkauf bleibt aus)
   ```bash
   # Terminal 1: Intelligence API
   cd intelligence && uvicorn buzzard_ai_complete.api.app:app --host 0.0.0.0 --port 8000

   # Render/Server env:
   BUZZARD_INTELLIGENCE_API_URL=https://your-intelligence-api.example
   BUZZARD_INTELLIGENCE_BRIDGE=1
   # BUZZARD_SALES_ENABLED=0  ← unverändert lassen
   ```
   Prüfen: `curl http://localhost:3001/api/intelligence/status`

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

Fragen? `/hilfe/` auf der Website oder info@buzzard24.de — Einrichtung: `docs/EMAIL_SETUP.md`

# Buzzard Session Checkpoint — 22. Aug 2026

**Stand:** Website-Kontakt fertig, Render API noch offen. Alles Wichtige auf `main` gemergt.

## Live-Status (buzzard24.de)

| Bereich | Status |
|--------|--------|
| Frontend / GitHub Pages | ✅ Live |
| E-Mail `info@buzzard24.de` | ✅ IONOS Postfach, Mails kommen an |
| Telefon `+49 151 26219394` | ✅ Auf Website (Impressum, ServiceBar) |
| Kontaktformular | ✅ Repariert (FormSubmit POST), Mails bestätigt |
| Impressum / Datenschutz / AGB | ✅ `info@buzzard24.de` |
| Render API | ❌ Noch nicht provisioniert (`no-server` / 404) |
| Verkauf / Checkout | ❌ `BUZZARD_SALES_ENABLED=0` (bewusst aus) |

## Was heute erledigt wurde

### Website & Kontakt
1. **Zentrale Kontakt-Konfiguration** — `lib/site/contact.ts`
2. **E-Mail** — `info@buzzard24.de` (statt Platzhalter `info@buzzard.com`)
3. **Telefon** — `+49 151 26219394`
4. **IONOS-Anleitung** — `docs/EMAIL_SETUP_IONOS.md`
5. **Kontaktformular-Fix** — PR #233: AJAX → natives Form-POST (Button funktioniert)
6. **Google/SEO-Redirects** — PR #234: `/impressum.html` → `/impressum/`

### Gemergte PRs (main)
| PR | Inhalt |
|----|--------|
| #232 | E-Mail + Telefon zentral auf Website |
| #233 | Kontaktformular Absenden repariert |
| #234 | Legal-`.html`-Weiterleitungen |

### Dokumentation (Branch offen)
- `docs/RENDER_API_SETUP_DE.md` — deutsche Render-Anleitung
- Branch: `cursor/render-api-setup-guide-c293` (noch nicht gemergt)

## Nächste Schritte (morgen)

### Priorität 1 — Render API
1. [Render Blueprint öffnen](https://dashboard.render.com/blueprint/new?repo=https://github.com/Buzzard-de/Buzzard)
2. `buzzard-api` + `buzzard-intelligence` deployen (Free)
3. Test: `https://buzzard-api.onrender.com/api/health` → 200
4. `ADMIN_PASSWORD` aus Render notieren → `/admin/login/` testen
5. Anleitung: `docs/RENDER_API_SETUP_DE.md`

### Priorität 2 — GitHub E-Mail (optional)
- `info@buzzard24.de` als primäre GitHub-E-Mail: [github.com/settings/emails](https://github.com/settings/emails)
- Bestätigungslink in IONOS Webmail klicken

### Später (Verkauf)
- Echte Firmendaten Impressum (USt-ID, volle Adresse)
- Stripe/PayPal, Produktimport, `SALES_ENABLED=1`

## Wichtige Dateien

| Pfad | Zweck |
|------|-------|
| `lib/site/contact.ts` | E-Mail + Telefon (Website) |
| `components/ContactForm.tsx` | Kontaktformular → FormSubmit |
| `docs/EMAIL_SETUP_IONOS.md` | E-Mail bei IONOS |
| `docs/RENDER_API_SETUP_DE.md` | Render API (morgen) |
| `render.yaml` | Render Blueprint Definition |
| `docs/GO_LIVE_PREP.md` | Gesamt-Checkliste |

## Nützliche URLs

- Website: https://buzzard24.de
- Impressum/Kontakt: https://buzzard24.de/impressum/
- IONOS Webmail: https://webmail.ionos.de
- Render Blueprint: https://dashboard.render.com/blueprint/new?repo=https://github.com/Buzzard-de/Buzzard
- API Health (noch 404): https://buzzard-api.onrender.com/api/health

## Git

- `main`: PRs #232, #233, #234 gemergt
- Offen: `cursor/render-api-setup-guide-c293` (Render-Doku + Bootstrap CONTACT_EMAIL)

## AI Core (unverändert / frozen)

- Baseline 94/100, Commerce E2E blockiert (externe Secrets)
- Keine Code-Änderungen an AI Core in dieser Session

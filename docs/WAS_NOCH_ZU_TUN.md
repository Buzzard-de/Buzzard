# Buzzard24 — Was noch zu tun ist

**Stand:** 23. Aug 2026 · Katalogmodus · Verkauf bleibt aus

---

## ✅ Bereits erledigt

| Bereich | Status |
|---------|--------|
| Website [buzzard24.de](https://buzzard24.de) | Live |
| E-Mail `info@buzzard24.de` (IONOS) | Funktioniert |
| Telefon `+49 151 26219394` | Auf Website |
| Kontaktformular (FormSubmit) | Aktiv |
| Render API `buzzard-api` | **Live** — `/api/health` → OK |
| Verkauf / Checkout | **Aus** (`salesEnabled: false`) |
| Intelligence Bridge | Embedded, Katalogmodus |

---

## 🔴 Jetzt erledigen (du — ca. 15 Min.)

### 1. Admin-Passwort setzen / zurücksetzen

Passwort vergessen ist **nicht schlimm**.

1. [Render Dashboard](https://dashboard.render.com) → **buzzard-api** → **Environment**
2. **`ADMIN_PASSWORD`** → neues sicheres Passwort eintragen
3. **Save** → Service startet neu
4. Login testen: [buzzard24.de/admin/login/](https://buzzard24.de/admin/login/)
   - E-Mail: `admin@buzzard24.de`
   - Passwort: das neue aus Render
5. Passwort im Passwort-Manager notieren

### 2. API kurz prüfen

Im Browser öffnen:

```
https://buzzard-api.onrender.com/api/health
```

Erwartet: JSON mit `"status":"ok"`.

### 3. `buzzard-intelligence` in Render prüfen (optional)

Render → **buzzard-intelligence** → Status **Live**?

- Free-Tier startet langsam (Cold Start)
- **API funktioniert auch ohne** (Embedded Intelligence)
- Bei **Failed**: Logs lesen — API bleibt trotzdem nutzbar

---

## 🟡 Optional — Katalog verbessern (diese Woche)

| # | Aufgabe | Wo | Anleitung |
|---|---------|-----|-----------|
| 1 | Google Search Console | [search.google.com/search-console](https://search.google.com/search-console) | `docs/GOOGLE_SEARCH_CONSOLE.md` |
| 2 | GitHub-E-Mail auf `info@buzzard24.de` | [github.com/settings/emails](https://github.com/settings/emails) | Bestätigungslink in IONOS Webmail |
| 3 | Impressum vervollständigen | Website `/impressum/` | Volle Adresse, ggf. USt-ID |
| 4 | Cloudflare vor Domain | Domain-DNS | `docs/SECURITY.md` |
| 5 | GitHub Pages neu bauen | GitHub → Actions → „Deploy to GitHub Pages“ → Run | Nach API-Live sinnvoll |

---

## 🟠 Später — AI Core / Commerce (nicht für Katalog nötig)

Nur relevant für **Phase 3 Commerce E2E** — **nicht** für die laufende Website.

In Render → **buzzard-intelligence** → Environment (Secrets, nicht in Git):

| Variable | Wert |
|----------|------|
| `COMMERCE_API_URL` | `https://buzzard-api.onrender.com` |
| `COMMERCE_API_TOKEN` | API-Token / JWT (geheim) |
| `COMMERCE_WEBHOOK_SECRET` | Zufallsstring (geheim) |
| `BUZZARD_AI_CORE_V3` | `1` |

> Secrets **nie** im Chat oder in Git committen.

---

## ⛔ Erst wenn Verkauf gewollt ist (explizit später)

**Nicht jetzt aktivieren.**

- [ ] Echte Produkte importieren (PIM / TecDoc)
- [ ] AGB / Versand / Widerruf finalisieren
- [ ] Stripe / PayPal Keys in Render
- [ ] `BUZZARD_SALES_ENABLED=1` + `NEXT_PUBLIC_SALES_ENABLED=1`
- [ ] SMTP für Bestell-E-Mails (`info@buzzard24.de` als Absender)
- [ ] Render Persistent Disk für SQLite (sonst DB-Reset bei Redeploy)

---

## Schnell-Checkliste (ausdrucken / abhaken)

```
KATALOGMODUS FERTIG:
[ ] Admin-Passwort in Render gesetzt
[ ] Admin-Login getestet (/admin/login/)
[ ] API Health OK (buzzard-api.onrender.com/api/health)

OPTIONAL:
[ ] Google Search Console
[ ] GitHub-E-Mail info@buzzard24.de
[ ] Impressum Adresse/USt-ID
[ ] Cloudflare

SPÄTER (VERKAUF):
[ ] — bewusst offen lassen —
```

---

## Nützliche Links

| Was | URL |
|-----|-----|
| Website | https://buzzard24.de |
| Impressum / Kontakt | https://buzzard24.de/impressum/ |
| Admin | https://buzzard24.de/admin/login/ |
| API Health | https://buzzard-api.onrender.com/api/health |
| Render Dashboard | https://dashboard.render.com |
| IONOS Webmail | https://webmail.ionos.de |
| Render API Anleitung | `docs/RENDER_API_SETUP_DE.md` |
| E-Mail Anleitung | `docs/EMAIL_SETUP_IONOS.md` |

---

## Support

- E-Mail: info@buzzard24.de
- Telefon: +49 151 26219394
